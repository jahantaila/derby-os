#!/bin/bash

# Instantly → GHL Lead Sync Script
# Jordan, Operations Specialist at Derby Digital

set -e

# API Configuration
INSTANTLY_BASE="https://api.instantly.ai/api/v2"
INSTANTLY_AUTH="Bearer MzQ0ODcyMDktNGYxNC00NTVhLWI4MDUtNDFhM2M2Y2NiYWNlOlpyaUdsSlpGeWdXeg=="
GHL_KEY="pit-4ae0985d-8de0-40e6-b688-4e6805e57c58"
GHL_LOCATION="3zMwpehG9y8ETJsZtR3d"
GHL_VERSION="2021-07-28"
USER_AGENT="Mozilla/5.0"

# GHL IDs
PIPELINE_ID="oNcLIG8SGY8IKvvVbkDe"
PIPELINE_STAGE_ID="0415b950-1b0e-47be-b7c4-65222923b448"
COLD_EMAIL_FIELD_ID="dLDNSAZYHk5qihoOx5oP"

echo "🚀 Starting Instantly → GHL Lead Sync"
echo "=================================="

# Function to make GHL API calls with rate limiting
ghl_api_call() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    
    sleep 5  # Rate limit: 5 seconds between calls
    
    if [ "$method" = "GET" ]; then
        curl -s -X GET "https://services.leadconnectorhq.com$endpoint" \
            -H "Authorization: Bearer $GHL_KEY" \
            -H "Version: $GHL_VERSION" \
            -H "User-Agent: $USER_AGENT"
    else
        curl -s -X POST "https://services.leadconnectorhq.com$endpoint" \
            -H "Authorization: Bearer $GHL_KEY" \
            -H "Version: $GHL_VERSION" \
            -H "User-Agent: $USER_AGENT" \
            -H "Content-Type: application/json" \
            -d "$data"
    fi
}

# Function to retry GHL calls on 403
ghl_api_call_with_retry() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local response
    local http_code
    
    response=$(ghl_api_call "$method" "$endpoint" "$data" 2>&1)
    http_code=$(echo "$response" | grep -o '"status":[0-9]*' | cut -d':' -f2 || echo "200")
    
    if [ "$http_code" = "403" ]; then
        echo "   ⚠️  Got 403, waiting 90 seconds and retrying..."
        sleep 90
        response=$(ghl_api_call "$method" "$endpoint" "$data")
    fi
    
    echo "$response"
}

# Fetch all emails from Instantly
echo "📧 Fetching emails from Instantly..."
all_emails_file="/tmp/instantly_emails.json"
echo "[]" > "$all_emails_file"

starting_after=""
page=1

