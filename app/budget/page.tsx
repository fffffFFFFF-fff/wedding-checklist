"use client";

import { useEffect, useMemo, useState } from "react";

type Seed = {
  schema: {
    budget_defaults_percent: Record<string, number>;
  };
};

type Expense = {
  id: string;
  category: string;
  amount: number;
  note?: string;
  created_at: string; // ISO date
};

function currency(n: number) {
  return "£" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function BudgetPage() {
  const [seed, setSeed] = useState<Seed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pull wedding budget from localStorage (set on /start)
  const budgetStr =
    typeof window !== "undefined" ? localStorage.getItem("weddingBudget") : null;
  const totalBudget = budgetStr ? Number(budgetStr) : 0;

  // Expenses live in localStorage for MVP
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    fetch("/data/wedding_mvp_seed.json")
      .then((r) => r.json())
      .then((data: Seed) => setSeed(data))
      .catch(() => setError("Could not load budget defaults."))
      .finally(() => setLoading(false));

    const stored = localStorage.getItem("expenses");
    if (stored) setExpenses(JSON.parse(stored));
  }, []);

  function saveExpenses(next: Expense[]) {
    setExpenses(next);
    localStorage.setItem("expenses", JSON.stringify(next));
  }

  const categories = useMemo(() => {
    if (!seed) return [];
    const percents = seed.schema.budget_defaults_percent || {};
    return Object.entries(percents).map(([name, pct]) => {
      const cap = Math.round((pct / 100) * totalBudget);
      const spent = expenses
        .filter((e) => e.category === name)
        .reduce((sum, e) => sum + e.amount, 0);
      const remaining = cap - spent;
      return { name, pct, cap, spent, remaining };
    });
  }, [seed, expenses, totalBudget]);

  // Form state for new expense
  const [cat, setCat] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");

  function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!cat || !amount) {
      alert("Pick a category and amount.");
      return;
    }
    const entry: Expense = {
      id: Math.random().toString(36).slice(2),
      category: cat,
      amount: Math.max(0, Number(amount)),
      note,
      created_at: new Date().toISOString(),
    };
    saveExpenses([entry, ...expenses]);
    setAmount("");
    setNote("");
  }

  function deleteExpense(id: string) {
    saveExpenses(expenses.filter((x) => x.id !== id));
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
        Loading…
      </main>
    );
  }
  if (error) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
        <p>{error}</p>
        <p>
          <a href="/">← Back home</a>
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>Budget</h1>
      <p style={{ margin: "8px 0" }}>
        <strong>Total budget:</strong> {totalBudget ? currency(totalBudget) : "—"}
      </p>

      {/* Category overview */}
      <section style={{ marginTop: 16 }}>
        <h2>Suggested Allocation</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {categories.map((c) => {
            const cap = Math.max(0, c.cap);
            const spent = Math.min(c.spent, Math.max(cap, 1));
            const pct = cap > 0 ? Math.round((spent / cap) * 100) : 0;
            return (
              <div
                key={c.name}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: 12,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 600 }}>
                    {c.name} <span style={{ color: "#666", fontWeight: 400 }}>({c.pct}%)</span>
                  </div>
                  <div>
                    {currency(c.spent)} / {currency(c.cap)}{" "}
                    <span style={{ color: c.remaining < 0 ? "#b00020" : "#666" }}>
                      ({c.remaining < 0 ? "-" : ""}{currency(Math.abs(c.remaining))}{" "}
                      {c.remaining < 0 ? "over" : "left"})
                    </span>
                  </div>
                </div>
                <div style={{ height: 8, background: "#f0f0f0", borderRadius: 999 }}>
                  <div
                    style={{
                      height: 8,
                      width: `${Math.min(100, pct)}%`,
                      background: c.remaining < 0 ? "#b00020" : "#222",
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Add expense */}
      <section style={{ marginTop: 24 }}>
        <h2>Add an expense</h2>
        <form
          onSubmit={addExpense}
          style={{ display: "grid", gap: 12, maxWidth: 520, marginTop: 8 }}
        >
          <label>
            Category
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 6 }}
            >
              <option value="">— Choose —</option>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Amount
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 6 }}
            />
          </label>

          <label>
            Note (optional)
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 6 }}
              placeholder="e.g., deposit paid to florist"
            />
          </label>

          <button
            type="submit"
            style={{
              padding: "10px 16px",
              border: "1px solid #333",
              borderRadius: 8,
              background: "#fff",
              width: "fit-content",
              cursor: "pointer",
            }}
          >
            Add expense
          </button>
        </form>
      </section>

      {/* Expense list */}
      <section style={{ marginTop: 24 }}>
        <h2>Recent expenses</h2>
        {expenses.length === 0 ? (
          <p>No expenses yet.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 8,
              borderTop: "1px solid #eee",
              marginTop: 8,
              paddingTop: 8,
            }}
          >
            {expenses.map((e) => (
              <div
                key={e.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid #eee",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{e.category}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {new Date(e.created_at).toLocaleDateString()} {e.note ? "· " + e.note : ""}
                  </div>
                </div>
                <div style={{ fontWeight: 600 }}>{currency(e.amount)}</div>
                <button
                  onClick={() => deleteExpense(e.id)}
                  style={{
                    border: "1px solid #333",
                    background: "#fff",
                    borderRadius: 6,
                    padding: "6px 10px",
                    cursor: "pointer",
                  }}
                  title="Delete expense"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <p style={{ marginTop: 24 }}>
        <a href="/plan">← Back to plan</a>
      </p>
    </main>
  );
}
