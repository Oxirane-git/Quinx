# CLAUDE.md — Quinx AI Email Writer

## Project Overview

This is the **Quinx AI Email Writer** — a cold outreach email pipeline
for Quinx AI, a restaurant customer retention system. It generates
hyper-personalized cold emails for independent restaurants, cafes, and
cloud kitchens using scraped business intelligence and the Claude API.

**Product:** Quinx AI (quinxai.com)
**What Quinx does:** Automates customer follow-up for restaurants via
WhatsApp, SMS, and email using a QR-code-based capture system.
**Pricing:** Starts at ₹3,999/month.

---

## Architecture — WAT Framework

This project uses the **WAT framework** (Workflows, Agents, Tools):

- **Workflows** (`workflows/`) — Markdown SOPs that define *what* to do
- **Agents** (Claude) — The decision-maker that orchestrates execution
- **Tools** (`tools/`) — Deterministic Python scripts that do the work

The separation ensures AI handles reasoning while deterministic code
handles execution, preventing compounding errors across multi-step tasks.

---

## File Structure

```
CLAUDE.md                     # This file — project instructions
email-writer-build-prompt.md  # Full build specification (reference doc)

workflows/                    # Markdown SOPs
  write_email.md              # Email generation workflow + master prompt

tools/                        # Deterministic scripts
  write_email.py              # Claude API caller — generates emails
  csv_handler.py              # Reads/writes leads CSV

.env                          # ANTHROPIC_API_KEY lives here (gitignored)
.tmp/                         # Temp files — always safe to delete
```

---

## Key Pipeline: Email Writing

### Input
A `businessContext` JSON object per lead, containing:
- **Required:** `businessName`, `city`, `category`
- **Personalization (need ≥2 usable):** `websiteSummary`, `positiveThemes`,
  `churnSignals`, `recentMentions`, `socialPresence`
- **Optional:** `ownerName`, `website`, `rating`, `reviewCount`,
  `lastReviewDate`, `hasLoyaltyProgram`, `hasEmailCapture`, `painScore`

### Output
```json
{ "subject": "under 9 words", "body": "90–130 words, plain text" }
```

### Flow
1. Validate businessContext (required fields + ≥2 personalization fields)
2. Execute `tools/write_email.py --context '{...}'`
3. Validate output (JSON structure, word count 90–130, businessName in body)
4. On failure: retry once with stricter prompt → if still fails, mark as failed
5. Write results back to leads CSV via `tools/csv_handler.py`

---

## Email Quality Rules (Non-Negotiable)

1. **Length:** Subject < 9 words. Body 90–130 words. Strictly enforced.
2. **Opening:** Must reference something SPECIFIC from scraped data — never
   "I came across your restaurant"
3. **Problem:** One sentence naming the revenue leak (first-timers not returning)
4. **Solution:** 1–2 sentences, plain English, outcome-focused
5. **CTA:** Soft, conversational, one question. Never "book a demo" or "click here"
6. **Tone:** Founder-to-founder. Warm. Direct. Zero exclamation marks.
   Zero corporate speak.
7. **Personalization:** Minimum TWO specific details from scraped data.
   Generic emails = rejected.
8. **Subject line:** Creates curiosity or names a pain. Never describes the product.
   Banned words: retention, automation, SaaS, platform, solution
9. **Sign-off:** Always `Sahil | Quinx AI` then `quinxai.com`. Nothing after.
10. **Format:** Raw JSON only. No markdown fences. No preamble.

---

## Tool Standards

Every script in `tools/` must:
- Accept inputs via CLI args (e.g., `--context '{...}'`)
- Return structured JSON to stdout
- Write errors to stderr (never stdout)
- Exit 0 on success, 1 on failure
- Be runnable standalone for testing
- Read secrets from `.env` only — never hardcoded

---

## Workflow Standards

Every file in `workflows/` must contain:
- **Objective** — one sentence
- **Inputs** — required data
- **Steps** — ordered, referencing specific tool names
- **Outputs** — what is produced
- **Edge Cases** — failure modes + handling
- **Notes** — rate limits, lessons learned

---

## Gemini API Configuration

- **Model:** `gemini-2.5-flash`
- **Temperature:** 0.7 (variation without losing rule compliance)
- **Max output tokens:** 500 (emails are short)
- **API key:** `GEMINI_API_KEY` in `.env`

---

## Operating Rules

### Before Any Task
1. Read the relevant workflow in `workflows/`
2. Check `tools/` — use existing tools before building new ones
3. Confirm all required inputs exist before executing

### During Execution
- Follow the sequence defined in the workflow
- On failure: read full error → fix tool → retest on one record
- If a fix involves paid API calls → stop and ask before retrying
- Log progress on multi-step tasks — never run silent
- If ambiguous → stop and ask, don't assume

### Never Do
- Store secrets outside `.env`
- Run paid API calls after failure without asking
- Overwrite workflow files without explicit instruction
- Send generic emails — skip the lead instead
- Run full batch to test — always validate on one record first
- Assume missing data — ask or skip with a logged reason

---

## Volume & Priorities

- **Daily volume:** 20–25 emails/day
- **Priority leads:** Pain score 7+ (highest churn signals = most likely to respond)
- **Skip rule:** If < 2 usable personalization fields, skip the lead entirely

---

## Dependencies

```
google-genai
python-dotenv
```
All other imports are Python stdlib only.
