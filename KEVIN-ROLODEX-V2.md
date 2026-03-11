# Kevin Rolodex V2 — After Initial Build

## Feature 1: Gmail Auto-Sync

### Overview
Automatically create/update Rolodex contacts when emails come in via Gmail. Every person Jahan emails or receives email from gets a Rolodex entry.

### Implementation
1. Create `POST /api/rolodex/sync-email` endpoint that accepts email metadata:
   ```json
   {
     "from": { "name": "John Smith", "email": "john@restaurant.com" },
     "to": [{ "name": "Jahan", "email": "jahan@derbydigital.us" }],
     "subject": "Re: Website proposal",
     "date": "2026-03-11T10:00:00Z",
     "snippet": "Hey Jahan, thanks for the proposal..."
   }
   ```
2. Logic:
   - Look up contact by email in Rolodex
   - If exists: update `lastContactedAt`, add an "email" interaction with subject as summary and snippet as details
   - If not exists: create new contact with `relationshipType: "other"`, parse name from email, add the email interaction
   - Skip emails from known internal addresses (jahan@derbydigital.us, etc.)
3. Create `GET /api/rolodex/sync-email/config` and `POST /api/rolodex/sync-email/config` for managing:
   - Excluded email domains (derbydigital.us, gmail.com system emails, etc.)
   - Excluded email addresses
   - Auto-tag rules (e.g., emails from @restaurant.com → tag "restaurant")
4. In the Rolodex settings area, add a "Gmail Sync" section showing:
   - Last sync time
   - Contacts created/updated from Gmail
   - Excluded domains list (editable)

### Note for Kimberly
The actual Gmail polling will be done via `gog` CLI or Google API outside of Kevin's code. Kevin just builds the API endpoint that receives the email data and the config UI. Kimberly will set up a cron/heartbeat to poll Gmail and push to this endpoint.

## Feature 2: Rolodex → Pipeline Bridge

### Overview
Move a Rolodex contact into the Pipeline as a deal with one click, keeping both linked.

### Implementation
1. Add "Move to Pipeline" button in Rolodex contact detail panel
   - Opens a small modal with:
     - Pre-filled name, email, phone, company, website, city, state from Rolodex
     - Stage selector (defaults to "new-lead")
     - Value field
     - Competitor tag selector
     - Notes (pre-filled with "Moved from Rolodex")
   - On submit: POST to `/api/pipeline` to create deal, then PATCH the Rolodex contact with `pipelineDealId`
2. Add "View in Pipeline" button on Rolodex contacts that already have `pipelineDealId`
   - Links to `/pipeline?highlight={dealId}`
3. In Pipeline contact detail, add "View in Rolodex" link if the deal has a matching Rolodex contact
4. Create `GET /api/rolodex/linked-deals` that returns Rolodex contacts with their pipeline deal status

### Design
- "Move to Pipeline" button: amber/gold color with Funnel icon
- "View in Pipeline" button: blue with ExternalLink icon
- Linked status shown as small pill on Rolodex card: "In Pipeline" (blue)

## Feature 3: Relationship Network / Introductions

### Overview
Track who knows who. When Jahan meets someone through a contact, track the chain.

### Implementation
1. Add `connections` field to RolodexContact: `string[]` of other contact IDs
2. In detail panel, add "Connections" section:
   - Shows linked contacts as avatar chips
   - "Add Connection" button → search/select another contact
   - Click a connection → navigate to that contact
3. "Introduced By" field already exists — when set, auto-create a connection between the two contacts
4. Add "Who can introduce me to...?" feature:
   - In Pipeline, when viewing a lead, show "Possible Introductions" if any Rolodex contacts share:
     - Same city
     - Same industry
     - Mutual connections

## Feature 4: Contact Timeline Enhancements

### Overview
Make the timeline richer and more useful.

### Implementation
1. Auto-log pipeline stage changes as interactions:
   - When a linked pipeline deal changes stage → add "deal" interaction to Rolodex contact
   - "Pipeline: moved to Interested"
2. Show email conversation history from Instantly in the timeline (if linked via pipeline)
3. Add "Quick Log" floating button on the detail panel:
   - One-tap to log: "Had a call" / "Sent email" / "Met in person" / "Sent gift"
   - Pre-fills interaction type, just needs a summary

## Feature 5: Smart Suggestions

### Implementation
1. Add a "Suggestions" section to the Rolodex dashboard:
   - "You haven't talked to [Name] in 30 days — they're a client" 
   - "George from Athena Greek has a call tomorrow at 11 AM"
   - "[Name] has a birthday coming up next week"
   - "5 prospects in your Rolodex aren't in the Pipeline yet"
2. Show these as cards at the top of the Rolodex page

## Feature 6: Import from Other Sources

### Implementation
1. CSV import for Rolodex (like pipeline)
   - Map columns: First Name, Last Name, Email, Phone, Company, Type, etc.
2. "Import from Contacts" — paste a vCard or contact list
3. "Import from LinkedIn" — CSV export from LinkedIn connections

## IMPORTANT RULES
- DO NOT touch any existing pages
- DO NOT change existing Rolodex files from V1 (only add to them)
- Run `npm run build` before committing
- One commit per feature, descriptive messages
