# Ideas: Instantly Integration + Email Marketing for Pipeline Leads

## 1. Instantly ↔ Derby OS Two-Way Sync
**What:** Auto-sync leads between Instantly campaigns and Derby OS pipeline
- When a lead replies "interested" in Instantly → auto-create in Derby OS as "interested" stage
- When you move a lead to "contacted" in Derby OS → trigger Instantly sequence
- Already have webhook endpoints (`/api/webhooks/instantly/`) — expand these

**Why:** No more manual CSV imports. Leads flow automatically.

**How:** Instantly has webhooks for lead status changes. We set up:
- Instantly webhook → Derby OS `/api/webhooks/instantly` → auto-import
- Derby OS stage change → call Instantly API to add/remove from campaigns

## 2. Email Newsletter to Interested Leads
**What:** Built-in email blast feature in Derby OS
- Select leads from Segments view (with new bulk select)
- "Send Email" bulk action → compose email → send via your outreach accounts
- Template library with restaurant-specific templates:
  - "Free Website Audit" offer
  - "SpotHopper vs DerbyFlow comparison"
  - "Case study: How [restaurant] increased orders 40%"
  - "Limited spots: Free website redesign"

**Options for sending:**
- **Option A: Instantly API** — Send through Instantly's infrastructure (best deliverability, they handle warmup)
- **Option B: Resend/SendGrid** — Direct email API, more control, $20/mo
- **Option C: GoHighLevel** — You already have it, has email marketing built in

**Recommendation:** Option A (Instantly) since you're already paying for it and it handles deliverability.

## 3. Lead Scoring
**What:** Auto-score leads based on engagement signals
- Replied = +10 points
- Replied "interested" = +20 points
- Has phone number = +5 points
- Has website = +5 points
- Multiple campaigns contacted = +10 points
- In a target city = +5 points
- Score shown as a colored bar on each lead card

**Why:** Instantly tells you who's interested, but not WHO to prioritize. This does.

## 4. Competitor Intelligence Dashboard
**What:** Track which competitors (SpotHopper, BentoBox, Owner.com, Popmenu) your leads use
- Tag leads by current provider during import
- Dashboard showing: "47 SpotHopper leads, 23 BentoBox, 12 Owner.com"
- Competitor-specific pitch templates
- Track win rate by competitor

## 5. Follow-Up Sequences in Derby OS
**What:** Simple built-in follow-up reminders
- After importing interested leads, auto-create follow-up tasks
- "Contact within 24 hours" → "Follow up in 3 days" → "Final follow up in 7 days"
- Show overdue follow-ups on dashboard
- Could trigger Instantly sequences or just show reminders

## 6. Meeting Scheduler Integration
**What:** When a lead hits "scheduled-meeting" stage, auto-send calendar link
- Integrate with Calendly/Cal.com
- Or build a simple booking page into Derby OS
- Auto-create calendar event when meeting is booked

## Priority Order (my recommendation):
1. **Instantly two-way sync** (eliminates manual CSV work, highest ROI)
2. **Lead scoring** (helps prioritize the 162+ leads)
3. **Follow-up sequences** (ensures no lead falls through cracks)
4. **Email newsletter** (re-engage cold leads at scale)
5. **Competitor dashboard** (nice to have, builds over time)
6. **Meeting scheduler** (future, when closing more deals)

## Questions for Jahan:
- Do you have an Instantly API key? What plan are you on?
- Do you want to use Instantly for newsletters or a separate service?
- What's your follow-up cadence? How many touches before giving up?
- Do you want lead scoring visible to clients eventually (in DerbyFlow)?
