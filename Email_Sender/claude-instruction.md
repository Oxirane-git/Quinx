# Claude Instruction — Hostinger Email Warmup Automation

Full build specification. For a quick reference, see [`CLAUDE (1).md`](CLAUDE%20(1).md).

---

## Project Overview

Build a complete headless browser automation system that:
- Logs into mail.hostinger.com using credentials from a `.env` file
- Reads leads (email, subject, body) from an Excel (`.xlsx`) or CSV file in the project root
- Sends personalized emails via the Hostinger webmail UI with a randomized 3–6 second delay between each send
- Runs fully headless in production, with a visible browser mode toggle for debugging

---

## Tech Stack

- **Runtime:** Node.js (v18+)
- **Headless Browser:** Playwright (preferred over Puppeteer — better reliability with modern webmail SPAs)
- **Excel/CSV Parsing:** `xlsx` (supports both `.xlsx` and `.csv`)
- **Environment Variables:** `dotenv`
- **Logging:** `winston` or `console` with timestamped output
- **Delay Utility:** Custom randomized sleep function

---

## Project Structure to Generate

```
hostinger-email-warmer/
├── .env                      ← Credentials (never commit)
├── .env.example              ← Template for env vars
├── .gitignore                ← Exclude .env, node_modules, logs
├── package.json
├── leads.xlsx                ← Sample leads file (generate a template)
├── src/
│   ├── index.js              ← Entry point / orchestrator
│   ├── browser.js            ← Playwright browser setup & teardown
│   ├── hostinger.js          ← All Hostinger webmail UI interactions
│   ├── leads.js              ← Excel/CSV reader and validator
│   ├── mailer.js             ← Send loop with delay logic
│   └── utils.js              ← sleep(), randomDelay(), logger
├── logs/
│   └── .gitkeep
└── README.md
```

---

## Step 1 — Environment Setup

### `.env` file structure:
```env
HOSTINGER_EMAIL=your_email@yourdomain.com
HOSTINGER_PASSWORD=your_password_here
LEADS_FILE=leads.xlsx
HEADLESS=true
LOG_LEVEL=info
```

### `.env.example`:
```env
HOSTINGER_EMAIL=
HOSTINGER_PASSWORD=
LEADS_FILE=leads.xlsx
HEADLESS=true
LOG_LEVEL=info
```

---

## Step 2 — `package.json`

```json
{
  "name": "hostinger-email-warmer",
  "version": "1.0.0",
  "description": "Automated email warmup via Hostinger webmail using headless Playwright",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "debug": "HEADLESS=false node src/index.js"
  },
  "dependencies": {
    "dotenv": "^16.0.0",
    "playwright": "^1.40.0",
    "xlsx": "^0.18.5"
  }
}
```

---

## Step 3 — `src/utils.js`

Implement the following:

```javascript
// randomDelay(min, max) — returns a promise that resolves after a random ms between min and max
// Default: min=3000, max=6000 (3–6 seconds)

// logger — simple timestamped console logger with levels: info, warn, error, success
// Format: [2025-01-01 12:00:00] [INFO] Message here

// formatLeadLog(index, total, email) — "Sending email 3/50 → recipient@example.com"
```

---

## Step 4 — `src/leads.js`

**Requirements:**
- Accept any file path from `process.env.LEADS_FILE`
- Auto-detect format by file extension (`.csv` or `.xlsx`)
- Parse using the `xlsx` library (it handles both formats)
- Expected columns (case-insensitive header matching):
  - `email` — recipient email address
  - `subject` — email subject line
  - `body` — email body (supports plain text; handle newlines `\n` as line breaks)
- Validate each row:
  - Skip rows with missing/invalid email (log a warning)
  - Skip rows with empty subject or body (log a warning)
  - Trim all whitespace from values
- Return a clean array of lead objects: `[{ email, subject, body }, ...]`
- Log total leads loaded and total skipped

**Sample leads.xlsx template to generate:**
Create a sample Excel file with headers: `email | subject | body` and 3 example rows with realistic warm-up email content (casual, conversational, non-promotional).

---

## Step 5 — `src/browser.js`

