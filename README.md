<p align="center">
  <img src="https://via.placeholder.com/1000x500/0A0A0B/00FF41?text=QUINX_AI+//+CORE_SYSTEM" alt="Quinx AI GUI Dashboard" width="800"/>
</p>

# QUINX_AI // B2B AUTONOMOUS OUTREACH ENGINE

<p align="center">
  <strong>End-to-end cold email pipeline architecture. From semantic extraction to encrypted delivery.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12+-00FF41?logo=python&logoColor=0A0A0B&style=for-the-badge" alt="Python"/>
  <img src="https://img.shields.io/badge/Node.js-18+-00FF41?logo=node.js&logoColor=0A0A0B&style=for-the-badge" alt="Node.js"/>
  <img src="https://img.shields.io/badge/React-19-00FF41?logo=react&logoColor=0A0A0B&style=for-the-badge" alt="React"/>
  <img src="https://img.shields.io/badge/FastAPI-0.110+-00FF41?logo=fastapi&logoColor=0A0A0B&style=for-the-badge" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Tailwind-V3_Noir-00FF41?logo=tailwindcss&logoColor=0A0A0B&style=for-the-badge" alt="Tailwind"/>
</p>

---

## ⬛ SYSTEM_OVERVIEW

**Quinx AI** is an industrial-scale, five-stage, autonomous outreach platform mapped to a local GUI dashboard. It is styled in an 'Obsidian & Matrix' Technical-Noir UI—designed for speed, stealth, and high-fidelity output.

```yaml
# Pipeline Operating States:
0. 🌐 FRONTEND   — Public-facing Landing Page (Terminal-styled B2B presentation)
1. ⚡ CAMPAIGN   — Define target semantic vectors (Niche, Tagline, Variables)
2. 🔍 SCRAPER    — Rapid Google API mapping & DOM extraction targeting decision-makers
3. ✍️ LLM_WRITER — Deep personalization via multi-model rotational LLMs (OpenRouter/Anthropic)
4. 🚀 DISPATCH   — Encrypted, Staggered SMTP transmission arrays
5. 📊 DATASTORE  — Global audit ledger utilizing SQLite and .xLsx output formats
```

All subsystems are monitored and controlled through the **Quinx Control Panel**, executing background asynchronous threads with live `STDOUT` log streaming directly to your interface.

---

## 🟩 REPLACED_DEPENDENCIES

Running Quinx completely replaces costly multi-layer SaaS stacks. Run it locally and inject your own API keys for wholesale payload distribution.

| Legacy Target | Execution Layer | Vector |
|---------------|-----------------|--------|
| Apollo.io ($99/mo) | `Email_Scrap` | Map scraping + strict domain mining. |
| ZoomInfo ($250/mo) | `enrich_lead.py`| Web scraping + DOM validation. |
| Copy.ai ($49/mo) | `batch_write_emails.py` | Strict LLM context boundary formatting. |
| Lemlist ($59/mo) | `Email_Sender` | Multi-relay dispatch & variable interpolation. |

---

## ⬛ ARCHITECTURE

```text
Quinx/
├── Email_Scrap/             # Stage 2: Entity mapping payload
├── Email_Writer/            # Stage 3: LLM generation core
├── Email_Sender/            # Stage 4: SMTP delivery mechanism
├── quinx-gui/               # 🖥️ Obsidian GUI Client
│   ├── backend/             # FastAPI / SQLite / Async Tasks
│   └── frontend/            # Vite / React / Tailwind `Obsidian_Matrix` Theme
│       └── src/
│           ├── pages/
│           │   ├── LandingPage.tsx   # [NEW] Tech-Noir Public Facing Homepage
│           │   ├── Auth.tsx          # Operator Authentication
│           │   ├── Campaign.tsx      # Semantic Variable Node
│           │   ├── Scraper.tsx       # Live Spiders
│           │   ├── Writer.tsx        # LLM Terminal
│           │   ├── Sender.tsx        # SMTP Dispatch Array
│           │   ├── Logs.tsx          # Data Ledger
│           │   └── Settings.tsx      # Config / Credentials
│           └── lib/api.ts
└── docs/                    # Architectural mappings
```

---

## 🟩 TECHNICAL_NOIR UI HIGHLIGHTS

The entire application runs on a meticulously designed **Obsidian & Gunmetal** theme, accented entirely by **Matrix Green (#00FF41)**. 

- **Landing Page**: Features a breathtaking "terminal-in-browser" hero section visualizing actual code (`run_pipeline.py`) simulating autonomous scraping, converting standard users instantly into the hacker narrative.
- **Bento Grids**: Utilizes high-contrast, sharp-cornered (`rounded-none`) glass blocks.
- **Scanlines & Noise**: Global CSS injects CRT monitor scanlines to solidify the command-line interface aesthetic.
- **STDOUT Emulation**: Every major asynchronous action broadcasts raw `stdout` strings directly to the frontend terminals.

---

## ⬛ DEPLOYMENT_ROUTINE

### 1/ Retrieve Repository
```bash
git clone https://github.com/YOUR_USERNAME/Quinx.git
cd Quinx
```

### 2/ Configure .ENV
```bash
# Injection Keys
cp Email_Scrap/.env.example Email_Scrap/.env
cp Email_Writer/.env.example Email_Writer/.env
```

### 3/ System Initialization
```bash
# API Server (Port 8001)
cd quinx-gui/backend
python -m venv venv
venv\Scripts\activate
pip install fastapi "uvicorn[standard]" sqlalchemy python-jose passlib bcrypt openpyxl
uvicorn main:app --port 8001 --reload

# Client Server (Port 5173)
cd ../frontend
npm install
npm run dev

# SMTP Relay (Internal)
cd ../../Email_Sender
npm install
```

> **Target Localhost:** Navigate to `http://localhost:5173` to access the Landing Interface. Authenticate as an Operator to access the Subsystem Dashboard.

---

<p align="center">
  <span style="color:#0A0A0B; background-color:#00FF41; padding: 2px 5px; font-weight:bold;">SYSTEM_STATUS: ONLINE</span>
</p>
