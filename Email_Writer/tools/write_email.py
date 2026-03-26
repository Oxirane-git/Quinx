#!/usr/bin/env python3
"""
Quinx AI — Email Writer Tool (OpenRouter)

Reads the master prompt from workflows/write_email.md, substitutes
businessContext values, calls the OpenRouter API, and returns a
personalized cold email as JSON.

Supports automatic key rotation: if one API key hits its rate limit,
the next key is tried automatically (up to 4 keys).

Usage:
    python tools/write_email.py --context '{"businessName":"Test Cafe","city":"Mumbai","category":"Cafe"}'
    python tools/write_email.py --context '{"businessName":"..."}' --retry-reason "Body was 145 words."
"""

import argparse
import json
import os
import re
import sys
import time

import requests
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
WORKFLOW_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "workflows",
    "write_email.md",
)
REQUIRED_FIELDS = ["businessName", "city", "category"]

DEFAULT_CAMPAIGN_CONTEXT = (
    "We help restaurants automatically follow up with customers after every visit "
    "via WhatsApp, SMS, and email. A QR code on the table captures customer contact — "
    "no app download needed. Automated sequences: post-visit follow-up (Day 3), "
    "reactivation (Day 30), review generation, birthday campaigns. Setup takes 48 hours, "
    "runs completely on autopilot after. Pricing starts at \u20b93,999/month. Website: quinxai.com"
)
DEFAULT_SIGN_OFF = "Sahil | Quinx AI\nquinxai.com"
PERSONALIZATION_FIELDS = [
    "websiteSummary",
    "positiveThemes",
    "churnSignals",
    "recentMentions",
    "socialPresence",
]
GENERIC_VALUES = {"", "unknown", "n/a", "none", "null"}
MIN_WORDS = 90
MAX_WORDS = 130
MODEL = "google/gemini-2.5-flash"
TEMPERATURE = 0.7
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def load_master_prompt() -> str:
    """Extract the master prompt block from the workflow markdown file."""
    try:
        with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(
            f"Workflow file not found: {WORKFLOW_PATH}",
            file=sys.stderr,
        )
        sys.exit(1)

    match = re.search(
        r"MASTER_PROMPT_START\s*\n(.*?)MASTER_PROMPT_END",
        content,
        re.DOTALL,
    )
    if not match:
        print(
            "Could not find MASTER_PROMPT_START / MASTER_PROMPT_END in workflow file.",
            file=sys.stderr,
        )
        sys.exit(1)

    return match.group(1).strip()


def substitute_placeholders(template: str, context: dict) -> str:
    """Replace {{variable}} placeholders with values from context."""

    def replacer(m: re.Match) -> str:
        key = m.group(1)
        value = context.get(key)
        if value is None or str(value).strip().lower() in GENERIC_VALUES:
            return "Unknown"
        return str(value)

    return re.sub(r"\{\{(\w+)\}\}", replacer, template)


def validate_required_fields(context: dict) -> None:
    """Abort if any required field is missing or empty."""
    missing = [
        f for f in REQUIRED_FIELDS
        if not context.get(f) or str(context[f]).strip().lower() in GENERIC_VALUES
    ]
    if missing:
        print(
            f"Missing required fields: {', '.join(missing)}",
            file=sys.stderr,
        )
        sys.exit(1)


def validate_personalization(context: dict) -> None:
    """Abort if fewer than 2 personalization fields are usable."""
    usable = sum(
        1
        for f in PERSONALIZATION_FIELDS
        if context.get(f)
        and str(context[f]).strip().lower() not in GENERIC_VALUES
    )
    if usable < 2:
        print(
            f"Insufficient personalization data ({usable}/2 usable fields). "
            "Skipping lead to avoid sending a generic email.",
            file=sys.stderr,
        )
        sys.exit(1)


def strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` wrappers if present."""
    text = text.strip()
    # Full fenced block: ```json ... ```
    pattern = r"^```(?:json)?\s*\n?(.*?)\n?\s*```$"
    match = re.match(pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()
    # Opening fence only (truncated response): ```json\n...
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?\s*```$", "", text)
        return text.strip()
    return text


def count_words(text: str) -> int:
    """Count words in a string."""
    return len(text.split())


def validate_output(result: dict, context: dict) -> str | None:
    """
    Validate the email output against all rules.
    Returns an error reason string, or None if valid.
    """
    # Check required keys
    if "subject" not in result or "body" not in result:
        return "Response JSON missing 'subject' or 'body' key."

    subject = result["subject"]
    body = result["body"]

    # Subject word count
    subject_words = count_words(subject)
    if subject_words > 8:
        return f"Subject line is {subject_words} words. Must be under 9."

    # Body word count
    body_words = count_words(body)
    if body_words < MIN_WORDS or body_words > MAX_WORDS:
        return (
            f"Body is {body_words} words. Must be between "
            f"{MIN_WORDS} and {MAX_WORDS}."
        )

    # Business name mention
    biz_name = context.get("businessName", "")
    if biz_name and biz_name.lower() not in body.lower():
        return (
            f"Business name '{biz_name}' does not appear in the email body."
        )

    return None  # All validations passed


def load_api_keys() -> list[str]:
    """Load all OpenRouter API keys from environment variables."""
    keys = []
    for i in range(1, 10):  # Support up to 9 keys
        key = os.getenv(f"OPENROUTER_API_KEY_{i}")
        if key:
            keys.append(key)

    # Fallback: also check the un-numbered key
    fallback = os.getenv("OPENROUTER_API_KEY")
    if fallback and fallback not in keys:
        keys.insert(0, fallback)

    return keys


def _call_openrouter_single(
    prompt: str,
    api_key: str,
) -> requests.Response:
    """Make a single OpenRouter API call and return the raw response."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://quinx.ai",
        "X-Title": "Quinx AI Email Writer",
    }
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "user", "content": prompt},
        ],
        "temperature": TEMPERATURE,
        "max_tokens": 2048,
    }
    return requests.post(
        OPENROUTER_API_URL,
        headers=headers,
        json=payload,
        timeout=120,
    )


def _is_rate_limit_error(response: requests.Response) -> bool:
    """Check if the response indicates a rate limit or quota error."""
    if response.status_code == 429:
        return True
    if response.status_code == 402:  # Payment required / quota exhausted
        return True
    try:
        body = response.json()
        error_msg = str(body.get("error", "")).lower()
        if any(kw in error_msg for kw in ["rate", "quota", "limit", "429"]):
            return True
    except Exception:
        pass
    return False


def call_openrouter_api(
    prompt: str,
    api_keys: list[str],
    retry_reason: str | None = None,
) -> dict:
    """
    Call the OpenRouter API with automatic key rotation.
    If one key hits its rate limit, the next key is tried.
    """
    # Build the full prompt
    full_prompt = prompt
    if retry_reason:
        full_prompt = (
            f"IMPORTANT CORRECTION: Your previous attempt failed because: "
            f"{retry_reason}\n"
            f"Please follow the rules EXACTLY this time. Pay special attention "
            f"to the rule you violated.\n\n"
            f"{prompt}"
        )

    last_error = None

    for key_index, api_key in enumerate(api_keys, start=1):
        key_label = f"Key #{key_index}"
        print(f"Trying {key_label}...", file=sys.stderr)

        try:
            response = _call_openrouter_single(full_prompt, api_key)
        except requests.exceptions.Timeout:
            print(f"{key_label}: Timeout. Retrying after 5s...", file=sys.stderr)
            time.sleep(5)
            try:
                response = _call_openrouter_single(full_prompt, api_key)
            except Exception as e2:
                print(f"{key_label}: Failed after timeout retry: {e2}", file=sys.stderr)
                last_error = str(e2)
                continue
        except Exception as e:
            print(f"{key_label}: Request error: {e}", file=sys.stderr)
            last_error = str(e)
            continue

        # Check for rate limiting — rotate to next key
        if _is_rate_limit_error(response):
            try:
                err_body = response.json()
            except Exception:
                err_body = response.text
            print(
                f"{key_label}: Rate limited (HTTP {response.status_code}). "
                f"Rotating to next key...",
                file=sys.stderr,
            )
            last_error = f"Rate limited: {err_body}"
            continue

        # Check for other HTTP errors
        if response.status_code != 200:
            try:
                err_body = response.json()
            except Exception:
                err_body = response.text
            print(
                f"{key_label}: HTTP {response.status_code}: {err_body}",
                file=sys.stderr,
            )
            last_error = f"HTTP {response.status_code}: {err_body}"
            continue

        # Parse response
        try:
            data = response.json()
        except json.JSONDecodeError:
            print(f"{key_label}: Invalid JSON response.", file=sys.stderr)
            last_error = "Invalid JSON response from API."
            continue

        # Extract text content
        raw_text = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        if not raw_text:
            print(f"{key_label}: Empty response content.", file=sys.stderr)
            last_error = "Empty response from API."
            continue

        # Parse the email JSON from the response
        cleaned = strip_markdown_fences(raw_text)
        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError:
            # Attempt to find JSON object in the response
            json_match = re.search(r"\{[^{}]*\}", cleaned, re.DOTALL)
            if json_match:
                try:
                    result = json.loads(json_match.group())
                except json.JSONDecodeError:
                    print(
                        f"{key_label}: Could not parse JSON:\n{raw_text}",
                        file=sys.stderr,
                    )
                    last_error = f"JSON parse error: {raw_text[:200]}"
                    continue
            else:
                print(
                    f"{key_label}: No JSON found in response:\n{raw_text}",
                    file=sys.stderr,
                )
                last_error = f"No JSON in response: {raw_text[:200]}"
                continue

        print(f"{key_label}: Success!", file=sys.stderr)
        return result

    # All keys exhausted
    print(
        f"All {len(api_keys)} API keys exhausted. Last error: {last_error}",
        file=sys.stderr,
    )
    sys.exit(1)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate a personalized cold email using Gemini API.",
    )
    context_group = parser.add_mutually_exclusive_group(required=True)
    context_group.add_argument(
        "--context",
        help="businessContext JSON string",
    )
    context_group.add_argument(
        "--context-file",
        help="Path to a JSON file containing the businessContext",
    )
    parser.add_argument(
        "--retry-reason",
        default=None,
        help="Reason for retry (injected into prompt for stricter compliance)",
    )
    parser.add_argument(
        "--campaign-context",
        default=None,
        help="Free-form description of the product/service being pitched. "
             "Defaults to the Quinx AI description if omitted.",
    )
    parser.add_argument(
        "--sign-off",
        default=None,
        help="Email sign-off text (e.g. 'Sahil | Quinx AI\\nquinxai.com'). "
             "Defaults to 'Sahil | Quinx AI\\nquinxai.com' if omitted.",
    )
    args = parser.parse_args()

    # --- Load environment ---
    env_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        ".env",
    )
    load_dotenv(env_path)

    api_keys = load_api_keys()
    if not api_keys:
        print(
            "No OpenRouter API keys found in .env. "
            "Set OPENROUTER_API_KEY_1, _2, etc.",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"Loaded {len(api_keys)} API key(s).", file=sys.stderr)

    # --- Parse context (from string or file) ---
    if args.context_file:
        try:
            with open(args.context_file, "r", encoding="utf-8") as f:
                context = json.load(f)
        except FileNotFoundError:
            print(f"Context file not found: {args.context_file}", file=sys.stderr)
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"Invalid JSON in context file: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        try:
            context = json.loads(args.context)
        except json.JSONDecodeError as e:
            print(f"Invalid businessContext JSON: {e}", file=sys.stderr)
            sys.exit(1)

    # --- Inject campaign context and sign-off ---
    context["campaignContext"] = args.campaign_context or DEFAULT_CAMPAIGN_CONTEXT
    context["signOff"] = args.sign_off or DEFAULT_SIGN_OFF

    # --- Validate inputs ---
    validate_required_fields(context)
    validate_personalization(context)

    # --- Build prompt ---
    template = load_master_prompt()
    prompt = substitute_placeholders(template, context)

    # --- Call API ---
    result = call_openrouter_api(prompt, api_keys, retry_reason=args.retry_reason)

    # --- Validate output ---
    error = validate_output(result, context)
    if error:
        # Return structured error
        body_words = count_words(result.get("body", ""))
        error_output = {
            "error": error,
            "actual_word_count": body_words,
            "subject": result.get("subject"),
            "body": result.get("body"),
        }
        print(json.dumps(error_output, indent=2))
        sys.exit(1)

    # --- Success ---
    print(json.dumps(result, indent=2))
    sys.exit(0)


if __name__ == "__main__":
    main()