while true; do
    echo "   📄 Fetching page $page..."
    
    url="$INSTANTLY_BASE/emails?email_type=received&limit=100"
    if [ ! -z "$starting_after" ]; then
        url="$url&starting_after=$starting_after"
    fi
    
    response=$(curl -s -H "Authorization: $INSTANTLY_AUTH" "$url")
    
    # Save response to temp file
    echo "$response" > "/tmp/page_response.json"
    
    # Check if we got emails
    email_count=$(python3 -c "
import json
with open('/tmp/page_response.json', 'r') as f:
    data = json.load(f)
print(len(data.get('items', [])))
")
    
    if [ "$email_count" -eq 0 ]; then
        echo "   ✅ No more emails, pagination complete"
        break
    fi
    
    echo "   📧 Found $email_count emails"
    
    # Append emails to our collection
    python3 -c "
import json

# Load existing emails
with open('$all_emails_file', 'r') as f:
    all_emails = json.load(f)

# Load new page
with open('/tmp/page_response.json', 'r') as f:
    response = json.load(f)

new_emails = response.get('items', [])

# Append new emails
all_emails.extend(new_emails)

# Save back
with open('$all_emails_file', 'w') as f:
    json.dump(all_emails, f)

# Print pagination info
print(f'Total emails so far: {len(all_emails)}')
next_starting_after = response.get('next_starting_after')
if next_starting_after:
    print(f'Next starting after: {next_starting_after}')
else:
    print('No more pages')
"
    
    # Get next starting_after
    starting_after=$(python3 -c "
import json
with open('/tmp/page_response.json', 'r') as f:
    data = json.load(f)
print(data.get('next_starting_after', ''))
")
    
    if [ -z "$starting_after" ]; then
        echo "   ✅ No next_starting_after, pagination complete"
        break
    fi
    
    page=$((page + 1))
done

# Process interested leads
echo ""
echo "🎯 Processing interested leads (i_status=1)..."

python3 - <<EOF
import json
import subprocess
import re
from datetime import datetime
from collections import defaultdict

# Load all emails
with open('$all_emails_file', 'r') as f:
    all_emails = json.load(f)

print(f"📊 Processing {len(all_emails)} total emails")

# Group emails by lead email address
leads = defaultdict(list)
interested_count = 0

for email in all_emails:
    lead_email = email.get('lead', '').strip().lower()
    i_status = email.get('i_status')
    
    if lead_email and i_status == 1:  # Only interested leads
        leads[lead_email].append(email)
        interested_count += 1

print(f"🎉 Found {interested_count} interested email interactions from {len(leads)} unique leads")

# Process each interested lead
for lead_email, email_conversations in leads.items():
    print(f"\n👤 Processing lead: {lead_email}")
    
    # Get lead info from most recent email
    latest_email = sorted(email_conversations, key=lambda x: x.get('timestamp_email', ''), reverse=True)[0]
    
    # Extract name from from_address_json
    from_address_json = latest_email.get('from_address_json', [])
    full_name = ""
    if from_address_json and len(from_address_json) > 0:
        full_name = from_address_json[0].get('name', '').strip()
    
    if not full_name:
        full_name = lead_email.split('@')[0].replace('.', ' ').replace('_', ' ').title()
    
    # Split name
    name_parts = full_name.split(' ', 1)
    first_name = name_parts[0] if name_parts else "Unknown"
    last_name = name_parts[1] if len(name_parts) > 1 else ""
    
    # Extract business from domain or email body
    domain = lead_email.split('@')[1] if '@' in lead_email else ""
    company_name = domain.replace('.com', '').replace('.net', '').replace('.org', '').title()
    
    # Try to extract better company name from email body
    body_text = latest_email.get('body', {}).get('text', '') if latest_email.get('body') else ''
    if body_text:
        # Look for common business patterns
        business_patterns = [
            r'at ([A-Z][a-z]+ ?[A-Z]*[a-z]*)',
            r'from ([A-Z][a-z]+ ?[A-Z]*[a-z]*)',
            r'([A-Z][a-z]+ ?[A-Z]*[a-z]*) Restaurant',
            r'([A-Z][a-z]+ ?[A-Z]*[a-z]*) Cafe',
        ]
        for pattern in business_patterns:
            match = re.search(pattern, body_text)
            if match:
                potential_company = match.group(1).strip()
                if len(potential_company) > 2 and potential_company not in ['The', 'And', 'Or']:
                    company_name = potential_company
                    break
    
    print(f"   📝 Name: {first_name} {last_name}")
    print(f"   🏢 Company: {company_name}")
    print(f"   📧 {len(email_conversations)} email interactions")
    
    # Check if contact exists in GHL
    print(f"   🔍 Checking if contact exists in GHL...")
    lookup_response = subprocess.run([
        'curl', '-s', '-X', 'GET',
        f'https://services.leadconnectorhq.com/contacts/lookup?locationId=$GHL_LOCATION&email={lead_email}',
        '-H', 'Authorization: Bearer $GHL_KEY',
        '-H', 'Version: $GHL_VERSION',
        '-H', 'User-Agent: $USER_AGENT'
    ], capture_output=True, text=True)
    
    subprocess.run(['sleep', '5'], check=True)  # Rate limit
    
    try:
        lookup_data = json.loads(lookup_response.stdout)
        contact_exists = 'contact' in lookup_data and lookup_data['contact']
        contact_id = lookup_data.get('contact', {}).get('id') if contact_exists else None
    except:
        contact_exists = False
        contact_id = None
    
    if contact_exists:
        print(f"   ✅ Contact exists (ID: {contact_id})")
    else:
        print(f"   ➕ Creating new contact: {first_name} {last_name} - {company_name}")
        
        # Create contact
        contact_data = {
            "firstName": first_name,
            "lastName": last_name,
            "email": lead_email,
            "companyName": company_name,
            "locationId": "$GHL_LOCATION",
            "customFields": [
                {"id": "$COLD_EMAIL_FIELD_ID", "value": "Cold Email"}
            ]
        }
        
        create_response = subprocess.run([
            'curl', '-s', '-X', 'POST',
            'https://services.leadconnectorhq.com/contacts/',
            '-H', 'Authorization: Bearer $GHL_KEY',
            '-H', 'Version: $GHL_VERSION',
            '-H', 'User-Agent: $USER_AGENT',
            '-H', 'Content-Type: application/json',
            '-d', json.dumps(contact_data)
        ], capture_output=True, text=True)
        
        subprocess.run(['sleep', '5'], check=True)  # Rate limit
        
        try:
            create_data = json.loads(create_response.stdout)
            contact_id = create_data.get('contact', {}).get('id')
            if contact_id:
                print(f"   ✅ Contact created (ID: {contact_id})")
            else:
                print(f"   ❌ Failed to create contact: {create_response.stdout}")
                continue
        except Exception as e:
            print(f"   ❌ Error creating contact: {e}")
            continue
        
        # Create opportunity
        print(f"   🎯 Creating opportunity: {first_name} {last_name} - {company_name}")
        
        opp_data = {
            "pipelineId": "$PIPELINE_ID",
            "locationId": "$GHL_LOCATION",
            "name": f"{first_name} {last_name} - {company_name}",
            "pipelineStageId": "$PIPELINE_STAGE_ID",
            "status": "open",
            "contactId": contact_id
        }
        
        opp_response = subprocess.run([
            'curl', '-s', '-X', 'POST',
            'https://services.leadconnectorhq.com/opportunities/',
            '-H', 'Authorization: Bearer $GHL_KEY',
            '-H', 'Version: $GHL_VERSION',
            '-H', 'User-Agent: $USER_AGENT',
            '-H', 'Content-Type: application/json',
            '-d', json.dumps(opp_data)
        ], capture_output=True, text=True)
        
        subprocess.run(['sleep', '5'], check=True)  # Rate limit
        
        try:
            opp_data_response = json.loads(opp_response.stdout)
            if 'opportunity' in opp_data_response:
                print(f"   ✅ Opportunity created")
            else:
                print(f"   ⚠️  Opportunity creation unclear: {opp_response.stdout}")
        except Exception as e:
            print(f"   ⚠️  Error creating opportunity: {e}")
    
    # Group emails by day and create notes
    if contact_id:
        print(f"   📝 Adding conversation notes...")
        
        # Group by day
        daily_conversations = defaultdict(list)
        for email in email_conversations:
            timestamp = email.get('timestamp_email', '')
            if timestamp:
                try:
                    date = datetime.fromisoformat(timestamp.replace('Z', '+00:00')).strftime('%Y-%m-%d')
                    daily_conversations[date].append(email)
                except:
                    daily_conversations['unknown'].append(email)
        
        # Create note for each day
        for date, day_emails in daily_conversations.items():
            note_body = f"=== Interested Lead Emails - {date} ===\\n\\n"
            
            for email in sorted(day_emails, key=lambda x: x.get('timestamp_email', '')):
                subject = email.get('subject', 'No Subject')
                timestamp = email.get('timestamp_email', 'Unknown time')
                body_text = email.get('body', {}).get('text', '') if email.get('body') else ''
                
                # Truncate body if too long
                if len(body_text) > 500:
                    body_text = body_text[:500] + "... (truncated)"
                
                note_body += f"Subject: {subject}\\n"
                note_body += f"Time: {timestamp}\\n"
                note_body += f"Message: {body_text}\\n\\n"
            
            note_data = {
                "body": note_body,
                "locationId": "$GHL_LOCATION"
            }
            
            note_response = subprocess.run([
                'curl', '-s', '-X', 'POST',
                f'https://services.leadconnectorhq.com/contacts/{contact_id}/notes',
                '-H', 'Authorization: Bearer $GHL_KEY',
                '-H', 'Version: $GHL_VERSION',
                '-H', 'User-Agent: $USER_AGENT',
                '-H', 'Content-Type: application/json',
                '-d', json.dumps(note_data)
            ], capture_output=True, text=True)
            
            subprocess.run(['sleep', '5'], check=True)  # Rate limit
            
            try:
                note_response_data = json.loads(note_response.stdout)
                if 'note' in note_response_data or 'id' in note_response_data:
                    print(f"   📝 Added note for {date}")
                else:
                    print(f"   ⚠️  Note creation unclear for {date}: {note_response.stdout}")
            except Exception as e:
                print(f"   ❌ Error adding note for {date}: {e}")

print(f"\\n🎉 Sync complete! Processed {len(leads)} interested leads")
EOF

echo ""
echo "✨ Instantly → GHL sync completed successfully!"

# Clean up temp file
rm -f "$all_emails_file"