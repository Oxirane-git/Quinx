/**
 * Email_Sender/src/db.js
 *
 * Thin wrapper that updates lead status in leads.db via a Python subprocess.
 * Uses execFileSync so email/status are passed as argv (no shell injection risk).
 *
 * Usage (internal — called from mailer.js):
 *   const { updateLeadStatus } = require('./db');
 *   updateLeadStatus(email, 'sent');     // after successful send
 *   updateLeadStatus(email, 'bounced');  // after send failure
 *
 * Failures are silently caught so a DB error never interrupts email sending.
 */

const { execFileSync } = require('child_process');
const path = require('path');

const DB_UPDATE_SCRIPT = path.join(__dirname, 'db_update.py');

/**
 * @param {string} email   - Lead email address
 * @param {string} status  - One of: 'new' | 'email_written' | 'sent' | 'bounced'
 */
function updateLeadStatus(email, status) {
    try {
        execFileSync('python', [DB_UPDATE_SCRIPT, email, status], {
            timeout: 8000,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
    } catch (err) {
        // stderr from db_update.py is available in err.stderr — log but don't throw
        const msg = err.stderr ? err.stderr.toString().trim() : err.message;
        // Only log if it's a real error (not the "not found" info message)
        if (msg && !msg.includes('not found in DB')) {
            console.warn(`[DB] Status update failed for ${email}: ${msg}`);
        }
    }
}

module.exports = { updateLeadStatus };
