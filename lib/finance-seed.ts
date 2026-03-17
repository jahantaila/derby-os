// Finance seed data — imported from Google Sheets + Stripe
// Generated automatically, do not edit manually

export type ExpenseCategory = "software" | "payroll" | "marketing" | "hosting" | "fulfillment" | "operations" | "other";
export type LineItemType = "recurring" | "one-time";

export interface FinanceLineItem {
  id: string;
  name: string;
  amount: number;
  type: LineItemType;
  category?: ExpenseCategory;
  date?: string;
  notes?: string;
}

export interface ClientFinance {
  id: string;
  name: string;
  status: "active" | "churned" | "paused";
  stripeCustomerId?: string;
  income: FinanceLineItem[];
  expenses: FinanceLineItem[];
  grossRevenue: number;
  stripeFee: number;
  totalExpenditure: number;
  netProfit: number;
  profitMargin: number;
  manuCut?: number;
  notes?: string;
}

export interface GeneralExpense extends FinanceLineItem {
  category: ExpenseCategory;
}

export const GENERAL_RECURRING: GeneralExpense[] = [
  { id: "gr0", name: "google account", amount: 50.4, type: "recurring", category: "other", notes: "gmail + biz account for jahan, abdul, and accounts" },
  { id: "gr1", name: "cloudways", amount: 54.5, type: "recurring", category: "fulfillment", notes: "for sites as of 5/8/25" },
  { id: "gr2", name: "canva premium", amount: 7.95, type: "recurring", category: "fulfillment", notes: "" },
  { id: "gr3", name: "instantly emails x9", amount: 45.0, type: "recurring", category: "marketing", notes: "for the pre warmed accounts" },
  { id: "gr4", name: "instantly monthly x10", amount: 100.0, type: "recurring", category: "marketing", notes: "for the pre warmed accounts" },
  { id: "gr5", name: "instantly subscription", amount: 97.0, type: "recurring", category: "marketing", notes: "just for the basic tier plan, no email accounts" },
  { id: "gr6", name: "envato elements", amount: 41.34, type: "recurring", category: "fulfillment", notes: "" },
  { id: "gr7", name: "captions.ai", amount: 10.59, type: "recurring", category: "fulfillment", notes: "pro plan" },
  { id: "gr8", name: "framer hosting", amount: 20.0, type: "recurring", category: "hosting", notes: "hosting for derby digital site" },
  { id: "gr9", name: "go high level", amount: 297.0, type: "recurring", category: "fulfillment", notes: "greedy ass mfs." },
  { id: "gr10", name: "allgood prime site", amount: 10.0, type: "recurring", category: "fulfillment", notes: "every month mf 10 for framer hosting" },
  { id: "gr11", name: "claude max", amount: 200.0, type: "recurring", category: "fulfillment", notes: "fucking openclaw" },
  { id: "gr12", name: "webild io", amount: 12.0, type: "recurring", category: "fulfillment", notes: "" },
];

export const EMPLOYEE_EXPENSES: GeneralExpense[] = [
  { id: "ee0", name: "Abdul Salary", amount: 500.48, type: "recurring", category: "payroll", notes: "" },
  { id: "ee1", name: "Elang Salary", amount: 350.0, type: "recurring", category: "payroll", notes: "" },
  { id: "ee2", name: "Muhammad Salary", amount: 800.0, type: "recurring", category: "payroll", notes: "" },
  { id: "ee3", name: "Manu Commission", amount: 630.0645, type: "recurring", category: "payroll", notes: "502 thrifts, todays man, 502 snkr plug" },
  { id: "ee4", name: "Allgood Commission", amount: 74.86, type: "recurring", category: "payroll", notes: "25% presumed commission" },
  { id: "ee5", name: "Hammas Sites", amount: 600.0, type: "recurring", category: "payroll", notes: "$300 for derby city pizza\n$300 for capital tire & muffler" },
];

