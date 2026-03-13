const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const { logger } = require('./utils');

function loadLeads(filePath) {
    try {
        const fullPath = path.resolve(process.cwd(), filePath);

        if (!fs.existsSync(fullPath)) {
            throw new Error(`File not found: ${fullPath}`);
        }

        const ext = path.extname(fullPath).toLowerCase();
        if (!['.xlsx', '.csv'].includes(ext)) {
            throw new Error(`Unsupported file type: ${ext}. Expected .xlsx or .csv`);
        }

        const workbook = xlsx.readFile(fullPath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Parse to JSON, case-insensitive headers will be handled by mapping
        const rawData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

        let validLeads = [];
        let skipped = 0;

        rawData.forEach((row, index) => {
            // Find keys case-insensitively
            const keys = Object.keys(row);
            const emailKey = keys.find(k => k.trim().toLowerCase() === 'email');
            const subjectKey = keys.find(k => k.trim().toLowerCase() === 'subject');
            const bodyKey = keys.find(k => k.trim().toLowerCase() === 'body');

            const statusKey = keys.find(k => k.trim().toLowerCase() === 'status');
            const email = emailKey ? String(row[emailKey]).trim() : '';
            const subject = subjectKey ? String(row[subjectKey]).trim() : '';
            const body = bodyKey ? String(row[bodyKey]).trim() : '';
            const status = statusKey ? String(row[statusKey]).trim() : '';

            if (!email || !email.includes('@')) {
                logger.warn(`Row ${index + 2}: Skipped due to missing/invalid email`);
                skipped++;
                return;
            }

            if (!subject || !body) {
                logger.warn(`Row ${index + 2}: Skipped due to missing subject or body`);
                skipped++;
                return;
            }

            // Only send emails that passed the writer validation
            if (status && status !== 'ready_to_send') {
                logger.warn(`Row ${index + 2}: Skipped — status is '${status}'`);
                skipped++;
                return;
            }

            validLeads.push({ email, subject, body });
        });

        logger.info(`Loaded ${validLeads.length} valid leads (${skipped} skipped)`);
        return validLeads;

    } catch (err) {
        logger.error(`Error loading leads: ${err.message}`);
        throw err;
    }
}

module.exports = {
    loadLeads
};
