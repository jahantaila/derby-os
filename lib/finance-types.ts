export type ExpenseCategory = "other" | "fulfillment" | "marketing" | "hosting";

export type RevenueCategory = "retainer" | "project" | "ad management" | "other";

export type FinanceRecurringExpense = {
  id: string;
  name: string;
  date: string;
  type: ExpenseCategory;
  recurring: string;
  notes: string;
  price: number;
};

export type FinanceEmployeeExpense = {
  id: string;
  name: string;
  date: string;
  notes: string;
  price: number;
  extraNotes: string;
};

export type FinanceOneTimeExpense = {
  id: string;
  name: string;
  date: string;
  notes: string;
  price: number;
};

export type FinanceRevenue = {
  id: string;
  clientName: string;
  amount: number;
  date: string;
  type: RevenueCategory;
  notes: string;
  stripeFee: number | null;
};

export type FinanceMonthData = {
  month: string;
  goalAmount: number;
  recurringExpenses: FinanceRecurringExpense[];
  employeeExpenses: FinanceEmployeeExpense[];
  oneTimeExpenses: FinanceOneTimeExpense[];
  revenues: FinanceRevenue[];
};

export type FinanceData = {
  months: Record<string, FinanceMonthData>;
};

export type FinanceSummary = {
  month: string;
  monthLabel: string;
  grossRevenue: number;
  totalStripeFee: number;
  totalRecurringExpenditure: number;
  totalEmployeeExpenditure: number;
  totalOneTimeExpenditure: number;
  totalExpenditure: number;
  totalProfit: number;
  profitMargin: number;
  goalAmount: number;
  goalPercent: number;
};
