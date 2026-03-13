# Quinx Outreach Control Panel — IDE Master Prompt

> Copy this prompt directly into Cursor, Windsurf, or your IDE of choice to generate the full GUI codebase.

---

## CONTEXT

You are building a full-stack desktop GUI application called **Quinx Outreach Control Panel** — a local web app (Python FastAPI backend + React frontend) that gives complete manual control over a cold email outreach pipeline with 4 stages: Lead Scraping, Email Writing, Email Sending, and Campaign Logs.

---

## TECH STACK

- **Backend**: Python (FastAPI + SQLite via SQLModel) — single `main.py` + `database.py`
- **Frontend**: React (Vite) with Tailwind CSS — dark, terminal-inspired aesthetic (think mission control / hacker dashboard)
- **Fonts**: Use `JetBrains Mono` for all UI — this is an ops tool, embrace it
- **State**: All campaign state persisted in SQLite (`quinx_campaigns.db`)
- **Run**: `npm run dev` (frontend on :5173) + `uvicorn main:app --reload` (backend on :8000)

---

## DESIGN AESTHETIC

Dark theme. `#0a0a0a` background. Monospace font throughout. Bright accent: `#00ff88` (terminal green). Status indicators use traffic light colors. Grid-based layout. Feels like a command center, not a SaaS app. Each page is a "module". Navigation is a left sidebar with module names + status dots.

---

## APPLICATION STRUCTURE — 4 PAGES (Modules)

---

### MODULE 1: Lead Scraper (`/scraper`)

**Purpose**: Configure and trigger `Email_Scrap` pipeline

**Fields & Controls**:

**1. Niche Selector** — Dropdown with options:
- Restaurants, Cafes, Coffee Shops, Bars & Pubs, Bakeries, Food Trucks
- Gyms & Fitness Centers, Yoga Studios, Pilates Studios, CrossFit Boxes
- Hotels & Boutique Hotels, Spas & Wellness Centers
- Dental Clinics, Medical Clinics, Physiotherapy Centers, Chiropractic Offices
- Real Estate Agencies, Law Firms, Accounting Firms, Marketing Agencies
- Auto Repair Shops, Car Dealerships
- Salons & Barbershops, Nail Studios
- Co-working Spaces, Event Venues
- Pet Grooming, Veterinary Clinics
- Custom (free text input)

**2. City Multi-Select** — Searchable multi-select with 80+ pre-loaded cities grouped by region:

*North America*: New York City, Los Angeles, Chicago, Houston, Miami, San Francisco, Seattle, Toronto, Vancouver, Montreal, Mexico City, Boston, Austin, Atlanta, Denver, Las Vegas, Phoenix, Dallas, Philadelphia, San Diego

*Europe*: London, Paris, Berlin, Amsterdam, Madrid, Barcelona, Rome, Milan, Vienna, Zurich, Stockholm, Copenhagen, Oslo, Helsinki, Prague, Warsaw, Lisbon, Dublin, Brussels, Munich, Hamburg, Lyon, Manchester, Edinburgh

*Asia Pacific*: Tokyo, Seoul, Singapore, Hong Kong, Sydney, Melbourne, Dubai, Mumbai, Delhi, Bangalore, Jakarta, Bangkok, Kuala Lumpur, Manila, Taipei, Shanghai, Beijing, Osaka

*Latin America*: São Paulo, Buenos Aires, Bogotá, Lima, Santiago, Caracas, Montevideo

*Middle East & Africa*: Cape Town, Lagos, Nairobi, Riyadh, Abu Dhabi, Doha

> Allow user to also add custom cities via text input.

**3. Lead Limit per City** — Number input (default: 60, max: 200)

**4. Output Folder** — Text input showing path (default: `./Email_Scrap/Leads/`)

**5. Run Scraper Button** — Triggers `google_maps_search.py` → `scrape_website_emails.py` → `build_leads_csv.py` for selected config. Shows real-time terminal output in a scrollable log box.

**6. Scrape Status Card** — Shows: cities queued, cities done, total leads found, emails extracted, owner names found

---

### MODULE 2: Email Writer (`/writer`)

**Purpose**: Control batch email generation via `Email_Writer`

**Controls**:

**1. Load Leads File** — File picker for `.xlsx` or `.csv` from `Email_Scrap/Leads/`

**2. Leads Preview Table** — Show first 10 rows with columns: `#`, `business_name`, `owner_name`, `email`, `city`, `status` (written / pending / skipped)

**3. Batch Range Selector** — Two number inputs: `From` and `To` (e.g., 1–40, then 41–100). Shows total leads in file so user knows the ceiling. Includes **"Next Batch"** button that auto-fills next unwritten range.

**4. Writer Config**:
- Temperature slider: 0.3–1.0 (default 0.7)
- Max tokens: 1024 / 2048 / 4096 (radio)
- Checkpoint every N leads: number input (default 10)
- Skip leads with < 2 personalization fields: toggle (default ON)

**5. Run Writer Button** — Runs `batch_write_emails.py` for the selected range. Shows live log stream.

**6. Writer Status Card** — Shows: batch range running, leads processed, leads skipped, emails written, retries triggered, current API key in use (KEY_1/2/3/4)

