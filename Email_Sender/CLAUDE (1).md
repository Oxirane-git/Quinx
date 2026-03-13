# CLAUDE.md — Hostinger Email Warmup Automation

This file provides guidance to Claude Code when working with this repository.

---

## Project Overview

A headless browser automation system that:
- Logs into **mail.hostinger.com** (Roundcube-based) using credentials from `.env`
- Reads leads (email, subject, body) from Excel/CSV
- Sends personalized warmup emails with randomized 3–6s delays
- Runs fully headless in production; visible browser toggle for debugging

> **Full build spec:** See [`claude-instruction.md`](claude-instruction.md) for step-by-step implementation details.

## Tech Stack

| Component        | Tool                       |
|------------------|----------------------------|
| Runtime          | Node.js v18+               |
| Browser          | Playwright (Chromium)      |
| Excel/CSV        | `xlsx`                     |
| Env vars         | `dotenv`                   |

## Project Structure

```
├── .env                  ← Credentials (never commit)
├── .env.example          ← Template for env vars
├── .gitignore
├── package.json
├── leads.xlsx            ← Leads file (email | subject | body)
├── src/
│   ├── index.js          ← Entry point / orchestrator
│   ├── browser.js        ← Playwright browser setup & teardown
│   ├── hostinger.js      ← Webmail UI interactions (login, compose, send, logout)
│   ├── leads.js          ← Excel/CSV reader and validator
│   ├── mailer.js         ← Send loop with delay logic
│   └── utils.js          ← sleep(), randomDelay(), logger
├── logs/
│   └── .gitkeep
└── README.md
```

## Commands

```bash
npm install                        # Install dependencies
npx playwright install chromium    # Install browser engine
npm start                          # Run headless (production)
npm run debug                      # Visible browser (HEADLESS=false)
```

## Environment Variables

```env
HOSTINGER_EMAIL=your_email@yourdomain.com
HOSTINGER_PASSWORD=your_password_here
LEADS_FILE=leads.xlsx
HEADLESS=true
LOG_LEVEL=info
```

## WAT Framework

This repo uses the **WAT framework** (Workflows, Agents, Tools):

- **`workflows/`** — Markdown SOPs. Don't create/overwrite without asking.
- **`tools/`** — Python scripts for deterministic execution. Check here before writing new code.
- **`.tmp/`** — Temporary/intermediate files. Disposable.
- **`.env`** — All secrets. Never store credentials anywhere else.

### Operating Rules

1. **Check `tools/` first** — Only create new scripts when nothing exists for the task.
2. **Read workflows before acting** — Follow existing workflows; don't bypass tools.
3. **Final outputs → cloud services** (Sheets, Slides, etc.). `.tmp/` is intermediate only.

## Hostinger Webmail Selectors (Roundcube)

All selectors live in a `SELECTORS` constant in `src/hostinger.js`:

| Element        | Primary Selector                          |
|----------------|-------------------------------------------|
| Login email    | `#rcmloginuser`                           |
| Login password | `#rcmloginpwd`                            |
| Login submit   | `#rcmloginsubmit`                         |
| Compose button | `#compose` / `a.button.compose`           |
| To field       | `input.ui-autocomplete-input`             |
| Subject field  | `input[name="_subject"]`                  |
| Body (iframe)  | `iframe[name="composebody"]` → `body`     |
| Send button    | `#sendbutton` / `a.button.send`           |

> If selectors fail, run with `HEADLESS=false` to visually inspect and update `SELECTORS`.

## Implementation Guidelines

### Robustness
- Wrap every Playwright interaction in try/catch
- Use `page.waitForSelector(selector, { timeout: 10000 })` before all interactions
- Use `page.waitForLoadState('networkidle')` after navigation steps

### Anti-Detection
- Randomized delays: 3000–6000ms between sends
- Human-like typing: `page.type(selector, text, { delay: 50 })`
- Random 500–1500ms pause between filling each field

### Logging Format
```
[YYYY-MM-DD HH:MM:SS] [LEVEL] Message
```

### Error Handling Loop
1. Read full error trace
2. Fix the script and retest (check before re-running if tool uses paid API calls)
3. Document learnings in the relevant workflow
4. Update workflow to prevent recurrence
