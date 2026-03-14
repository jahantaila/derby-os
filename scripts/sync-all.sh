#!/bin/bash
# Instantly → GHL Full Sync
# Written by Kimberly — Jordan just runs this

IKEY="MzQ0ODcyMDktNGYxNC00NTVhLWI4MDUtNDFhM2M2Y2NiYWNlOlpyaUdsSlpGeWdXeg=="
GKEY="pit-4ae0985d-8de0-40e6-b688-4e6805e57c58"
LOC="3zMwpehG9y8ETJsZtR3d"
PIPE="oNcLIG8SGY8IKvvVbkDe"
STAGE="0415b950-1b0e-47be-b7c4-65222923b448"

CREATED=0
SKIPPED=0
FAILED=0
TOTAL=0

# Step 1: Collect all interested lead emails
echo "=== Step 1: Collecting all interested leads from Instantly ==="
LEADS_FILE="/tmp/instantly_leads.jsonl"
> "$LEADS_FILE"

NEXT=""
PAGE=0
while true; do
    PAGE=$((PAGE+1))
    URL="https://api.instantly.ai/api/v2/emails?email_type=received&limit=100"
    if [ -n "$NEXT" ]; then
        URL="${URL}&starting_after=${NEXT}"
    fi
    
    RESP=$(curl -s "$URL" -H "Authorization: Bearer $IKEY")
    
    # Extract interested leads and append to file
    echo "$RESP" | python3 -c "
import json,sys
d = json.load(sys.stdin)
for e in d.get('items',[]):
    if e.get('i_status') == 1:
        email = e.get('from_address_email','')
        if email:
            info = {
                'email': email,
                'name': (e.get('from_address_json') or [{}])[0].get('name',''),
                'campaign_id': e.get('campaign_id',''),
                'eaccount': e.get('eaccount','')
            }
            print(json.dumps(info))
" >> "$LEADS_FILE"
    
    NEXT=$(echo "$RESP" | python3 -c "import json,sys; print(json.load(sys.stdin).get('next_starting_after',''))" 2>/dev/null)
    
    if [ -z "$NEXT" ]; then
        break
    fi
    
    echo "  Page $PAGE done..."
    sleep 3
done

# Deduplicate by email
UNIQUE_FILE="/tmp/instantly_leads_unique.jsonl"
python3 -c "
import json
seen = {}
with open('$LEADS_FILE') as f:
    for line in f:
        d = json.loads(line.strip())
        email = d['email']
        if email not in seen:
            seen[email] = d
            print(json.dumps(d))
" > "$UNIQUE_FILE"

TOTAL_LEADS=$(wc -l < "$UNIQUE_FILE")
echo "Found $TOTAL_LEADS unique interested leads"
echo ""

# Campaign ID prefix → competitor tag mapping
get_competitor() {
    local cid="${1:0:8}"
    case "$cid" in
        fb5345e8) echo "fisherman|Fisherman" ;;
        c05100d8) echo "owner.com|Owner.com" ;;
        a202c0fc) echo "spothopper|SpotHopper" ;;
        7ba2df69) echo "spothopper|SpotHopper" ;;
        5c6ff270) echo "spothopper|SpotHopper" ;;
        5865d6c2) echo "owner.com|Owner.com" ;;
        47fcc84f) echo "spothopper|SpotHopper" ;;
        3ee8e0f6) echo "owner.com|Owner.com" ;;
        3cded186) echo "spothopper|SpotHopper" ;;
        3c613d22) echo "spothopper|SpotHopper" ;;
        2e2aaa4b) echo "bentobox|BentoBox" ;;
        1d47e813) echo "cold-email|Unknown" ;;
        0d64f3d2) echo "spothopper|SpotHopper" ;;
        0be9b550) echo "spothopper|SpotHopper" ;;
        95e858aa) echo "spothopper|SpotHopper" ;;
        f2229c40) echo "bentobox|BentoBox" ;;
        *) echo "cold-email|Unknown" ;;
    esac
}

