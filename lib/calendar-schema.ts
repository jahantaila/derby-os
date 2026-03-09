export type CalendarEventType = "deadline" | "milestone" | "meeting" | "task";

export type CalendarEventRecord = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  assignee: string;
  type: CalendarEventType;
  client: string;
};

export const CALENDAR_TEAM_MEMBERS = [
  { id: "jahan", name: "Jahan" },
  { id: "kimberly", name: "Kimberly" },
  { id: "alex", name: "Alex" },
  { id: "sabri", name: "Sabri" },
  { id: "kevin", name: "Kevin" },
  { id: "hamza", name: "Hamza" },
  { id: "abdul", name: "Abdul" },
  { id: "elang", name: "Elang" },
] as const;

export const INITIAL_CALENDAR_EVENTS: CalendarEventRecord[] = [
  {
    id: "e1",
    title: "Bluegrass Ads Launch",
    date: "2026-03-10",
    time: "10:00",
    assignee: "jahan",
    type: "deadline",
    client: "Bluegrass Garage Door",
  },
  {
    id: "e2",
    title: "Google Ads API Access Expected",
    date: "2026-03-11",
    time: null,
    assignee: "kimberly",
    type: "milestone",
    client: "Derby Digital",
  },
  {
    id: "e3",
    title: "Olympus Proposal Due",
    date: "2026-03-12",
    time: null,
    assignee: "alex",
    type: "deadline",
    client: "OlympusLou",
  },
  {
    id: "e4",
    title: "Mission Control V3 Complete",
    date: "2026-03-12",
    time: null,
    assignee: "kevin",
    type: "milestone",
    client: "Derby Digital",
  },
  {
    id: "e5",
    title: "Weekly Team Review",
    date: "2026-03-10",
    time: "14:00",
    assignee: "jahan",
    type: "meeting",
    client: "Derby Digital",
  },
  {
    id: "e6",
    title: "Palma Analysis Redo",
    date: "2026-03-14",
    time: null,
    assignee: "alex",
    type: "deadline",
    client: "Palma Italian Kitchen",
  },
];
