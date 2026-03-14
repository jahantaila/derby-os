#!/usr/bin/env python3
"""Instantly → GHL sync runner. Uses pre-collected leads list."""

import json, subprocess, time, re, sys, os
from datetime import datetime

IKEY = "MzQ0ODcyMDktNGYxNC00NTVhLWI4MDUtNDFhM2M2Y2NiYWNlOlpyaUdsSlpGeWdXeg=="
GKEY = "pit-4ae0985d-8de0-40e6-b688-4e6805e57c58"
LOC = "3zMwpehG9y8ETJsZtR3d"
PIPE = "oNcLIG8SGY8IKvvVbkDe"
STAGE = "0415b950-1b0e-47be-b7c4-65222923b448"

CAMP_MAP = {
    "fb5345e8": ("fisherman", "Fisherman", "FISHERMAN STEAL CUSTOMERS"),
    "c05100d8": ("owner.com", "Owner.com", "OWNER STEAL CUSTOMERS 2"),
    "a202c0fc": ("spothopper", "SpotHopper", "ASGARI SPOTHOPPER"),
    "7ba2df69": ("spothopper", "SpotHopper", "LOUISVILLE SPOTHOPPER"),
    "5c6ff270": ("spothopper", "SpotHopper", "NEW SPOTHOPPER -- STEAL CUSTOMERS"),
    "5865d6c2": ("owner.com", "Owner.com", "OWNER STEAL CUSTOMERS"),
    "47fcc84f": ("spothopper", "SpotHopper", "Follow Up With Interested SpotHopper Leads"),
    "3ee8e0f6": ("owner.com", "Owner.com", "Follow Up With Interested Owner Leads"),
    "3cded186": ("spothopper", "SpotHopper", "SPOTHOPPER STEAL CUSTOMERS 2"),
    "3c613d22": ("spothopper", "SpotHopper", "Indy Spothopper"),
    "2e2aaa4b": ("bentobox", "BentoBox", "BentoBox Steal Customers 2"),
    "1d47e813": ("cold-email", "Unknown", "Instantly 100 Leads"),
    "0d64f3d2": ("spothopper", "SpotHopper", "NEW YORK SPOTHOPPER"),
    "0be9b550": ("spothopper", "SpotHopper", "SPOTHOPPER - MARCH 2026"),
    "95e858aa": ("spothopper", "SpotHopper", "SPOTHOPPER Campaign"),
    "f2229c40": ("bentobox", "BentoBox", "BENTOBOX Campaign"),
}

FREE_PROVIDERS = {"gmail.com","yahoo.com","hotmail.com","outlook.com","aol.com","icloud.com","comcast.net","att.net","verizon.net","ymail.com","mail.com","earthlink.net","mchsi.com","bellsouth.net","roadrunner.com","myyahoo.com"}

BUSINESS_WORDS = {"restaurant","pizza","grill","kitchen","cafe","bar","pub","deli","bistro","tavern","lounge","bbq","taco","sushi","ramen","inc","llc","group","house","club","market","bakery","brew","catering","food","burger","steak","wok","hot","pot","smoke","wing","chicken","seafood","mexican","italian","indian","thai","chinese","japanese","korean","vietnamese","brazilian","french","greek","mediterranean"}

def curl_get(url, headers):
    cmd = ["curl", "-s", url]
    for k, v in headers.items():
        cmd.extend(["-H", f"{k}: {v}"])
    r = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(r.stdout)

def curl_post(url, headers, data):
    cmd = ["curl", "-s", "-X", "POST", url]
    for k, v in headers.items():
        cmd.extend(["-H", f"{k}: {v}"])
    cmd.extend(["-H", "Content-Type: application/json", "-d", json.dumps(data, ensure_ascii=True)])
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return json.loads(r.stdout) if r.stdout.strip() else {"error": "empty response"}
    except Exception as e:
        return {"error": str(e)}

GHL_HEADERS = {"Authorization": f"Bearer {GKEY}", "Version": "2021-07-28", "User-Agent": "Mozilla/5.0"}
INST_HEADERS = {"Authorization": f"Bearer {IKEY}"}

def check_ghl_exists(email):
    time.sleep(3)
    d = curl_get(f"https://services.leadconnectorhq.com/contacts/?locationId={LOC}&query={email}&limit=1", GHL_HEADERS)
    return len(d.get("contacts", [])) > 0

def get_emails(email):
    time.sleep(3)
    return curl_get(f"https://api.instantly.ai/api/v2/emails?lead={email}&limit=50", INST_HEADERS)

