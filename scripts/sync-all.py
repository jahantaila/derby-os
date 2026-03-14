#!/usr/bin/env python3
"""Instantly → GHL Full Sync - Written by Kimberly"""

import json, subprocess, time, re, sys, os
from datetime import datetime

IKEY = "MzQ0ODcyMDktNGYxNC00NTVhLWI4MDUtNDFhM2M2Y2NiYWNlOlpyaUdsSlpGeWdXeg=="
GKEY = "pit-4ae0985d-8de0-40e6-b688-4e6805e57c58"
LOC = "3zMwpehG9y8ETJsZtR3d"
PIPE = "oNcLIG8SGY8IKvvVbkDe"
STAGE = "0415b950-1b0e-47be-b7c4-65222923b448"

STATE_FILE = "/tmp/sync-state.json"
LOG_FILE = "/tmp/sync-log.txt"

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
    "1d47e813": ("cold-email", "Unknown"),
    "0d64f3d2": ("spothopper", "SpotHopper"),
    "0be9b550": ("spothopper", "SpotHopper"),
    "95e858aa": ("spothopper", "SpotHopper"),
    "f2229c40": ("bentobox", "BentoBox"),
}

CAMPAIGN_NAMES = {
    "fb5345e8": "FISHERMAN STEAL CUSTOMERS",
    "c05100d8": "OWNER STEAL CUSTOMERS 2",
    "a202c0fc": "ASGARI SPOTHOPPER",
    "7ba2df69": "LOUISVILLE SPOTHOPPER",
    "5c6ff270": "NEW SPOTHOPPER -- STEAL CUSTOMERS",
    "5865d6c2": "OWNER STEAL CUSTOMERS",
    "47fcc84f": "Follow Up With Interested SpotHopper Leads",
    "3ee8e0f6": "Follow Up With Interested Owner Leads",
    "3cded186": "SPOTHOPPER STEAL CUSTOMERS 2",
    "3c613d22": "Indy Spothopper",
    "2e2aaa4b": "BentoBox Steal Customers 2",
    "1d47e813": "Instantly 100 Leads",
    "0d64f3d2": "NEW YORK SPOTHOPPER",
    "0be9b550": "SPOTHOPPER - MARCH 2026",
    "95e858aa": "SPOTHOPPER Campaign",
    "f2229c40": "BENTOBOX Campaign",
}

FREE_PROVIDERS = {"gmail.com","yahoo.com","hotmail.com","outlook.com","aol.com","icloud.com","comcast.net","att.net","verizon.net","ymail.com","mail.com","earthlink.net","mchsi.com","bellsouth.net","roadrunner.com","myyahoo.com"}

BUSINESS_WORDS = {"restaurant","pizza","grill","kitchen","cafe","bar","pub","deli","bistro","tavern","lounge","bbq","taco","sushi","ramen","inc","llc","group","house","club","market","bakery","brew","catering","taphouse","steakhouse","eatery","waffles","cornbread","hot","soul","fresh","empire","smoke","belly"}

def log(msg):
    line = f"[{datetime.now().strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")

def curl_get(url, headers):
    """GET request via curl"""
    cmd = ["curl", "-s", "--max-time", "30", url]
    for k, v in headers.items():
        cmd.extend(["-H", f"{k}: {v}"])
    r = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except:
        return {"error": r.stdout[:200]}

def curl_post(url, headers, data):
    """POST request via curl"""
    cmd = ["curl", "-s", "--max-time", "30", "-X", "POST", url,
           "-H", "Content-Type: application/json"]
    for k, v in headers.items():
        cmd.extend(["-H", f"{k}: {v}"])
    cmd.extend(["-d", json.dumps(data)])
    r = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except:
        return {"error": r.stdout[:200]}

def instantly_get(path):
    return curl_get(f"https://api.instantly.ai/api/v2{path}",
                    {"Authorization": f"Bearer {IKEY}"})

def ghl_get(path):
    return curl_get(f"https://services.leadconnectorhq.com{path}",
                    {"Authorization": f"Bearer {GKEY}", "Version": "2021-07-28", "User-Agent": "Mozilla/5.0"})

def ghl_post(path, data):
    return curl_post(f"https://services.leadconnectorhq.com{path}",
                     {"Authorization": f"Bearer {GKEY}", "Version": "2021-07-28", "User-Agent": "Mozilla/5.0"}, data)

def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {"processed": [], "created": 0, "skipped": 0, "failed": 0}

def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)

