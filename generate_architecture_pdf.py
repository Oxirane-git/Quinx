#!/usr/bin/env python3
"""
Quinx AI — Architecture PDF Generator
Produces a multi-page PDF with:
  Page 1: Cover
  Page 2: Full pipeline overview flowchart
  Page 3: Email_Scrap deep-dive flowchart
  Page 4: Email_Writer deep-dive flowchart
  Page 5: Email_Sender deep-dive flowchart
  Page 6: Data dictionary & API key reference table
"""

import io
import os
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfgen import canvas as rl_canvas

# ---------------------------------------------------------------------------
# Colours
# ---------------------------------------------------------------------------
C_DARK    = "#0D1B2A"   # near-black navy
C_BLUE    = "#1A4B8C"   # primary blue
C_TEAL    = "#1A7A6E"   # Email_Scrap
C_PURPLE  = "#5B2D8E"   # Email_Writer
C_ORANGE  = "#C85A1E"   # Email_Sender
C_BRIDGE  = "#B8860B"   # bridge
C_LIGHT   = "#F4F6FB"   # bg
C_GRAY    = "#8A94A6"
C_WHITE   = "#FFFFFF"
C_GREEN   = "#2E7D32"
C_RED     = "#C62828"

OUT_PATH = Path(__file__).parent / "Quinx_AI_Architecture.pdf"

W, H = A4  # 595 x 842 pt


# ===========================================================================
# Matplotlib helpers
# ===========================================================================

def box(ax, x, y, w, h, label, sublabel=None, color=C_BLUE, text_color=C_WHITE,
        radius=0.3, fontsize=9, subfontsize=7.5):
    rect = FancyBboxPatch((x - w/2, y - h/2), w, h,
                          boxstyle=f"round,pad=0,rounding_size={radius}",
                          linewidth=1.2, edgecolor=C_WHITE,
                          facecolor=color, zorder=3)
    ax.add_patch(rect)
    if sublabel:
        ax.text(x, y + h*0.13, label, ha="center", va="center",
                fontsize=fontsize, color=text_color, fontweight="bold", zorder=4)
        ax.text(x, y - h*0.22, sublabel, ha="center", va="center",
                fontsize=subfontsize, color=text_color, alpha=0.88, zorder=4)
    else:
        ax.text(x, y, label, ha="center", va="center",
                fontsize=fontsize, color=text_color, fontweight="bold", zorder=4,
                wrap=True)


def diamond(ax, x, y, w, h, label, color=C_BRIDGE, text_color=C_WHITE, fontsize=8):
    xs = [x, x + w/2, x, x - w/2, x]
    ys = [y + h/2, y, y - h/2, y, y + h/2]
    ax.fill(xs, ys, color=color, zorder=3)
    ax.plot(xs, ys, color=C_WHITE, linewidth=1.2, zorder=4)
    ax.text(x, y, label, ha="center", va="center",
            fontsize=fontsize, color=text_color, fontweight="bold", zorder=5)


def arrow(ax, x1, y1, x2, y2, label=None, color=C_GRAY, lw=1.5):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="-|>", color=color,
                                lw=lw, mutation_scale=12),
                zorder=2)
    if label:
        mx, my = (x1+x2)/2, (y1+y2)/2
        ax.text(mx + 0.05, my, label, fontsize=6.5, color=color, va="center", zorder=5)


def section_label(ax, x, y, text, color):
    ax.text(x, y, text, fontsize=7, color=color, fontweight="bold",
            ha="center", va="center", alpha=0.7,
            bbox=dict(boxstyle="round,pad=0.25", facecolor=color, alpha=0.12,
                      edgecolor=color, linewidth=0.8))


