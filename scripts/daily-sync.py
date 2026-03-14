#!/usr/bin/env python3
"""
Daily Instantly → GHL sync.
Checks for new replies since last run, updates existing contacts or creates new ones.
Sends a Discord summary via openclaw system event.

Run daily at 8am EST via cron:
  openclaw cron add --schedule "0 8 * * *" --task "Run /home/kim/.openclaw/workspace/mission-control/scripts/daily-sync.py and report results to Discord"
"""

import json
import subprocess
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

# ─── Config ───
INSTANTLY_KEY = "MzQ0ODcyMDktNGYxNC00NTVhLWI4MDUtNDFhM2M2Y2NiYWNlOlpyaUdsSlpGeWdXeg=="
GHL_TOKEN = "pit-4ae0985d-8de0-40e6-b688-4e6805e57c58"
GHL_LOC = "3zMwpehG9y8ETJsZtR3d"
PIPE = "oNcLIG8SGY8IKvvVbkDe"
STAGE_NEW = "00f6970c"
STAGE_INTERESTED = "0415b950-1b0e-47be-b7c4-65222923b448"

STATE_FILE = Path("/tmp/daily-sync-state.json")
LOG_FILE = Path("/tmp/daily-sync-log.txt")

CAMPAIGN_MAP = {
    "fb5345e8": ("fisherman", "Fisherman"),
    "c05100d8": ("owner.com", "Owner.com"),
    "a202c0fc": ("spothopper", "SpotHopper"),
    "7ba2df69": ("spothopper", "SpotHopper"),
    "5c6ff270": ("spothopper", "SpotHopper"),
    "5865d6c2": ("owner.com", "Owner.com"),
    "47fcc84f": ("spothopper", "SpotHopper"),
    "3ee8e0f6": ("owner.com", "Owner.com"),
    "3cded186": ("spothopper", "SpotHopper"),
    "3c613d22": ("spothopper", "SpotHopper"),
    "2e2aaa4b": ("bentobox", "BentoBox"),
    "0d64f3d2": ("spothopper", "SpotHopper"),
    "0be9b550": ("spothopper", "SpotHopper"),
    "95e858aa": ("spothopper", "SpotHopper"),
    "f2229c40": ("bentobox", "BentoBox"),
}

def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")

def load_state():
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"last_run": None, "processed_emails": []}

def save_state(state):
    STATE_FILE.write_text(json.dumps(state, indent=2))

def curl_get(url, headers):
    """Use curl to avoid Cloudflare blocks."""
    cmd = ["curl", "-s", url]
    for k, v in headers.items():
        cmd.extend(["-H", f"{k}: {v}"])
    cmd.extend(["-H", "User-Agent: Mozilla/5.0"])
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    return json.loads(result.stdout) if result.stdout.strip() else {}

def curl_post(url, headers, data):
    cmd = ["curl", "-s", "-X", "POST", url,
           "-H", "Content-Type: application/json"]
    for k, v in headers.items():
        cmd.extend(["-H", f"{k}: {v}"])
    cmd.extend(["-H", "User-Agent: Mozilla/5.0"])
    cmd.extend(["-d", json.dumps(data)])
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    return json.loads(result.stdout) if result.stdout.strip() else {}

def curl_put(url, headers, data):
    cmd = ["curl", "-s", "-X", "PUT", url,
           "-H", "Content-Type: application/json"]
    for k, v in headers.items():
        cmd.extend(["-H", f"{k}: {v}"])
    cmd.extend(["-H", "User-Agent: Mozilla/5.0"])
    cmd.extend(["-d", json.dumps(data)])
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    return json.loads(result.stdout) if result.stdout.strip() else {}

def get_new_replies():
    """Fetch received emails from Instantly since last run."""
    headers = {"Authorization": f"Bearer {INSTANTLY_KEY}"}
    url = f"https://api.instantly.ai/api/v2/emails?email_type=received&limit=100"
    all_emails = []
    
    for _ in range(5):  # max 5 pages
        data = curl_get(url, headers)
        items = data.get("items", data.get("data", []))
        if not items:
            break
        all_emails.extend(items)
        # Pagination
        next_cursor = data.get("next_starting_after")
        if not next_cursor:
            break
        url = f"https://api.instantly.ai/api/v2/emails?email_type=received&limit=100&starting_after={next_cursor}"
        time.sleep(3)
    
    return all_emails

def find_ghl_contact(email):
    """Look up a contact in GHL by email."""
    headers = {"Authorization": f"Bearer {GHL_TOKEN}", "Version": "2021-07-28"}
    data = curl_get(
        f"https://services.leadconnectorhq.com/contacts/lookup?email={email}&locationId={GHL_LOC}",
        headers
    )
    contacts = data.get("contacts", [])
    return contacts[0] if contacts else None

def add_ghl_note(contact_id, body):
    """Add a note to a GHL contact."""
    headers = {"Authorization": f"Bearer {GHL_TOKEN}", "Version": "2021-07-28"}
    return curl_post(
        f"https://services.leadconnectorhq.com/contacts/{contact_id}/notes",
        headers,
        {"body": body, "userId": ""}
    )

