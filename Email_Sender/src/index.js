require('dotenv').config();
const { loadLeads } = require('./leads');
const { createTransport } = require('./hostinger');
const { sendAllEmails } = require('./mailer');
const { logger } = require('./utils');

async function main() {
    const email = process.env.HOSTINGER_EMAIL;
    const password = process.env.HOSTINGER_PASSWORD;
    const leadsFile = process.env.LEADS_FILE || 'leads.xlsx';

    if (!email || !password) {
        logger.error('Missing HOSTINGER_EMAIL or HOSTINGER_PASSWORD in .env');
        process.exit(1);
    }

    const leads = loadLeads(leadsFile);

    if (leads.length === 0) {
        logger.warn('No valid leads found. Exiting.');
        process.exit(0);
    }

    logger.info(`Starting warmup — ${leads.length} leads loaded from ${leadsFile}`);

    try {
        const transporter = await createTransport(email, password);
        await sendAllEmails(transporter, email, leads);
    } catch (err) {
        logger.error(`Fatal error: ${err.message}`);
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Unhandled error:', err.message);
    process.exit(1);
});
