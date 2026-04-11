# Quinx Outreach Control Panel — SaaS Master Prompt

> Copy this prompt directly into Cursor, Windsurf, or your IDE of choice to generate the full multi-tenant SaaS codebase.

---

## CONTEXT

You are building a full-stack, multi-tenant web application (SaaS) called **Quinx Outreach Control Panel**. This is a hosted platform (Python FastAPI backend + React frontend) that gives users complete manual control over a cold email outreach pipeline with 4 stages: Lead Scraping, Email Writing, Email Sending, and Campaign Logs. 

Crucially, **users do not download anything**. They sign up, log in, connect their own email accounts securely, and run campaigns from a centralized server. The system must natively handle multiple concurrent users, isolate their data, track API spend limits, and run heavy tasks in the background without blocking the web server.

---

## TECH STACK

- **Backend**: Python (FastAPI + SQLAlchemy/SQLModel)
- **Database**: PostgreSQL (All tables must have a `user_id` foreign key for data isolation)
- **Task Queue**: Celery + Redis (Heavy scraping/sending scripts run here, *not* as synchronous subprocesses)
- **Frontend**: React (Vite) with Tailwind CSS — dark, terminal-inspired aesthetic (think mission control / hacker dashboard)
- **Authentication**: JWT-based Auth (Signup / Login / Private Routes)
- **Fonts**: Use `JetBrains Mono` for all UI 
- **Run Locally**: `npm run dev` (frontend on :5173), `uvicorn main:app --reload` (backend), and `celery -A core.celery_app worker` (background workers).

---

## DESIGN AESTHETIC

Dark theme. `#0a0a0a` background. Monospace font throughout. Bright accent: `#00ff88` (terminal green). Status indicators use traffic light colors. Grid-based layout. Feels like a command center, not a standard SaaS app. Each page is a "module". Navigation is a left sidebar with module names + status dots + current User Balance.

---

## APPLICATION STRUCTURE

### MODULE 0: Authentication & Settings

**1. Auth Pages**: 
- `/signup`: Email, Password, Name
- `/login`: Email, Password

**2. Settings Modal (`/settings`)**:
- **Email Connections**:
  - **Connect Hostinger/IMAP**: A sleek modal where users securely input their SMTP/IMAP Server, Email, and App Password. Stored encrypted in the DB.
  - **Connect Gmail**: A button triggering Google OAuth 2.0 flowing back to FastAPI to store the Refresh Token.
- **Anthropic Spend Limit**: 
  - Admin (global) can set Anthropic API limits.
  - User can view their remaining generation quota/balance in this modal or on the sidebar (e.g., "$4.50 / $10.00 Spent").

---

### MODULE 1: Lead Scraper (`/scraper`)

**Purpose**: Configure and trigger background scraping tasks

**Fields & Controls**:
1. **Niche Selector** — Dropdown (Restaurants, Gyms, Dental Clinics, Custom text input, etc.)
2. **City Multi-Select** — Searchable multi-select of global cities.
3. **Lead Limit per City** — Number input (default: 60, max: 200)
4. **Run Scraper Button** — Triggers a Celery task that runs the scraping scripts.
5. **Real-time Scrape Status Box** — Connects via WebSocket or polling to the Celery task to stream live log output (simulating a terminal view) back to the user.

---

### MODULE 2: Email Writer (`/writer`)

**Purpose**: Control batch email generation utilizing the Anthropic API with spend tracking.

**Controls**:
1. **Load Leads** — Select a previously scraped campaign list from the database.
2. **Leads Preview Table** — Shows `#`, `business_name`, `email`, `city`, `status`
3. **Batch Range Selector** — Inputs: `From` and `To`.
4. **Writer Config**:
   - Temperature slider: 0.3–1.0 (default 0.7)
   - Max tokens radio buttons (1024, 2048)
   - Skip leads with < 2 personalization fields (toggle)
5. **Run Writer Button** — Calculates estimated token cost. If within user limit, dispatches the rewriting job to Celery. Validates outputs strictly (Subject < 9 words). Deducts actual cost from user balance upon completion.
6. **Live Writer Log** — Streams generation progress via WebSockets.

---

### MODULE 3: Email Sender (`/sender`)

**Purpose**: Deliver emails via the user's connected SMTP/OAuth account.

**Controls**:
1. **Load Emails** — Select a generated campaign list from the DB.
2. **Send Range** — Inputs: `From` and `To`.
3. **Sender Config**:
   - Sending Account: Dropdown to pick "Hostinger - team@tryquinx.com" or "Google OAuth - name@gmail.com" (pulled from user's Settings).
   - Min/Max delay between emails (seconds).
4. **Send Button** — Queues the email sending Celery task, mapping the user's chosen credentials securely to the SMTP payload.
5. **Live Send Log** — Terminal box showing `✓ sent to email@domain.com` or `✗ failed`. Running totals tallying sent/failed. Include pause/abort signals sent to Celery.

---

### MODULE 4: Campaign Log (`/logs`)

**Purpose**: Database view of all the user's outreach activity.

**Database Tables Structure (SQLAlchemy)**:
- `users`: id, email, hashed_password, balance, api_limit
- `email_accounts`: id, user_id, provider (smtp/gmail), credentials_json (encrypted)
- `campaigns`: id, user_id, name, niche, created_at, status
- `leads`: id, campaign_id, user_id, business_name, email, city...
- `emails_written`: id, lead_id, user_id, subject, body, status
- `emails_sent`: id, lead_id, user_id, sent_at, status

**UI**:
1. **Stats Dashboard** — Total scraped, written, sent for the given user.
2. **Full Log Table** — Paginated table with cross-joined statuses (Scraped? -> Written? -> Sent?). 
3. **Export Button** — Generates and downloads a `.xlsx` of the filtered table.

---

## BACKEND API ROUTES (FastAPI)

```text
POST /api/auth/register, /api/auth/login
GET  /api/users/me, /api/users/settings/email-accounts

POST /api/scraper/start-task   (Returns Job ID)
POST /api/writer/start-task    (Returns Job ID, checks limits)
POST /api/sender/start-task    (Returns Job ID, uses DB credentials)

GET  /api/tasks/{job_id}/status (or WebSocket /ws/tasks/{job_id})

GET  /api/campaigns, /api/campaigns/{id}/leads
```

## BUILD INSTRUCTIONS

Ensure every action in the database strictly enforces `WHERE user_id = current_user.id`. Build the backend layout supporting Celery task structures cleanly alongside the FastAPI router before tackling the React frontend modules one by one. Maintain the hacker-aesthetic CSS globally.
