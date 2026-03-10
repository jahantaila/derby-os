export type FinanceRecurringFlag = "M" | "1-time";
export type FinanceClientType = "restaurant" | "home-service" | "gaming" | "other";
export type FinanceClientStatus = "active" | "inactive";
export type FinancePaymentStatus = "paid" | "pending";
export type FinanceServiceType =
  | "Website"
  | "SEO"
  | "Social Media"
  | "Google Ads"
  | "Meta Ads"
  | "Software"
  | "Review Automation"
  | "Other";

export type FinanceLedgerRow = {
  id: string;
  name: string;
  date: string;
  recurring: FinanceRecurringFlag;
  notes: string;
  amount: number;
  service?: FinanceServiceType;
  paymentStatus?: FinancePaymentStatus;
};

export type FinanceIncomeRow = FinanceLedgerRow;

export type FinanceMonthData = {
  month: string;
  goalAmount: number;
  stripeFeeOverride: number | null;
  income: FinanceIncomeRow[];
  expenses: FinanceLedgerRow[];
};

export type FinanceClient = {
  id: string;
  name: string;
  clientType: FinanceClientType;
  status: FinanceClientStatus;
  services: FinanceServiceType[];
  months: Record<string, FinanceMonthData>;
};

export type FinanceGeneralMonthData = {
  month: string;
  goalAmount: number;
  recurringExpenses: FinanceLedgerRow[];
  employeeExpenses: FinanceLedgerRow[];
  oneTimeExpenses: FinanceLedgerRow[];
};

export type FinanceGeneralData = {
  months: Record<string, FinanceGeneralMonthData>;
};

export type FinanceData = {
  clients: FinanceClient[];
  generalData: FinanceGeneralData;
};

export type FinanceSummary = {
  month: string;
  monthLabel: string;
  grossRevenue: number;
  totalStripeFee: number;
  totalExpenditure: number;
  totalProfit: number;
  profitMargin: number;
};