# Step 2: Process each lead
echo "=== Step 2: Processing leads ==="
while IFS= read -r line; do
    TOTAL=$((TOTAL+1))
    
    EMAIL=$(echo "$line" | python3 -c "import json,sys; print(json.load(sys.stdin)['email'])")
    FROM_NAME=$(echo "$line" | python3 -c "import json,sys; print(json.load(sys.stdin)['name'])")
    CAMPAIGN_ID=$(echo "$line" | python3 -c "import json,sys; print(json.load(sys.stdin)['campaign_id'])")
    EACCOUNT=$(echo "$line" | python3 -c "import json,sys; print(json.load(sys.stdin)['eaccount'])")
    
    # Check if exists in GHL
    sleep 3
    EXISTS=$(curl -s "https://services.leadconnectorhq.com/contacts/?locationId=$LOC&query=$EMAIL&limit=1" \
        -H "Authorization: Bearer $GKEY" -H "Version: 2021-07-28" -H "User-Agent: Mozilla/5.0" | \
        python3 -c "import json,sys; print(len(json.load(sys.stdin).get('contacts',[])))")
    
    if [ "$EXISTS" != "0" ]; then
        SKIPPED=$((SKIPPED+1))
        if [ $((TOTAL % 10)) -eq 0 ]; then
            echo "PROGRESS: $TOTAL/$TOTAL_LEADS | created=$CREATED skipped=$SKIPPED failed=$FAILED"
        fi
        continue
    fi
    
    # Fetch full email thread
    sleep 3
    EMAILS_JSON=$(curl -s "https://api.instantly.ai/api/v2/emails?lead=$EMAIL&limit=50" \
        -H "Authorization: Bearer $IKEY")
    
    # Extract contact data from emails
    CONTACT_DATA=$(echo "$EMAILS_JSON" | python3 -c "
import json, sys, re

data = json.load(sys.stdin)
emails = data.get('items', [])

# Sort by date
emails.sort(key=lambda x: x.get('timestamp_email', ''))

first_name = ''
last_name = ''
company = ''
phone = ''
from_name = '''$FROM_NAME'''

# Check received emails for real name and phone
for e in emails:
    fr = e.get('from_address_email', '')
    body = e.get('body', {}).get('text', '') or ''
    
    # Only check lead's emails (not our outreach)
    if fr == '$EMAIL':
        # Look for phone
        phones = re.findall(r'[\(]?\d{3}[\)\-\.\s]?\s?\d{3}[\-\.\s]\d{4}', body)
        if phones and not phone:
            raw = re.sub(r'[^\d]', '', phones[0])
            if len(raw) == 10:
                phone = '+1' + raw
        
        # Look for name in signature
        lines = body.strip().split('\n')
        for i, line in enumerate(lines):
            line = line.strip()
            # Common signature patterns
            if line.lower().startswith('thanks,') or line.lower().startswith('thank you,'):
                # Next non-empty line is likely the name
                for j in range(i+1, min(i+3, len(lines))):
                    candidate = lines[j].strip()
                    if candidate and len(candidate.split()) <= 4 and not candidate.startswith('On ') and '@' not in candidate:
                        parts = candidate.split()
                        if len(parts) >= 2:
                            first_name = parts[0]
                            last_name = ' '.join(parts[1:])
                        elif len(parts) == 1:
                            first_name = parts[0]
                        break
                break
            # Sent from iPhone pattern
            if 'sent from my' in line.lower():
                # Check nearby lines for name
                for j in range(max(0, i-2), i):
                    candidate = lines[j].strip()
                    if candidate and len(candidate.split()) <= 4 and not candidate.startswith('>') and '@' not in candidate and not candidate.startswith('On '):
                        parts = candidate.split()
                        if len(parts) >= 2:
                            first_name = parts[0]
                            last_name = ' '.join(parts[1:])
                        break

# If no name from signature, try from_address_json name
if not first_name and from_name:
    parts = from_name.strip().split()
    # Only use if it looks like a person name (not a business)
    if len(parts) <= 3:
        # Check if it might be a business name
        business_indicators = ['restaurant', 'pizza', 'grill', 'kitchen', 'cafe', 'bar', 'pub', 'deli', 'bistro', 'tavern', 'lounge', 'bbq', 'taco', 'sushi', 'ramen', 'inc', 'llc', 'group', 'house', 'club']
        is_business = any(ind in from_name.lower() for ind in business_indicators)
        if not is_business and parts[0][0].isupper():
            first_name = parts[0]
            if len(parts) >= 2:
                last_name = ' '.join(parts[1:])

if not first_name:
    first_name = 'No Name'

# Business name from email or from_name
email_addr = '$EMAIL'
domain = email_addr.split('@')[1] if '@' in email_addr else ''
email_prefix = email_addr.split('@')[0] if '@' in email_addr else ''

free_providers = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'comcast.net', 'att.net', 'verizon.net', 'ymail.com', 'mail.com', 'earthlink.net', 'mchsi.com', 'bellsouth.net']

if domain not in free_providers:
    # Use domain as business name
    company = domain.split('.')[0].replace('-', ' ').title()
