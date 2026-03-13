#!/usr/bin/env python3
"""
Quinx AI — Lead Enrichment Tool

Fetches a lead's website, extracts visible text, detects social links /
loyalty keywords / email capture, then calls the OpenRouter API to
produce structured personalization data for the email writer.

Usage:
    python tools/enrich_lead.py --context '{"business_name":"...","city":"...","category":"...","website":"https://..."}'

Output (stdout): JSON enrichment dict
Errors (stderr): progress logs
Exit 0: success (fields may still be "Unknown" if site unreachable)
Exit 1: bad args or all API keys exhausted
"""

import argparse
import json
import os
import re
import sys
import time

import requests
from dotenv import load_dotenv

try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from tools.write_email import (
    load_api_keys,
    _is_rate_limit_error,
    strip_markdown_fences,
    OPENROUTER_API_URL,
    MODEL,
)

SCRAPE_TIMEOUT = 8           # seconds per HTTP request
MIN_TEXT_LENGTH = 100        # chars; below this = no usable content
MAX_TEXT_CHARS = 6000        # chars sent to AI (cost control)
ENRICHMENT_MAX_TOKENS = 400
ENRICHMENT_TEMPERATURE = 0.3

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

LOYALTY_KEYWORDS = ["loyalty", "reward", "rewards", "points", "membership", "punch card", "stamp card", "frequent"]
EMAIL_CAPTURE_KEYWORDS = ["subscribe", "newsletter", "sign up", "signup", "join our list"]
SOCIAL_DOMAINS = {
    "instagram.com": "Instagram",
    "facebook.com": "Facebook",
    "twitter.com": "Twitter",
    "tiktok.com": "TikTok",
}

UNKNOWN_SKELETON = {
    "websiteSummary": "Unknown",
    "positiveThemes": "Unknown",
    "churnSignals": "Unknown",
    "socialPresence": "Unknown",
    "hasLoyaltyProgram": "Unknown",
    "hasEmailCapture": "Unknown",
    "recentMentions": "Unknown",
    "rating": "Unknown",
    "reviewCount": "Unknown",
    "lastReviewDate": "Unknown",
    "painScore": "6",
    "enrichment_status": "unknown",
}


# ---------------------------------------------------------------------------
# Website fetching + parsing
# ---------------------------------------------------------------------------

def _fetch_html(url: str) -> str | None:
    """Fetch raw HTML from a URL. Returns None on any error."""
    try:
        resp = requests.get(
            url,
            timeout=SCRAPE_TIMEOUT,
            headers={"User-Agent": USER_AGENT},
            allow_redirects=True,
        )
        if resp.status_code == 200:
            return resp.text
        print(f"  ENRICH: {url} returned HTTP {resp.status_code}", file=sys.stderr)
    except requests.exceptions.Timeout:
        print(f"  ENRICH: Timeout fetching {url}", file=sys.stderr)
    except requests.exceptions.ConnectionError:
        print(f"  ENRICH: Connection error for {url}", file=sys.stderr)
    except Exception as e:
        print(f"  ENRICH: Error fetching {url}: {e}", file=sys.stderr)
    return None