**7. Output Preview** — After completion, show a table of written emails with: `business_name`, `subject`, `body preview (first 80 chars)`, `status (PASS/FAIL)`

---

### MODULE 3: Email Sender (`/sender`)

**Purpose**: Control SMTP delivery via `Email_Sender`

**Controls**:

**1. Load Email File** — File picker for output `.xlsx` from `Email_Writer/emails/`

**2. Leads Preview Table** — Show all rows: `#`, `business_name`, `email`, `subject`, `body preview`, `send status` (sent / pending / failed)

**3. Send Range** — Two number inputs: From / To (how many to send this session). **"Send All Pending"** shortcut button.

**4. Sender Config**:
- Min delay between emails (seconds): number input (default 10)
- Max delay between emails (seconds): number input (default 15)
- From email: text input (default: `team@tryquinx.com`)
- Retry failed after delay: toggle + delay input (default ON, 4s)

**5. Send Button** — Runs `npm start` in Email_Sender dir for selected range. Shows real-time console output.

**6. Live Send Log** — Scrollable terminal box showing `[HH:MM:SS] ✓ sent to email@domain.com` or `✗ failed`. Running totals: Sent X / Failed Y / Remaining Z.

**7. Pause / Resume / Abort** buttons for the send session.

---

### MODULE 4: Campaign Log (`/logs`)

**Purpose**: Persistent SQLite database of all outreach activity

**Database Tables (SQLModel)**:

| Table | Fields |
|-------|--------|
| `campaigns` | id, name, niche, created_at, status |
| `leads` | id, campaign_id, business_name, owner_name, email, phone, website, city, category |
| `emails_written` | id, lead_id, subject, body, personalization_score, status, written_at |
| `emails_sent` | id, lead_id, sent_at, status (sent/failed), error_message |

**UI**:

**1. Campaign Selector** — Dropdown of all past campaigns

**2. Stats Dashboard** — Cards showing:
- Total leads scraped
- Emails written (pass / fail / skip breakdown)
- Emails sent (sent / failed)
- Open rate placeholder (manual entry field)
- Reply rate placeholder (manual entry field)

**3. Full Log Table** — Paginated table with all leads + their pipeline status across all 4 stages. Filterable by: city, niche, status, date range.

**4. Export Button** — Export current filtered view to `.xlsx`

**5. Timeline View** — Simple chronological list of all actions: "Scraped 43 leads in London", "Wrote emails 1–40", "Sent 25 emails", etc.

---

## BACKEND API ROUTES (FastAPI)

```
POST /api/scraper/run         — start scraper with config
GET  /api/scraper/status      — scraper progress

POST /api/writer/run          — start writer with batch range + config
GET  /api/writer/status       — writer progress

POST /api/sender/run          — start sender with range + config
POST /api/sender/pause
POST /api/sender/abort
GET  /api/sender/status

GET  /api/logs/campaigns      — list all campaigns
GET  /api/logs/campaign/{id}  — full stats for campaign
GET  /api/logs/leads          — paginated, filterable leads
POST /api/logs/export         — export to xlsx

WebSocket /ws/scraper         — real-time log stream
WebSocket /ws/writer          — real-time log stream
WebSocket /ws/sender          — real-time log stream
```

> All subprocess calls use `asyncio.create_subprocess_exec` and stream stdout to the WebSocket.

---

## FILE STRUCTURE TO GENERATE

```
quinx-gui/
├── backend/
│   ├── main.py           (FastAPI app + all routes)
│   ├── database.py       (SQLModel models + DB init)
│   ├── runner.py         (subprocess manager + WS streaming)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Scraper.jsx
│   │   │   ├── Writer.jsx
│   │   │   ├── Sender.jsx
│   │   │   └── Logs.jsx
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── TerminalLog.jsx
│   │   │   ├── StatusCard.jsx
│   │   │   └── DataTable.jsx
│   │   └── index.css     (Tailwind + JetBrains Mono import)
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## ADDITIONAL REQUIREMENTS

- **No auth needed** — local-only tool
- All file paths configurable, stored in `config.json` at project root
- `.env` values for `GOOGLE_MAPS_API_KEY`, `OPENROUTER_API_KEY_1–4`, `HOSTINGER_EMAIL`, `HOSTINGER_PASSWORD` loaded from existing `.env` files in each subdirectory — do not move or duplicate secrets
- All subprocess commands are configurable (in case script paths differ)
- Every action is logged to SQLite with timestamp
- The GUI does **NOT** replace the Python/JS scripts — it calls them as subprocesses and controls their input parameters
- Build the full working codebase, not stubs. Every component must be functional.

---

## BUILD ORDER

Begin with:
1. `backend/database.py` — all SQLModel models
2. `backend/main.py` — full FastAPI app
3. `backend/runner.py` — subprocess + WebSocket streaming
4. Then build all 4 frontend pages in order: Scraper → Writer → Sender → Logs

---

## DESIGN DIRECTIVE

Make it feel like a real ops tool. Dark. Monospace. Terminal-green accents (`#00ff88`). Every status should be visible at a glance. No rounded-corner SaaS cards. Sharp edges, dense information, purposeful layout.