elif from_name:
    # Check if from_name looks like a business
    business_indicators = ['restaurant', 'pizza', 'grill', 'kitchen', 'cafe', 'bar', 'pub', 'deli', 'bistro', 'tavern', 'lounge', 'bbq', 'taco', 'sushi', 'ramen', 'inc', 'llc', 'group', 'house', 'club', 'market', 'bakery', 'brew']
    if any(ind in from_name.lower() for ind in business_indicators) or from_name != f'{first_name} {last_name}'.strip():
        company = from_name
    else:
        # Try email prefix
        company = email_prefix.replace('.', ' ').replace('_', ' ').replace('-', ' ').title()
else:
    company = email_prefix.replace('.', ' ').replace('_', ' ').replace('-', ' ').title()

# Clean up
if company.lower() in ['gmail', 'yahoo', 'hotmail', 'outlook', 'aol']:
    company = email_prefix.replace('.', ' ').replace('_', ' ').replace('-', ' ').title()

result = {
    'firstName': first_name,
    'lastName': last_name,
    'company': company,
    'phone': phone
}
print(json.dumps(result))
")
    
    FIRST=$(echo "$CONTACT_DATA" | python3 -c "import json,sys; print(json.load(sys.stdin)['firstName'])")
    LAST=$(echo "$CONTACT_DATA" | python3 -c "import json,sys; print(json.load(sys.stdin)['lastName'])")
    COMPANY=$(echo "$CONTACT_DATA" | python3 -c "import json,sys; print(json.load(sys.stdin)['company'])")
    PHONE=$(echo "$CONTACT_DATA" | python3 -c "import json,sys; print(json.load(sys.stdin)['phone'])")
    
    # Get competitor tag
    COMP_INFO=$(get_competitor "$CAMPAIGN_ID")
    COMP_TAG=$(echo "$COMP_INFO" | cut -d'|' -f1)
    COMP_PROVIDER=$(echo "$COMP_INFO" | cut -d'|' -f2)
    
    # Build opportunity name
    if [ "$FIRST" = "No Name" ]; then
        OPP_NAME="No Name - $COMPANY"
    elif [ -n "$LAST" ]; then
        OPP_NAME="$FIRST $LAST - $COMPANY"
    else
        OPP_NAME="$FIRST - $COMPANY"
    fi
    
    echo "CREATING: $OPP_NAME | tags: cold-email,$COMP_TAG | phone: ${PHONE:-none}"
    
    # Build contact JSON
    PHONE_JSON=""
    if [ -n "$PHONE" ]; then
        PHONE_JSON="\"phone\":\"$PHONE\","
    fi
    
    PHONE_SOURCE=""
    if [ -n "$PHONE" ]; then
        PHONE_SOURCE=",{\"id\":\"i1zLB9YndvgIPXIACvZA\",\"value\":\"Given by Lead\"}"
    fi
    
    PROVIDER_FIELD=""
    if [ "$COMP_PROVIDER" != "Unknown" ]; then
        PROVIDER_FIELD=",{\"id\":\"gziZOwyG3l2wDoxIyFVM\",\"value\":\"$COMP_PROVIDER\"}"
    fi
    
    # Create contact
    sleep 5
    CONTACT_RESP=$(curl -s -X POST "https://services.leadconnectorhq.com/contacts/" \
        -H "Authorization: Bearer $GKEY" -H "Version: 2021-07-28" \
        -H "Content-Type: application/json" -H "User-Agent: Mozilla/5.0" \
        -d "{\"firstName\":\"$FIRST\",\"lastName\":\"$LAST\",\"email\":\"$EMAIL\",$PHONE_JSON\"companyName\":\"$COMPANY\",\"locationId\":\"$LOC\",\"tags\":[\"cold-email\",\"$COMP_TAG\"],\"customFields\":[{\"id\":\"dLDNSAZYHk5qihoOx5oP\",\"value\":\"Cold Email\"}$PROVIDER_FIELD$PHONE_SOURCE]}")
    
    CID=$(echo "$CONTACT_RESP" | python3 -c "import json,sys; print(json.load(sys.stdin).get('contact',{}).get('id',''))" 2>/dev/null)
    
    if [ -z "$CID" ]; then
        echo "  FAILED to create contact: $CONTACT_RESP"
        FAILED=$((FAILED+1))
        if [ $((TOTAL % 10)) -eq 0 ]; then
            echo "PROGRESS: $TOTAL/$TOTAL_LEADS | created=$CREATED skipped=$SKIPPED failed=$FAILED"
        fi
        continue
    fi
    
    # Create opportunity
    sleep 5
    curl -s -X POST "https://services.leadconnectorhq.com/opportunities/" \
        -H "Authorization: Bearer $GKEY" -H "Version: 2021-07-28" \
        -H "Content-Type: application/json" -H "User-Agent: Mozilla/5.0" \
        -d "{\"pipelineId\":\"$PIPE\",\"locationId\":\"$LOC\",\"name\":\"$OPP_NAME\",\"pipelineStageId\":\"$STAGE\",\"status\":\"open\",\"contactId\":\"$CID\"}" > /dev/null
    
    # Create notes — one per email
    sleep 3
    echo "$EMAILS_JSON" | python3 -c "
