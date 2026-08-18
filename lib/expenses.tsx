import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "./auth";
import { checkBudgetAlerts } from "./budgetAlerts";
import { formatPln, localDateString } from "./format";
import { cancelWeeklySummary, scheduleWeeklySummary } from "./notifications";
import { useSettings } from "./settings";
import { supabase } from "./supabase";
import type { Category, Expense } from "../types/database";

const HISTORY_PAGE_SIZE = 50;

type AddExpenseInput = {
  categoryId: string;
  amount: number;
  note?: string;
};

type UpdateExpenseInput = {
  categoryId: string;
  amount: number;
  note?: string;
};

type HistoryState = {
  items: Expense[];
  hasMore: boolean;
  /** ładowanie pierwszej strony (także po zmianie filtra) */
  isLoading: boolean;
  isLoadingMore: boolean;
  categoryId: string | null;
};

const INITIAL_HISTORY: HistoryState = {
  items: [],
  hasMore: true,
  isLoading: true,
  isLoadingMore: false,
  categoryId: null,
};

type ExpensesContextValue = {
  categories: Category[];
  /** wydatki z bieżącego miesiąca, najnowsze pierwsze */
  monthExpenses: Expense[];
  isLoading: boolean;
  totalLimit: number;
  spentThisMonth: number;
  spentToday: number;
  /** suma wydatków bieżącego miesiąca per kategoria */
  spentByCategory: Record<string, number>;
  /** timestamp ostatniego udanego dodania — do animacji potwierdzenia */
  lastAddedAt: number | null;
  /** komunikat po nieudanym zapisie w tle (optimistic rollback) */
  saveErrorMessage: string | null;
  clearSaveError: () => void;
  /** dodaje wydatek optymistycznie i zapisuje w tle */
  addExpense: (input: AddExpenseInput) => void;
  /** ponowne pobranie kategorii i wydatków (pull-to-refresh) */
  refresh: () => Promise<void>;
  /** paginowana historia wszystkich wydatków (strony po 50) */
  history: HistoryState;
  /** zmienia filtr kategorii historii i ładuje pierwszą stronę */
  setHistoryFilter: (categoryId: string | null) => void;
  /** dociąga kolejną stronę historii */
  loadMoreHistory: () => void;
  /** usuwa wydatek optymistycznie */
  deleteExpense: (id: string) => void;
  /** edytuje wydatek optymistycznie */
  updateExpense: (id: string, input: UpdateExpenseInput) => void;
  /** znajduje wydatek po id (historia lub bieżący miesiąc) */
  getExpenseById: (id: string) => Expense | undefined;
};

const ExpensesContext = createContext<ExpensesContextValue>({
  categories: [],
  monthExpenses: [],
  isLoading: true,
  totalLimit: 0,
  spentThisMonth: 0,
  spentToday: 0,
  spentByCategory: {},
  lastAddedAt: null,
  saveErrorMessage: null,
  clearSaveError: () => {},
  addExpense: () => {},
  refresh: async () => {},
  history: INITIAL_HISTORY,
  setHistoryFilter: () => {},
  loadMoreHistory: () => {},
  deleteExpense: () => {},
  updateExpense: () => {},
  getExpenseById: () => undefined,
});

const firstOfMonthString = (): string => {
  const now = new Date();
  return localDateString(new Date(now.getFullYear(), now.getMonth(), 1));
};

