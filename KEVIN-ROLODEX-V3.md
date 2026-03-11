# Kevin Task: Rolodex V3 — 3 Layer Navigation

## Overview
The current Rolodex page crams too much into one view. Restructure into 3 distinct layers/views within the same page, using internal tabs (NOT separate routes).

## Layout: 3 Internal Views via Top Tabs

Top of the Rolodex page should have 3 main view tabs:
- **Home** (default) — greeting, AI, analytics, next steps
- **Contacts** — browse all contacts in grid/list with filters
- **[Contact Name]** — appears dynamically when a contact is selected (breadcrumb style)

### View 1: HOME (Default Landing)

Clean, spacious layout. This is what Jahan sees when he opens /rolodex.

**Hero Greeting Section**
- "Good morning, Jahan" / "Good afternoon" / "Good evening" (based on Eastern time)
- Subtitle: "You have X contacts · Y need follow-up · Z new this week"
- Current date displayed

**AI Chat Section** (prominent, center)
- Large input: "Ask anything about your network..."
- Suggested prompts as pills below:
  - "Who should I follow up with this week?"
  - "Show me my strongest relationships"
  - "Which contacts are in Louisville?"
  - "Find me restaurant owners I haven't talked to"
  - "Who can introduce me to someone in Nashville?"
- AI response area below input (expandable)
- Conversation history (collapsible)

**Analytics Cards Row** (3-4 cards, horizontal)
- Total Contacts (with type breakdown mini bar)
- Needs Attention (overdue follow-ups count)
- This Week's Activity (interactions logged)
- Avg Relationship Score (with trend)

**Recommended Next Steps** (action cards)
- "📞 Call Marcus Thompson — last contacted 14 days ago, monthly reminder overdue"
- "✉️ Follow up with David Park — discovery call was 6 days ago"
- "🎂 Emily Rodriguez's birthday is in 2 weeks"
- "🤝 George Papadopoulos has a call scheduled tomorrow at 11 AM"
- Each card is clickable → jumps to that contact's detail view
- Max 6 items, sorted by urgency

**Recent Activity Feed** (compact)
- Last 10 interactions across all contacts
- "[Type icon] [Contact name] — [Summary] · [time ago]"
- Click → jumps to contact

### View 2: CONTACTS (Browse)

Full-width contact browser. Clean and spacious.

**Top Controls**
- Search bar (full-text)
- Filter pills: All | Clients | Prospects | Partners | Vendors | Friends | Mentors | Industry | Team
- Sort dropdown: Recently Contacted | Alphabetical | Score | Newest
- View toggle: Grid | List (icon buttons)
- "Add Contact" button
- Contact count

**Grid View** (default, 3-4 columns)
- Each card:
  - Avatar circle (initials, colored by type)
  - Name (bold, large)
  - Company + Title
  - Type badge (small colored pill)
  - City, State
  - Last contacted: "3d ago"
  - Score bar (thin line at bottom, color-coded)
  - Quick icons: phone, email (if available)
- Cards are generous in size — NOT cramped
- Hover: subtle border glow
- Click → switches to Contact Detail view

**List View**
- Compact table rows
- Columns: Name | Company | Type | City | Phone | Email | Last Contacted | Score
- Click row → Contact Detail view

### View 3: CONTACT DETAIL (Full Screen)

When a contact is selected, this view takes over the full width. No sidebar — full real estate.

**Breadcrumb Navigation**
- "Rolodex > Contacts > Marcus Thompson" at the top
- Click "Contacts" to go back to browse view
- Click "Rolodex" to go back to home

**Contact Header** (full width)
- Large avatar circle (left)
- Name (large)
- Company + Title
- Type badge (editable)
- Score circle
- Quick actions: Call | Email | Website | Copy | Text
- Last contacted info
- 3-dot menu: Archive, Move to Pipeline, Delete

**Content Tabs** (below header, full width)
- Overview | Activity | Notes | Connections | AI Insights
- These are the same 5 tabs as currently built
- BUT they now have FULL WIDTH to breathe — no sidebar squeezing them
- The activity heatmap, timeline, notes, connections all get much more space

## Navigation Flow
1. User opens /rolodex → sees HOME with greeting, AI, analytics
2. Clicks "Contacts" tab OR clicks a recommended contact → CONTACTS browser OR DETAIL
3. In CONTACTS, clicks a contact card → CONTACT DETAIL (full screen)
4. In CONTACT DETAIL, breadcrumb back to Contacts or Home
5. Home tab always accessible

## State Management
- `currentView: "home" | "contacts" | "detail"`
- `selectedContactId: string | null`
- When selecting a contact from Home recommendations → set view to "detail"
- When selecting from Contacts grid → set view to "detail"
- Back navigation: detail → contacts → home
- Browser back button should work (use URL hash: #home, #contacts, #detail/[id])

## Design
- Remove the "Real-time filtering", "Polling every 15s" badges — those are dev info, not user-facing
- Clean up the header: just search + filters + actions
- SPACIOUS layouts — generous padding, card sizes, whitespace
- Each view should feel like its own page, not a cramped panel
- Keep all existing glass-card styling, dark theme, Derby blue accents
- Footer: minimal — just contact count + last synced

## Technical
- This is a REWRITE of app/rolodex/page.tsx
- Keep all existing API routes and store logic unchanged
- Keep all the existing tab content (Overview, Activity, Notes, Connections, AI) — just give them full width
- Auto-seed still works on first load
- Real-time polling still every 15 seconds (but don't show it in UI)
- URL hash for navigation state
- Run `npm run build` before committing

## IMPORTANT
- DO NOT change any API routes or store files
- DO NOT delete any functionality — just reorganize the layout
- The contact detail tabs should have ALL the same features as current
- Run npm run build before committing