import json, sys

data = json.load(sys.stdin)
emails = sorted(data.get('items', []), key=lambda x: x.get('timestamp_email', ''))

campaign_names = {
    'fb5345e8': 'FISHERMAN STEAL CUSTOMERS',
    'c05100d8': 'OWNER STEAL CUSTOMERS 2',
    'a202c0fc': 'ASGARI SPOTHOPPER',
    '7ba2df69': 'LOUISVILLE SPOTHOPPER',
    '5c6ff270': 'NEW SPOTHOPPER -- STEAL CUSTOMERS',
    '5865d6c2': 'OWNER STEAL CUSTOMERS',
    '47fcc84f': 'Follow Up With Interested SpotHopper Leads',
    '3ee8e0f6': 'Follow Up With Interested Owner Leads',
    '3cded186': 'SPOTHOPPER STEAL CUSTOMERS 2',
    '3c613d22': 'Indy Spothopper',
    '2e2aaa4b': 'BentoBox Steal Customers 2',
    '1d47e813': 'Instantly 100 Leads',
    '0d64f3d2': 'NEW YORK SPOTHOPPER',
    '0be9b550': 'SPOTHOPPER - MARCH 2026',
    '95e858aa': 'SPOTHOPPER Campaign',
    'f2229c40': 'BENTOBOX Campaign',
}

for e in emails:
    ts = e.get('timestamp_email', '')[:10]
    fr = e.get('from_address_email', '')
    eaccount = e.get('eaccount', '$EACCOUNT')
    cid8 = e.get('campaign_id', '')[:8]
    camp_name = campaign_names.get(cid8, 'Unknown Campaign')
    
    body = e.get('body', {}).get('text', '') or ''
    
    # Strip quoted replies
    clean_lines = []
    for line in body.split('\n'):
        if line.strip().startswith('On ') and 'wrote:' in line:
            break
        if line.strip().startswith('> '):
            break
        clean_lines.append(line)
    clean_body = '\n'.join(clean_lines).strip()
    
    if not clean_body:
        clean_body = '(Outreach email sent from Instantly)'
    
    # Escape for JSON
    clean_body = clean_body.replace('\\\\', '\\\\\\\\').replace('\"', '\\\\\"').replace('\n', '\\\\n').replace('\t', '\\\\t')
    
    from_name_json = (e.get('from_address_json') or [{}])[0].get('name', fr)
    
    import datetime
    try:
        dt = datetime.datetime.fromisoformat(ts)
        date_str = dt.strftime('%B %d, %Y')
    except:
        date_str = ts
    
    note = f'📧 Email — {date_str}\\\\nOutreach Account: {eaccount}\\\\nCampaign: {camp_name}\\\\n\\\\nFrom: {from_name_json} <{fr}>\\\\n\\\\n{clean_body}'
    
    print(json.dumps({'body': note}))
" | while IFS= read -r note_json; do
        sleep 5
        NOTEBODY=$(echo "$note_json" | python3 -c "import json,sys; print(json.load(sys.stdin)['body'])")
        curl -s -X POST "https://services.leadconnectorhq.com/contacts/$CID/notes" \
            -H "Authorization: Bearer $GKEY" -H "Version: 2021-07-28" \
            -H "Content-Type: application/json" -H "User-Agent: Mozilla/5.0" \
            -d "{\"body\":\"$NOTEBODY\"}" > /dev/null
    done
    
    CREATED=$((CREATED+1))
    
    if [ $((TOTAL % 10)) -eq 0 ]; then
        echo "PROGRESS: $TOTAL/$TOTAL_LEADS | created=$CREATED skipped=$SKIPPED failed=$FAILED"
    fi
    
done < "$UNIQUE_FILE"

echo ""
echo "========================================="
echo "SYNC COMPLETE"
echo "Total processed: $TOTAL"
echo "New contacts created: $CREATED"
echo "Skipped (already existed): $SKIPPED"
echo "Failed: $FAILED"
echo "========================================="
