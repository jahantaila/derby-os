# Kevin Task: Build the Rolodex

## Overview
Build a new top-level page at `/rolodex` — a personal relationship management system inspired by David Rockefeller's legendary rolodex. This is NOT just for leads — it's for EVERYONE Jahan knows: clients, prospects, partners, vendors, friends, mentors, investors, business contacts, anyone.

The pipeline is for sales. The rolodex is for relationships.

## Navigation
- Add "Rolodex" to the sidebar navigation (between Pipeline and Finance)
- Icon: BookUser from lucide-react
- URL: /rolodex

## Data Model

Create new types in `/lib/rolodex-types.ts`:

```typescript
type RelationshipType = 
  | "client"           // Current paying client
  | "prospect"         // Potential client/lead  
  | "partner"          // Business partner, collaborator
  | "vendor"           // Service provider, contractor
  | "mentor"           // Advisor, mentor
  | "investor"         // Potential or actual investor
  | "friend"           // Personal connection
  | "industry"         // Industry contact (conferences, events)
  | "team"             // Team member, employee
  | "other";           // Everything else

type InteractionType = 
  | "call"
  | "email" 
  | "meeting"
  | "text"
  | "social"           // Social media interaction
  | "event"            // Met at event/conference
  | "note"             // General note/observation
  | "gift"             // Sent/received a gift
  | "referral"         // Gave or received a referral
  | "deal";            // Business deal/transaction

type Interaction = {
  id: string;
  type: InteractionType;
  date: string;         // Eastern time date
  summary: string;      // What happened
  details?: string;     // Longer notes if needed
  sentiment?: "positive" | "neutral" | "negative";
  createdAt: string;
};

type StayInTouchReminder = {
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | "custom";
  customDays?: number;
  lastReminded?: string;
  snoozedUntil?: string;
};

type RolodexContact = {
  id: string;
  
  // Identity
  firstName: string;
  lastName: string;
  nickname?: string;
  avatar?: string;       // URL or emoji
  
  // Contact Info
  email?: string;
  phone?: string;
  secondaryEmail?: string;
  secondaryPhone?: string;
  
  // Professional
  company?: string;
  title?: string;
  industry?: string;
  website?: string;
  
  // Location
  city?: string;
  state?: string;
  country?: string;
  
  // Relationship
  relationshipType: RelationshipType;
  tags: string[];
  howWeMet?: string;     // "Cold email campaign", "Networking event", "Referral from X"
  metDate?: string;      // When you first connected
  introducedBy?: string; // Who introduced you
  
  // Personal Details (Rockefeller style)
  birthday?: string;
  spouse?: string;
  children?: string;
  interests?: string;    // Hobbies, passions, what they care about
  favoriteFood?: string;
  personalNotes?: string; // Anything else worth remembering
  
  // Social
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  facebook?: string;
  
  // Relationship Tracking
  interactions: Interaction[];
  stayInTouch?: StayInTouchReminder;
  relationshipScore: number;  // 0-100, computed from interactions
  lastContactedAt?: string;
  nextFollowUp?: string;
  
  // Pipeline Link
  pipelineDealId?: string;   // Optional link to pipeline deal
  
  // Meta
  createdAt: string;
  updatedAt: string;
  archived: boolean;
};
```

## Storage
- Create `/lib/rolodex-store.ts` — same pattern as pipeline-store
- Store in `~/mission-control-data/rolodex.json`
- Separate from pipeline data

## API Routes

### `GET /api/rolodex` — List all contacts
### `POST /api/rolodex` — Create new contact
### `GET /api/rolodex/[id]` — Get single contact
### `PATCH /api/rolodex/[id]` — Update contact
### `DELETE /api/rolodex/[id]` — Archive contact (soft delete)
### `POST /api/rolodex/[id]/interactions` — Add interaction
### `DELETE /api/rolodex/[id]/interactions/[interactionId]` — Delete interaction
### `GET /api/rolodex/reminders` — Get contacts due for follow-up
### `POST /api/rolodex/import-pipeline` — Import contacts from pipeline into rolodex

## Page Layout (`/app/rolodex/page.tsx`)

### Top Bar
- Page title: "ROLODEX" with BookUser icon
- Contact count: "247 connections"
- "Add Contact" button (blue gradient)
- Search bar (searches name, company, email, tags, notes)

### Filter Row
- Relationship type pills: All | Clients | Prospects | Partners | Vendors | Mentors | Friends | Industry | Team
- Sort: Recently Contacted | Alphabetical | Relationship Score | Needs Attention
- Quick filters: "Needs Follow-Up" (overdue reminders), "New This Month", "Birthday This Month"

