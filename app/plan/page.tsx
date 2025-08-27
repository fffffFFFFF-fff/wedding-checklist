"use client";

import { useEffect, useMemo, useState } from "react";

type TaskTemplate = {
  key: string;
  title: string;
  description?: string;
  due_offset_days: number;
  window: string;
  category: string;
  conditions?: Record<string, unknown>;
};

type Seed = {
  schema: any;
  task_templates: TaskTemplate[];
};

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function fmt(d: Date) {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function PlanPage() {
  const [seed, setSeed] = useState<Seed | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskStatus, setTaskStatus] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const weddingDateStr = typeof window !== "undefined" ? localStorage.getItem("weddingDate") : null;
  const budgetStr = typeof window !== "undefined" ? localStorage.getItem("weddingBudget") : null;

  useEffect(() => {
    if (!weddingDateStr) {
      setError("No wedding date set. Please start again.");
      setLoading(false);
      return;
    }
    fetch("/data/wedding_mvp_seed.json")
      .then(r => r.json())
      .then((data: Seed) => setSeed(data))
      .catch(() => setError("Could not load task templates."))
      .finally(() => setLoading(false));

    const stored = localStorage.getItem("taskStatus");
    if (stored) setTaskStatus(JSON.parse(stored));
  }, [weddingDateStr]);

  const weddingDate = useMemo(() => {
    return weddingDateStr ? new Date(weddingDateStr) : null;
  }, [weddingDateStr]);

  const tasks = useMemo(() => {
    if (!seed || !weddingDate) return [];
    return seed.task_templates
      .map(t => {
        const due = addDays(weddingDate, t.due_offset_days);
        return { ...t, due };
      })
      .sort((a, b) => a.due.getTime() - b.due.getTime());
  }, [seed, weddingDate]);

  const countdownText = useMemo(() => {
    if (!weddingDate) return "";
    const now = new Date();
    const diffMs = weddingDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    if (diffDays >= 0) {
      return `${months} months and ${days} days to go`;
    } else {
      return `Wedding was ${Math.abs(diffDays)} days ago`;
    }
  }, [weddingDate]);

  function toggleTask(key: string) {
    const next = { ...taskStatus, [key]: !taskStatus[key] };
    setTaskStatus(next);
    localStorage.setItem("taskStatus", JSON.stringify(next));
  }
async function buyPremium() {
  try {
    const res = await fetch("/api/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || "Checkout failed. Please try again.");
    }
  } catch {
    alert("Could not start checkout.");
  }
}

  
  if (loading) {
    return <main style={{maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui"}}>Loading…</main>;
  }
  if (error) {
    return (
      <main style={{maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui"}}>
        <p>{error}</p>
        <p><a href="/start">Go to start</a></p>
      </main>
    );
  }

  return (
    <main style={{maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui"}}>
      <h1>Your Wedding Plan</h1>
      <p style={{margin: "8px 0"}}><strong>Date:</strong> {weddingDate ? fmt(weddingDate) : "—"}</p>
      <p style={{margin: "8px 0"}}><strong>Budget:</strong> {budgetStr ? `£${Number(budgetStr).toLocaleString()}` : "—"}</p>
      <p style={{margin: "8px 0", color: "#444"}}>{countdownText}</p>
      <p style={{margin: "8px 0"}}>
        <a href="/budget">Open budget planner →</a>
      </p>

      <section style={{marginTop: 24}}>
        <h2>Upcoming (next 30 days)</h2>
        <ul>
          {tasks
            .filter(t => {
              const now = new Date();
              const in30 = addDays(now, 30);
              return t.due >= now && t.due <= in30;
            })
            .slice(0, 10)
            .map(t => (
              <li key={`up-${t.key}`} style={{margin: "6px 0"}}>
                {fmt(t.due)} — {t.title}
              </li>
            ))}
          {tasks.filter(t => {
            const now = new Date();
            const in30 = addDays(now, 30);
            return t.due >= now && t.due <= in30;
          }).length === 0 && <li>No tasks in the next 30 days 🎉</li>}
        </ul>
      </section>

      <section style={{marginTop: 24}}>
        <h2>Full Checklist</h2>
        <div style={{display: "grid", gap: 8}}>
          {tasks.map(t => (
            <label key={t.key} style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              border: "1px solid #ddd",
              borderRadius: 8
            }}>
              <input
                type="checkbox"
                checked={!!taskStatus[t.key]}
                onChange={() => toggleTask(t.key)}
              />
              <div>
                <div style={{fontWeight: 600}}>{t.title}</div>
                <div style={{fontSize: 12, color: "#555"}}>{t.description || ""}</div>
              </div>
              <div style={{fontSize: 12, color: "#333"}}>{fmt(t.due)}</div>
            </label>
          ))}
        </div>
      </section>

      <p style={{marginTop: 24}}><a href="/">← Back home</a></p>
    </main>
  );
}
