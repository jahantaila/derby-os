# Kevin Task: Rolodex V2 — Full UI Redesign

## IMPORTANT: This is a COMPLETE REWRITE of app/rolodex/page.tsx
Delete the old page and build fresh. Keep all existing API routes and store logic.

## Design Inspiration
- Clay.earth: clean left sidebar contact list, right detail panel always visible
- Monica HQ: personal details (family, activities, journal, reminders)
- Lightfield: AI-native, natural language queries, timeline-first
- Palantini: activity heatmap, engagement ratios, unified feed

## Layout: 3-Panel Design

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER: Search | Filters | Add Contact | Import Pipeline        │
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                       │
│ CONTACT  │              DETAIL PANEL                             │
│   LIST   │  ┌──────────────────────────────────────────┐        │
│          │  │  HEADER: Name, Company, Score, Actions    │        │
│ Scrollable  │  ├──────────────────────────────────────────┤        │
│ sidebar  │  │  TABS: Overview | Activity | Notes |      │        │
│          │  │        Connections | AI Insights           │        │
│ Click to │  │                                            │        │
│ select   │  │  TAB CONTENT                               │        │
│          │  │  (scrollable independently)                │        │
│          │  │                                            │        │
│          │  └──────────────────────────────────────────┘        │
├──────────┴──────────────────────────────────────────────────────┤
│ FOOTER: X connections | Last synced: 30s ago                     │
└─────────────────────────────────────────────────────────────────┘
```

## Top Header Bar
- Search input (full-text: name, company, email, tags, notes)
- Filter pills: All | Clients | Prospects | Partners | Vendors | Friends | ... (scrollable)
- Sort dropdown: Recently Contacted | Alphabetical | Relationship Score | Newest
- "Add Contact" button (blue gradient)
- "Import from Pipeline" button (secondary)
- Contact count badge

## Left Panel: Contact List (fixed width ~320px)
- Scrollable list of contact cards
- Each card shows:
  - Name (bold)
  - Company + Title (small, muted)
  - Relationship type colored dot
  - Last contacted: "3d ago" / "2w ago" / "Never"
  - Phone icon if has phone, email icon if has email
  - Small relationship score bar (thin line at bottom)
- Selected contact has highlighted border (blue)
- Click to select → loads in detail panel
- Real-time search filtering

## Right Panel: Contact Detail (tabs)

### Detail Header (always visible above tabs)
- Large name
- Company + Title
- Relationship type badge (editable — click to change)
- Relationship Score circle (0-100, color coded)
- Quick actions row: 📞 Call | ✉️ Email | 🌐 Website | 📋 Copy | 💬 Text
  - Each is an icon button
  - Call = tel: link, Email = mailto:, Website = new tab
- "Last contacted X ago" text
- 3-dot menu: Archive, Move to Pipeline, Delete

### Tab: Overview
Split into sections with clean cards:

**Contact Info Card**
- Email (with copy button)
- Phone (with copy + call button)
- Secondary email/phone
- Location (city, state, country)
- Website

**Professional Card**
- Company
- Title
- Industry
- Tags (editable pills with + button)

**Relationship Card**
- Type (editable dropdown)
- How We Met
- Met Date
- Introduced By
- Pipeline link (if linked, show "View in Pipeline" button)

**Personal Card** (Monica-inspired)
- Birthday (with age calculation)
- Spouse
- Children
- Interests / Hobbies
- Favorite Food
- Personal Notes (expandable text area)

**Social Links Card**
- LinkedIn, Instagram, Twitter, Facebook
- Each as a clickable link with icon

**Stay In Touch Card**
- Frequency selector (weekly/biweekly/monthly/quarterly/yearly)
- Next follow-up date
- Snooze button

All fields are inline-editable: click the value to edit, blur/enter to save. Auto-save with PATCH API call.

### Tab: Activity (Palantini-inspired)

**Activity Stats Bar**
- Total interactions count
- Last 30 days count
- Most common type (e.g. "Mostly emails")
- Who initiates more (you vs them)

**Activity Heatmap** (GitHub contribution style)
- 12-month grid showing interaction frequency per week
- Green shades: light (1-2) → dark (5+)
- Hover shows date + count

**Quick Log Buttons**
Row of icon buttons for fast logging:
📞 Call | ✉️ Email | 🤝 Meeting | 💬 Text | 📝 Note | 🎁 Gift | 🤝 Referral | 💰 Deal

Click → small inline form: summary + optional details + sentiment (😊😐😟)

**Timeline**
- Chronological feed of all interactions
- Filter row: All | Calls | Emails | Meetings | Notes | ...
- Each entry:
  - Icon + type badge + date (right aligned)
  - Summary text (bold)
  - Details text (muted, expandable)
  - Sentiment emoji if set
  - Delete button (hover only)
- Infinite scroll or "Load More"

### Tab: Notes
- Free-form notes area with rich formatting
- Quick note input at top (type + enter to add timestamped note)
- Each note shows timestamp + content
- Notes auto-save
- This is separate from interactions — think of it as a journal about this person

### Tab: Connections (relationship network)
- Shows linked contacts as avatar cards
- "Add Connection" search/select
- "Introduced By" chain if exists
- "Mutual Tags" — other contacts who share tags with this person
- "Same City" — other contacts in the same location
- Click any connected contact → navigates to them

### Tab: AI Insights
- Natural language query box: "Ask anything about this contact"
- Pre-built prompts:
  - "Summarize my relationship with this person"
  - "When should I follow up?"
  - "What do we have in common?"
  - "Draft a follow-up email"
  - "What should I know before our next meeting?"
- AI response area with conversation history
- "Suggest tags & interests" button (auto-analyzes notes + interactions)

## Dummy Data
Pre-populate the Rolodex with 8-10 diverse dummy contacts on first load (when rolodex.json is empty):

1. **Marcus Thompson** — Client, Thompson Electric LLC, Louisville KY, electrician, phone: (502) 555-0101, 12 interactions, score: 78
2. **Sarah Chen** — Partner, Chen Marketing Group, NYC, marketing consultant, 8 interactions, score: 65
3. **David Park** — Prospect, Park's Italian Kitchen, Nashville TN, restaurant owner, 3 interactions, score: 35
4. **Emily Rodriguez** — Friend, none, Austin TX, met at SXSW 2025, 15 interactions, score: 85
5. **James Wilson** — Vendor, Wilson Design Co, remote, web designer, 6 interactions, score: 55
6. **Mike O'Brien** — Client, O'Brien Garage Doors, Louisville KY, home service, 10 interactions, score: 72
7. **Lisa Chang** — Mentor, Sequoia Capital, San Francisco, investor/advisor, 4 interactions, score: 60
8. **Ahmed Hassan** — Industry, Hassan Painting Co, Lexington KY, painting contractor, 5 interactions, score: 45
9. **Rachel Kim** — Team, Derby Digital, Louisville, marketing coordinator, 20 interactions, score: 92
10. **George Papadopoulos** — Prospect, Athena Greek Restaurant, Mansfield OH, restaurant owner, 1 interaction (scheduled call), score: 15

Each dummy contact should have:
- 3-10 varied interactions with realistic dates (spanning last 3 months)
- Some with phone numbers, some without
- Some with personal details (birthday, interests), some sparse
- Tags relevant to their industry
- Realistic notes

Create these in a seed function: `POST /api/rolodex/seed` — only works if rolodex is empty. Also call it automatically on page load if contacts array is empty.

## Real-Time Updates
- Poll `/api/rolodex` every 15 seconds for the contact list
- When editing a contact, optimistic UI update (show change immediately, PATCH in background)
- Show "Last synced: Xs ago" in footer
- When a new contact is added (webhook, etc.), it appears in the list automatically on next poll

## Design System
- Dark theme matching rest of Derby OS
- Glass cards: `rounded-2xl border border-white/10 bg-white/[0.03] p-4`
- Section titles: `text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400`
- Active tab: blue underline + white text
- Inactive tab: slate-400 text
- Relationship type dot colors (small circle before name in list):
  - client: #3B82F6 (blue)
  - prospect: #F59E0B (amber)
  - partner: #22C55E (green)
  - vendor: #A855F7 (purple)
  - mentor: #06B6D4 (cyan)
  - investor: #EAB308 (yellow)
  - friend: #EC4899 (pink)
  - industry: #64748B (slate)
  - team: #6366F1 (indigo)
  - other: #94A3B8 (gray)
- Score circle colors: 0-30 red, 31-60 amber, 61-85 blue, 86-100 green
- Heatmap colors: empty=#1e293b, light=#166534, medium=#22c55e, dark=#4ade80
- All transitions smooth (200ms)
- No purple for decorative elements (only vendor type dot is an exception)

## Technical Notes
- This is ONE page file: `app/rolodex/page.tsx` — rewrite it completely
- Keep all existing API routes working (don't change them)
- Add `POST /api/rolodex/seed` for dummy data
- Add `connections` field handling: create a new API endpoint `PATCH /api/rolodex/[id]/connections` that accepts `{ add?: string[], remove?: string[] }`
- Use existing rolodex-store functions
- Page must be `"use client"` with client-side data fetching
- All dates in Eastern time
- Run `npm run build` before committing
- One commit, descriptive message

## FILE SIZE
This will be a large file (2000+ lines). That's OK. Keep it as one file for now.
