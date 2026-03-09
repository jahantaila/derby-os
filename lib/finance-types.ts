export type FinanceCategory = "revenue" | "expense";

export type FinanceClient = {
  id: string;
  name: string;
  monthlyRetainer: number;
  adSpend: number;
  status: "active" | "paused";
};

export type FinanceEntry = {
  id: string;
  date: string;
  description: string;
  category: FinanceCategory;
  clientId: string | null;
  amount: number;
};

export type FinanceOverhead = {
  aiCosts: number;
  software: number;
  team: number;
  other: number;
};

export type FinanceData = {
  clients: FinanceClient[];
  entries: FinanceEntry[];
  monthlyOverhead: FinanceOverhead;
};

export type FinanceClientSummary = {
  clientId: string;
  name: string;
  monthlyRetainer: number;
  adSpend: number;
  expenses: number;
  profit: number;
  margin: number;
};

export type FinanceOverallSummary = {
  monthlyRevenue: number;
  monthlyExpenses: number;
  netProfit: number;
  profitMargin: number;
};

export type FinanceMonthlyPoint = {
  monthKey: string;
  label: string;
  revenue: number;
  expenses: number;
};

export type FinanceSummary = {
  overall: FinanceOverallSummary;
  clients: FinanceClientSummary[];
  monthly: FinanceMonthlyPoint[];
};