def fig_to_bytes(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    buf.seek(0)
    return buf


# ===========================================================================
# Chart 1 — Full pipeline overview
# ===========================================================================

def chart_pipeline_overview():
    fig, ax = plt.subplots(figsize=(11, 15))
    fig.patch.set_facecolor(C_DARK)
    ax.set_facecolor(C_DARK)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 22)
    ax.axis("off")

    ax.text(5, 21.3, "Quinx AI — Full Pipeline Overview",
            ha="center", va="center", fontsize=14, color=C_WHITE, fontweight="bold")
    ax.text(5, 20.8, "run_pipeline.py  ·  End-to-end automation",
            ha="center", va="center", fontsize=9, color=C_GRAY)

    # ── Entry point ──
    box(ax, 5, 20.1, 4, 0.7, "python run_pipeline.py --niche cafes --cities ...",
        color="#1E3A5F", fontsize=8)
    arrow(ax, 5, 19.75, 5, 19.3)

    # ── Step 1: Email_Scrap ──────────────────────────────────────────────────
    ax.add_patch(FancyBboxPatch((0.4, 13.5), 9.2, 5.55,
                 boxstyle="round,pad=0.1", linewidth=1.5,
                 edgecolor=C_TEAL, facecolor=C_TEAL+"18", zorder=1))
    section_label(ax, 1.5, 18.9, "STEP 1 · EMAIL_SCRAP", C_TEAL)

    box(ax, 5, 18.5, 6, 0.75,
        "google_maps_search.py",
        "Google Maps Places API → raw_places_cafes_<city>.json",
        color=C_TEAL, fontsize=8.5, subfontsize=7)
    arrow(ax, 5, 18.12, 5, 17.55)

    box(ax, 5, 17.2, 6, 0.65,
        "scrape_website_emails.py",
        "BeautifulSoup · homepage + /contact + /about",
        color=C_TEAL, fontsize=8.5, subfontsize=7)
    arrow(ax, 5, 16.87, 5, 16.3)

    box(ax, 5, 15.95, 6, 0.65,
        "build_leads_csv.py",
        "Merge · deduplicate by place_id + email",
        color=C_TEAL, fontsize=8.5, subfontsize=7)
    arrow(ax, 5, 15.62, 5, 15.05)

    box(ax, 5, 14.7, 6.5, 0.65,
        "Output: Email_Scrap/Leads/leads_cafes_YYYYMMDD.csv",
        color="#0D3B30", text_color="#7FFFD4", fontsize=7.8)
    arrow(ax, 5, 14.37, 5, 13.8)

    # ── Step 2: Bridge ──────────────────────────────────────────────────────
    ax.add_patch(FancyBboxPatch((0.4, 11.2), 9.2, 2.35,
                 boxstyle="round,pad=0.1", linewidth=1.5,
                 edgecolor=C_BRIDGE, facecolor=C_BRIDGE+"15", zorder=1))
    section_label(ax, 1.5, 13.4, "STEP 2 · BRIDGE", C_BRIDGE)

    box(ax, 5, 13.1, 7, 0.65,
        "Column mapping + owner fallback + chunking",
        "Filters email-only rows · splits into leads_chunk_NNN.xlsx",
        color=C_BRIDGE, fontsize=8.5, subfontsize=7, text_color=C_DARK)
    arrow(ax, 5, 12.77, 5, 12.2)

    box(ax, 5, 11.9, 6.5, 0.55,
        "Output: Email_Writer/leads/leads_chunk_001.xlsx … _NNN.xlsx",
        color="#3B2E00", text_color="#FFD700", fontsize=7.5)
    arrow(ax, 5, 11.62, 5, 11.05)

    # ── Step 3: Email_Writer ─────────────────────────────────────────────────
    ax.add_patch(FancyBboxPatch((0.4, 5.5), 9.2, 5.3,
                 boxstyle="round,pad=0.1", linewidth=1.5,
                 edgecolor=C_PURPLE, facecolor=C_PURPLE+"18", zorder=1))
    section_label(ax, 1.5, 10.65, "STEP 3 · EMAIL_WRITER", C_PURPLE)

    box(ax, 5, 10.35, 6, 0.75,
        "enrich_lead.py  (per lead)",
        "Scrape website → AI summary via Gemini 2.5 Flash",
        color=C_PURPLE, fontsize=8.5, subfontsize=7)
    arrow(ax, 5, 9.97, 5, 9.4)

    box(ax, 5, 9.05, 6, 0.75,
        "write_email.py  (per lead)",
        "Master prompt template → personalized subject + body",
        color=C_PURPLE, fontsize=8.5, subfontsize=7)
    arrow(ax, 5, 8.67, 5, 8.1)

    box(ax, 5, 7.75, 6, 0.75,
        "batch_write_emails.py",
        "Orchestrate · validate · retry · checkpoint every 10",
        color=C_PURPLE, fontsize=8.5, subfontsize=7)
    arrow(ax, 5, 7.37, 5, 6.8)

    box(ax, 5, 6.5, 6.5, 0.55,
        "Output: Email_Writer/emails/email_output_10chunks.xlsx",
        color="#2D0A4E", text_color="#DA8FFF", fontsize=7.5)
    arrow(ax, 5, 6.22, 5, 5.75)

    # ── Step 4: Human Review ────────────────────────────────────────────────
    diamond(ax, 5, 5.25, 5, 0.85, "Human Review\n(open Excel, verify emails)",
            color="#1B3A4B", text_color="#80D8FF", fontsize=8)
    arrow(ax, 5, 4.82, 5, 4.3, color=C_ORANGE)

    # ── Step 4: Email_Sender ────────────────────────────────────────────────
    ax.add_patch(FancyBboxPatch((0.4, 1.2), 9.2, 2.85,
                 boxstyle="round,pad=0.1", linewidth=1.5,
                 edgecolor=C_ORANGE, facecolor=C_ORANGE+"18", zorder=1))
    section_label(ax, 1.5, 3.9, "STEP 4 · EMAIL_SENDER  (manual: npm start)", C_ORANGE)

    box(ax, 5, 3.6, 6, 0.75,
        "leads.js + hostinger.js + mailer.js",
        "Hostinger SMTP · ssl:465 · 10–15s random delay per email",
        color=C_ORANGE, fontsize=8.5, subfontsize=7)
    arrow(ax, 5, 3.22, 5, 2.65)

    box(ax, 5, 2.35, 6, 0.55,
        "Emails delivered  ·  sent/failed logged to console",
        color="#3B1400", text_color="#FFAB76", fontsize=7.8)

    # Legend
    legend_items = [
        (C_TEAL,   "Email_Scrap  (lead scraping)"),
        (C_BRIDGE, "Bridge  (data transform)"),
        (C_PURPLE, "Email_Writer  (AI emails)"),
        (C_ORANGE, "Email_Sender  (SMTP delivery)"),
    ]
    for i, (col, lbl) in enumerate(legend_items):
        lx = 0.55 + i * 2.38
        ax.add_patch(FancyBboxPatch((lx, 0.55), 0.22, 0.22,
                     boxstyle="round,pad=0.02", facecolor=col,
                     edgecolor="none", zorder=5))
        ax.text(lx + 0.28, 0.66, lbl, fontsize=6.5, color=C_GRAY, va="center")

    return fig_to_bytes(fig)