const SAVE_ERROR =
  "Nie udało się zapisać zmian. Sprawdź połączenie i spróbuj ponownie.";

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { settings } = useSettings();
  const userId = session?.user.id ?? null;

  const [categories, setCategories] = useState<Category[]>([]);
  const [monthExpenses, setMonthExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastAddedAt, setLastAddedAt] = useState<number | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryState>(INITIAL_HISTORY);

  // Chroni przed zapisaniem wyników nieaktualnego zapytania historii
  // (np. szybka zmiana filtra).
  const historyRequestId = useRef(0);

  const fetchAll = useCallback(async () => {
    if (!userId) {
      return;
    }

    const [categoriesResult, expensesResult] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase
        .from("expenses")
        .select("*")
        .gte("date", firstOfMonthString())
        .order("created_at", { ascending: false }),
    ]);

    if (!categoriesResult.error) {
      setCategories(categoriesResult.data);
    }
    if (!expensesResult.error) {
      setMonthExpenses(expensesResult.data);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setCategories([]);
      setMonthExpenses([]);
      setIsLoading(true);
      setHistory(INITIAL_HISTORY);
      return;
    }

    fetchAll();
  }, [userId, fetchAll]);

  const fetchHistoryPage = useCallback(
    async (categoryId: string | null, offset: number) => {
      let query = supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + HISTORY_PAGE_SIZE - 1);

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      return query;
    },
    []
  );

  const setHistoryFilter = useCallback(
    (categoryId: string | null) => {
      if (!userId) {
        return;
      }

      const requestId = ++historyRequestId.current;
      setHistory({
        items: [],
        hasMore: true,
        isLoading: true,
        isLoadingMore: false,
        categoryId,
      });

      fetchHistoryPage(categoryId, 0).then(({ data, error }) => {
        if (historyRequestId.current !== requestId) {
          return;
        }
        setHistory((current) => ({
          ...current,
          items: error ? [] : data,
          hasMore: !error && data.length === HISTORY_PAGE_SIZE,
          isLoading: false,
        }));
      });
    },
    [userId, fetchHistoryPage]
  );

  const loadMoreHistory = useCallback(() => {
    setHistory((current) => {
      if (current.isLoading || current.isLoadingMore || !current.hasMore) {
        return current;
      }

      const requestId = historyRequestId.current;
      const offset = current.items.filter(
        (item) => !item.id.startsWith("temp-")
      ).length;

      fetchHistoryPage(current.categoryId, offset).then(({ data, error }) => {
        if (historyRequestId.current !== requestId) {
          return;
        }
        setHistory((next) => {
          if (error) {
            return { ...next, isLoadingMore: false };
          }
          const known = new Set(next.items.map((item) => item.id));
          return {
            ...next,
            items: [
              ...next.items,
              ...data.filter((item) => !known.has(item.id)),
            ],
            hasMore: data.length === HISTORY_PAGE_SIZE,
            isLoadingMore: false,
          };
        });
      });

      return { ...current, isLoadingMore: true };
    });
  }, [fetchHistoryPage]);

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

      let spentAfter = amount;
      setMonthExpenses((current) => {
        spentAfter =
          current.reduce(
            (sum, e) =>
              e.category_id === categoryId ? sum + Number(e.amount) : sum,
            0
          ) + amount;
        return [optimistic, ...current];
      });
      setHistory((current) =>
        current.categoryId && current.categoryId !== categoryId
          ? current
          : { ...current, items: [optimistic, ...current.items] }
      );
      setLastAddedAt(Date.now());

      // Alert budżetowy 80%/100% (raz na kategorię+próg+miesiąc).
      const category = categories.find((c) => c.id === categoryId);
      if (category && settings) {
        checkBudgetAlerts({ userId, category, spentAfter, settings }).catch(
          () => {}
        );
      }

      const replaceOptimistic = (row: Expense | null) => {
        setMonthExpenses((current) =>
          row
            ? current.map((e) => (e.id === tempId ? row : e))
            : current.filter((e) => e.id !== tempId)
        );
        setHistory((current) => ({
          ...current,
          items: row
            ? current.items.map((e) => (e.id === tempId ? row : e))
            : current.items.filter((e) => e.id !== tempId),
        }));
      };

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
            replaceOptimistic(null);
            setSaveErrorMessage(
              "Nie udało się zapisać wydatku. Sprawdź połączenie i spróbuj ponownie."
            );
          } else {
            replaceOptimistic(data);
          }
        });
    },
    [userId, categories, settings]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      if (!userId || id.startsWith("temp-")) {
        return;
      }

      let removedMonth: Expense[] = [];
      let removedHistory: Expense[] = [];
      setMonthExpenses((current) => {
        removedMonth = current;
        return current.filter((e) => e.id !== id);
      });
      setHistory((current) => {
        removedHistory = current.items;
        return { ...current, items: current.items.filter((e) => e.id !== id) };
      });

      supabase
        .from("expenses")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            setMonthExpenses(removedMonth);
            setHistory((current) => ({ ...current, items: removedHistory }));
            setSaveErrorMessage(SAVE_ERROR);
          }
        });
    },
    [userId]
  );

  const updateExpense = useCallback(
    (id: string, { categoryId, amount, note }: UpdateExpenseInput) => {
      if (!userId || id.startsWith("temp-")) {
        return;
      }

      const patch = {
        category_id: categoryId,
        amount,
        note: note?.trim() ? note.trim() : null,
      };

      let previousMonth: Expense[] = [];
      let previousHistory: Expense[] = [];
      const apply = (list: Expense[]) =>
        list.map((e) => (e.id === id ? { ...e, ...patch } : e));

      let spentAfter = 0;
      setMonthExpenses((current) => {
        previousMonth = current;
        const next = apply(current);
        spentAfter = next.reduce(
          (sum, e) =>
            e.category_id === categoryId ? sum + Number(e.amount) : sum,
          0
        );
        return next;
      });
      setHistory((current) => {
        previousHistory = current.items;
        return { ...current, items: apply(current.items) };
      });

      // Edycja też może przekroczyć próg (większa kwota / zmiana kategorii).
      const category = categories.find((c) => c.id === categoryId);
      if (category && settings) {
        checkBudgetAlerts({ userId, category, spentAfter, settings }).catch(
          () => {}
        );
      }

      supabase
        .from("expenses")
        .update(patch)
        .eq("id", id)
        .select()
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            setMonthExpenses(previousMonth);
            setHistory((current) => ({ ...current, items: previousHistory }));
            setSaveErrorMessage(SAVE_ERROR);
          } else {
            setMonthExpenses((current) =>
              current.map((e) => (e.id === id ? data : e))
            );
            setHistory((current) => ({
              ...current,
              items: current.items.map((e) => (e.id === id ? data : e)),
            }));
          }
        });
    },
    [userId, categories, settings]
  );

  const getExpenseById = useCallback(
    (id: string) =>
      history.items.find((e) => e.id === id) ??
      monthExpenses.find((e) => e.id === id),
    [history.items, monthExpenses]
  );

  const clearSaveError = useCallback(() => setSaveErrorMessage(null), []);

  const { totalLimit, spentThisMonth, spentToday, spentThisWeek, spentByCategory } =
    useMemo(() => {
      const today = localDateString();
      // Początek tygodnia: poniedziałek.
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      const mondayString = localDateString(monday);
      const byCategory: Record<string, number> = {};
      for (const expense of monthExpenses) {
        byCategory[expense.category_id] =
          (byCategory[expense.category_id] ?? 0) + Number(expense.amount);
      }
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
        spentThisWeek: monthExpenses.reduce(
          (sum, expense) =>
            expense.date >= mondayString ? sum + Number(expense.amount) : sum,
          0
        ),
        spentByCategory: byCategory,
      };
    }, [categories, monthExpenses]);

  // Cotygodniowe podsumowanie (niedziela 19:00) — treść lokalnego
  // powiadomienia jest stała, więc odświeżamy je po każdej zmianie danych.
  const weeklyEnabled = settings?.weekly_summary_enabled ?? false;
  useEffect(() => {
    if (!userId || !settings || isLoading) {
      return;
    }
    if (!weeklyEnabled) {
      cancelWeeklySummary();
      return;
    }

    const remaining = totalLimit - spentThisMonth;
    const timer = setTimeout(() => {
      scheduleWeeklySummary(
        "BudgetTrack — podsumowanie tygodnia",
        `W tym tygodniu wydałeś ${formatPln(spentThisWeek)}. Zostało Ci ${formatPln(remaining)} do końca miesiąca.`
      );
    }, 400);

    return () => clearTimeout(timer);
  }, [userId, settings, isLoading, weeklyEnabled, spentThisWeek, totalLimit, spentThisMonth]);

  return (
    <ExpensesContext.Provider
      value={{
        categories,
        monthExpenses,
        isLoading,
        totalLimit,
        spentThisMonth,
        spentToday,
        spentByCategory,
        lastAddedAt,
        saveErrorMessage,
        clearSaveError,
        addExpense,
        refresh: fetchAll,
        history,
        setHistoryFilter,
        loadMoreHistory,
        deleteExpense,
        updateExpense,
        getExpenseById,
      }}
    >
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses() {
  return useContext(ExpensesContext);
}
