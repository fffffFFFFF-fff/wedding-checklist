"use client";

import { useEffect, useMemo, useState } from "react";

type TaskTemplate = {
  key: string;
  title: string;
  description?: string;
  due_offset_days: number;
  window: string;   // e.g. "9_12m"
  category: string;
};

type Seed = {
  schema: { windows: Record<string, { label: string }> };
  task_templates: TaskTemplate[];
};

type TaskState = { done?: boolean; note?: string };

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
function fmt(d: Date) {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function today() { const d = new Date(); d.setHours(0,0,0,0); return d; }

export default function PlanPage() {
  const [seed, setSeed] = useState<Seed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskState, setTaskState] = useState<Record<string, TaskState>>({});
  const [filter, setFilter] = useState<"all"|"todo"|"done"|"overdue">("all");

  const weddingDateStr = typeof window !== "undefined" ? localStorage.getItem("weddingDate") : null;
  const budgetStr = typeof window !== "undefined" ? localStorage.getItem("weddingBudget") : null;

  useEffect(() => {
    if (!weddingDateStr) { setError("No wedding date set. Please start again."); setLoading(false); return; }
    fetch("/data/wedding_mvp_seed.json")
      .then(r => r.json())
      .then((data: Seed) => setSeed(data))
      .catch(() => setError("Could not load task templates."))
      .finally(() => setLoading(false));

    // migrate old storage if present
    const legacy = localStorage.getItem("taskStatus");
    if (legacy) {
      const parsed = JSON.parse(legacy) as Record<string, boolean>;
      const next: Record<string, TaskState> = {};
      Object.entries(parsed).forEach(([k, v]) => (next[k] = { done: v }));
      localStorage.setItem("taskState", JSON.stringify(next));
      localStorage.removeItem("taskStatus");
      setTaskState(next);
    } else {
      const stored = localStorage.getItem("taskState");
      if (stored) setTaskState(JSON.parse(stored));
    }
  }, [weddingDateStr]);

  const weddingDate = useMemo(() => weddingDateStr ? new Date(weddingDateStr) : null, [weddingDateStr]);
  const allTasks = useMemo(() => {
    if (!seed || !weddingDate) return [];
    return seed.task_templates
      .map(t => ({ ...t, due: addDays(weddingDate, t.due_offset_days) }))
      .sort((a, b) => a.due.getTime() - b.due.getTime());
  }, [seed, weddingDate]);

  const windows = seed?.schema.windows || {};
  const groups = useMemo(() => {
    const map: Record<string, { label: string; items: any[] }> = {};
    for (const t of allTasks) {
      if (!map[t.window]) map[t.window] = { label: windows[t.window]?.label || t.window, items: [] };
      map[t.window].items.push(t);
    }
    return Object.entries(map)
      .map(([key, val]) => {
        const earliest = val.items[0]?.due?.getTime() ?? 0;
        return { key, label: val.label, items: val.items, earliest };
      })
      .sort((a, b) => a.earliest - b.earliest);
  }, [allTasks, windows]);

  const now = today();
  const countdownText = useMemo(() => {
    if (!weddingDate) return "";
    const diffDays = Math.ceil((weddingDate.getTime() - Date.now()) / 86400000);
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    return diffDays >= 0 ? `${months} months and ${days} days to go` : `Wedding was ${Math.abs(diffDays)} days ago`;
  }, [weddingDate]);

  function saveTaskState(next: Record<string, TaskState>) {
    setTaskState(next);
    localStorage.setItem("taskState", JSON.stringify(next));
  }
  function toggleDone(key: string) {
    const cur = !!taskState[key]?.done;
    saveTaskState({ ...taskState, [key]: { ...taskState[key], done: !cur } });
  }
  function updateNote(key: string, note: string) {
    saveTaskState({ ...taskState, [key]: { ...taskState[key], note } });
  }

  function isOverdue(t: any) { return t.due < now && !taskState[t.key]?.done; }
  function visible(t: any) {
    const done = !!taskState[t.key]?.done;
    if (filter === "all") return true;
    if (filter === "todo") return !done;
    if (filter === "done") return done;
    if (filter === "overdue") return isOverdue(t);
    return true;
  }

  // overall progress
  const totalTasks = allTasks.length;
  const doneCount = allTasks.filter(t => taskState[t.key]?.done).length;
  const overallPct = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0;

  if (loading) return <main style={{maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui"}}>Loading…</main>;
  if (error) return (
    <main style={{maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui"}}>
      <p>{error}</p><p><a href="/start">Go to start</a></p>
    </main>
  );

  return (
    <main style={{maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui"}}>
      <h1>Your Wedding Plan</h1>
      <p style={{margin: "8px 0"}}><strong>Date:</strong> {weddingDate ? fmt(weddingDate) : "—"}</p>
      <p style={{margin: "8px 0"}}><strong>Budget:</strong> {budgetStr ? `£${Number(budgetStr).toLocaleString()}` : "—"}</p>
      <p style={{margin: "8px 0", color: "#444"}}>{countdownText}</p>
      <p style={{margin: "8px 0"}}><a href="/budget">Open budget planner →</a></p>

      {/* Overall progress */}
      <div style={{marginTop: 8, padding: 12, border: "1px solid #ddd", borderRadius: 10}}>
        <div style={{display:"flex", justifyContent:"space-between", marginBottom: 6}}>
          <strong>Overall progress</strong>
          <span>{doneCount}/{totalTasks} ({overallPct}%)</span>
        </div>
        <div style={{height: 10, background:"#f0f0f0", borderRadius: 999}}>
          <div style={{height:10, width:`${overallPct}%`, background:"#222", borderRadius:999}} />
        </div>
      </div>

      {/* Filters */}
      <div style={{display:"flex", gap:8, marginTop: 12, flexWrap:"wrap"}}>
        {(["all","todo","done","overdue"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:"6px 10px", border:"1px solid #333", borderRadius:8,
            background: filter===f ? "#eee" : "#fff", cursor:"pointer"
          }}>
            {f === "all" ? "All" : f === "todo" ? "To-do" : f === "done" ? "Done" : "Overdue"}
          </button>
        ))}
      </div>

      {/* Upcoming next 30 days */}
      <section style={{marginTop: 24}}>
        <h2>Upcoming (next 30 days)</h2>
        <ul>
          {allTasks
            .filter(t => t.due >= now && t.due <= addDays(now, 30))
            .filter(visible)
            .slice(0, 10)
            .map(t => (
              <li key={`up-${t.key}`} style={{margin:"6px 0"}}>{fmt(t.due)} — {t.title}</li>
            ))}
          {allTasks.filter(t => t.due >= now && t.due <= addDays(now, 30)).filter(visible).length === 0 && (
            <li>No tasks in the next 30 days 🎉</li>
          )}
        </ul>
      </section>

      {/* Grouped checklist with per-group progress */}
      <section style={{marginTop: 24}}>
        <h2>Checklist</h2>
        <div style={{display:"grid", gap:12}}>
          {groups.map(group => {
            const visibleItems = group.items.filter(visible);
            if (visibleItems.length === 0) return null;

            const gDone = group.items.filter((t:any) => taskState[t.key]?.done).length;
            const gTotal = group.items.length;
            const gPct = gTotal ? Math.round((gDone / gTotal) * 100) : 0;

            return (
              <div key={group.key} style={{border:"1px solid #ddd", borderRadius:10, padding:12}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 8}}>
                  <div style={{fontWeight:700}}>{group.label}</div>
                  <div style={{fontSize:12, color:"#555"}}>{gDone}/{gTotal} ({gPct}%)</div>
                </div>
                <div style={{height:8, background:"#f0f0f0", borderRadius:999, marginBottom:10}}>
                  <div style={{height:8, width:`${gPct}%`, background:"#222", borderRadius:999}} />
                </div>

                <div style={{display:"grid", gap:8}}>
                  {visibleItems.map((t:any) => {
                    const done = !!taskState[t.key]?.done;
                    const overdue = isOverdue(t);
                    return (
                      <div key={t.key} style={{
                        display:"grid", gridTemplateColumns:"auto 1fr auto",
                        gap:12, alignItems:"start", padding:"10px 12px",
                        border:"1px solid #eee", borderRadius:8, background: done ? "#f7fff7" : "#fff"
                      }}>
                        <input type="checkbox" checked={done} onChange={() => toggleDone(t.key)} />
                        <div>
                          <div style={{fontWeight:600}}>
                            {t.title} {overdue && <span style={{color:"#b00020"}}>(overdue)</span>}
                          </div>
                          {t.description && <div style={{fontSize:12, color:"#666"}}>{t.description}</div>}
                          <div style={{marginTop:6}}>
                            <textarea
                              placeholder="Add a note (vendor, price, etc.)"
                              value={taskState[t.key]?.note || ""}
                              onChange={(e) => updateNote(t.key, e.target.value)}
                              rows={2}
                              style={{width:"100%", padding:8, border:"1px solid #ddd", borderRadius:6, fontFamily:"inherit"}}
                            />
                          </div>
                        </div>
                        <div style={{fontSize:12, color: overdue ? "#b00020" : "#333"}}>{fmt(t.due)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <p style={{marginTop:24}}><a href="/">← Back home</a></p>
    </main>
  );
}
