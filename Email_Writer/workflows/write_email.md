# Workflow: Write Personalized Cold Email

## Objective

Take a populated businessContext JSON for a single restaurant lead and
produce a personalized cold email subject and body using the Claude API.

---

## Inputs

- **businessContext JSON** — scraped data for one restaurant lead
- **Master prompt template** — embedded below in this file

---

## Steps

### 1. Validate Required Fields

Check that `businessContext` contains all three required fields:
- `businessName`
- `city`
- `category`

**If any are missing:** abort with error to stderr, do not proceed.

### 2. Validate Personalization Depth

At least **2** of the following fields must be non-empty and non-generic:
- `websiteSummary`
- `positiveThemes`
- `churnSignals`
- `recentMentions`
- `socialPresence`

"Non-generic" means the value is not just `"Unknown"`, `"N/A"`, `"None"`,
or an empty string.

**If fewer than 2 are usable:** log a warning and **skip this lead**.
Do not send a generic email under any circumstances.

### 3. Execute Email Writer Tool

Run:
```
python tools/write_email.py --context '{"businessName":"...","city":"...",...}'
```

The tool reads the master prompt from this file, substitutes placeholders,
calls the Claude API, and returns JSON to stdout.

### 4. Validate Output Structure

Confirm the output JSON has both `"subject"` and `"body"` keys.

### 5. Validate Word Count

Body must be between **90 and 130 words** (inclusive).
The tool enforces this internally, but double-check at the workflow level.

### 6. Validate Business Name Mention

`businessName` must appear at least once in the `body`.

### 7. Retry on Validation Failure

If any validation (steps 4–6) fails:
- Retry **once** with a stricter prompt injection telling Claude
  the specific rule that was violated:
  ```
  python tools/write_email.py --context '{...}' --retry-reason "Body was 145 words. Must be 90-130."
  ```

### 8. Handle Persistent Failure

If the second attempt also fails:
- Mark lead as `"email_write_failed"` in the CSV
- Log the failure reason
- Move to the next lead — never block the batch

### 9. Write Results to CSV

On success, update the leads CSV via:
```
python tools/csv_handler.py --action update --file leads.csv --business-name "Cafe Name" --subject "..." --body "..." --status "ready_to_send"
```

---

## Outputs

- `subject` — string, under 9 words
- `body` — string, 90–130 words, plain text, no HTML
- Updated CSV row with subject, body, and `status = "ready_to_send"`

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Claude API timeout | Retry once after 5 seconds, then fail gracefully |
| Rate limit (429) | Wait 60 seconds, retry once |
| Response not valid JSON | Attempt to extract JSON from response text; if still invalid, mark as failed |
| Markdown fences in response | Strip ` ```json ``` ` before parsing |
| No useful scraped data | Skip lead, log reason, do NOT write a generic email |
| Missing API key | Abort immediately with clear error to stderr |
| Word count out of range | Retry once with explicit count instruction |
| Business name missing from body | Retry once with explicit mention instruction |

---

## Notes

- **Temperature 0.7** gives enough variation without losing rule compliance
- **Pain score 7+** = leads most likely to respond; prioritise in send queue
- Daily volume: 20–25 emails
- Update this file when you discover subject line patterns with higher open rates
- Always test on one record before running a batch

---

## Master Prompt Template

The tool reads the block between `MASTER_PROMPT_START` and `MASTER_PROMPT_END`
at runtime and substitutes `{{variable}}` placeholders with real values.

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

CAMPAIGN CONTEXT:
{{campaignContext}}

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

9. SIGN-OFF: Use exactly this sign-off: {{signOff}}
   Nothing else after that.

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
  "body": "Hi there,\n\nLooks like Artisan Brew Co. has built something genuinely good — your reviews mention the seasonal menu and the dog-friendly setup almost every time. That's hard to build.\n\nWhat most cafes with loyal regulars miss is the first-timers. Roughly 65% of people who visit once and enjoy it never return — not because they didn't like it, but because nothing pulled them back.\n\nWe built a system that fixes this automatically — a QR code captures their contact when they visit, and a WhatsApp follow-up goes out three days later. No work on your end after setup.\n\nWorth a 10-minute call this week?\n\n{{signOff}}"
}

Example 2 — Restaurant with churn signals in reviews:
{
  "subject": "something I noticed in The Spice Garden's reviews",
  "body": "Hi there,\n\nI was looking at The Spice Garden's Google listing — the food reviews are genuinely strong, but a few recent ones mention people saying they 'haven't been back in months' or 'keep meaning to return.' That pattern usually means one thing: no system pulling them back.\n\nMost independent restaurants in Pune lose around 60–70% of first-time customers permanently — not from bad food, just from no follow-up.\n\nWe automate that follow-up via WhatsApp. Customer visits, scans a QR, gets a message three days later. Runs itself completely.\n\nWant me to show you what this would look like for The Spice Garden specifically?\n\n{{signOff}}"
}

---

Now write the email for the business above.
Return only the JSON. Nothing else.

MASTER_PROMPT_END
```