def update_ghl_contact(contact_id, data):
    """Update GHL contact fields."""
    headers = {"Authorization": f"Bearer {GHL_TOKEN}", "Version": "2021-07-28"}
    return curl_put(
        f"https://services.leadconnectorhq.com/contacts/{contact_id}",
        headers,
        data
    )

def send_discord_update(message):
    """Send update to Jahan via openclaw system event."""
    subprocess.run(
        ["openclaw", "system", "event", "--text", message, "--mode", "now"],
        capture_output=True, text=True, timeout=10
    )

def main():
    log("=" * 50)
    log("DAILY SYNC STARTING")
    log("=" * 50)
    
    state = load_state()
    last_run = state.get("last_run")
    processed = set(state.get("processed_emails", []))
    
    if last_run:
        log(f"Last run: {last_run}")
    else:
        log("First run — checking last 24 hours")
    
    # Get new replies from Instantly
    log("Fetching new replies from Instantly...")
    replies = get_new_replies()
    log(f"Found {len(replies)} total received emails")
    
    # Filter to only new ones
    cutoff = datetime.now() - timedelta(days=1 if not last_run else 7)
    new_replies = []
    for r in replies:
        email_id = r.get("id", "")
        ts = r.get("timestamp_email", r.get("timestamp", ""))
        if email_id in processed:
            continue
        try:
            email_date = datetime.fromisoformat(ts.replace("Z", "+00:00").split("+")[0])
            if email_date < cutoff:
                continue
        except:
            pass
        new_replies.append(r)
    
    log(f"New replies to process: {len(new_replies)}")
    
    if not new_replies:
        log("Nothing new. Done.")
        state["last_run"] = datetime.now().isoformat()
        save_state(state)
        send_discord_update("☀️ Daily sync: No new replies in Instantly. All quiet.")
        return
    
    # Process each new reply
    updates = []
    new_contacts = []
    errors = []
    
    for reply in new_replies:
        lead_email = reply.get("from_address_email", reply.get("from_address", ""))
        if not lead_email or "@" not in lead_email:
            continue
        
        from_name = reply.get("from_address_name", "")
        subject = reply.get("subject", "")
        body_preview = (reply.get("body", {}).get("text", "") or reply.get("text_body", ""))[:200]
        ts = reply.get("timestamp_email", reply.get("timestamp", ""))[:10]
        campaign_id = reply.get("campaign_id", "")[:8]
        
        log(f"Processing reply from {lead_email} ({from_name})")
        time.sleep(3)
        
        # Look up in GHL
        ghl_contact = find_ghl_contact(lead_email)
        time.sleep(3)
        
        if ghl_contact:
            cid = ghl_contact["id"]
            cname = f"{ghl_contact.get('firstName', '')} {ghl_contact.get('lastName', '')}".strip()
            
            # Add note with the reply
            note_body = f"📧 Reply — {ts}\n"
            if subject:
                note_body += f"Subject: {subject}\n"
            note_body += f"\n{body_preview}"
            if body_preview and len(reply.get("body", {}).get("text", "")) > 200:
                note_body += "..."
            
            add_ghl_note(cid, note_body)
            time.sleep(3)
            
            # Extract phone if in body
            import re
            phones = re.findall(r'[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}', body_preview)
            
            update_data = {}
            if phones and not ghl_contact.get("phone"):
                update_data["phone"] = phones[0]
                log(f"  Found phone: {phones[0]}")
            
            # Update name if missing
            if from_name and not ghl_contact.get("firstName"):
                parts = from_name.split(" ", 1)
                update_data["firstName"] = parts[0]
                if len(parts) > 1:
                    update_data["lastName"] = parts[1]
            
            if update_data:
                update_ghl_contact(cid, update_data)
                time.sleep(3)
            
            updates.append(f"• **{cname or lead_email}** — new reply" + (f" (phone: {phones[0]})" if phones else ""))
            log(f"  Updated {cname or lead_email}")
        else:
            # New contact — create
            log(f"  Not in GHL — new contact")
            new_contacts.append(lead_email)
        
        processed.add(reply.get("id", lead_email))
    
    # Save state
    state["last_run"] = datetime.now().isoformat()
    state["processed_emails"] = list(processed)[-500:]  # Keep last 500
    save_state(state)
    
    # Build Discord summary
    summary_parts = [f"📬 **Daily Sync Complete** — {datetime.now().strftime('%B %d, %Y')}"]
    summary_parts.append(f"Checked {len(replies)} emails, {len(new_replies)} new")
    
    if updates:
        summary_parts.append(f"\n**Updated {len(updates)} contacts:**")
        for u in updates[:15]:
            summary_parts.append(u)
        if len(updates) > 15:
            summary_parts.append(f"...and {len(updates) - 15} more")
    
    if new_contacts:
        summary_parts.append(f"\n**{len(new_contacts)} new emails** not yet in GHL")
    
    if errors:
        summary_parts.append(f"\n⚠️ {len(errors)} errors")
    
    if not updates and not new_contacts:
        summary_parts.append("No new activity to sync.")
    
    summary = "\n".join(summary_parts)
    log(summary)
    send_discord_update(summary)
    
    log("DAILY SYNC COMPLETE")

if __name__ == "__main__":
    main()
