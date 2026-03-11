# Kevin Task: Pipeline Command Center Dashboard

## Overview
Replace the current basic dashboard with a real-time Pipeline Command Center that Jahan can open every morning and instantly know what's happening across all leads.

## Layout (Single Page, No Scrolling for Key Info)

### Top Row: Live Stats Cards (4 cards, horizontal)
1. **Total Leads** — big number + trend arrow (vs last week)
2. **New Today** — leads imported in last 24h (from Instantly webhook + manual)
3. **Needs Follow-Up** — leads in "contacted" stage older than 3 days with no activity
4. **Hot Leads** — leads in "interested" or "scheduled-meeting" stage

Each card: glass-card style, big number, small label, subtle trend indicator

### Second Row: Today's Priority Actions (LEFT 60%) + Activity Feed (RIGHT 40%)

**Priority Actions Panel:**
- "Good morning, Jahan. Here's what needs attention today:" header
- Sorted list of actionable items:
  - 🔥 **New interested leads** (imported in last 24h) — "3 new leads came in overnight — review and assign"
  - 📞 **Overdue follow-ups** — leads contacted 3+ days ago with no stage change — "Call [Name] at [Restaurant] — contacted 5 days ago, no response"
  - 📋 **Stale leads** — leads sitting in "new-lead" for 7+ days — "12 leads haven't been touched in a week"
  - 🎯 **Close opportunities** — leads in "negotiating" or "scheduled-meeting" — "[Name] has a meeting scheduled — prep needed"
- Each item is clickable → opens that lead's detail in the pipeline
- Max 10 items shown, "View All in Pipeline" link at bottom

**Live Activity Feed:**
- Real-time feed of what's happening:
  - "New lead: [Name] from [City] — SpotHopper campaign" (with timestamp)
  - "Stage changed: [Name] moved to Interested"
  - "Lead enriched: [Name] — Denver, CO"
- Auto-refreshes every 30 seconds
- Shows last 20 activities
- Each entry has a small icon (+ for new, → for stage change, 🔍 for enrichment)

### Third Row: Pipeline Funnel (LEFT 50%) + Geographic Heat Map (RIGHT 50%)

**Pipeline Funnel:**
- Visual funnel showing leads flowing through stages
- New Lead → Contacted → Interested → Scheduled Meeting → Attended → Negotiating → Closed Won
- Each stage shows count + conversion rate to next stage
- Color-coded bars (use existing STAGE_META colors)
- Click a stage → navigates to Segments view filtered to that stage

**Geographic Breakdown:**
- Top 10 cities by lead count, horizontal bar chart
- Shows city name + count + bar
- "View by State" toggle that groups by state instead
- Click a city → navigates to Segments view filtered to that city

### Fourth Row: Campaign Performance (FULL WIDTH)

**Campaign Tracker:**
- Table showing each Instantly campaign:
  - Campaign Name | Total Leads | Interested | Reply Rate | Last Import | Status
- Data pulled from pipeline deals grouped by their campaign tag/notes
- Sorted by most recent activity
- Helps Jahan see which campaigns are performing

## Technical Requirements

### Auto-Refresh
- Dashboard data refreshes every 30 seconds via polling
- No full page reload — just re-fetch `/api/pipeline` and recompute
- Show a subtle "Last updated: X seconds ago" in the corner
- Add a manual refresh button too

### Activity Log API
- Create `GET /api/pipeline/activity` endpoint
- Returns recent activity entries (new leads, stage changes, enrichments)
- Store activity log in a separate JSON file (`pipeline-activity.json`)
- When leads are created/updated via any API route, append to activity log
- Keep last 100 entries, prune older ones

### Morning Summary API  
- Create `GET /api/pipeline/morning-summary` endpoint
- Returns computed summary:
  - newToday: count of leads created today
  - newThisWeek: count of leads created in last 7 days
  - needsFollowUp: list of leads (contacted 3+ days, no stage change)
  - staleLeads: count of leads in new-lead for 7+ days
  - hotLeads: list of leads in interested/scheduled-meeting/negotiating
  - topCities: array of {city, count} top 10
  - campaignStats: array of {campaign, total, interested, replyRate}
  - funnelData: array of {stage, count, conversionRate}

### Date/Time Rules
- ALL dates in Eastern time
- "Today" = current date in Eastern time
- "This week" = last 7 days in Eastern time
- Use existing `easternDateOnly()` pattern

## Design Rules
- Use existing glass-card, glass-panel patterns
- Derby blue gradient for accent elements
- No purple
- Dark theme consistent with rest of app
- Responsive but optimize for desktop (Jahan's primary use)
- Section titles: uppercase tracking-[0.16em] text-slate-400 with icon
- Numbers: text-3xl font-bold text-white
- Trend indicators: green for up, red for down, slate for neutral
- This is the FIRST thing Jahan sees — make it feel like a command center

## IMPORTANT
- This is the main dashboard page (`/app/page.tsx`) — the home page
- Keep existing sidebar navigation working
- DO NOT delete any existing pages
- Run `npm run build` before committing
- One commit, descriptive message