def extract_name_from_emails(emails, lead_email, from_name):
    """Extract real person name from email content"""
    first, last = "", ""
    
    for e in emails:
        if e.get("from_address_email") != lead_email:
            continue
        body = (e.get("body") or {}).get("text", "") or ""
        lines = body.strip().split("\n")
        
        for i, line in enumerate(lines):
            line_s = line.strip().lower()
            # Signature patterns
            if any(line_s.startswith(p) for p in ["thanks,", "thank you,", "best,", "regards,", "cheers,"]):
                for j in range(i+1, min(i+3, len(lines))):
                    candidate = lines[j].strip()
                    if candidate and len(candidate.split()) <= 4 and "@" not in candidate and not candidate.startswith("On "):
                        parts = candidate.split()
                        first = parts[0]
                        last = " ".join(parts[1:]) if len(parts) > 1 else ""
                        return first, last
            # "Sent from my iPhone. Name"
            if "sent from my" in line_s:
                for j in range(max(0, i-2), i):
                    candidate = lines[j].strip()
                    if candidate and len(candidate.split()) <= 4 and "@" not in candidate and ">" not in candidate:
                        parts = candidate.split()
                        if len(parts) >= 2:
                            first = parts[0]
                            last = " ".join(parts[1:])
                            return first, last
    
    # Fall back to from_address_json name
    if from_name:
        parts = from_name.strip().split()
        is_biz = any(w in from_name.lower() for w in BUSINESS_WORDS)
        if not is_biz and len(parts) <= 3 and parts[0][0:1].isupper():
            first = parts[0]
            last = " ".join(parts[1:]) if len(parts) > 1 else ""
            return first, last
    
    return "No Name", ""

def extract_phone(emails, lead_email):
    """Extract phone from email bodies"""
    for e in emails:
        if e.get("from_address_email") != lead_email:
            continue
        body = (e.get("body") or {}).get("text", "") or ""
        phones = re.findall(r'[\(]?\d{3}[\)\-\.\s]?\s?\d{3}[\-\.\s]\d{4}', body)
        if phones:
            raw = re.sub(r'[^\d]', '', phones[0])
            if len(raw) == 10:
                return f"+1{raw}"
    return ""

def extract_company(lead_email, from_name, first_name, last_name):
    """Extract business name"""
    domain = lead_email.split("@")[1] if "@" in lead_email else ""
    prefix = lead_email.split("@")[0] if "@" in lead_email else ""
    
    if domain and domain not in FREE_PROVIDERS:
        return domain.split(".")[0].replace("-", " ").replace("_", " ").title()
    
    if from_name:
        is_biz = any(w in from_name.lower() for w in BUSINESS_WORDS)
        full_name = f"{first_name} {last_name}".strip()
        if is_biz or (from_name.strip() != full_name and from_name.strip() != first_name):
            return from_name.strip()
    
    # From email prefix
    clean = prefix.replace(".", " ").replace("_", " ").replace("-", " ")
    clean = re.sub(r'\d+$', '', clean).strip()
    if clean.lower() not in {"gmail", "yahoo", "hotmail", "info", "contact", "admin", "hello", "order", "orders", "support"}:
        return clean.title()
    
    return "Unknown Business"

def strip_quoted(text):
    """Strip quoted replies from email"""
    lines = text.split("\n")
    clean = []
    for line in lines:
        if line.strip().startswith("On ") and "wrote:" in line:
            break
        if line.strip().startswith("> "):
            break
        clean.append(line)
    return "\n".join(clean).strip()

