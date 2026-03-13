"""
Email_Scrap/tools/migrate_xlsx_to_db.py

Re-runnable migration tool.  Supports two input formats:

  1. XLSX files (Quinx/Leads/)        — filenames like {City}_{Country}_{Niche}_Leads.xlsx
  2. Category CSV files (by_category/) — filenames like cafes.csv, restaurants.csv
     City/country are embedded in the 'city' column as "Amsterdam, Netherlands"

Both modes are idempotent: duplicate emails are silently skipped.

Usage:
    # XLSX migration (default)
    python tools/migrate_xlsx_to_db.py
    python tools/migrate_xlsx_to_db.py --leads-dir /path/to/Leads --dry-run

    # CSV (by_category) migration
    python tools/migrate_xlsx_to_db.py --csv-dir /path/to/by_category
    python tools/migrate_xlsx_to_db.py --csv-dir /path/to/by_category --dry-run

    # Both in one shot
    python tools/migrate_xlsx_to_db.py --csv-dir /path/to/by_category --leads-dir /path/to/Leads
"""

import argparse
import csv
import glob
import os
import re
import sys

try:
    import openpyxl
except ImportError:
    sys.exit("[ERROR] openpyxl is required: pip install openpyxl")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db_handler import DB_PATH, init_db, insert_leads

_TOOLS_DIR        = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT     = os.path.dirname(os.path.dirname(_TOOLS_DIR))
DEFAULT_LEADS_DIR = os.path.join(_PROJECT_ROOT, "Leads")
DEFAULT_CSV_DIR   = os.path.join(_PROJECT_ROOT, "Email_Scrap", "Leads", "by_category")

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def parse_xlsx_filename(filename: str) -> dict:
    """
    Extract city, country, niche from {City}_{Country}_{Niche}_Leads.xlsx.
      parts[-1] = niche, parts[-2] = country, rest = city
      Country is uppercased if ≤ 3 chars (UK, USA), else title-cased.
    """
    stem = os.path.splitext(filename)[0]
    stem = re.sub(r"[_\-]?[Ll]eads$", "", stem)
    parts = [p for p in stem.split("_") if p.strip()]

    if len(parts) < 3:
        return {"city": "", "country": "", "niche": stem.replace("_", " ").title()}

    niche       = parts[-1].title()
    country_raw = parts[-2]
    country     = country_raw.upper() if len(country_raw) <= 3 else country_raw.title()
    city        = " ".join(parts[:-2]).title()
    return {"city": city, "country": country, "niche": niche}


def parse_city_column(city_str: str) -> tuple:
    """
    Parse "Amsterdam, Netherlands" or "Atlanta, USA" into (city, country).
    Falls back to (full_string, "") if no comma is found.
    """
    city_str = city_str.strip().strip('"')
    if ", " in city_str:
        parts = city_str.split(", ", 1)
        return parts[0].strip(), parts[1].strip()
    return city_str, ""


def niche_from_filename(filename: str) -> str:
    """cafes.csv -> 'Cafes',  bars_pubs.csv -> 'Bars Pubs'"""
    stem = os.path.splitext(filename)[0]
    return stem.replace("_", " ").title()


# ──────────────────────────────────────────────────────────────────────────────
# Readers
# ──────────────────────────────────────────────────────────────────────────────

def read_xlsx(filepath: str, meta: dict) -> list:
    """
    Read leads from a *_Leads.xlsx file.
    Expected columns: business_name, email, phone, website, city, category, niche, owner_name
    """
    wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
    ws = wb.active
    headers = []
    leads = []

    for row_idx, row in enumerate(ws.iter_rows(values_only=True)):
        if row_idx == 0:
            headers = [str(h).strip().lower() if h else "" for h in row]
            continue

        row_dict = {}
        for col_idx, val in enumerate(row):
            if col_idx < len(headers) and headers[col_idx]:
                row_dict[headers[col_idx]] = str(val).strip() if val is not None else ""

        email = row_dict.get("email", "").strip().lower()
        if not email or "@" not in email:
            continue

        leads.append({
            "business_name": row_dict.get("business_name", ""),
            "email":         email,
            "phone":         row_dict.get("phone", ""),
            "website":       row_dict.get("website", ""),
            "owner_name":    row_dict.get("owner_name", ""),
            "city":          row_dict.get("city", "") or meta["city"],
            "country":       meta["country"],
            "address":       row_dict.get("address", ""),
            "category":      row_dict.get("category", ""),
            "niche":         row_dict.get("niche", "") or meta["niche"],
            "place_id":      None,
            "source_file":   os.path.basename(filepath),
            "source":        "xlsx_import",
            "scraped_at":    None,
        })

    wb.close()
    return leads


