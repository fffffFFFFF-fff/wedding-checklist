export default function Home() {
  return (
    <main style={{maxWidth: 720, margin: "40px auto", padding: 16, fontFamily: "system-ui"}}>
      <h1>Wedding Checklist</h1>
      <p>Enter your wedding date and budget to get a personalized to-do list and timeline.</p>
      <a href="/start" style={{
        display: "inline-block",
        marginTop: 16,
        padding: "10px 16px",
        border: "1px solid #333",
        borderRadius: 8,
        textDecoration: "none"
      }}>
        Plan my wedding
      </a>
      <p style={{marginTop: 24, fontSize: 12, color: "#666"}}>MVP demo – no signup needed.</p>
    </main>
  );
}
