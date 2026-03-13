# Quinx AI — Email Writer Build Prompt
### Drop this into Claude Code after CLAUDE.md is loaded

---

## CONTEXT

Quinx AI is a restaurant customer retention system. We send cold
outreach emails to independent restaurants, cafes, and cloud kitchens.
Each email must feel like it was hand-written by someone who genuinely
researched that specific business — not a template blast.

We send 20–25 emails per day. Before each email is written, a
researcher has already scraped the business and produced a
`businessContext` JSON object. The email writer receives that context
and produces a subject line and body.

---

## TASK: Build Two Things

---

### 1. `workflows/write_email.md`

Create this workflow file with the following structure:

**Objective:**
Take a populated businessContext JSON for a single restaurant lead and
produce a personalized cold email subject and body using the Claude API.

**Inputs:**
- businessContext JSON (see schema below)
- Master prompt template (embedded in this workflow file)

**Steps:**
1. Validate businessContext has minimum required fields:
   `businessName`, `city`, `category` — abort with error if missing
2. Validate at least 2 of these personalization fields are non-empty
   and non-generic: `websiteSummary`, `positiveThemes`, `churnSignals`,
   `recentMentions`, `socialPresence`
   If fewer than 2 are usable, log a warning and skip this lead
   (do not send a generic email)
3. Execute `tools/write_email.py` with the businessContext as input
4. Validate the output JSON has both `"subject"` and `"body"` keys
5. Validate body word count is between 90 and 130 words
6. Validate `businessName` appears at least once in the body
7. If any validation fails: retry once with a stricter prompt injection
   telling Claude the specific rule that was violated
8. If second attempt also fails: mark lead as `"email_write_failed"`
   and move to next lead
9. Write subject and body back to the leads CSV via `tools/csv_handler.py`

**Outputs:**
- `subject` string (under 9 words)
- `body` string (90–130 words, plain text, no HTML)
- Updated CSV row with subject, body, `status = "ready_to_send"`

**Edge Cases:**
- Claude API timeout → retry once after 5 seconds, then fail gracefully
- Rate limit → wait 60 seconds, retry once
- Response not valid JSON → attempt to extract JSON from response text,
  if still invalid mark as failed
- Business has no useful scraped data → skip, log reason, do not write
  a generic email under any circumstances

---

**Master Prompt Template:**

Embed the following block verbatim. The tool reads this at runtime
and substitutes `{{variable}}` placeholders with real values.