def read_category_csv(filepath: str) -> list:
    """
    Read leads from a by_category CSV file.
    Expected columns: business_name, email, phone, website, city, address, owner_name, category
    City column format: "Amsterdam, Netherlands"
    Niche is derived from the filename (e.g. cafes.csv -> Cafes).
    """
    niche    = niche_from_filename(os.path.basename(filepath))
    leads    = []

    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Normalize keys to lowercase
            row = {k.strip().lower(): v for k, v in row.items()}

            email = row.get("email", "").strip().lower()
            if not email or "@" not in email:
                continue

            city_raw = row.get("city", "").strip()
            city, country = parse_city_column(city_raw)

            leads.append({
                "business_name": row.get("business_name", "").strip(),
                "email":         email,
                "phone":         row.get("phone", "").strip(),
                "website":       row.get("website", "").strip(),
                "owner_name":    row.get("owner_name", "").strip(),
                "city":          city,
                "country":       country,
                "address":       row.get("address", "").strip(),
                "category":      row.get("category", "").strip(),
                "niche":         niche,
                "place_id":      None,
                "source_file":   os.path.basename(filepath),
                "source":        "csv_import",
                "scraped_at":    None,
            })

    return leads


# ──────────────────────────────────────────────────────────────────────────────
# Migration runners
# ──────────────────────────────────────────────────────────────────────────────

def migrate_xlsx_dir(leads_dir: str, dry_run: bool) -> tuple:
    """Process all *_Leads.xlsx files. Returns (total_rows, inserted, skipped)."""
    xlsx_files = sorted(glob.glob(os.path.join(leads_dir, "*_Leads.xlsx")))
    if not xlsx_files:
        print(f"  [WARN] No *_Leads.xlsx files found in: {leads_dir}")
        return 0, 0, 0

    print(f"\n[XLSX] {len(xlsx_files)} file(s) in: {leads_dir}")
    total_rows = total_inserted = total_skipped = 0

    for filepath in xlsx_files:
        filename = os.path.basename(filepath)
        meta = parse_xlsx_filename(filename)
        print(f"  {filename}")
        print(f"    -> city='{meta['city']}'  country='{meta['country']}'  niche='{meta['niche']}'")

        leads = read_xlsx(filepath, meta)
        total_rows += len(leads)
        print(f"    Rows with valid email: {len(leads)}")

        if dry_run:
            continue

        result = insert_leads(leads)
        total_inserted += result["inserted"]
        total_skipped  += result["skipped"]
        print(f"    Inserted: {result['inserted']}  |  Skipped (duplicate): {result['skipped']}")

    return total_rows, total_inserted, total_skipped


def migrate_csv_dir(csv_dir: str, dry_run: bool) -> tuple:
    """Process all *.csv files in a by_category dir. Returns (total_rows, inserted, skipped)."""
    csv_files = sorted(glob.glob(os.path.join(csv_dir, "*.csv")))
    if not csv_files:
        print(f"  [WARN] No *.csv files found in: {csv_dir}")
        return 0, 0, 0

    print(f"\n[CSV] {len(csv_files)} file(s) in: {csv_dir}")
    total_rows = total_inserted = total_skipped = 0

    for filepath in csv_files:
        filename = os.path.basename(filepath)
        niche    = niche_from_filename(filename)
        print(f"  {filename}  (niche='{niche}')")

        leads = read_category_csv(filepath)
        total_rows += len(leads)
        print(f"    Rows with valid email: {len(leads)}")

        if dry_run:
            continue

        result = insert_leads(leads)
        total_inserted += result["inserted"]
        total_skipped  += result["skipped"]
        print(f"    Inserted: {result['inserted']}  |  Skipped (duplicate): {result['skipped']}")

    return total_rows, total_inserted, total_skipped


# ──────────────────────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Migrate Quinx lead files (XLSX or by_category CSVs) into leads.db"
    )
    parser.add_argument(
        "--leads-dir",
        default=None,
        help=f"Directory containing *_Leads.xlsx files (default: {DEFAULT_LEADS_DIR})",
    )
    parser.add_argument(
        "--csv-dir",
        default=None,
        help=f"Directory containing by_category *.csv files (default: {DEFAULT_CSV_DIR})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and report counts without writing to the DB",
    )
    args = parser.parse_args()

    # If neither flag given, default to XLSX migration
    if not args.leads_dir and not args.csv_dir:
        args.leads_dir = DEFAULT_LEADS_DIR

    print(f"[MIGRATE] {'DRY RUN — ' if args.dry_run else ''}Starting migration")

    if not args.dry_run:
        init_db()
        print(f"[MIGRATE] DB: {DB_PATH}")

    grand_rows = grand_inserted = grand_skipped = 0

    if args.leads_dir:
        if not os.path.isdir(args.leads_dir):
            print(f"[ERROR] XLSX directory not found: {args.leads_dir}")
        else:
            rows, ins, skp = migrate_xlsx_dir(args.leads_dir, args.dry_run)
            grand_rows += rows; grand_inserted += ins; grand_skipped += skp

    if args.csv_dir:
        if not os.path.isdir(args.csv_dir):
            print(f"[ERROR] CSV directory not found: {args.csv_dir}")
        else:
            rows, ins, skp = migrate_csv_dir(args.csv_dir, args.dry_run)
            grand_rows += rows; grand_inserted += ins; grand_skipped += skp

    print(f"\n[MIGRATE] Summary")
    print(f"  Total rows with email : {grand_rows}")
    if not args.dry_run:
        print(f"  Inserted into DB      : {grand_inserted}")
        print(f"  Skipped (duplicate)   : {grand_skipped}")
    print(f"[MIGRATE] Done.")


if __name__ == "__main__":
    main()
