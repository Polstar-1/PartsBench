export default function Ask({ vehicle }) {
  return (
    <>
      <p className="eyebrow">Ask</p>
      <h1 className="page-title">Ask about a problem.</h1>
      <p className="page-sub">Coming soon. Describe what's wrong with your {vehicle ? vehicle.year + " " + vehicle.make + " " + vehicle.model : "vehicle"} and get a plain-English answer.</p>

      <div className="ask-grid">
      <div className="panel">
        <label htmlFor="ask">What's going on?</label>
        <textarea id="ask" rows={4} disabled placeholder="e.g. Rough idle when cold, check engine light, P0301…" />
        <button className="btn-primary block" disabled style={{ marginTop: 12 }}>Ask (coming soon)</button>
      </div>

      <div className="panel">
        <p className="section-title" style={{ marginBottom: 10 }}>Each answer will cover</p>
        <ol className="ask-list">
          <li><strong>What happened.</strong> The likely fault, in plain language.</li>
          <li><strong>Why it happened.</strong> Wear, age, or a known weak point for this vehicle.</li>
          <li><strong>How to prevent it.</strong> What to do differently so it doesn't repeat.</li>
          <li><strong>The part to buy.</strong> The right replacement, with links.</li>
        </ol>
      </div>
      </div>
    </>
  );
}
