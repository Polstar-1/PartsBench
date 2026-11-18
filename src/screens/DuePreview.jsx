import RecallPanel from "../RecallPanel";
import { dueAround } from "../preview";
import { fmtInterval, fmtDistU, distUnit, fromInput } from "../units";

// The payoff, shown before anyone is asked to save anything: what usually comes due at this mileage, plus recalls.
export default function DuePreview({ draft, mileage, full }) {
  const miles = mileage ? fromInput(mileage) : null;
  const items = dueAround(draft, miles);
  return (
    <div className="due-preview">
      <p className="section-title" style={{ marginBottom: 6 }}>What to expect</p>
      {items === null && <p className="hint" style={{ marginTop: 0 }}>Enter your mileage above to see what usually comes due around then.</p>}
      {items !== null && items.length > 0 && (
        <>
          <p className="hint" style={{ marginTop: 0 }}>Around {fmtDistU(miles)}, these jobs usually come up:</p>
          <ul className="due-list">
            {items.map((it) => (
              <li key={it.key}>
                <span className="due-name">{it.label}{!full && !it.free && <span className="due-tag">Premium</span>}</span>
                <span className="due-every">every ~{fmtInterval(it.every)} {distUnit()}</span>
              </li>
            ))}
          </ul>
          <p className="hint">Based on common intervals, not your service history. Save the vehicle and log what's been done to track it for real.</p>
        </>
      )}
      {items !== null && items.length === 0 && (
        <p className="hint" style={{ marginTop: 0 }}>No big jobs usually land right at {fmtDistU(miles)}. Routine ones like oil and tire rotation still come around regularly.</p>
      )}
      <RecallPanel vehicle={draft} collapsed />
    </div>
  );
}
