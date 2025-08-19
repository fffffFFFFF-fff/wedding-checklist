"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StartPage() {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [budget, setBudget] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !budget) {
      alert("Please enter a wedding date and budget.");
      return;
    }
    localStorage.setItem("weddingDate", date);
    localStorage.setItem("weddingBudget", budget);
    localStorage.removeItem("taskStatus");
    router.push("/plan");
  }

  return (
    <main style={{maxWidth: 720, margin: "40px auto", padding: 16, fontFamily: "system-ui"}}>
      <h1>Tell us the basics</h1>
      <form onSubmit={handleSubmit} style={{display: "grid", gap: 12, marginTop: 16}}>
        <label>
          Wedding date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{display: "block", marginTop: 6, padding: 8, width: "100%"}}
          />
        </label>

        <label>
          Total budget (e.g. 10000)
          <input
            type="number"
            min={0}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            style={{display: "block", marginTop: 6, padding: 8, width: "100%"}}
          />
        </label>

        <button type="submit" style={{
          padding: "10px 16px",
          border: "1px solid #333",
          borderRadius: 8,
          background: "#fff",
          cursor: "pointer",
          width: "fit-content"
        }}>
          Create my plan
        </button>
      </form>
    </main>
  );
}