```
MASTER_PROMPT_START

You are an outreach specialist for Quinx AI — a restaurant customer
retention system that helps independent restaurants, cafes, and cloud
kitchens automatically bring back first-time customers through
WhatsApp, SMS, and email follow-ups.

Your job is to write ONE cold outreach email that feels like it was
written by a human who genuinely researched this specific business —
not a template, not a mass blast.

---

BUSINESS INTELLIGENCE REPORT:
Business Name: {{businessName}}
Owner/Contact Name: {{ownerName}}
City: {{city}}
Category: {{category}}
Website: {{website}}

What their website says about them:
{{websiteSummary}}

Their Google/review presence:
- Star Rating: {{rating}}
- Total Reviews: {{reviewCount}}
- Common positive themes in reviews: {{positiveThemes}}
- Red flags / churn signals in reviews: {{churnSignals}}
- Last review date: {{lastReviewDate}}

Social media presence: {{socialPresence}}
Visible loyalty or retention program: {{hasLoyaltyProgram}}
Email capture on website: {{hasEmailCapture}}
Recent news or mentions: {{recentMentions}}

Pain score (1–10, based on churn signals detected): {{painScore}}

---

QUINX AI CONTEXT:
- We help restaurants automatically follow up with customers after
  every visit via WhatsApp, SMS, and email
- QR code on the table captures customer contact — no app download needed
- Automated sequences: post-visit follow-up (Day 3), reactivation
  (Day 30), review generation, birthday campaigns
- Setup takes 48 hours, runs completely on autopilot after
- Pricing starts at ₹3,999/month
- Website: tryquinx.com

---

WRITING RULES — FOLLOW EVERY ONE:

1. LENGTH: Subject line under 9 words. Email body between 90–130 words.
   Not a single word more. Count carefully.

2. OPENING LINE: Must reference something SPECIFIC about their business
   from the intelligence report. Not generic. Not "I came across your
   restaurant." Something real — a dish, a review theme, their vibe,
   their specialty. If nothing specific was found, reference their
   city + category in a way that shows you know their market.

3. THE PROBLEM: One sentence. Name the revenue leak (first-time
   customers not coming back) without jargon or buzzwords. Make it
   feel like an observation, not a sales claim.

4. THE SOLUTION: One to two sentences max. What Quinx AI does in plain
   English. No feature lists. No bullet points. Focus on the outcome:
   customers come back automatically.

5. THE CTA: Soft. Conversational. Ask one question or make one
   low-commitment offer. Rotate between these options:
   - "Worth a 10-minute call this week?"
   - "Want me to show you what this would look like for {{businessName}} specifically?"
   - "Happy to show you a quick demo — no commitment."
   Never use: "Click here", "Schedule a meeting", "Book a demo",
   "Limited time offer"

6. TONE: Founder-to-founder. Warm, direct, no fluff. Write like a
   smart person who genuinely noticed something about their business
   and wants to help — not a SaaS sales rep hitting quota. Zero
   corporate speak. Zero exclamation marks.

7. PERSONALISATION REQUIREMENT: The email must contain at least TWO
   specific details from the business intelligence report. Generic
   emails that could apply to any restaurant will be rejected.

8. SUBJECT LINE RULES:
   - Must create curiosity or name a specific pain
   - Do NOT describe the product
   - Do NOT use: retention, automation, SaaS, platform, solution
   - Do NOT ask a question in the subject line
   - Good examples:
     "your Google reviews are telling you something"
     "the customers who loved {{businessName}} and never came back"
     "something I noticed about {{businessName}}"
     "most {{city}} cafes miss this"
   - Bad examples:
     "Automate your restaurant marketing"
     "Increase your repeat customers with Quinx AI"
     "I have a solution for you"

9. SIGN-OFF: Sign as "Sahil | Quinx AI" with tryquinx.com on the
   next line. Nothing else after that.

10. FORMAT: Return ONLY a JSON object in this exact structure.
    No explanation. No preamble. No markdown fences.
    {
      "subject": "subject line here",
      "body": "full email body here"
    }

---

QUALITY EXAMPLES:

Example 1 — Cafe with strong reviews, no follow-up system:
{
  "subject": "the customers who loved Artisan Brew and never came back",
  "body": "Hi there,\n\nLooks like Artisan Brew Co. has built something genuinely good — your reviews mention the seasonal menu and the dog-friendly setup almost every time. That's hard to build.\n\nWhat most cafes with loyal regulars miss is the first-timers. Roughly 65% of people who visit once and enjoy it never return — not because they didn't like it, but because nothing pulled them back.\n\nWe built a system that fixes this automatically — a QR code captures their contact when they visit, and a WhatsApp follow-up goes out three days later. No work on your end after setup.\n\nWorth a 10-minute call this week?\n\nSahil | Quinx AI\ntryquinx.com"
}

Example 2 — Restaurant with churn signals in reviews:
{
  "subject": "something I noticed in The Spice Garden's reviews",
  "body": "Hi there,\n\nI was looking at The Spice Garden's Google listing — the food reviews are genuinely strong, but a few recent ones mention people saying they 'haven't been back in months' or 'keep meaning to return.' That pattern usually means one thing: no system pulling them back.\n\nMost independent restaurants in Pune lose around 60–70% of first-time customers permanently — not from bad food, just from no follow-up.\n\nWe automate that follow-up via WhatsApp. Customer visits, scans a QR, gets a message three days later. Runs itself completely.\n\nWant me to show you what this would look like for The Spice Garden specifically?\n\nSahil | Quinx AI\ntryquinx.com"
}

---

Now write the email for the business above.
Return only the JSON. Nothing else.

MASTER_PROMPT_END
```

