const { sendEmail } = require('./hostinger');
const { logger, randomDelay } = require('./utils');
const { updateLeadStatus } = require('./db');

async function sendAllEmails(transporter, from, leads) {
    const sendLimit = parseInt(process.env.SEND_LIMIT || '0', 10);
    const effectiveLeads = sendLimit > 0 ? leads.slice(0, sendLimit) : leads;
    const total = effectiveLeads.length;

    if (sendLimit > 0) {
        logger.info(`Send limit: ${sendLimit} — processing ${total} of ${leads.length} leads`);
    }

    let sent = 0;
    let failed = 0;
    const failedLeads = [];

    for (let i = 0; i < total; i++) {
        const lead = effectiveLeads[i];
        const startTime = Date.now();

        logger.info(`Sending ${i + 1}/${total} → ${lead.email}`);

        try {
            await sendEmail(transporter, from, lead);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

            logger.success(`Sent ${i + 1}/${total} → ${lead.email} (${elapsed}s)`);
            sent++;
            updateLeadStatus(lead.email, 'sent');

        } catch (err) {
            failed++;
            failedLeads.push(lead.email);
            updateLeadStatus(lead.email, 'bounced');
            // Wait a moment on failure before continuing
            await randomDelay(2000, 4000);
            continue;
        }

        // Delay before the next email if this is not the last one
        if (i < total - 1) {
            await randomDelay(10000, 15000);
        }
    }

    logger.info('─────────────────────────────────');
    logger.success(`✅ Sent: ${sent}  ❌ Failed: ${failed}  Total: ${total}`);

    if (failedLeads.length > 0) {
        logger.warn(`Failed leads: ${failedLeads.join(', ')}`);
    }

    return { sent, failed, failedLeads };
}

module.exports = {
    sendAllEmails
};
