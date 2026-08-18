import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "./auth";
import { localDateString } from "./format";
import { supabase } from "./supabase";
import type { Category, Expense } from "../types/database";

type AddExpenseInput = {
  categoryId: string;
  amount: number;
  note?: string;
};

type ExpensesContextValue = {
  categories: Category[];
  /** wydatki z bieżącego miesiąca, najnowsze pierwsze */
  monthExpenses: Expense[];
  isLoading: boolean;
  totalLimit: number;
  spentThisMonth: number;
  spentToday: number;
  /** timestamp ostatniego udanego dodania — do animacji potwierdzenia */
  lastAddedAt: number | null;
  /** komunikat po nieudanym zapisie w tle (optimistic rollback) */
  saveErrorMessage: string | null;
  clearSaveError: () => void;
  /** dodaje wydatek optymistycznie i zapisuje w tle */
  addExpense: (input: AddExpenseInput) => void;
};

const ExpensesContext = createContext<ExpensesContextValue>({
  categories: [],
  monthExpenses: [],
  isLoading: true,
  totalLimit: 0,
  spentThisMonth: 0,
  spentToday: 0,
  lastAddedAt: null,
  saveErrorMessage: null,
  clearSaveError: () => {},
  addExpense: () => {},
});

const firstOfMonthString = (): string => {
  const now = new Date();
  return localDateString(new Date(now.getFullYear(), now.getMonth(), 1));
};

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [categories, setCategories] = useState<Category[]>([]);
  const [monthExpenses, setMonthExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastAddedAt, setLastAddedAt] = useState<number | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setCategories([]);
      setMonthExpenses([]);
      setIsLoading(true);
      return;
    }

    let cancelled = false;

    const fetchAll = async () => {
      const [categoriesResult, expensesResult] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order"),
        supabase
          .from("expenses")
          .select("*")
          .gte("date", firstOfMonthString())
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) {
        return;
      }
      if (!categoriesResult.error) {
        setCategories(categoriesResult.data);
      }
      if (!expensesResult.error) {
        setMonthExpenses(expensesResult.data);
      }
      setIsLoading(false);
    };

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addExpense = useCallback(
    ({ categoryId, amount, note }: AddExpenseInput) => {
      if (!userId) {
        return;
      }

      // Wpis optymistyczny — widok główny aktualizuje się natychmiast,
      // zapis do bazy leci w tle.
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic: Expense = {
        id: tempId,
        user_id: userId,
        category_id: categoryId,
        amount,
        note: note?.trim() ? note.trim() : null,
        date: localDateString(),
        created_at: new Date().toISOString(),
      };

      setMonthExpenses((current) => [optimistic, ...current]);
      setLastAddedAt(Date.now());

      supabase
        .from("expenses")
        .insert({
          user_id: userId,
          category_id: categoryId,
          amount,
          note: optimistic.note,
          date: optimistic.date,
        })
        .select()
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            // Rollback wpisu optymistycznego.
            setMonthExpenses((current) =>
              current.filter((expense) => expense.id !== tempId)
            );
            setSaveErrorMessage(
              "Nie udało się zapisać wydatku. Sprawdź połączenie i spróbuj ponownie."
            );
          } else {
            setMonthExpenses((current) =>
              current.map((expense) => (expense.id === tempId ? data : expense))
            );
          }
        });
    },
    [userId]
  );

  const clearSaveError = useCallback(() => setSaveErrorMessage(null), []);

  const { totalLimit, spentThisMonth, spentToday } = useMemo(() => {
    const today = localDateString();
    return {
      totalLimit: categories.reduce(
        (sum, category) => sum + Number(category.monthly_limit),
        0
      ),
      spentThisMonth: monthExpenses.reduce(
        (sum, expense) => sum + Number(expense.amount),
        0
      ),
      spentToday: monthExpenses.reduce(
        (sum, expense) =>
          expense.date === today ? sum + Number(expense.amount) : sum,
        0
      ),
    };
  }, [categories, monthExpenses]);

  return (
    <ExpensesContext.Provider
      value={{
        categories,
        monthExpenses,
        isLoading,
        totalLimit,
        spentThisMonth,
        spentToday,
        lastAddedAt,
        saveErrorMessage,
        clearSaveError,
        addExpense,
      }}
    >
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses() {
  return useContext(ExpensesContext);
}
