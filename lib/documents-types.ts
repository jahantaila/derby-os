export type DocumentCategory = "report" | "ad-copy" | "proposal" | "campaign-plan" | "analysis" | "other";
export type DocumentStatus = "draft" | "final";

export type DocumentRecord = {
  id: string;
  title: string;
  content: string;
  category: DocumentCategory;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  clientId?: string;
  tags: string[];
  status: DocumentStatus;
};

export const DOCUMENT_CATEGORIES: DocumentCategory[] = ["report", "ad-copy", "proposal", "campaign-plan", "analysis", "other"];
export const DOCUMENT_STATUSES: DocumentStatus[] = ["draft", "final"];

export const INITIAL_DOCUMENTS: DocumentRecord[] = [
  {
    id: "doc-alex-olympus-analysis",
    title: "Olympus Meta Campaign Analysis",
    content: `<h2>Executive Summary</h2><p>Spend is concentrated in broad audience sets while the best conversion rate is coming from retargeting and testimonial-led creative. The main issue is weak post-click alignment between ad promise and landing-page proof.</p><h3>Findings</h3><ul><li>CTR is strongest on owner-led video creative with a direct savings angle.</li><li>Lead quality drops sharply on generic awareness campaigns.</li><li>Budget can be reallocated from low-intent placements into retargeting and call-focused campaigns.</li></ul><h3>Recommendation</h3><p>Shift 18% of spend into retargeting, rebuild the lead form hook around urgency, and test a shorter landing page with stronger proof above the fold.</p>`,
    category: "analysis",
    createdBy: "alex",
    createdAt: "2026-03-07T14:00:00-05:00",
    updatedAt: "2026-03-07T14:00:00-05:00",
    clientId: "olympuslou",
    tags: ["meta ads", "audit", "performance"],
    status: "final",
  },
  {
    id: "doc-sabri-bluegrass-copy",
    title: "Bluegrass Search Ad Copy Variations",
    content: `<h2>Primary Angle</h2><p><strong>Garage Door Repair Fast.</strong> Same-day service, veteran-owned, and built to get your door working without the runaround.</p><h3>Headlines</h3><ul><li>Garage Door Repair In Louisville</li><li>Veteran-Owned Local Service</li><li>Broken Spring Fixed Fast</li></ul><h3>Description</h3><p>Call now for fast, honest garage door repair. Same-day appointments available across Louisville and nearby service areas.</p>`,
    category: "ad-copy",
    createdBy: "sabri",
    createdAt: "2026-03-08T18:10:00-05:00",
    updatedAt: "2026-03-09T00:42:00-05:00",
    clientId: "bluegrass-garage-door",
    tags: ["google ads", "search", "offers"],
    status: "draft",
  },
  {
    id: "doc-kimberly-mission-control-brief",
    title: "Mission Control V3 Project Brief",
    content: `<h2>Objective</h2><p>Ship a cleaner internal operating system for Derby Digital with stronger visibility into agents, tasks, projects, and financial data.</p><h3>Scope</h3><ul><li>Preserve existing glassmorphism design language.</li><li>Move page-level data to persistent API-backed stores.</li><li>Improve operational visibility for Jahan without adding clutter.</li></ul><h3>Success Criteria</h3><p>The dashboard should feel premium, remain readable under heavy data density, and support future workflow automation.</p>`,
    category: "proposal",
    createdBy: "kimberly",
    createdAt: "2026-03-09T12:07:00-05:00",
    updatedAt: "2026-03-09T12:07:00-05:00",
    clientId: "derby-digital",
    tags: ["internal", "planning", "product"],
    status: "final",
  },
];