def main():
    # Clear log
    with open(LOG_FILE, "w") as f:
        f.write("")
    
    state = load_state()
    already_done = set(state["processed"])
    
    # Step 1: Collect interested leads
    log("=== Step 1: Collecting interested leads from Instantly ===")
    leads = {}
    next_page = None
    page = 0
    
    while True:
        page += 1
        url = "/emails?email_type=received&limit=100"
        if next_page:
            url += f"&starting_after={next_page}"
        
        data = instantly_get(url)
        if "error" in data:
            log(f"  Instantly error: {data}")
            time.sleep(10)
            continue
        
        for e in data.get("items", []):
            if e.get("i_status") == 1:
                email = e.get("from_address_email", "")
                if email and email not in leads:
                    leads[email] = {
                        "from_name": (e.get("from_address_json") or [{}])[0].get("name", ""),
                        "campaign_id": e.get("campaign_id", ""),
                        "eaccount": e.get("eaccount", ""),
                    }
        
        next_page = data.get("next_starting_after", "")
        if not next_page:
            break
        
        log(f"  Page {page}: {len(leads)} leads so far")
        time.sleep(3)
    
    log(f"Found {len(leads)} unique interested leads")
    
    # Step 2: Process each lead
    total = 0
    created = state["created"]
    skipped = state["skipped"]
    failed = state["failed"]
    
    for email, info in sorted(leads.items()):
        total += 1
        
        if email in already_done:
            skipped += 1
            continue
        
        # Check GHL
        time.sleep(3)
        ghl_resp = ghl_get(f"/contacts/?locationId={LOC}&query={email}&limit=1")
        contacts = ghl_resp.get("contacts", [])
        
        if contacts:
            skipped += 1
            state["processed"].append(email)
            if total % 10 == 0:
                log(f"PROGRESS: {total}/{len(leads)} | created={created} skipped={skipped} failed={failed}")
                save_state(state)
            continue
        
        # Fetch emails
        time.sleep(3)
        emails_data = instantly_get(f"/emails?lead={email}&limit=50")
        emails = sorted(emails_data.get("items", []), key=lambda x: x.get("timestamp_email", ""))
        
        # Extract data
        from_name = info["from_name"]
        campaign_id = info["campaign_id"]
        cid8 = campaign_id[:8]
        comp_tag, comp_provider = CAMPAIGN_MAP.get(cid8, ("cold-email", "Unknown"))
        camp_name = CAMPAIGN_NAMES.get(cid8, "Unknown Campaign")
        
        first, last = extract_name_from_emails(emails, email, from_name)
        phone = extract_phone(emails, email)
        company = extract_company(email, from_name, first, last)
        
        if first == "No Name":
            opp_name = f"No Name - {company}"
        elif last:
            opp_name = f"{first} {last} - {company}"
        else:
            opp_name = f"{first} - {company}"
        
        log(f"CREATING: {opp_name} | tags: cold-email,{comp_tag} | phone: {phone or 'none'}")
        
        # Create contact
        contact_data = {
            "firstName": first,
            "lastName": last,
            "email": email,
            "companyName": company,
            "locationId": LOC,
            "tags": ["cold-email", comp_tag] if comp_tag != "cold-email" else ["cold-email"],
            "customFields": [
                {"id": "dLDNSAZYHk5qihoOx5oP", "value": "Cold Email"},
            ]
        }
        if phone:
            contact_data["phone"] = phone
            contact_data["customFields"].append({"id": "i1zLB9YndvgIPXIACvZA", "value": "Given by Lead"})
        if comp_provider != "Unknown":
            contact_data["customFields"].append({"id": "gziZOwyG3l2wDoxIyFVM", "value": comp_provider})
        
        time.sleep(5)
        resp = ghl_post("/contacts/", contact_data)
        
        cid = (resp.get("contact") or {}).get("id", "")
        if not cid:
            log(f"  FAILED contact: {resp.get('error', resp.get('message', str(resp)[:100]))}")
            # Check if 403/rate limit
            if resp.get("statusCode") == 403 or "403" in str(resp):
                log("  Rate limited! Waiting 90s...")
                time.sleep(90)
            failed += 1
            state["processed"].append(email)
            if total % 10 == 0:
                save_state(state)
            continue
        
        # Create opportunity
        time.sleep(5)
        ghl_post("/opportunities/", {
            "pipelineId": PIPE,
            "locationId": LOC,
            "name": opp_name,
            "pipelineStageId": STAGE,
            "status": "open",
            "contactId": cid
        })
        
        # Create notes - one per email
        for e in emails:
            ts = e.get("timestamp_email", "")[:10]
            try:
                dt = datetime.fromisoformat(ts)
                date_str = dt.strftime("%B %d, %Y")
            except:
                date_str = ts
            
            fr = e.get("from_address_email", "")
            fr_name = (e.get("from_address_json") or [{}])[0].get("name", fr)
            eaccount = e.get("eaccount", info["eaccount"])
            
            body_text = (e.get("body") or {}).get("text", "") or ""
            clean = strip_quoted(body_text)
            if not clean:
                clean = "(Outreach email sent from Instantly)"
            
            note_body = f"📧 Email — {date_str}\nOutreach Account: {eaccount}\nCampaign: {camp_name}\n\nFrom: {fr_name} <{fr}>\n\n{clean}"
            
            # Add key info for lead replies
            if fr == email and phone:
                note_body += f"\n\n📞 PHONE: {phone}"
            
            time.sleep(5)
            ghl_post(f"/contacts/{cid}/notes", {"body": note_body})
        
        created += 1
        state["created"] = created
        state["skipped"] = skipped
        state["failed"] = failed
        state["processed"].append(email)
        
        if total % 10 == 0:
            log(f"PROGRESS: {total}/{len(leads)} | created={created} skipped={skipped} failed={failed}")
            save_state(state)
    
    save_state(state)
    log("=========================================")
    log(f"SYNC COMPLETE")
    log(f"Total processed: {total}")
    log(f"New contacts created: {created}")
    log(f"Skipped (already existed): {skipped}")
    log(f"Failed: {failed}")
    log("=========================================")
    
    # Signal completion
    subprocess.run(["openclaw", "system", "event", "--text",
                     f"Sync complete: {created} new leads created, {skipped} skipped, {failed} failed",
                     "--mode", "now"])

if __name__ == "__main__":
    main()
