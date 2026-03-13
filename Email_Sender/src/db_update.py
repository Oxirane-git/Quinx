"""
Email_Sender/src/db_update.py

Thin CLI wrapper so Node.js can update lead status in leads.db
without requiring any npm SQLite package.

Called by db.js via child_process.execFileSync:
    python db_update.py <email> <status>

status must be one of: new, email_written, sent, bounced

Exit codes:
    0  success
    1  error (message printed to stderr)
"""

import sys
import os

def main():
    if len(sys.argv) < 3:
        print("Usage: db_update.py <email> <status>", file=sys.stderr)
        sys.exit(1)

    email  = sys.argv[1].strip().lower()
    status = sys.argv[2].strip()

    # Resolve db_handler path: src/ -> Email_Sender/ -> Quinx/ -> Email_Scrap/tools/
    _SRC_DIR      = os.path.dirname(os.path.abspath(__file__))
    _SENDER_DIR   = os.path.dirname(_SRC_DIR)
    _PROJECT_ROOT = os.path.dirname(_SENDER_DIR)
    _HANDLER_DIR  = os.path.join(_PROJECT_ROOT, "Email_Scrap", "tools")

    sys.path.insert(0, _HANDLER_DIR)

    try:
        from db_handler import update_lead_status
    except ImportError as e:
        print(f"[db_update] Cannot import db_handler: {e}", file=sys.stderr)
        sys.exit(1)

    # Map status to timestamp field
    ts_field_map = {
        "sent":    "email_sent_at",
        "bounced": "email_sent_at",   # record when the bounce happened
    }
    ts_field = ts_field_map.get(status)

    try:
        updated = update_lead_status(email, status, ts_field)
        if not updated:
            # Lead not in DB yet — not an error, just log
            print(f"[db_update] Email not found in DB (skipped): {email}")
        sys.exit(0)
    except ValueError as e:
        print(f"[db_update] Invalid arguments: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[db_update] DB error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
