"use client";

import { statusConfig, type FieldResult } from "./constants";

export default function FieldResults({
  results,
  overrides,
  onOverride,
}: {
  results: FieldResult[];
  overrides: Record<string, boolean>;
  onOverride?: (key: string) => void;
}) {
  const effectiveStatus = (r: FieldResult) =>
    overrides[r.key] && r.status === "fuzzy_match" ? "match" : r.status;

  return (
    <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #D9D9D9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#1B1B1B" }}>Field Verification Results</span>
        <span style={{ fontSize: "11px", color: "#71767A" }}>{results.length} fields checked</span>
      </div>
      <div>
        {results.map((r, i) => {
          const status = effectiveStatus(r);
          const scfg = statusConfig[status] || statusConfig.mismatch;
          return (
            <div key={r.key} style={{ padding: "10px 16px", borderLeft: `3px solid ${scfg.borderColor}`, borderBottom: i < results.length - 1 ? "1px solid #E8E8E8" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#1B1B1B" }}>{r.field}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {r.isStrict && (
                    <span style={{ fontSize: "10px", backgroundColor: "#F0F0F0", color: "#565C65", padding: "1px 6px", borderRadius: "10px", border: "1px solid #C9C9C9", fontWeight: 600 }}>STRICT</span>
                  )}
                  <span style={{ fontSize: "11px", fontWeight: 700, color: scfg.badgeText, backgroundColor: scfg.badgeBg, padding: "2px 8px", borderRadius: "10px" }}>{scfg.label}</span>
                </div>
              </div>
              {r.appValue && (
                <div style={{ fontSize: "11px", color: "#565C65" }}>
                  <span style={{ fontWeight: 600 }}>Application: </span>
                  <span style={{ fontFamily: "monospace" }}>{r.key === "governmentWarning" ? r.appValue.substring(0, 60) + "…" : r.appValue}</span>
                </div>
              )}
              {r.labelValue && (
                <div style={{ fontSize: "11px", color: "#565C65", marginTop: "2px" }}>
                  <span style={{ fontWeight: 600 }}>Label: </span>
                  <span style={{ fontFamily: "monospace" }}>{r.key === "governmentWarning" ? r.labelValue.substring(0, 60) + "…" : r.labelValue}</span>
                </div>
              )}
              {r.warningNotes && r.warningNotes.length > 0 && (
                <ul style={{ margin: "4px 0 0", paddingLeft: "14px" }}>
                  {r.warningNotes.map((note) => (
                    <li key={note} style={{ fontSize: "11px", color: "#9E1B1B", marginTop: "2px" }}>{note}</li>
                  ))}
                </ul>
              )}
              {r.status === "fuzzy_match" && !overrides[r.key] && onOverride && (
                <button
                  style={{ marginTop: "6px", fontSize: "11px", backgroundColor: "#FEF3E2", color: "#925C00", border: "1px solid #E5A000", borderRadius: "10px", padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}
                  onClick={() => onOverride(r.key)}
                >
                  ✓ Approve as match
                </button>
              )}
              {overrides[r.key] && (
                <span style={{ marginTop: "4px", display: "inline-block", fontSize: "11px", color: "#00521C", fontWeight: 600 }}>✓ Manually approved</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
