# Kevin Task: Rolodex V4 — Dashboard + Detail Upgrades

## IMPORTANT: Do NOT rewrite the whole page. Make SURGICAL additions to the existing app/rolodex/page.tsx.

## Task 1: Clickable Timeline Items with Detail Popup

Currently timeline items show a summary. Make them clickable to expand into a detail popup/modal.

### Requirements:
1. Each timeline item card becomes clickable (cursor-pointer, hover effect)
2. Clicking opens a modal/popup with:
   - Full interaction type + badge + date at top
   - Summary (large text)
   - Details section (the full details field, expandable)
   - Sentiment indicator
   - "Attachments" placeholder section (for future: linked emails, files, etc.)
   - "Full Email Content" placeholder section (shows "Connect Gmail to see full email content" for now)
   - Edit button → allows editing summary, details, sentiment inline
   - Delete button (with confirmation)
   - Close button
3. Modal design: centered, glass-card style, max-w-2xl, dark backdrop blur
4. For now the detail just shows what we have (summary + details). But structure it so when Gmail/Instantly sync is added later, the full email/content will appear here.

## Task 2: Smart Daily Briefing on Home

Add an AI-generated daily briefing card at the top of the Home view.

### Requirements:
1. New card above the analytics row: "📋 Daily Briefing"
2. Content is generated from contact data (NOT an API call — compute client-side):
   - "Good evening, Jahan." (time-based greeting — already exists, reuse)
   - Mentions any contacts with calls/meetings today
   - Mentions overdue follow-ups (top 3)
   - Mentions contacts whose score dropped recently
   - Mentions new contacts added this week
   - Mentions upcoming birthdays (next 14 days)
3. Format as a flowing paragraph, not bullet points. Make it feel like a personal assistant briefing.
4. Show in a highlighted card with a subtle blue-left-border accent

## Task 3: "Who's Going Cold?" Alert Section on Home

### Requirements:
1. New section on Home below recommended next steps
2. Title: "🧊 Going Cold" 
3. Shows contacts where:
   - They have a stayInTouch reminder set
   - lastContactedAt is more than 2x their reminder frequency (e.g. monthly contact = 60+ days cold)
   - OR relationship score < 30 and they had interactions before
4. Each card shows: Name, company, type dot, "Last contacted X days ago", score with trend arrow
5. Clickable → jumps to contact detail
6. Max 5 items

## Task 4: Quick Actions Bar on Home

### Requirements:
1. Horizontal row of action buttons below the greeting, above AI chat
2. Buttons:
   - "📞 Log a Call" → opens quick log modal pre-set to "call" type (need to select contact first — show contact picker)
   - "➕ Add Contact" → opens add contact modal
   - "📥 Import Pipeline" → triggers pipeline import
   - "🔍 Search Contacts" → switches to Contacts view with search focused
3. Design: rounded pill buttons, icon + label, glass-card style, horizontal scroll on mobile

## Task 5: Network Growth Chart on Home

### Requirements:
1. New card in the analytics section or below it
2. Simple bar chart showing contacts added per week (last 8 weeks)
3. Compute from contact.createdAt dates
4. Use pure CSS/HTML bars (no chart library needed)
5. Each bar: label = week (e.g. "Mar 3"), height = count, hover shows exact number
6. Show "X contacts this week vs Y last week" summary text

## Task 6: Weekly Digest Card on Home

### Requirements:
1. Card showing this week's activity summary:
   - "This week: X new contacts, Y interactions logged, Z follow-ups completed"
   - Compare to last week with trend arrows (↑↓→)
   - Compute from contact data: count contacts with createdAt this week, count interactions with date this week
2. Compact horizontal card with 3-4 metrics

## Task 7: Upcoming Events Section on Home

### Requirements:
1. Mini section showing upcoming events:
   - Birthdays in next 14 days (from contact.birthday, check month/day)
   - Scheduled follow-ups (contacts with nextFollowUp in next 7 days)
2. Each item: 🎂 or 📅 icon + name + date
3. Clickable → jumps to contact
4. Max 5 items

## Task 8: Relationship Trajectory Chart on Contact Detail

### Requirements:
1. In the Activity tab, add a "Relationship Trajectory" section
2. Simple line/area chart showing interaction frequency over time
3. X-axis: months (last 6 months), Y-axis: interaction count per month
4. Pure CSS/HTML (no library) — use a series of dots connected by a line, or stacked bars
5. Shows trend: "Trending up" / "Stable" / "Declining" text

## Task 9: Communication Style Insights on Contact Detail

### Requirements:
1. In Activity tab, add "Communication Insights" card
2. Compute from interactions:
   - Breakdown by type: "60% email, 25% call, 15% meeting" — show as horizontal stacked bar
   - "Most common: Email" 
   - "Best sentiment: Calls (80% positive)" — analyze which type has most positive sentiment
   - "Suggestion: Try calling more — your calls tend to go well"
3. All computed client-side from interaction data

## Task 10: Smart Groups in Contacts View

### Requirements:
1. Above the filter pills in Contacts view, add "Smart Groups" section
2. Auto-generated groups (computed from data):
   - By city: "Louisville (4)", "Nashville (2)", etc. — show top 5 cities
   - "Haven't Talked To in 30+ Days" (count)
   - "Top 10 by Score"
   - "New This Month"
   - "Has Phone Number"
3. Each group is a clickable pill — clicking it applies the corresponding filter
4. Show as a collapsible section: "Smart Groups" with chevron toggle

## Task 11: Referral Chain on Contact Detail — Connections Tab

### Requirements:
1. In the Connections tab, add "Referral Chain" visualization
2. If contact has `introducedBy`, show the chain:
   - "You → Marcus Thompson → Mike O'Brien"
3. Simple horizontal chain with arrows between names
4. Each name is clickable → navigates to that contact
5. Show "X introductions from this contact" count if they've introduced others (check other contacts' introducedBy field)

## Task 12: Bubble Map Placeholder on Home

### Requirements:
1. Add a section on Home: "Network Map"
2. For now, show a simple visual: circles of different sizes arranged in a cluster
3. Each circle = a contact, size = interaction count, color = relationship type dot color
4. Use CSS absolute positioning within a relative container
5. Clickable circles → jump to contact
6. Show top 20 contacts only (by interaction count)
7. This is a placeholder — will be enhanced with proper D3/canvas later

## Design Rules
- All additions use existing glass-card, dark theme patterns
- Keep all existing functionality
- Surgical additions only — don't restructure what works
- Run `npm run build` before committing
- One commit for all changes
