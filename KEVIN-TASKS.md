# Kevin Pipeline Improvements — Phase 1

## Task 1: Bulk Actions (SELECT + ACT on multiple contacts)

Add bulk selection and actions to the SEGMENTS view:

### Requirements:
1. Add a checkbox column to the segments table (leftmost column)
2. "Select All" checkbox in the header that selects all currently filtered/visible contacts
3. When 1+ contacts selected, show a floating action bar at bottom of screen with:
   - **Count**: "X contacts selected"
   - **Change Stage**: dropdown to move all selected to a stage
   - **Add Tag**: dropdown/input to add a tag to all selected
   - **Delete**: red button to delete all selected (with confirmation modal)
   - **Export Selected**: CSV export of just selected contacts
   - **Clear Selection**: X button to deselect all
4. Selection state resets when filters change
5. Floating bar design: fixed bottom, dark glass card, centered, with Derby blue gradient accent on left border

### API Changes needed:
- Add `PATCH /api/pipeline/bulk` endpoint that accepts `{ ids: string[], action: "stage" | "tag" | "delete", value?: string }`
- Bulk stage change: update all matching deals
- Bulk tag add: append tag to all matching deals (no duplicates)
- Bulk delete: remove all matching deals

### Design:
- Checkbox: custom styled, blue when checked, round corners
- Floating bar: `fixed bottom-6 left-1/2 -translate-x-1/2 z-50` glass-card with blur
- Buttons match existing Derby design system (border-white/10, hover:border-blue-300/30)
- Keep it clean and minimal

## Task 2: Saved Views (Quick Filter Presets)

Add saved views/presets above the segments filters:

### Requirements:
1. Row of preset filter buttons above the filter dropdowns
2. Built-in presets (always visible):
   - "All Contacts" (clears all filters)
   - "New This Week" (dateFrom = 7 days ago, stage = new-lead)
   - "Interested" (stage = interested)
   - "SpotHopper" (tag = SpotHopper)
   - "Needs Follow-Up" (stage = contacted, dateTo = 7 days ago — contacted but no activity in a week)
3. Custom saved views:
   - "Save Current Filters" button (+ icon) that saves current filter state with a name
   - Saved views stored in localStorage under key `derby-os-saved-views`
   - Each saved view shows as a pill button with name + X to delete
4. Active view gets blue highlight border

### Design:
- Horizontal scrollable row of pills
- Same pill styling as existing tag pills but slightly larger
- Built-in presets have subtle icon (Sparkles for smart ones)
- Save button is a dashed-border pill with + icon

## Task 3: Enhanced AI Assistant

Improve the AI Insights panel:

### Requirements:
1. Add more useful preset prompts:
   - "Show me hot leads ready to close"
   - "Which cities have the most leads?"
   - "Draft a follow-up email for [contact]"
   - "Find leads I haven't contacted in 2+ weeks"
   - "Summarize this week's pipeline activity"
2. Make the AI response area taller (min-h-[280px])
3. Add a "Copy Response" button in the response area
4. When AI mentions specific contacts, make them clickable (link to their detail view)
5. Add conversation history within the session (show previous Q&A pairs, scrollable)

### API Changes:
- Update `/api/pipeline/insights` to accept `history` param (array of previous Q&A pairs for context)

## Task 4: Contact Card Quick Actions

Improve the contact detail/card view:

### Requirements:
1. In the contact detail modal, add quick action buttons:
   - **Call** (tel: link to their phone if available)
   - **Email** (mailto: link)
   - **Visit Website** (opens in new tab)
   - **Copy Email** (clipboard copy with toast)
2. Show the "Contacted from" info prominently (not buried in notes)
   - Parse notes for "Contacted from X" pattern
   - Show as a labeled field: "Outreach Account: X"
3. Show campaign info parsed from notes as a labeled field too
4. Add inline stage change (click stage pill → dropdown to change)
5. Add inline tag management (+ button to add tags, x to remove)

### Design:
- Quick actions as icon buttons in a row at top of detail modal
- Outreach Account shown with a Mail icon, blue text
- Campaign shown with a Sparkles icon
- Keep the existing modal layout, just enhance it

## IMPORTANT RULES FOR KEVIN:
- DO NOT delete any existing functionality
- DO NOT change the color scheme or fonts
- DO NOT restructure existing components unless necessary
- Test with `npm run build` before committing
- One commit per task, descriptive commit messages
- All new API routes go in /app/api/pipeline/
- Use existing design patterns (glass-card, border-white/10, etc.)
- All dates in Eastern time
- Keep the file structure — pipeline page stays as one file for now