# ===========================================================================
# Chart 2 — Email_Scrap deep-dive
# ===========================================================================

def chart_email_scrap():
    fig, ax = plt.subplots(figsize=(10, 13))
    fig.patch.set_facecolor(C_DARK)
    ax.set_facecolor(C_DARK)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 16)
    ax.axis("off")

    ax.text(5, 15.4, "Email_Scrap — Lead Generation Pipeline",
            ha="center", fontsize=13, color=C_WHITE, fontweight="bold")
    ax.text(5, 14.95, "Google Maps → Website Scraping → Deduplicated CSV",
            ha="center", fontsize=8.5, color=C_GRAY)

    # For each city loop
    box(ax, 5, 14.3, 6, 0.65, "For each city in --cities list",
        color="#1A3A4A", text_color="#80CFFF", fontsize=9)
    arrow(ax, 5, 13.97, 5, 13.45)

    # Already done?
    diamond(ax, 5, 13.1, 4.5, 0.75,
            "enriched file exists\n& size > 10 bytes?",
            color="#1B3A2A", text_color="#80FFB0", fontsize=8)
    ax.text(7.65, 13.1, "YES → skip city", fontsize=7.5, color=C_GREEN, va="center")
    arrow(ax, 5, 12.72, 5, 12.15, color=C_GRAY)
    ax.text(5.1, 12.4, "NO", fontsize=7.5, color=C_RED, va="center")

    # Maps search
    box(ax, 5, 11.8, 6.5, 0.65,
        "google_maps_search.py",
        "--niche cafes  --city \"London UK\"",
        color=C_TEAL, subfontsize=7.5)
    arrow(ax, 5, 11.47, 5, 10.9)

    box(ax, 5, 10.6, 7, 0.55,
        "Places API New · up to 3 pages × 20 = 60 places/city",
        color="#0D3B30", text_color="#7FFFD4", fontsize=7.5)
    arrow(ax, 5, 10.32, 5, 9.75)

    box(ax, 5, 9.45, 6.5, 0.55,
        "Output: .tmp/raw_places_cafes_london-uk.json",
        color="#0D3B30", text_color="#7FFFD4", fontsize=7.5)
    arrow(ax, 5, 9.17, 5, 8.6)

    # Scraping
    box(ax, 5, 8.3, 6.5, 0.65,
        "scrape_website_emails.py",
        "--input .tmp/raw_places_cafes_london-uk.json",
        color=C_TEAL, subfontsize=7.5)
    arrow(ax, 5, 7.97, 5, 7.4)

    # Scraping sub-steps
    ax.add_patch(FancyBboxPatch((1.2, 6.6), 7.6, 0.62,
                 boxstyle="round,pad=0.06", facecolor="#0D3B30",
                 edgecolor=C_TEAL, linewidth=0.8, zorder=2))
    ax.text(5, 6.91, "Homepage + /contact + /contact-us + /about + /about-us",
            ha="center", va="center", fontsize=7.5, color="#7FFFD4")
    arrow(ax, 5, 6.6, 5, 6.05)

    ax.add_patch(FancyBboxPatch((1.2, 5.3), 7.6, 0.62,
                 boxstyle="round,pad=0.06", facecolor="#0D3B30",
                 edgecolor=C_TEAL, linewidth=0.8, zorder=2))
    ax.text(5, 5.61, "Regex email extraction  ·  Schema.org owner name  ·  1.2s delay/record",
            ha="center", va="center", fontsize=7.5, color="#7FFFD4")
    arrow(ax, 5, 5.3, 5, 4.75)

    box(ax, 5, 4.45, 6.5, 0.55,
        "Output: .tmp/enriched_cafes_london-uk.json",
        color="#0D3B30", text_color="#7FFFD4", fontsize=7.5)
    arrow(ax, 5, 4.17, 5, 3.6)

    # build_leads_csv
    box(ax, 5, 3.3, 6.5, 0.65,
        "build_leads_csv.py  (after all cities done)",
        "Merge all enriched_*.json · dedup by place_id + email",
        color=C_TEAL, subfontsize=7.5)
    arrow(ax, 5, 2.97, 5, 2.4)

    box(ax, 5, 2.1, 7.5, 0.65,
        "Leads/leads_cafes_YYYYMMDD_HHMMSS.csv",
        "~900–950 unique leads · business_name, owner_name, email, phone, website, category, city",
        color="#0D3B30", text_color="#7FFFD4", fontsize=8, subfontsize=6.8)

    # Hit rate callout
    ax.text(5, 1.35, "Expected hit rate: ~40–60% with email  ·  ~20–30% with owner name",
            ha="center", fontsize=7.5, color=C_GRAY,
            style="italic")

    return fig_to_bytes(fig)