def _extract_text(html: str) -> str:
    """Extract clean visible text from HTML using BeautifulSoup."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "head", "noscript"]):
        tag.decompose()
    text = soup.get_text(separator=" ", strip=True)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _detect_social_links(html: str) -> str:
    """Scan <a> tags for social media links. Returns plain-English string or ''."""
    soup = BeautifulSoup(html, "html.parser")
    found = {}
    for a in soup.find_all("a", href=True):
        href = a["href"].lower()
        for domain, label in SOCIAL_DOMAINS.items():
            if domain in href and label not in found:
                # Extract handle if possible
                match = re.search(rf"{re.escape(domain)}/([^/?#\"]+)", href)
                handle = f"/{match.group(1)}" if match else ""
                found[label] = f"{label}{handle}"
    if not found:
        return ""
    return ", ".join(found.values())


def _detect_loyalty(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in LOYALTY_KEYWORDS)


def _detect_email_capture(html: str, text: str) -> bool:
    lower_text = text.lower()
    if any(kw in lower_text for kw in EMAIL_CAPTURE_KEYWORDS):
        return True
    soup = BeautifulSoup(html, "html.parser")
    for form in soup.find_all("form"):
        for inp in form.find_all("input"):
            t = (inp.get("type", "") + inp.get("name", "")).lower()
            if "email" in t:
                return True
    return False


def fetch_website_text(url: str) -> tuple[str, str, bool, bool]:
    """
    Fetch and parse a website.
    Returns: (visible_text, social_presence_str, has_loyalty, has_email_capture)
    """
    if not BS4_AVAILABLE:
        print("  ENRICH: beautifulsoup4 not installed. Run: pip install beautifulsoup4", file=sys.stderr)
        return ("", "", False, False)

    # Normalize URL
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    url = url.rstrip("/")

    # Fetch homepage
    html = _fetch_html(url)
    if not html:
        return ("", "", False, False)

    homepage_text = _extract_text(html)
    social = _detect_social_links(html)
    has_loyalty = _detect_loyalty(homepage_text)
    has_email = _detect_email_capture(html, homepage_text)

    # Try /about page for more context
    about_text = ""
    about_html = _fetch_html(url + "/about")
    if about_html:
        about_text = " " + _extract_text(about_html)

    combined = (homepage_text + about_text).strip()
    combined = combined[:MAX_TEXT_CHARS]

    return (combined, social, has_loyalty, has_email)


# ---------------------------------------------------------------------------
# AI enrichment call
# ---------------------------------------------------------------------------

def _call_enrichment_single(prompt: str, api_key: str) -> requests.Response:
    """Single enrichment API call with lower token budget."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://quinxai.com",
        "X-Title": "Quinx AI Lead Enricher",
    }
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": ENRICHMENT_TEMPERATURE,
        "max_tokens": ENRICHMENT_MAX_TOKENS,
    }
    return requests.post(OPENROUTER_API_URL, headers=headers, json=payload, timeout=60)


def call_enrichment_api(
    prompt: str,
    api_keys: list[str],
    key_status: dict,
) -> tuple[dict | None, str | None, bool]:
    """
    Call the enrichment API with key rotation.
    Returns: (result_dict | None, error_str | None, all_exhausted: bool)
    """
    exhausted_count = 0

    for key_index, api_key in enumerate(api_keys, start=1):
        if key_status.get(key_index, {}).get("exhausted", False):
            exhausted_count += 1
            continue

        try:
            response = _call_enrichment_single(prompt, api_key)
        except requests.exceptions.Timeout:
            print(f"  ENRICH Key #{key_index}: Timeout, retrying...", file=sys.stderr)
            time.sleep(3)
            try:
                response = _call_enrichment_single(prompt, api_key)
            except Exception as e:
                print(f"  ENRICH Key #{key_index}: Failed after retry: {e}", file=sys.stderr)
                continue
        except Exception as e:
            print(f"  ENRICH Key #{key_index}: Request error: {e}", file=sys.stderr)
            continue

        if _is_rate_limit_error(response):
            print(f"  ENRICH Key #{key_index}: Rate limited, rotating...", file=sys.stderr)
            key_status[key_index] = {"exhausted": True}
            exhausted_count += 1
            continue

        if response.status_code != 200:
            print(f"  ENRICH Key #{key_index}: HTTP {response.status_code}", file=sys.stderr)
            continue

        try:
            data = response.json()
        except Exception:
            print(f"  ENRICH Key #{key_index}: Invalid JSON response", file=sys.stderr)
            continue

        raw_text = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        if not raw_text:
            print(f"  ENRICH Key #{key_index}: Empty content", file=sys.stderr)
            continue

        cleaned = strip_markdown_fences(raw_text)
        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError:
            # Try to extract JSON object
            match = re.search(r"\{.*?\}", cleaned, re.DOTALL)
            if match:
                try:
                    result = json.loads(match.group())
                except json.JSONDecodeError:
                    print(f"  ENRICH Key #{key_index}: Could not parse JSON", file=sys.stderr)
                    continue
            else:
                print(f"  ENRICH Key #{key_index}: No JSON in response", file=sys.stderr)
                continue

        print(f"  ENRICH Key #{key_index}: Success!", file=sys.stderr)
        return result, None, False

    all_exhausted = exhausted_count >= len(api_keys)
    return None, "All keys tried, none succeeded.", all_exhausted


# ---------------------------------------------------------------------------
# Main enrichment function
# ---------------------------------------------------------------------------