```javascript
// launchBrowser() — launches Playwright Chromium
//   - headless: read from process.env.HEADLESS (default true)
//   - args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
//   - viewport: { width: 1280, height: 800 }
//   - Returns { browser, page }

// closeBrowser(browser) — graceful teardown
```

---

## Step 6 — `src/hostinger.js`

This is the core automation file. Implement all webmail interactions here.

### `login(page, email, password)`
1. Navigate to `https://mail.hostinger.com`
2. Wait for the email input field to be visible (selector: `input[name="login"]` or `input[type="email"]` — inspect the actual Hostinger webmail login page and use the correct selectors)
3. Clear and type the email address (use `page.fill()`)
4. Tab to or click the password field
5. Clear and type the password
6. Click the Sign In / Login button
7. Wait for navigation — confirm login success by waiting for the compose button or inbox sidebar to appear
8. If login fails (error message appears), throw a descriptive error: `Login failed: check credentials in .env`
9. Add a 2-second wait after successful login to let the UI fully load

**Important selector notes for Hostinger Webmail (Roundcube-based):**
- Login form: `#rcmloginuser`, `#rcmloginpwd`, `#rcmloginsubmit`
- Compose button: `#compose` or `a.compose` or button with title "Compose"
- The exact selectors may vary — use `page.waitForSelector()` with a timeout and fallback logic

### `composeAndSend(page, lead)`

Parameters: `{ email, subject, body }`

1. **Click Compose:** Find and click the "New Message" / "Compose" button
   - Try selectors in order: `a[onclick*="compose"]`, `#compose`, `button.compose`, `.button.compose`
   - Wait for the compose window/modal to appear

2. **Fill To field:**
   - Click the "To" input field
   - Type the recipient email
   - Press Tab or Enter to confirm the recipient

3. **Fill Subject field:**
   - Click the Subject input
   - Type the subject line

4. **Fill Body:**
   - The body area is likely a contenteditable div or an iframe (Roundcube uses an iframe with TinyMCE or plain contenteditable)
   - If iframe: `await page.frame({ name: 'composebody' }).fill('body', lead.body)` (adjust frame name)
   - If contenteditable: `await page.click('.message-body')` then `await page.keyboard.type(lead.body)`
   - Handle `\n` characters as actual newlines

5. **Send the email:**
   - Click the Send button: `#sendbutton`, `button[title="Send"]`, or `input[value="Send"]`
   - Wait for the compose window to close or a success notification
   - Confirm send success (look for "Message sent" toast/notification)

