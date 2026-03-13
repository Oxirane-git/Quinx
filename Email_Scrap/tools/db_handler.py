"""
Email_Scrap/tools/db_handler.py

Standalone SQLite access layer for the Quinx lead pipeline.
Database location: Quinx/leads.db  (project root, two levels above this file)

Public API:
    init_db()                                          -> None
    insert_leads(leads: list[dict])                    -> dict {inserted, skipped}
    get_existing_emails()                              -> set[str]
    update_lead_status(email, status, ts_field, ts)    -> bool
    get_leads_by_filter(niche, city, country, status, limit) -> list[dict]
"""

import os
import sqlite3
from datetime import datetime, timezone
from typing import Optional

# Resolve DB path: Email_Scrap/tools/ -> Email_Scrap/ -> Quinx/
_TOOLS_DIR    = os.path.dirname(os.path.abspath(__file__))
_SCRAP_DIR    = os.path.dirname(_TOOLS_DIR)
_PROJECT_ROOT = os.path.dirname(_SCRAP_DIR)
DB_PATH = os.path.join(_PROJECT_ROOT, "leads.db")

_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS leads (
    id              INTEGER  PRIMARY KEY AUTOINCREMENT,
    business_name   TEXT     NOT NULL,
    email           TEXT     NOT NULL UNIQUE,
    phone           TEXT     DEFAULT '',
    website         TEXT     DEFAULT '',
    owner_name      TEXT     DEFAULT '',
    city            TEXT     NOT NULL DEFAULT '',
    country         TEXT     NOT NULL DEFAULT '',
    address         TEXT     DEFAULT '',
    category        TEXT     DEFAULT '',
    niche           TEXT     NOT NULL DEFAULT '',
    place_id        TEXT     DEFAULT NULL UNIQUE,
    status          TEXT     NOT NULL DEFAULT 'new'
                    CHECK(status IN ('new', 'email_written', 'sent', 'bounced')),
    scraped_at          TEXT DEFAULT NULL,
    email_written_at    TEXT DEFAULT NULL,
    email_sent_at       TEXT DEFAULT NULL,
    source_file     TEXT     DEFAULT '',
    source          TEXT     DEFAULT 'google_maps'
);
CREATE INDEX IF NOT EXISTS idx_leads_email    ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status   ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_niche    ON leads(niche);
CREATE INDEX IF NOT EXISTS idx_leads_city     ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_country  ON leads(country);
CREATE INDEX IF NOT EXISTS idx_leads_place_id ON leads(place_id) WHERE place_id IS NOT NULL;
"""

_INSERT_COLS = (
    "business_name", "email", "phone", "website", "owner_name",
    "city", "country", "address", "category", "niche",
    "place_id", "status", "scraped_at", "source_file", "source",
)

_VALID_STATUSES  = {"new", "email_written", "sent", "bounced"}
_VALID_TS_FIELDS = {"scraped_at", "email_written_at", "email_sent_at"}


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create tables and indexes if they do not exist. Safe to call multiple times."""
    conn = _connect()
    try:
        conn.executescript(_CREATE_SQL)
        conn.commit()
        print(f"[DB] Initialized: {DB_PATH}")
    finally:
        conn.close()


