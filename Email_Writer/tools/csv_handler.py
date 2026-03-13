#!/usr/bin/env python3
"""
Quinx AI — CSV Handler Tool

Manages the leads CSV file: read rows, update rows with email subject/body,
update status, and query leads by status.

Usage:
    # Read all leads
    python tools/csv_handler.py --action read --file leads.csv

    # Read leads filtered by status
    python tools/csv_handler.py --action read --file leads.csv --status "scraped"

    # Update a lead with subject, body, and status
    python tools/csv_handler.py --action update --file leads.csv \
        --business-name "Test Cafe" \
        --subject "something I noticed about Test Cafe" \
        --body "Hi there, ..." \
        --status "ready_to_send"

    # Mark a lead as failed
    python tools/csv_handler.py --action update --file leads.csv \
        --business-name "Test Cafe" \
        --status "email_write_failed" \
        --failure-reason "Word count out of range after retry"

    # Get a single lead's businessContext as JSON
    python tools/csv_handler.py --action get-context --file leads.csv \
        --business-name "Test Cafe"
"""

import argparse
import csv
import json
import os
import sys
from copy import deepcopy
from datetime import datetime

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# All known CSV columns in canonical order
CSV_COLUMNS = [
    "businessName",
    "ownerName",
    "city",
    "category",
    "website",
    "email",
    "phone",
    "websiteSummary",
    "rating",
    "reviewCount",
    "positiveThemes",
    "churnSignals",
    "lastReviewDate",
    "socialPresence",
    "hasLoyaltyProgram",
    "hasEmailCapture",
    "recentMentions",
    "painScore",
    "subject",
    "body",
    "status",
    "failureReason",
    "emailWrittenAt",
    "emailSentAt",
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def resolve_path(file_path: str) -> str:
    """Resolve file path relative to project root if not absolute."""
    if os.path.isabs(file_path):
        return file_path
    return os.path.join(BASE_DIR, file_path)


def read_csv(file_path: str) -> tuple[list[str], list[dict]]:
    """Read CSV and return (fieldnames, rows)."""
    path = resolve_path(file_path)
    if not os.path.exists(path):
        print(f"CSV file not found: {path}", file=sys.stderr)
        sys.exit(1)

    with open(path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        rows = list(reader)

    return fieldnames, rows


def write_csv(file_path: str, fieldnames: list[str], rows: list[dict]) -> None:
    """Write rows to CSV, preserving column order."""
    path = resolve_path(file_path)

    # Ensure all expected columns exist in fieldnames
    all_fields = list(fieldnames)
    for col in CSV_COLUMNS:
        if col not in all_fields:
            all_fields.append(col)

    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=all_fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def find_lead_index(rows: list[dict], business_name: str) -> int:
    """Find the index of a lead by businessName (case-insensitive)."""
    target = business_name.strip().lower()
    for i, row in enumerate(rows):
        if row.get("businessName", "").strip().lower() == target:
            return i
    return -1


def init_csv(file_path: str) -> None:
    """Create a new CSV with headers if it doesn't exist."""
    path = resolve_path(file_path)
    if os.path.exists(path):
        print(
            json.dumps({"status": "exists", "path": path, "message": "CSV already exists."}),
        )
        return

    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        writer.writeheader()

    print(json.dumps({"status": "created", "path": path, "columns": CSV_COLUMNS}))


def add_lead(file_path: str, context_json: str) -> None:
    """Add a new lead row from a businessContext JSON string."""
    path = resolve_path(file_path)

    try:
        context = json.loads(context_json)
    except json.JSONDecodeError as e:
        print(f"Invalid JSON: {e}", file=sys.stderr)
        sys.exit(1)

    if not context.get("businessName"):
        print("businessName is required to add a lead.", file=sys.stderr)
        sys.exit(1)

    # Read existing or create new
    if os.path.exists(path):
        fieldnames, rows = read_csv(file_path)
    else:
        fieldnames = list(CSV_COLUMNS)
        rows = []

    # Check for duplicate
    idx = find_lead_index(rows, context["businessName"])
    if idx >= 0:
        print(
            json.dumps({
                "status": "duplicate",
                "businessName": context["businessName"],
                "message": "Lead already exists in CSV.",
            }),
        )
        return

    # Build row with defaults
    new_row = {col: "" for col in CSV_COLUMNS}
    for key, value in context.items():
        if key in CSV_COLUMNS:
            new_row[key] = str(value) if value is not None else ""

    if not new_row.get("status"):
        new_row["status"] = "scraped"

    rows.append(new_row)
    write_csv(file_path, fieldnames, rows)

    print(json.dumps({
        "status": "added",
        "businessName": context["businessName"],
        "total_leads": len(rows),
    }))


# ---------------------------------------------------------------------------
# Actions
# ---------------------------------------------------------------------------


def action_read(args: argparse.Namespace) -> None:
    """Read and output leads, optionally filtered by status."""
    fieldnames, rows = read_csv(args.file)

    if args.status:
        rows = [r for r in rows if r.get("status", "").lower() == args.status.lower()]

    output = {
        "total": len(rows),
        "leads": rows,
    }
    print(json.dumps(output, indent=2))


def action_update(args: argparse.Namespace) -> None:
    """Update a lead's subject, body, status, or failure reason."""
    if not args.business_name:
        print("--business-name is required for update action.", file=sys.stderr)
        sys.exit(1)

    fieldnames, rows = read_csv(args.file)
    idx = find_lead_index(rows, args.business_name)

    if idx < 0:
        print(
            f"Lead not found: '{args.business_name}'",
            file=sys.stderr,
        )
        sys.exit(1)

    row = rows[idx]
    updated_fields = []

    if args.subject is not None:
        row["subject"] = args.subject
        updated_fields.append("subject")

    if args.body is not None:
        row["body"] = args.body
        updated_fields.append("body")

    if args.status is not None:
        row["status"] = args.status
        updated_fields.append("status")

    if args.failure_reason is not None:
        row["failureReason"] = args.failure_reason
        updated_fields.append("failureReason")

    # Timestamp
    if args.subject or args.body:
        row["emailWrittenAt"] = datetime.now().isoformat()
        updated_fields.append("emailWrittenAt")

    rows[idx] = row
    write_csv(args.file, fieldnames, rows)

    print(json.dumps({
        "status": "updated",
        "businessName": args.business_name,
        "updatedFields": updated_fields,
    }))


def action_get_context(args: argparse.Namespace) -> None:
    """Extract a single lead's businessContext as JSON for the email tool."""
    if not args.business_name:
        print("--business-name is required for get-context action.", file=sys.stderr)
        sys.exit(1)

    fieldnames, rows = read_csv(args.file)
    idx = find_lead_index(rows, args.business_name)

    if idx < 0:
        print(f"Lead not found: '{args.business_name}'", file=sys.stderr)
        sys.exit(1)

    row = deepcopy(rows[idx])

    # Remove output-only fields from context
    for key in ["subject", "body", "status", "failureReason", "emailWrittenAt", "emailSentAt"]:
        row.pop(key, None)

    # Convert painScore to int if present
    if row.get("painScore"):
        try:
            row["painScore"] = int(row["painScore"])
        except (ValueError, TypeError):
            pass

    print(json.dumps(row, indent=2))


def action_init(args: argparse.Namespace) -> None:
    """Initialize a new CSV file with headers."""
    init_csv(args.file)


def action_add(args: argparse.Namespace) -> None:
    """Add a lead from JSON context."""
    if not args.context:
        print("--context is required for add action.", file=sys.stderr)
        sys.exit(1)
    add_lead(args.file, args.context)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Quinx AI — CSV handler for leads pipeline.",
    )
    parser.add_argument(
        "--action",
        required=True,
        choices=["read", "update", "get-context", "init", "add"],
        help="Action to perform",
    )
    parser.add_argument(
        "--file",
        required=True,
        help="Path to the leads CSV file (relative to project root or absolute)",
    )
    parser.add_argument("--business-name", default=None, help="Business name to target")
    parser.add_argument("--subject", default=None, help="Email subject line")
    parser.add_argument("--body", default=None, help="Email body text")
    parser.add_argument("--status", default=None, help="Lead status to set or filter by")
    parser.add_argument("--failure-reason", default=None, help="Reason for failure")
    parser.add_argument("--context", default=None, help="businessContext JSON string (for add action)")

    args = parser.parse_args()

    actions = {
        "read": action_read,
        "update": action_update,
        "get-context": action_get_context,
        "init": action_init,
        "add": action_add,
    }

    actions[args.action](args)


if __name__ == "__main__":
    main()