def extract_name(emails_data, from_name, email):
    first, last = "", ""
    for e in emails_data:
        if e.get("from_address_email") == email:
            body = (e.get("body") or {}).get("text", "") or ""
            lines = body.strip().split("\n")
            for i, line in enumerate(lines):
                l = line.strip().lower()
                if l.startswith("thanks,") or l.startswith("thank you,") or l.startswith("best,") or l.startswith("regards,") or l.startswith("sincerely,"):
                    for j in range(i+1, min(i+3, len(lines))):
                        c = lines[j].strip()
                        if c and len(c.split()) <= 4 and "@" not in c and not c.startswith("On ") and not c.startswith(">"):
                            parts = c.split()
                            first = parts[0]
                            last = " ".join(parts[1:]) if len(parts) > 1 else ""
                            return first, last
                if "sent from my" in l:
                    for j in range(max(0, i-2), i):
                        c = lines[j].strip()
                        if c and len(c.split()) <= 4 and "@" not in c and not c.startswith(">"):
                            parts = c.split()
                            if len(parts) >= 2:
                                first, last = parts[0], " ".join(parts[1:])
                                return first, last

    if not first and from_name:
        parts = from_name.strip().split()
        is_biz = any(w in from_name.lower() for w in BUSINESS_WORDS)
        if not is_biz and len(parts) <= 3 and parts[0][0:1].isupper():
            first = parts[0]
            last = " ".join(parts[1:]) if len(parts) > 1 else ""
    
    return first or "No Name", last

def extract_phone(emails_data, email):
    for e in emails_data:
        if e.get("from_address_email") == email:
            body = (e.get("body") or {}).get("text", "") or ""
            phones = re.findall(r'[\(]?\d{3}[\)\-\.\s]?\s?\d{3}[\-\.\s]\d{4}', body)
            if phones:
                raw = re.sub(r'[^\d]', '', phones[0])
                if len(raw) == 10:
                    return f"+1{raw}"
    return ""

def extract_company(email_addr, from_name, first, last):
    domain = email_addr.split("@")[1] if "@" in email_addr else ""
    prefix = email_addr.split("@")[0] if "@" in email_addr else ""
    
    if domain and domain not in FREE_PROVIDERS:
        return domain.split(".")[0].replace("-", " ").replace("_", " ").title()
    
    if from_name:
        is_biz = any(w in from_name.lower() for w in BUSINESS_WORDS)
        full_name = f"{first} {last}".strip()
        if is_biz or (from_name.strip() != full_name and from_name.strip() != first):
            return from_name.strip()
    
    cleaned = prefix.replace(".", " ").replace("_", " ").replace("-", " ")
    # Capitalize properly
    return " ".join(w.capitalize() for w in cleaned.split())

def strip_quotes(body):
    lines = []
    for line in body.split("\n"):
        if line.strip().startswith("On ") and "wrote:" in line:
            break
        if line.strip().startswith("> "):
            break
        lines.append(line)
    return "\n".join(lines).strip()

def create_notes(cid, emails_data, eaccount, campaign_id):
    cid8 = campaign_id[:8]
    _, _, camp_name = CAMP_MAP.get(cid8, ("cold-email", "Unknown", "Unknown Campaign"))
    
    sorted_emails = sorted(emails_data, key=lambda x: x.get("timestamp_email", ""))
    
    for e in sorted_emails:
        ts = e.get("timestamp_email", "")[:10]
        fr = e.get("from_address_email", "")
        from_json = (e.get("from_address_json") or [{}])[0]
        from_display = from_json.get("name", fr)
        ea = e.get("eaccount", eaccount)
        
        body = (e.get("body") or {}).get("text", "") or ""
        clean = strip_quotes(body)
        if not clean:
            clean = "(Outreach email sent from Instantly)"
        
        try:
            dt = datetime.fromisoformat(ts)
            date_str = dt.strftime("%B %d, %Y")
        except:
            date_str = ts
        
        note_body = f"📧 Email — {date_str}\nOutreach Account: {ea}\nCampaign: {camp_name}\n\nFrom: {from_display} <{fr}>\n\n{clean}"
        
        # Check for phone in lead's email
        if fr != ea and fr != eaccount:
            phones = re.findall(r'[\(]?\d{3}[\)\-\.\s]?\s?\d{3}[\-\.\s]\d{4}', clean)
            if phones:
                note_body += f"\n\n📞 PHONE: {phones[0]}"
        
        time.sleep(5)
        curl_post(f"https://services.leadconnectorhq.com/contacts/{cid}/notes", GHL_HEADERS, {"body": note_body})