**Notes:**
- Temperature 0.7 gives enough variation across leads without losing rule compliance
- If Claude returns markdown fences, strip them before JSON parse
- Pain score 7+ = leads most likely to respond; prioritise these in the send queue
- Update this file when you discover subject line patterns that get higher open rates

---

### 2. `tools/write_email.py`

Create this Python script:

**What it does:**
- Reads the master prompt template from `workflows/write_email.md`
  (extracts the block between `MASTER_PROMPT_START` and `MASTER_PROMPT_END`)
- Accepts a businessContext JSON as a CLI argument: `--context '{...}'`
- Substitutes all `{{variable}}` placeholders with values from the
  businessContext object. Any missing key becomes the string `"Unknown"`
- Calls the Anthropic Claude API (`claude-sonnet-4-5`)
  with the fully populated prompt
- Parses the response as JSON
- Returns the result as JSON to stdout: `{"subject": "...", "body": "..."}`

**Script requirements:**
- API key read from `.env` as `ANTHROPIC_API_KEY`
- `max_tokens: 500` — emails are short, this prevents runaway responses
- `temperature: 0.7`
- If the API response contains markdown fences (` ```json ``` `) strip
  them before parsing
- Word count validation built in — if body is outside 90–130 words,
  return an error JSON and exit 1:
  `{"error": "word_count", "actual": 145, "subject": null, "body": null}`
- Standalone testable:
  `python tools/write_email.py --context '{"businessName":"Test Cafe","city":"Mumbai","category":"Cafe",...}'`

**Error handling:**
- API failure → stderr + exit code 1
- JSON parse failure → stderr message + exit code 1
- Missing `ANTHROPIC_API_KEY` → stderr: `"Missing ANTHROPIC_API_KEY in .env"` + exit 1
- Missing required context fields → stderr: `"Missing required fields: businessName, city"` + exit 1

**Dependencies (all installable via pip):**
```
anthropic
python-dotenv
```
All other imports are stdlib only.

---

## businessContext JSON Schema

```json
{
  "businessName": "string — required",
  "ownerName": "string or null — use 'there' in email if null",
  "city": "string — required",
  "category": "string — required",
  "website": "string or null",
  "websiteSummary": "string — what the site says about them",
  "rating": "string — e.g. 4.2",
  "reviewCount": "string — e.g. 187",
  "positiveThemes": "string — common praise in reviews",
  "churnSignals": "string — red flags suggesting customers don't return",
  "lastReviewDate": "string — e.g. 2 weeks ago",
  "socialPresence": "string — platforms, follower count, last post",
  "hasLoyaltyProgram": "string — Yes / No / Unknown",
  "hasEmailCapture": "string — Yes / No / Unknown",
  "recentMentions": "string or null — news, awards, press",
  "painScore": "integer 1–10"
}
```

---

## Tone and Quality Rules (Enforce These in the Workflow Notes)

- Founder-to-founder. Warm. Direct. No fluff.
- Zero exclamation marks. Zero corporate speak.
- Subject line: creates curiosity or names a pain. Never describes
  the product. Never uses: retention, automation, SaaS, platform,
  solution, growth hacking.
- Body opens with ONE specific scraped detail about their business.
  Names the problem in one sentence. Explains the fix in 1–2 sentences.
  Ends with ONE soft CTA — never "book a demo" or "click here".
- Sign-off: `Sahil | Quinx AI` with `tryquinx.com` on the next line. Nothing else.

---

## Deliverable Checklist

When done, confirm each item before moving to the next pipeline stage:

- [ ] `workflows/write_email.md` exists with full SOP + embedded master prompt
- [ ] `tools/write_email.py` exists and is runnable standalone
- [ ] Running the tool with a sample businessContext JSON produces
      valid `{"subject": "...", "body": "..."}` output
- [ ] Word count validation works — test with a prompt designed to
      produce a too-long response and confirm the error JSON is returned
- [ ] Missing API key produces a clear error message to stderr
- [ ] The workflow edge cases section is complete with real handling logic
- [ ] Tested on at least 2 different businessContext inputs with different
      categories (e.g. one cafe, one cloud kitchen)

**Do not move on to the researcher or pipeline stages until this tool
produces clean output on both test inputs. Test first. Confirm. Then proceed.**
