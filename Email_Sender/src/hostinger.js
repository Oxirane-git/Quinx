const nodemailer = require('nodemailer');
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

module.exports = {
    createTransport,
    sendEmail,
};