6. **Error handling:**
   - If compose window doesn't open: retry once after 2 seconds
   - If send fails: log the error, mark lead as failed, continue to next lead (don't stop the whole run)

### `logout(page)`
- Click user menu → Logout
- Or navigate to `https://mail.hostinger.com/?_task=logout`

---

## Step 7 — `src/mailer.js`

```javascript
// sendAllEmails(page, leads)
// For each lead:
//   1. Log: "Sending email X/Y → email@example.com"
//   2. Call hostinger.composeAndSend(page, lead)
//   3. On success: log success with timestamp
//   4. On error: log error, push to failedLeads[], continue
//   5. If not the last lead: await randomDelay(3000, 6000)
//
// After all leads:
//   - Log summary: "✅ Sent: X | ❌ Failed: Y | Total: Z"
//   - If any failed leads, log them out for retry
//   - Return { sent, failed, failedLeads }
```

---

## Step 8 — `src/index.js`

Orchestration flow:

```javascript
async function main() {
  // 1. Load .env
  // 2. Validate required env vars (HOSTINGER_EMAIL, HOSTINGER_PASSWORD, LEADS_FILE)
  //    — If missing, log a clear error and exit with process.exit(1)
  // 3. Load and validate leads from file
  //    — If 0 valid leads found, exit gracefully
  // 4. Log startup summary: "Starting warmup for X leads from [filename]"
  // 5. Launch browser
  // 6. Login to Hostinger webmail
  // 7. Run sendAllEmails loop
  // 8. Logout
  // 9. Close browser
  // 10. Log final summary
}

main().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
```

---

## Step 9 — `README.md`

Include:
1. Prerequisites (Node.js 18+, npm)
2. Installation steps:
   ```bash
   npm install
   npx playwright install chromium
   ```
3. Setup instructions (copy `.env.example` to `.env`, fill credentials)
4. Leads file format with example table
5. Run commands:
   ```bash
   npm start           # Headless mode (production)
   npm run debug       # Visible browser (debugging)
   ```
6. Column format for leads file
7. Troubleshooting section:
   - "Login failed" → check credentials
   - "Selector not found" → Hostinger may have updated UI, run in debug mode
   - "Module not found" → run `npm install`

---

## Step 10 — `.gitignore`

```
node_modules/
.env
logs/*.log
*.csv
*.xlsx
!leads.xlsx.example
```

---

## Additional Implementation Requirements

### Robustness
- Wrap every Playwright interaction in try/catch
- Use `page.waitForSelector(selector, { timeout: 10000 })` before all interactions
- After clicking compose, wait for the compose window using `page.waitForSelector()` not arbitrary `page.waitForTimeout()`
- Use `page.waitForLoadState('networkidle')` after navigation steps

### Anti-Detection (for email warming purposes)
- Use randomized delays between 3000–6000ms (already specified)
- Type text with human-like speed: use `page.type(selector, text, { delay: 50 })` instead of `page.fill()` for subject and body fields
- Add a random 500–1500ms pause between filling each field

### Selector Strategy
- Define all selectors as constants at the top of `hostinger.js` in a `SELECTORS` object
- This makes it easy to update when Hostinger changes their UI

```javascript
const SELECTORS = {
  loginEmail: '#rcmloginuser',
  loginPassword: '#rcmloginpwd',
  loginSubmit: '#rcmloginsubmit',
  composeBtn: '#compose',
  toField: 'input.ui-autocomplete-input',
  subjectField: 'input[name="_subject"]',
  bodyFrame: 'iframe[name="composebody"]',
  sendBtn: '#sendbutton',
  successToast: '.ui-dialog-content, #messagestack div'
}
```

### Logging Output Format
Every log line should look like:
```
[2025-06-15 14:32:01] [INFO]    Starting warmup — 47 leads loaded from leads.xlsx
[2025-06-15 14:32:03] [INFO]    Logged in as sahil@quinxai.com ✓
[2025-06-15 14:32:05] [INFO]    Sending 1/47 → john@restaurant.com
[2025-06-15 14:32:08] [SUCCESS] Sent 1/47 → john@restaurant.com (3.2s)
[2025-06-15 14:32:13] [INFO]    Sending 2/47 → mary@cafe.com
...
[2025-06-15 14:45:22] [INFO]    ─────────────────────────────────
[2025-06-15 14:45:22] [SUCCESS] ✅ Sent: 45  ❌ Failed: 2  Total: 47
[2025-06-15 14:45:22] [WARN]    Failed leads: bob@broken.com, x@invalid
```

---

## Execution Instructions for Claude

1. Generate **all files** listed in the project structure above
2. Generate a **working `leads.xlsx`** sample file with 5 example rows (realistic warmup email content — casual conversation, no spam triggers)
3. After generating all files, output a **"Setup Checklist"** in the terminal/chat:
   ```
   ✅ Files generated
   📋 Next steps:
      1. cd hostinger-email-warmer
      2. npm install
      3. npx playwright install chromium
      4. cp .env.example .env  →  fill in your credentials
      5. Add your leads to leads.xlsx
      6. npm start
   ```
4. Do NOT hardcode any credentials anywhere — all sensitive data must come from `.env`
5. The code must run end-to-end with `node src/index.js` — no missing imports, no placeholder TODOs left in code

---

## Notes on Hostinger Webmail

Hostinger's webmail is **Roundcube**. Key known selectors (verify in debug mode):
- Login user input: `#rcmloginuser`
- Login password: `#rcmloginpwd`  
- Login submit: `#rcmloginsubmit`
- Compose button: `#compose` or `a.button.compose`
- To field: `input.addressfield` or inside `.compose-headers`
- Subject field: `input[name="_subject"]`
- Message body: Inside an `<iframe>` — use `page.frameLocator('iframe[name="composebody"]').locator('body')`
- Send button: `#sendbutton` or `a.button.send`

If selectors fail, run with `HEADLESS=false` to visually inspect the UI and update the `SELECTORS` object accordingly.