# ===========================================================================
# Chart 3 — Email_Writer deep-dive
# ===========================================================================

def chart_email_writer():
    fig, ax = plt.subplots(figsize=(10, 14))
    fig.patch.set_facecolor(C_DARK)
    ax.set_facecolor(C_DARK)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 17)
    ax.axis("off")

    ax.text(5, 16.4, "Email_Writer — AI Email Generation Pipeline",
            ha="center", fontsize=13, color=C_WHITE, fontweight="bold")
    ax.text(5, 15.95, "Website Enrichment + Gemini 2.5 Flash + Quality Validation",
            ha="center", fontsize=8.5, color=C_GRAY)

    box(ax, 5, 15.3, 6, 0.65,
        "batch_write_emails.py  starts",
        "Reads all Email_Writer/leads/leads_chunk_*.xlsx",
        color="#2D0A4E", subfontsize=7.5)
    arrow(ax, 5, 14.97, 5, 14.4)

    # For each lead
    box(ax, 5, 14.1, 5, 0.6,
        "For each lead in chunks",
        color="#1B1B3A", text_color="#80B0FF", fontsize=8.5)
    arrow(ax, 5, 13.8, 5, 13.25)

    # Enrich
    box(ax, 5, 12.95, 6.5, 0.65,
        "enrich_lead.py",
        "Scrape website (homepage + /about) · max 6000 chars",
        color=C_PURPLE, subfontsize=7.5)
    arrow(ax, 5, 12.62, 5, 12.05)

    ax.add_patch(FancyBboxPatch((1.0, 11.25), 8.0, 0.65,
                 boxstyle="round,pad=0.06", facecolor="#1A0033",
                 edgecolor=C_PURPLE, linewidth=0.8, zorder=2))
    ax.text(5, 11.575, "Gemini 2.5 Flash  ·  temp 0.3  →  websiteSummary · positiveThemes · churnSignals · painScore",
            ha="center", va="center", fontsize=7, color="#DA8FFF")
    arrow(ax, 5, 11.25, 5, 10.7)

    # Has ≥2 fields?
    diamond(ax, 5, 10.35, 5, 0.72,
            "≥ 2 usable personalization\nfields available?",
            color="#1A0033", text_color="#DA8FFF", fontsize=7.5)
    ax.text(7.9, 10.35, "NO → skip lead", fontsize=7.5, color=C_RED, va="center")
    arrow(ax, 5, 9.99, 5, 9.4, color=C_GRAY)
    ax.text(5.1, 9.65, "YES", fontsize=7.5, color=C_GREEN, va="center")

    # Write email
    box(ax, 5, 9.1, 6.5, 0.65,
        "write_email.py",
        "workflows/write_email.md prompt · temp 0.7 · max 2048 tokens",
        color=C_PURPLE, subfontsize=7.5)
    arrow(ax, 5, 8.77, 5, 8.2)

    ax.add_patch(FancyBboxPatch((1.0, 7.4), 8.0, 0.65,
                 boxstyle="round,pad=0.06", facecolor="#1A0033",
                 edgecolor=C_PURPLE, linewidth=0.8, zorder=2))
    ax.text(5, 7.725, "Output: { \"subject\": \"< 9 words\",  \"body\": \"90–130 words, plain text\" }",
            ha="center", va="center", fontsize=7.5, color="#DA8FFF")
    arrow(ax, 5, 7.4, 5, 6.85)

    # Validate
    diamond(ax, 5, 6.5, 5.5, 0.72,
            "Valid?  (subject < 9w · body 90–130w\nbiz name in body)",
            color="#1B1B3A", text_color="#80B0FF", fontsize=7.5)
    arrow(ax, 5, 6.14, 5, 5.55, color=C_GRAY)
    ax.text(5.1, 5.8, "PASS", fontsize=7.5, color=C_GREEN, va="center")

    # Retry path
    ax.text(8.2, 6.5, "FAIL →\nretry once\nwith correction\nprompt", fontsize=6.8,
            color=C_RED, va="center", ha="center",
            bbox=dict(boxstyle="round,pad=0.3", facecolor="#3B0000", edgecolor=C_RED, lw=0.8))

    # Save
    box(ax, 5, 5.2, 6.5, 0.65,
        "Save result",
        "Append to output Excel · checkpoint every 10 leads",
        color=C_PURPLE, subfontsize=7.5)
    arrow(ax, 5, 4.87, 5, 4.3)

    # Key rotation callout
    ax.add_patch(FancyBboxPatch((0.5, 3.5), 9.0, 0.65,
                 boxstyle="round,pad=0.08", facecolor="#1A0033",
                 edgecolor="#888", linewidth=0.8, zorder=2))
    ax.text(5, 3.825, "API key rotation: OPENROUTER_API_KEY_1 → _2 → _3 → _4  on 429/402. Stop if all exhausted.",
            ha="center", va="center", fontsize=7, color=C_GRAY)
    arrow(ax, 5, 3.5, 5, 2.95)

    box(ax, 5, 2.65, 7.5, 0.65,
        "emails/email_output_10chunks.xlsx",
        "business_name · email · phone · website · city · subject · body · status",
        color="#2D0A4E", text_color="#DA8FFF", fontsize=8, subfontsize=6.8)

    # Quality rules
    rules = [
        "Subject < 9 words",
        "Body 90–130 words",
        "Biz name in body",
        "≥ 2 personalization fields",
        "No banned words",
        'Sign-off: "Sahil | Quinx AI"',
    ]
    ax.text(5, 1.75, "Quality Rules (non-negotiable):",
            ha="center", fontsize=7.5, color=C_GRAY, fontweight="bold")
    cols = 3
    for i, rule in enumerate(rules):
        rx = 1.5 + (i % cols) * 2.5
        ry = 1.35 - (i // cols) * 0.38
        ax.text(rx, ry, f"✓  {rule}", fontsize=6.8, color="#80D8FF", va="center")

    return fig_to_bytes(fig)


# ===========================================================================
# Chart 4 — Email_Sender deep-dive
# ===========================================================================

def chart_email_sender():
    fig, ax = plt.subplots(figsize=(9, 11))
    fig.patch.set_facecolor(C_DARK)
    ax.set_facecolor(C_DARK)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 14)
    ax.axis("off")

    ax.text(5, 13.4, "Email_Sender — SMTP Delivery Pipeline",
            ha="center", fontsize=13, color=C_WHITE, fontweight="bold")
    ax.text(5, 12.95, "Node.js  ·  Hostinger SMTP  ·  Realistic send delays",
            ha="center", fontsize=8.5, color=C_GRAY)

    box(ax, 5, 12.3, 5.5, 0.7,
        "npm start  (src/index.js)",
        "Load .env · get LEADS_FILE path",
        color="#3B1400", text_color="#FFAB76", subfontsize=7.5)
    arrow(ax, 5, 11.95, 5, 11.4)

    box(ax, 5, 11.1, 6, 0.65,
        "leads.js  —  loadLeads(filePath)",
        "Read .xlsx or .csv  ·  validate email, subject, body",
        color=C_ORANGE, subfontsize=7.5)
    arrow(ax, 5, 10.77, 5, 10.2)

    diamond(ax, 5, 9.85, 4.5, 0.72,
            "Row valid?\n(email has @, subject & body non-empty)",
            color="#3B1400", text_color="#FFAB76", fontsize=7.5)
    ax.text(7.9, 9.85, "SKIP + log", fontsize=7.5, color=C_GRAY, va="center")
    arrow(ax, 5, 9.49, 5, 8.9, color=C_ORANGE)
    ax.text(5.1, 9.15, "VALID", fontsize=7.5, color=C_GREEN, va="center")

    box(ax, 5, 8.6, 6, 0.65,
        "hostinger.js  —  createTransport()",
        "smtp.hostinger.com · port 465 · SSL · verify connection",
        color=C_ORANGE, subfontsize=7.5)
    arrow(ax, 5, 8.27, 5, 7.7)

    box(ax, 5, 7.4, 5.5, 0.65,
        "For each validated lead",
        color="#1A1A2E", text_color="#FFAB76", fontsize=8.5)
    arrow(ax, 5, 7.07, 5, 6.5)

    box(ax, 5, 6.2, 6, 0.65,
        "hostinger.js  —  sendEmail(transporter, from, lead)",
        "Plain-text email · From: team@tryquinx.com",
        color=C_ORANGE, subfontsize=7.5)
    arrow(ax, 5, 5.87, 5, 5.3)

    diamond(ax, 5, 4.95, 4.5, 0.72,
            "Send success?",
            color="#3B1400", text_color="#FFAB76", fontsize=8)
    # success path
    arrow(ax, 5, 4.59, 5, 4.02, color=C_GREEN)
    ax.text(5.1, 4.28, "YES", fontsize=7.5, color=C_GREEN, va="center")
    # fail path
    ax.text(7.9, 4.95, "NO → log fail\n2–4s retry delay", fontsize=7.5,
            color=C_RED, va="center", ha="center",
            bbox=dict(boxstyle="round,pad=0.3", facecolor="#3B0000", edgecolor=C_RED, lw=0.8))

    box(ax, 5, 3.7, 6, 0.65,
        "mailer.js  —  randomDelay(10000, 15000)",
        "Wait 10–15 seconds before next email",
        color=C_ORANGE, subfontsize=7.5)
    arrow(ax, 5, 3.37, 5, 2.8)

    box(ax, 5, 2.5, 6, 0.65,
        "Log: [HH:MM:SS] ✓ sent to email@domain.com",
        "Running totals: sent X / failed Y",
        color="#3B1400", text_color="#FFAB76", fontsize=8, subfontsize=7.5)
    arrow(ax, 5, 2.17, 5, 1.6)

    box(ax, 5, 1.3, 5, 0.6,
        "All leads processed  ·  Final summary printed",
        color="#1A0800", text_color="#FFD0A0", fontsize=8)

    # Config callout
    ax.add_patch(FancyBboxPatch((0.3, 0.2), 9.4, 0.72,
                 boxstyle="round,pad=0.08", facecolor="#1A1000",
                 edgecolor="#888", linewidth=0.8, zorder=2))
    ax.text(5, 0.56, ".env:  HOSTINGER_EMAIL · HOSTINGER_PASSWORD · LEADS_FILE  (path to email_output_*.xlsx)",
            ha="center", va="center", fontsize=7, color=C_GRAY)

    return fig_to_bytes(fig)