def insert_leads(leads: list) -> dict:
    """
    Bulk-insert leads. Silently skips duplicates (by email or place_id).

    Each dict should have at minimum: business_name, email.
    Optional keys: phone, website, owner_name, city, country, address,
                   category, niche, place_id, source_file, source, scraped_at.

    Returns: {"inserted": int, "skipped": int}
    """
    if not leads:
        return {"inserted": 0, "skipped": 0}

    now_iso = datetime.now(timezone.utc).isoformat()
    rows = []

    for lead in leads:
        email = (lead.get("email") or "").strip().lower()
        if not email or "@" not in email:
            continue

        place_id = lead.get("place_id") or None
        if place_id == "":
            place_id = None

        rows.append((
            (lead.get("business_name") or "").strip(),
            email,
            (lead.get("phone") or "").strip(),
            (lead.get("website") or "").strip(),
            (lead.get("owner_name") or "").strip(),
            (lead.get("city") or "").strip(),
            (lead.get("country") or "").strip(),
            (lead.get("address") or "").strip(),
            (lead.get("category") or "").strip(),
            (lead.get("niche") or "").strip(),
            place_id,
            "new",
            lead.get("scraped_at") or now_iso,
            (lead.get("source_file") or "").strip(),
            (lead.get("source") or "google_maps").strip(),
        ))

    if not rows:
        return {"inserted": 0, "skipped": len(leads)}

    sql = (
        f"INSERT OR IGNORE INTO leads ({', '.join(_INSERT_COLS)}) "
        f"VALUES ({', '.join(['?'] * len(_INSERT_COLS))})"
    )

    conn = _connect()
    try:
        cursor = conn.executemany(sql, rows)
        conn.commit()
        inserted = cursor.rowcount
        skipped  = len(rows) - inserted
        return {"inserted": inserted, "skipped": skipped}
    finally:
        conn.close()


def get_existing_emails() -> set:
    """Return the set of all emails already in the DB (for pipeline dedup)."""
    conn = _connect()
    try:
        rows = conn.execute("SELECT email FROM leads").fetchall()
        return {row["email"] for row in rows}
    finally:
        conn.close()


def update_lead_status(
    email: str,
    status: str,
    timestamp_field: Optional[str] = None,
    timestamp_value: Optional[str] = None,
) -> bool:
    """
    Update a lead's lifecycle status and optionally set a timestamp column.

    Args:
        email:           Lead's email address.
        status:          One of 'new', 'email_written', 'sent', 'bounced'.
        timestamp_field: One of 'scraped_at', 'email_written_at', 'email_sent_at'.
        timestamp_value: ISO-8601 string; defaults to current UTC time if omitted.

    Returns True if the row was found and updated, False if email not in DB.
    """
    email = email.strip().lower()
    if status not in _VALID_STATUSES:
        raise ValueError(f"Invalid status '{status}'. Must be one of: {_VALID_STATUSES}")
    if timestamp_field and timestamp_field not in _VALID_TS_FIELDS:
        raise ValueError(f"Invalid timestamp_field '{timestamp_field}'.")

    ts = timestamp_value or datetime.now(timezone.utc).isoformat()
    conn = _connect()
    try:
        if timestamp_field:
            sql = f"UPDATE leads SET status = ?, {timestamp_field} = ? WHERE email = ?"
            cursor = conn.execute(sql, (status, ts, email))
        else:
            sql = "UPDATE leads SET status = ? WHERE email = ?"
            cursor = conn.execute(sql, (status, email))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def get_leads_by_filter(
    niche: Optional[str] = None,
    city: Optional[str] = None,
    country: Optional[str] = None,
    status: Optional[str] = None,
    limit: Optional[int] = None,
) -> list:
    """
    Query leads with optional filters (all string filters are case-insensitive LIKE).
    Returns a list of dicts (all columns).
    """
    clauses, params = [], []

    if niche:
        clauses.append("LOWER(niche) LIKE LOWER(?)")
        params.append(f"%{niche}%")
    if city:
        clauses.append("LOWER(city) LIKE LOWER(?)")
        params.append(f"%{city}%")
    if country:
        clauses.append("LOWER(country) LIKE LOWER(?)")
        params.append(f"%{country}%")
    if status:
        clauses.append("status = ?")
        params.append(status)

    sql = "SELECT * FROM leads"
    if clauses:
        sql += " WHERE " + " AND ".join(clauses)
    sql += " ORDER BY id ASC"
    if limit:
        sql += f" LIMIT {int(limit)}"

    conn = _connect()
    try:
        rows = conn.execute(sql, params).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


if __name__ == "__main__":
    init_db()
    print(f"[DB] Schema created. DB path: {DB_PATH}")
