# Hostinger Email Warmer

Automated email warmup sequence for Hostinger webmail using headless Playwright.

## Prerequisites
- Node.js 18+
- npm

## Setup

1. Install dependencies:
   ```bash
   npm install
   npx playwright install chromium
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   ```
   Fill in `.env` with your Hostinger credentials.

3. Generate sample leads file or prepare your own:
   ```bash
   npm run setup:leads
   ```
   *Your `leads.xlsx` or `.csv` must have headers: `email`, `subject`, `body`.*

## Running the Automation

**Headless (Production Mode):**
```bash
npm start
```

**Visible Browser (Debug Mode):**
```bash
npm run debug
```

## Troubleshooting

- **Login failed**: Double-check your exact `.env` credentials. Check if Hostinger added a captcha.
- **Selector not found**: Hostinger may have updated their UI. Run in debug mode, inspect their page elements, and update the selectors in `src/hostinger.js`.
- **Module not found**: Ensure you ran `npm install`.
