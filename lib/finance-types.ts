export type FinanceRecordType = "income" | "expense";

export type FinanceRecordCategory = "retainer" | "ad spend" | "tool cost" | "freelancer" | "other";

export type FinanceClient = {
  id: string;
  name: string;
  status: "active" | "paused";
};

export type FinanceRecord = {
  id: string;
  type: FinanceRecordType;
  client: string | null;
  amount: number;
  category: FinanceRecordCategory;
  date: string;
  notes: string;
  recurring: boolean;
};

export type MonthlyClientBreakdown = {
  clientId: string;
  clientName: string;
  revenue: number;
  costs: number;
  monthlyRetainer: number;
  adSpendManaged: number;
  additionalCosts: number;
};

export type MonthlySnapshot = {
  month: string;
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  clientBreakdown: Record<string, MonthlyClientBreakdown>;
};

export type FinanceData = {
  clients: FinanceClient[];
  records: FinanceRecord[];
  monthlySnapshots: Record<string, MonthlySnapshot>;
};

export type FinanceOverallSummary = {
  month: string;
  monthLabel: string;
  monthlyRevenue: number;
  monthlyCosts: number;
  netProfit: number;
  mrr: number;
  activeClients: number;
};

export type FinanceClientSummary = {
  clientId: string;
  name: string;
  status: FinanceClient["status"];
  monthlyRetainer: number;
  adSpendManaged: number;
  additionalCosts: number;
  revenue: number;
  costs: number;
  netProfit: number;
  marginPercent: number;
};

export type FinanceMonthlyPoint = {
  month: string;
  label: string;
  revenue: number;
  costs: number;
  profit: number;
};

export type FinanceSummary = {
  overall: FinanceOverallSummary;
  clients: FinanceClientSummary[];
  trend: FinanceMonthlyPoint[];
  transactions: FinanceRecord[];
  availableMonths: string[];
};