def build_enrichment_prompt(lead: dict, website_text: str) -> str:
    return (
        f"You are a business intelligence analyst helping write hyper-personalized cold emails.\n"
        f"Extract structured insights from the website text below.\n\n"
        f"BUSINESS: {lead.get('business_name', '')}, {lead.get('city', '')} "
        f"({lead.get('category', '')})\n"
        f"WEBSITE TEXT:\n---\n{website_text}\n---\n\n"
        f"Return ONLY a JSON object with these exact keys. "
        f"Quote actual phrases from the text where possible. "
        f'Use "Unknown" if a field cannot be determined.\n\n'
        f'{{\n'
        f'  "websiteSummary": "2-3 sentence factual summary of what this business offers, their specialty, and vibe",\n'
        f'  "positiveThemes": "comma-separated list of what customers would love: specific food items, ambiance details, unique features mentioned on the site",\n'
        f'  "churnSignals": "specific signals suggesting customers may not return — e.g. no loyalty program, no follow-up mechanism, generic experience, seasonal menu gaps. If none detectable write: No specific churn signals detected"\n'
        f'}}\n\n'
        f"Return only the JSON. No explanation."
    )


def enrich_lead(
    lead: dict,
    api_keys: list[str],
    key_status: dict,
) -> tuple[dict, bool]:
    """
    Enrich a lead with scraped website data + AI analysis.
    Returns: (enrichment_dict, all_keys_exhausted)
    enrichment_dict always has all keys; fields may be "Unknown" on failure.
    """
    skeleton = UNKNOWN_SKELETON.copy()

    website = lead.get("website", "") or ""
    if not website or website.strip().lower() in {"", "unknown", "n/a"}:
        print("  ENRICH: No website URL — skipping enrichment", file=sys.stderr)
        skeleton["enrichment_status"] = "no_website"
        return skeleton, False

    print(f"  ENRICH: Fetching {website}...", file=sys.stderr)
    website_text, social, has_loyalty, has_email = fetch_website_text(website)

    # Populate deterministic fields
    skeleton["socialPresence"] = social if social else "Unknown"
    skeleton["hasLoyaltyProgram"] = "Yes" if has_loyalty else "Unknown"
    skeleton["hasEmailCapture"] = "Yes" if has_email else "Unknown"

    if len(website_text) < MIN_TEXT_LENGTH:
        print(f"  ENRICH: Too little text ({len(website_text)} chars) — skipping AI call", file=sys.stderr)
        skeleton["enrichment_status"] = "no_text"
        return skeleton, False

    print(f"  ENRICH: Got {len(website_text)} chars — calling AI...", file=sys.stderr)
    prompt = build_enrichment_prompt(lead, website_text)
    result, error, all_exhausted = call_enrichment_api(prompt, api_keys, key_status)

    if all_exhausted:
        skeleton["enrichment_status"] = "api_exhausted"
        return skeleton, True

    if result is None:
        print(f"  ENRICH: AI call failed ({error}) — using partial data", file=sys.stderr)
        skeleton["enrichment_status"] = "api_failed"
        return skeleton, False

    # Merge AI results
    for field in ("websiteSummary", "positiveThemes", "churnSignals"):
        val = result.get(field, "")
        if val and str(val).strip().lower() not in {"", "unknown", "n/a", "none", "null"}:
            skeleton[field] = str(val).strip()

    # Compute painScore heuristic
    churn = skeleton.get("churnSignals", "Unknown")
    if churn not in ("Unknown",) and "no specific" not in churn.lower():
        skeleton["painScore"] = "7"
    elif skeleton.get("websiteSummary", "Unknown") != "Unknown":
        skeleton["painScore"] = "6"
    else:
        skeleton["painScore"] = "5"

    skeleton["enrichment_status"] = "enriched"
    return skeleton, False


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    if not BS4_AVAILABLE:
        print(
            "ERROR: beautifulsoup4 is not installed.\n"
            "Run: pip install beautifulsoup4",
            file=sys.stderr,
        )
        sys.exit(1)

    parser = argparse.ArgumentParser(description="Enrich a lead with website data.")
    parser.add_argument(
        "--context",
        required=True,
        help='Lead JSON string, e.g. \'{"business_name":"...","city":"...","website":"..."}\'',
    )
    args = parser.parse_args()

    env_path = os.path.join(BASE_DIR, ".env")
    load_dotenv(env_path)

    api_keys = load_api_keys()
    if not api_keys:
        print("No OpenRouter API keys found in .env.", file=sys.stderr)
        sys.exit(1)

    try:
        lead = json.loads(args.context)
    except json.JSONDecodeError as e:
        print(f"Invalid JSON: {e}", file=sys.stderr)
        sys.exit(1)

    key_status: dict = {}
    result, all_exhausted = enrich_lead(lead, api_keys, key_status)

    if all_exhausted:
        print("All API keys exhausted during enrichment.", file=sys.stderr)
        sys.exit(1)

    print(json.dumps(result, indent=2))
    sys.exit(0)


if __name__ == "__main__":
    main()