# ===== MAIN =====
with open("/home/kim/.openclaw/workspace/mission-control/data/interested-leads.json") as f:
    leads = json.load(f)

# State tracking
state_file = "/home/kim/.openclaw/workspace/mission-control/data/sync-state.json"
if os.path.exists(state_file):
    with open(state_file) as f:
        state = json.load(f)
else:
    state = {"processed": [], "created": [], "skipped": [], "failed": []}

total = len(leads)
created = len(state["created"])
skipped = len(state["skipped"])
failed = len(state["failed"])
processed = len(state["processed"])

print(f"Starting sync: {total} leads total, {processed} already processed")
sys.stdout.flush()

for i, (email, info) in enumerate(sorted(leads.items())):
    if email in state["processed"]:
        continue

    processed += 1
    try:
        from_name = (info.get("from_json") or [{}])[0].get("name", "") if isinstance(info.get("from_json"), list) else info.get("from_json", {}).get("name", "") if isinstance(info.get("from_json"), dict) else ""
        campaign_id = info.get("campaign_id", "")
        eaccount = info.get("eaccount", "")

        # Check GHL
        if check_ghl_exists(email):
            skipped += 1
            state["processed"].append(email)
            state["skipped"].append(email)
            if processed % 10 == 0:
                print(f"PROGRESS: {processed}/{total} | created={created} skipped={skipped} failed={failed}")
                sys.stdout.flush()
            continue

        # Get emails
        emails_resp = get_emails(email)
        emails_data = emails_resp.get("items", [])

        # Extract data
        first, last = extract_name(emails_data, from_name, email)
        phone = extract_phone(emails_data, email)
        company = extract_company(email, from_name, first, last)

        cid8 = campaign_id[:8]
        comp_tag, comp_provider, _ = CAMP_MAP.get(cid8, ("cold-email", "Unknown", "Unknown"))

        if first == "No Name":
            opp_name = f"No Name - {company}"
        elif last:
            opp_name = f"{first} {last} - {company}"
        else:
            opp_name = f"{first} - {company}"

        print(f"CREATING: {opp_name} | tags: cold-email,{comp_tag} | phone: {phone or 'none'}")
        sys.stdout.flush()

        # Create contact
        contact_data = {
            "firstName": first,
            "lastName": last,
            "email": email,
            "companyName": company,
            "locationId": LOC,
            "tags": ["cold-email", comp_tag] if comp_tag != "cold-email" else ["cold-email"],
            "customFields": [{"id": "dLDNSAZYHk5qihoOx5oP", "value": "Cold Email"}]
        }
        if phone:
            contact_data["phone"] = phone
            contact_data["customFields"].append({"id": "i1zLB9YndvgIPXIACvZA", "value": "Given by Lead"})
        if comp_provider != "Unknown":
            contact_data["customFields"].append({"id": "gziZOwyG3l2wDoxIyFVM", "value": comp_provider})

        time.sleep(5)
        resp = curl_post("https://services.leadconnectorhq.com/contacts/", GHL_HEADERS, contact_data)
        cid = resp.get("contact", {}).get("id", "")

        if not cid:
            print(f"  FAILED: {resp}")
            sys.stdout.flush()
            failed += 1
            state["processed"].append(email)
            state["failed"].append(email)
            continue

        # Create opportunity
        time.sleep(5)
        curl_post("https://services.leadconnectorhq.com/opportunities/", GHL_HEADERS, {
            "pipelineId": PIPE, "locationId": LOC, "name": opp_name,
            "pipelineStageId": STAGE, "status": "open", "contactId": cid
        })

        # Create notes
        if emails_data:
            try:
                create_notes(cid, emails_data, eaccount, campaign_id)
            except Exception as e:
                print(f"  Notes error (continuing): {e}")
                sys.stdout.flush()

        created += 1
        state["processed"].append(email)
        state["created"].append(email)

    except Exception as e:
        print(f"  ERROR on {email}: {e}")
        sys.stdout.flush()
        failed += 1
        state["processed"].append(email)
        state["failed"].append(email)

    if processed % 10 == 0:
        print(f"PROGRESS: {processed}/{total} | created={created} skipped={skipped} failed={failed}")
        sys.stdout.flush()

    # Save state every 5 leads
    if processed % 5 == 0:
        with open(state_file, "w") as f:
            json.dump(state, f)

# Final save
with open(state_file, "w") as f:
    json.dump(state, f)

print(f"\n{'='*50}")
print(f"SYNC COMPLETE")
print(f"Total: {total}")
print(f"Created: {created}")
print(f"Skipped: {skipped}")
print(f"Failed: {failed}")
print(f"{'='*50}")