# ===========================================================================
# Build PDF
# ===========================================================================

def build_pdf():
    doc = SimpleDocTemplate(
        str(OUT_PATH),
        pagesize=A4,
        leftMargin=1.8*cm, rightMargin=1.8*cm,
        topMargin=1.5*cm, bottomMargin=1.5*cm,
        title="Quinx AI — Automation Architecture",
        author="Quinx AI",
    )

    styles = getSampleStyleSheet()

    heading1 = ParagraphStyle("H1", parent=styles["Heading1"],
        fontSize=22, textColor=colors.HexColor(C_BLUE),
        spaceAfter=6, spaceBefore=0, alignment=TA_CENTER)
    heading2 = ParagraphStyle("H2", parent=styles["Heading2"],
        fontSize=13, textColor=colors.HexColor(C_BLUE),
        spaceAfter=4, spaceBefore=10)
    body = ParagraphStyle("Body", parent=styles["Normal"],
        fontSize=9, textColor=colors.HexColor("#222222"),
        spaceAfter=4, leading=14)
    mono = ParagraphStyle("Mono", parent=styles["Code"],
        fontSize=8, textColor=colors.HexColor(C_DARK),
        backColor=colors.HexColor("#EEF2F8"),
        spaceAfter=4, leftIndent=8, rightIndent=8,
        borderPad=4, borderRadius=3)
    caption = ParagraphStyle("Caption", parent=styles["Normal"],
        fontSize=8, textColor=colors.HexColor(C_GRAY),
        alignment=TA_CENTER, spaceAfter=8)

    story = []

    # ── Cover ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 3*cm))
    story.append(Paragraph("Quinx AI", heading1))
    story.append(Paragraph("Automation Architecture", ParagraphStyle("H1b",
        parent=heading1, fontSize=16, textColor=colors.HexColor(C_GRAY),
        spaceAfter=2)))
    story.append(Spacer(1, 0.4*cm))
    story.append(HRFlowable(width="80%", thickness=1.5,
                             color=colors.HexColor(C_BLUE), spaceAfter=20))
    story.append(Spacer(1, 0.5*cm))

    cover_lines = [
        ("System", "End-to-end cold outreach pipeline"),
        ("Components", "Email_Scrap · Email_Writer · Email_Sender"),
        ("Entry point", "python run_pipeline.py --niche &lt;type&gt; --cities &lt;list&gt;"),
        ("AI Model", "Gemini 2.5 Flash via OpenRouter"),
        ("SMTP", "Hostinger  ·  smtp.hostinger.com:465"),
        ("Output", "Personalized cold emails delivered to leads"),
    ]
    tdata = [[Paragraph(f"<b>{k}</b>", body), Paragraph(v, body)] for k, v in cover_lines]
    t = Table(tdata, colWidths=[4.5*cm, 10*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#EEF2F8")),
        ("TEXTCOLOR",  (0,0), (0,-1), colors.HexColor(C_BLUE)),
        ("ROWBACKGROUNDS", (0,0), (-1,-1),
         [colors.HexColor("#F8FAFF"), colors.HexColor("#FFFFFF")]),
        ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#CCCCCC")),
        ("TOPPADDING",  (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph(
        "This document describes the full automation system that scrapes leads, "
        "generates personalized cold emails using AI, and delivers them via SMTP — "
        "triggered by a single command.",
        ParagraphStyle("CoverBody", parent=body, fontSize=10,
                       textColor=colors.HexColor("#444"), alignment=TA_CENTER)))

    story.append(PageBreak())

    # ── Page 2: Full overview flowchart ──────────────────────────────────────
    story.append(Paragraph("Full Pipeline Overview", heading2))
    story.append(HRFlowable(width="100%", thickness=0.5,
                             color=colors.HexColor("#CCCCCC"), spaceAfter=8))
    buf = chart_pipeline_overview()
    img = Image(buf, width=16*cm, height=21.8*cm)
    story.append(img)
    story.append(PageBreak())

    # ── Page 3: Email_Scrap ───────────────────────────────────────────────────
    story.append(Paragraph("Step 1 · Email_Scrap — Lead Generation", heading2))
    story.append(HRFlowable(width="100%", thickness=0.5,
                             color=colors.HexColor("#CCCCCC"), spaceAfter=8))
    buf = chart_email_scrap()
    img = Image(buf, width=15.5*cm, height=20.2*cm)
    story.append(img)
    story.append(PageBreak())

    # ── Page 4: Email_Writer ──────────────────────────────────────────────────
    story.append(Paragraph("Step 3 · Email_Writer — AI Email Generation", heading2))
    story.append(HRFlowable(width="100%", thickness=0.5,
                             color=colors.HexColor("#CCCCCC"), spaceAfter=8))
    buf = chart_email_writer()
    img = Image(buf, width=15.5*cm, height=21.7*cm)
    story.append(img)
    story.append(PageBreak())

    # ── Page 5: Email_Sender ──────────────────────────────────────────────────
    story.append(Paragraph("Step 4 · Email_Sender — SMTP Delivery", heading2))
    story.append(HRFlowable(width="100%", thickness=0.5,
                             color=colors.HexColor("#CCCCCC"), spaceAfter=8))
    buf = chart_email_sender()
    img = Image(buf, width=14*cm, height=17.1*cm)
    story.append(img)
    story.append(PageBreak())

    # ── Page 6: Data dictionary + API reference ───────────────────────────────
    story.append(Paragraph("Data Dictionary", heading2))
    story.append(HRFlowable(width="100%", thickness=0.5,
                             color=colors.HexColor("#CCCCCC"), spaceAfter=8))

    stage_data = [
        ["Stage", "Fields"],
        ["Raw\n(Maps API)", "place_id · business_name · address · phone · website · types · city"],
        ["Enriched\n(Scraper)", "+ email · owner_name"],
        ["Leads CSV\n(Email_Scrap)", "business_name · owner_name · email · phone · website · category · city · source"],
        ["Chunk XLSX\n(Bridge)", "business_name · owner_name* · email · phone · website · city · category · niche\n* fallback: \"<Name>'s Team\" if blank"],
        ["Writer Output\n(Email_Writer)", "+ websiteSummary · positiveThemes · churnSignals · painScore · subject · body · status"],
        ["Sender Input\n(Email_Sender)", "email · subject · body  (only these 3 are consumed)"],
    ]
    ts = Table(stage_data, colWidths=[3.5*cm, 12.5*cm])
    ts.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,0), colors.HexColor(C_BLUE)),
        ("TEXTCOLOR",    (0,0), (-1,0), colors.white),
        ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",     (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1),
         [colors.HexColor("#F0F4FF"), colors.HexColor("#FFFFFF")]),
        ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#CCCCCC")),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",   (0,0), (-1,-1), 6),
        ("BOTTOMPADDING",(0,0), (-1,-1), 6),
        ("LEFTPADDING",  (0,0), (-1,-1), 8),
    ]))
    story.append(ts)
    story.append(Spacer(1, 0.6*cm))

    story.append(Paragraph("API Keys Reference", heading2))
    story.append(HRFlowable(width="100%", thickness=0.5,
                             color=colors.HexColor("#CCCCCC"), spaceAfter=8))

    key_data = [
        ["Service", "Environment Variable", "Location", "Used by"],
        ["Google Maps\nPlaces API", "GOOGLE_MAPS_API_KEY", "Email_Scrap/.env", "google_maps_search.py"],
        ["OpenRouter\n(Gemini 2.5 Flash)", "OPENROUTER_API_KEY_1\n… _4 (auto-rotate)", "Email_Writer/.env", "enrich_lead.py\nwrite_email.py"],
        ["Hostinger\nSMTP", "HOSTINGER_EMAIL\nHOSTINGER_PASSWORD", "Email_Sender/.env", "hostinger.js"],
    ]
    tk = Table(key_data, colWidths=[3.5*cm, 4.5*cm, 4*cm, 4*cm])
    tk.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,0), colors.HexColor(C_BLUE)),
        ("TEXTCOLOR",    (0,0), (-1,0), colors.white),
        ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",     (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1),
         [colors.HexColor("#F0F4FF"), colors.HexColor("#FFFFFF")]),
        ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#CCCCCC")),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",   (0,0), (-1,-1), 6),
        ("BOTTOMPADDING",(0,0), (-1,-1), 6),
        ("LEFTPADDING",  (0,0), (-1,-1), 8),
    ]))
    story.append(tk)
    story.append(Spacer(1, 0.6*cm))

    story.append(Paragraph("Quick Start", heading2))
    story.append(HRFlowable(width="100%", thickness=0.5,
                             color=colors.HexColor("#CCCCCC"), spaceAfter=8))
    cmds = [
        ("Test run (1 city, fast)",
         "python run_pipeline.py --niche \"cafes\" --cities \"London UK\""),
        ("Production (25 cities)",
         "python run_pipeline.py --niche \"cafes\""),
        ("Custom niche + cities",
         "python run_pipeline.py --niche \"restaurants\" --cities \"New York City USA\" \"Tokyo Japan\""),
        ("After reviewing output Excel",
         "cd Email_Sender &amp;&amp; npm start"),
    ]
    for label, cmd in cmds:
        story.append(Paragraph(f"<b>{label}</b>", body))
        story.append(Paragraph(cmd, mono))
        story.append(Spacer(1, 0.15*cm))

    doc.build(story)
    print(f"\nPDF saved to: {OUT_PATH}")


if __name__ == "__main__":
    build_pdf()