### Main View: Contact Grid (default) + List View Toggle

**Grid View (default):**
- Cards in a responsive grid (3-4 columns on desktop)
- Each card shows:
  - Name (large, bold)
  - Company + Title (smaller)
  - Relationship type badge (colored pill)
  - Phone + Email (with click-to-call/email icons)
  - City, State
  - Last contacted: "3 days ago" / "2 weeks ago" / "Never"
  - Relationship score bar (thin colored bar at bottom)
  - Tags as small pills
  - 📞 phone icon if has phone, ✉️ if has email
- Click card → opens detail panel

**List View:**
- Compact table similar to Segments view
- Columns: Name | Company | Type | Phone | Email | Last Contacted | Score | Tags

### Detail Panel (slides in from right, or modal)

**Header:**
- Name (large) + company/title
- Relationship type badge (editable inline)
- Quick action buttons: Call | Email | Text | LinkedIn | Website
- Relationship score circle (0-100)
- "Last contacted X days ago"

**Tabs:**

1. **Overview**
   - Contact info (all fields, inline editable)
   - How We Met + Met Date
   - Personal Details section (birthday, spouse, children, interests, notes)
   - Tags (editable)
   - Stay In Touch reminder setting
   - Pipeline link (if exists)

2. **Timeline**
   - Chronological list of all interactions
   - Each entry: icon + type badge + date + summary
   - "Add Interaction" button at top
   - Filter by interaction type
   - Conversation history from Instantly (if linked to pipeline)
   - Color-coded: calls=blue, emails=purple, meetings=green, notes=gray

3. **Notes**
   - Free-form rich notes area
   - Quick note input at top (like pipeline rolodex notes)
   - Timestamped entries

### Add Contact Modal
- Clean form with sections: Basic Info | Contact | Professional | Personal | Relationship
- "Import from Pipeline" button that lets you pick a pipeline lead and auto-fill fields
- Auto-compute relationship score after creation

### Add Interaction Modal
- Type selector (icon buttons for each type)
- Date (defaults to today)
- Summary (required)
- Details (optional, expandable)
- Sentiment (optional: 😊 😐 😟)

## Relationship Score Algorithm
Compute automatically based on:
- **Recency**: Last contact within 7 days = +30, 30 days = +20, 90 days = +10, else +0
- **Frequency**: 10+ interactions = +25, 5+ = +15, 2+ = +10, 1 = +5
- **Depth**: Has personal details filled = +10, has phone = +5, has multiple contact methods = +5
- **Sentiment**: Positive interactions boost +5 each, negative -5
- **Engagement**: Two-way (has inbound interactions) = +15, one-way only = +0
- Cap at 100, floor at 0
- Recompute on every interaction add/edit

## Stay In Touch System
- Each contact can have a reminder frequency
- `/api/rolodex/reminders` returns contacts where:
  - lastContactedAt + frequency > today (overdue)
  - OR nextFollowUp <= today
- Dashboard widget shows "X contacts need attention"
- Sorted by most overdue first

## Design Rules
- Same dark glass theme as pipeline
- Glass cards with border-white/10
- Derby blue gradient accents
- Relationship type colors:
  - client: blue (border-blue-300/30 bg-blue-500/15)
  - prospect: amber (border-amber-300/30 bg-amber-500/15)
  - partner: green (border-green-300/30 bg-green-500/15)
  - vendor: purple (border-purple-300/30 bg-purple-500/15) — ONLY exception to no-purple rule, it's subtle
  - mentor: cyan (border-cyan-300/30 bg-cyan-500/15)
  - investor: yellow (border-yellow-300/30 bg-yellow-500/15)
  - friend: pink (border-pink-300/30 bg-pink-500/15)
  - industry: slate (border-slate-300/30 bg-slate-500/15)
  - team: indigo (border-indigo-300/30 bg-indigo-500/15)
  - other: gray (border-white/10 bg-white/5)
- Interaction type icons (use lucide-react):
  - call: Phone
  - email: Mail
  - meeting: Calendar
  - text: MessageSquare
  - social: Globe
  - event: Users
  - note: FileText
  - gift: Gift
  - referral: Share2
  - deal: DollarSign
- Score colors: 0-30 red, 31-60 yellow, 61-85 blue, 86-100 green
- All dates in Eastern time

## IMPORTANT RULES
- DO NOT touch any existing pages (pipeline, finance, etc.)
- DO NOT change sidebar styling, just add the new nav item
- Create all new files, don't modify existing ones (except sidebar nav)
- Run `npm run build` before committing
- One commit with descriptive message
- Make sure the page works standalone — no dependencies on pipeline data
- The import-from-pipeline feature should COPY data, not link/sync