export const CLIENT_FINANCES: ClientFinance[] = [
  {
    id: "client0", name: "Lake Reliable Services", status: "active",
    grossRevenue: 299.0, stripeFee: 290.03, totalExpenditure: 0,
    netProfit: 290.03, profitMargin: 97.0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client1", name: "Pina Fiesta", status: "active",
    grossRevenue: 280.0, stripeFee: 271.58, totalExpenditure: 0,
    netProfit: 271.58, profitMargin: 97.0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client2", name: "El Vaquero", status: "active",
    grossRevenue: 280.0, stripeFee: 271.58, totalExpenditure: 0,
    netProfit: 271.58, profitMargin: 97.0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client3", name: "Al Forno", status: "active",
    grossRevenue: 280.0, stripeFee: 271.58, totalExpenditure: 0,
    netProfit: 271.58, profitMargin: 97.0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client4", name: "Hop Atomica", status: "active",
    grossRevenue: 347.0, stripeFee: 336.64, totalExpenditure: 0,
    netProfit: 336.64, profitMargin: 97.0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client5", name: "Olympus Gaming Lounge", status: "paused",
    grossRevenue: 0, stripeFee: 0.3, totalExpenditure: 20.0,
    netProfit: -20.3, profitMargin: 0,
    income: [

    ],
    expenses: [
      { id: "ci5e0", name: "framer monthly hosting", amount: 20.0, type: "recurring", date: "2025-05-25", notes: "monthly hosting for framer since we pay" }
    ],
  },
  {
    id: "client6", name: "Las Chamas", status: "active",
    grossRevenue: 280.0, stripeFee: 271.58, totalExpenditure: 0,
    netProfit: 271.58, profitMargin: 97.0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client7", name: "Hardwire Electric", status: "active", stripeCustomerId: "cus_Sggx6Iq5MkyGZw",
    grossRevenue: 1350.0, stripeFee: 1310.55, totalExpenditure: 51.8,
    netProfit: 1258.75, profitMargin: 93.2,
    income: [

    ],
    expenses: [
      { id: "ci7e0", name: "framer monthly hosting", amount: 20.0, type: "recurring", date: "2025-07-26", notes: "went up because of new website" },
      { id: "ci7e1", name: "yext listings", amount: 31.8, type: "recurring", date: "2025-07-15", notes: "" }
    ],
  },
  {
    id: "client8", name: "Asgari Enterprise", status: "paused",
    grossRevenue: 0, stripeFee: 0.3, totalExpenditure: 10.0,
    netProfit: -10.3, profitMargin: 0,
    income: [

    ],
    expenses: [
      { id: "ci8e0", name: "framer monthly hosting", amount: 10.0, type: "recurring", date: "2025-05-25", notes: "3.78 on May 14, rest on 5/25" }
    ],
  },
  {
    id: "client9", name: "Asgari Home Services", status: "paused",
    grossRevenue: 0, stripeFee: 0.3, totalExpenditure: 20.0,
    netProfit: -20.3, profitMargin: 0,
    income: [

    ],
    expenses: [
      { id: "ci9e0", name: "framer hosting", amount: 20.0, type: "recurring", date: "2025-05-30", notes: "16.75 billed on 5/30 rest billed on 5/16" }
    ],
  },
  {
    id: "client10", name: "The Service Station", status: "paused",
    grossRevenue: 0, stripeFee: 0.3, totalExpenditure: 0,
    netProfit: -0.3, profitMargin: 0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client11", name: "BS Brew Works", status: "active",
    grossRevenue: 199.0, stripeFee: 192.93, totalExpenditure: 0,
    netProfit: 192.93, profitMargin: 96.9,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client12", name: "Suri Sushi Thai", status: "active",
    grossRevenue: 199.0, stripeFee: 192.93, totalExpenditure: 0,
    netProfit: 192.93, profitMargin: 96.9,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client13", name: "Chamberlain Painting", status: "active", stripeCustomerId: "cus_TSaP6nhK2jmvw5",
    grossRevenue: 750.0, stripeFee: 727.95, totalExpenditure: 20.0,
    netProfit: 707.95, profitMargin: 94.4,
    income: [

    ],
    expenses: [
      { id: "ci13e0", name: "landing page hosting", amount: 20.0, type: "one-time", date: "2025-11-20", notes: "" }
    ],
  },
  {
    id: "client14", name: "Palma Italian + Jack & Mary", status: "active",
    grossRevenue: 338.3, stripeFee: 328.19, totalExpenditure: 0,
    netProfit: 328.19, profitMargin: 97.0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client15", name: "Bella Napoli Pizzeria", status: "active",
    grossRevenue: 199.0, stripeFee: 192.93, totalExpenditure: 0,
    netProfit: 192.93, profitMargin: 96.9,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client16", name: "Hela-do Feliz", status: "active",
    grossRevenue: 84.15, stripeFee: 81.41, totalExpenditure: 0,
    netProfit: 81.41, profitMargin: 96.7,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client17", name: "El Ma\u00f1anero Breakfast Spot", status: "active",
    grossRevenue: 84.15, stripeFee: 81.41, totalExpenditure: 0,
    netProfit: 81.41, profitMargin: 96.7,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client18", name: "Tuscany Italian", status: "active",
    grossRevenue: 799.0, stripeFee: 775.53, totalExpenditure: 0,
    netProfit: 775.53, profitMargin: 97.1,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client19", name: "Roofing KY", status: "churned",
    grossRevenue: 0, stripeFee: 0.3, totalExpenditure: 0,
    netProfit: 0.0, profitMargin: 0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client20", name: "The May Fly", status: "active",
    grossRevenue: 199.0, stripeFee: 192.93, totalExpenditure: 0,
    netProfit: 192.93, profitMargin: 96.9,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client21", name: "Leylas Lebanese", status: "paused",
    grossRevenue: 0, stripeFee: 0.3, totalExpenditure: 0,
    netProfit: -0.3, profitMargin: 0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client22", name: "DAISY DUKES", status: "active",
    grossRevenue: 199.0, stripeFee: 192.93, totalExpenditure: 0,
    netProfit: 192.93, profitMargin: 96.9,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client23", name: "ALL WORKS CONSTRUCTION", status: "active",
    grossRevenue: 39.98, stripeFee: 38.52, totalExpenditure: 0,
    netProfit: 38.52, profitMargin: 96.3,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client24", name: "Ramsis Cafe", status: "active",
    grossRevenue: 499.0, stripeFee: 484.23, totalExpenditure: 0,
    netProfit: 484.23, profitMargin: 97.0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client25", name: "Ama Raw Bar", status: "active",
    grossRevenue: 338.3, stripeFee: 328.19, totalExpenditure: 0,
    netProfit: 328.19, profitMargin: 97.0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client26", name: "502 Thrifts", status: "active",
    grossRevenue: 199.0, stripeFee: 192.93, totalExpenditure: 0,
    netProfit: 192.93, profitMargin: 96.9, manuCut: 96.4645,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client27", name: "Papa Gios Pizza", status: "active",
    grossRevenue: 199.0, stripeFee: 192.93, totalExpenditure: 0,
    netProfit: 192.93, profitMargin: 96.9,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client28", name: "Guidon Brewing", status: "active",
    grossRevenue: 378.1, stripeFee: 366.84, totalExpenditure: 0,
    netProfit: 366.84, profitMargin: 97.0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client29", name: "Wu Zhao", status: "active", stripeCustomerId: "cus_TEgYrDMu6at6Pd",
    grossRevenue: 1197.0, stripeFee: 1161.99, totalExpenditure: 30.7,
    netProfit: 1131.29, profitMargin: 94.5,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client30", name: "Jamaican Breeze Indy", status: "paused",
    grossRevenue: 0, stripeFee: 0.3, totalExpenditure: 0,
    netProfit: 0.0, profitMargin: 0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client31", name: "Juke bar", status: "active",
    grossRevenue: 340.0, stripeFee: 329.84, totalExpenditure: 0,
    netProfit: 329.84, profitMargin: 97.0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client32", name: "Texas Closets", status: "churned", stripeCustomerId: "cus_TN2PPC6nTFTyPb",
    grossRevenue: 0, stripeFee: 0.3, totalExpenditure: 0,
    netProfit: -0.3, profitMargin: 0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client33", name: "Hoopsters", status: "active", stripeCustomerId: "cus_TOlfsigxQpnK69",
    grossRevenue: 84.15, stripeFee: 81.41, totalExpenditure: 0,
    netProfit: 81.41, profitMargin: 96.7,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client34", name: "Todays Man", status: "active",
    grossRevenue: 700.0, stripeFee: 679.4, totalExpenditure: 0,
    netProfit: 679.4, profitMargin: 97.1, manuCut: 339.7,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client35", name: "Chao Vietnamese", status: "active",
    grossRevenue: 179.0, stripeFee: 173.51, totalExpenditure: 0,
    netProfit: 173.51, profitMargin: 96.9,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client36", name: "Island Bar", status: "active",
    grossRevenue: 223.2, stripeFee: 216.43, totalExpenditure: 0,
    netProfit: 216.43, profitMargin: 97.0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client37", name: "Big Daddys CA", status: "active",
    grossRevenue: 299.0, stripeFee: 290.03, totalExpenditure: 0,
    netProfit: 290.03, profitMargin: 97.0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client38", name: "Blue Surf", status: "active",
    grossRevenue: 399.0, stripeFee: 387.13, totalExpenditure: 0,
    netProfit: 387.13, profitMargin: 97.0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client39", name: "Dip N Crepe", status: "active",
    grossRevenue: 199.0, stripeFee: 192.93, totalExpenditure: 0,
    netProfit: 192.93, profitMargin: 96.9,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client40", name: "Sakura Blue", status: "active",
    grossRevenue: 199.0, stripeFee: 192.93, totalExpenditure: 0,
    netProfit: 192.93, profitMargin: 96.9,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client41", name: "Conalls Public House", status: "active",
    grossRevenue: 199.0, stripeFee: 192.93, totalExpenditure: 0,
    netProfit: 192.93, profitMargin: 96.9,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client42", name: "Cafe Single Fin", status: "churned", stripeCustomerId: "cus_TnEaLicb568VGH",
    grossRevenue: 0, stripeFee: 0.3, totalExpenditure: 0,
    netProfit: -0.3, profitMargin: 0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client43", name: "Craigs Electric", status: "active",
    grossRevenue: 650.0, stripeFee: 630.85, totalExpenditure: 0,
    netProfit: 630.85, profitMargin: 97.1,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client44", name: "Sarcastic Swines BBQ", status: "active",
    grossRevenue: 199.0, stripeFee: 192.93, totalExpenditure: 0,
    netProfit: 192.93, profitMargin: 96.9,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client45", name: "502 SNKR Plug", status: "active",
    grossRevenue: 150.0, stripeFee: 145.35, totalExpenditure: 0,
    netProfit: 145.35, profitMargin: 96.9, manuCut: 72.675,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client46", name: "Dairy Kastle", status: "active", stripeCustomerId: "cus_TuJhedfnwe3IWf",
    grossRevenue: 229.2, stripeFee: 222.25, totalExpenditure: 0,
    netProfit: 222.25, profitMargin: 97.0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client47", name: "Micheal Golata", status: "active",
    grossRevenue: 478.4, stripeFee: 464.23, totalExpenditure: 0,
    netProfit: 464.23, profitMargin: 97.0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client48", name: "Ghost Face Brewing", status: "active", stripeCustomerId: "cus_TwsN6ZWaALiTMg",
    grossRevenue: 319.2, stripeFee: 309.64, totalExpenditure: 0,
    netProfit: 309.64, profitMargin: 97.0,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client49", name: "Bluegrass Garage Door", status: "active", stripeCustomerId: "cus_TzaxkBMKCwE9EU",
    grossRevenue: 1500.0, stripeFee: 1456.2, totalExpenditure: 15.0,
    netProfit: 1441.2, profitMargin: 96.1,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client50", name: "Cheddar Box Too", status: "active", stripeCustomerId: "cus_U2tMZEWPnL3IY4",
    grossRevenue: 99.0, stripeFee: 95.83, totalExpenditure: 0,
    netProfit: 95.83, profitMargin: 96.8,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client51", name: "Aloha Island Grill", status: "active",
    grossRevenue: 250.0, stripeFee: 242.45, totalExpenditure: 0,
    netProfit: 242.45, profitMargin: 97.0, manuCut: 121.225,
    income: [

    ],
    expenses: [

    ],
  },
  {
    id: "client52", name: "Grand Slam Pizza", status: "active",
    grossRevenue: 199.0, stripeFee: 192.93, totalExpenditure: 0,
    netProfit: 192.93, profitMargin: 96.9,
    income: [

    ],
    expenses: [

    ],
  },
];

export const MARCH_SUMMARY = {
  month: "2026-03",
  grossRevenue: 15912.13,
  totalStripeFees: 15437.48,
  totalClientExpenses: 117.5,
  generalRecurring: 945.78,
  employeeExpenses: 2955.4,
  totalExpenditure: 19456.16,
  netProfit: -3544.03,
  activeClients: 44,
  profitMargin: -22.3,
};
