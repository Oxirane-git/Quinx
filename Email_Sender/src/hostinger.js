const nodemailer = require('nodemailer');
const Imap = require('imap');
const MailComposer = require('mailcomposer');
const { logger } = require('./utils');

async function createTransport(email, password) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.hostinger.com',
        port: 465,
        secure: true,
        auth: {
            user: email,
            pass: password,
        },
    });

    await transporter.verify();
    logger.success(`SMTP connection verified for ${email} ✓`);
    return transporter;
}

async function sendEmail(transporter, from, lead) {
    await transporter.sendMail({
        from: from,
        to: lead.email,
        subject: lead.subject,
        text: lead.body,
    });
}

/**
 * Saves a copy of the sent email to the "Sent" folder via IMAP.
 */
async function saveToSent(email, password, lead, fromName) {
    return new Promise((resolve, reject) => {
        const mail = new MailComposer({
            from: fromName ? `${fromName} <${email}>` : email,
            to: lead.email,
            subject: lead.subject,
            text: lead.body,
            date: new Date()
        });

        mail.build((err, message) => {
            if (err) return reject(err);

            const imap = new Imap({
                user: email,
                password: password,
                host: 'imap.hostinger.com',
                port: 993,
                tls: true,
                tlsOptions: { servername: 'imap.hostinger.com' }
            });

            imap.once('ready', () => {
                // Hostinger usually uses "Sent", but we can try to find it.
                // We'll try "Sent" first.
                imap.append(message, { folder: 'Sent', flags: ['Seen'] }, (appendErr) => {
                    if (appendErr) {
                        // Fallback to "INBOX.Sent" if "Sent" fails
                        imap.append(message, { folder: 'INBOX.Sent', flags: ['Seen'] }, (fallbackErr) => {
                            imap.end();
                            if (fallbackErr) {
                                logger.warn(`[IMAP] Failed to save to Sent/INBOX.Sent: ${fallbackErr.message}`);
                                resolve(); // Don't crash the whole process
                            } else {
                                logger.info(`[IMAP] Message saved to INBOX.Sent ✓`);
                                resolve();
                            }
                        });
                    } else {
                        imap.end();
                        logger.info(`[IMAP] Message saved to Sent folder ✓`);
                        resolve();
                    }
                });
            });

            imap.once('error', (imapErr) => {
                logger.warn(`[IMAP] Connection error: ${imapErr.message}`);
                resolve();
            });

            imap.connect();
        });
    });
}

module.exports = {
    createTransport,
    sendEmail,
    saveToSent,
};
