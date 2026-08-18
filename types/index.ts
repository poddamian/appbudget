export type Expense = {
  id: string;
  amount: number;
  description: string | null;
  category: string | null;
  createdAt: string;
};

export type Budget = {
  id: string;
  name: string;
  monthlyLimit: number;
  currency: string;
};
