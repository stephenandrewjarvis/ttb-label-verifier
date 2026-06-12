"use client";

import React, { useState, useRef } from "react";
import FieldResults from "./FieldResults";
import { FEDERAL_BLUE, overallConfig, type BatchResponse } from "./constants";

function StatusDot({ status }: { status: "pass" | "fail" | "needs_review" }) {
  const cfg = overallConfig[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
      <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: cfg.borderColor, flexShrink: 0 }} />
      <span style={{ fontSize: "12px", fontWeight: 700, color: cfg.textColor }}>{cfg.label}</span>
    </span>
  );
}

export default function BatchUpload() {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [useStandardWarning, setUseStandardWarning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchResponse | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Record<string, boolean>>>({});
  const zipInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!zipFile || !csvFile) return;
    setLoading(true);
    setResult(null);
    setExpandedRow(null);
    setOverrides({});
    const fd = new FormData();
    fd.append("zip", zipFile);
    fd.append("csv", csvFile);
    fd.append("useStandardWarning", String(useStandardWarning));
    try {
      const res = await fetch("/api/verify-batch", { method: "POST", body: fd });
      setResult(await res.json());
    } catch {
      setResult({ items: [], summary: { total: 0, passed: 0, needsReview: 0, failed: 0 }, error: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* ZIP upload */}
        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", padding: "20px" }}>
          <label htmlFor="zip-upload" style={{ fontSize: "12px", fontWeight: 700, color: "#565C65", textTransform: "uppercase", letterSpacing: "0.8px", display: "block", margin: "0 0 10px" }}>Label Images (ZIP)</label>
          <button
            id="zip-upload"
            onClick={() => zipInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); zipInputRef.current?.click(); } }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setZipFile(f); }}
            style={{ border: `2px dashed ${zipFile ? FEDERAL_BLUE : "#A9AEB1"}`, borderRadius: "4px", padding: "20px", textAlign: "center", cursor: "pointer", backgroundColor: zipFile ? "#F0F8FF" : "#FAFAFA", width: "100%" }}
            aria-label={zipFile ? `ZIP file selected: ${zipFile.name}` : "Upload ZIP file containing label images"}
          >
            <div style={{ fontSize: "28px", marginBottom: "6px" }}>🗜</div>
            {zipFile ? (
              <p style={{ fontSize: "13px", fontWeight: 600, color: FEDERAL_BLUE, margin: 0 }}>{zipFile.name}</p>
            ) : (
              <>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#1B1B1B", margin: "0 0 2px" }}>Click or drag ZIP file</p>
                <p style={{ fontSize: "11px", color: "#71767A", margin: 0 }}>ZIP containing label image files</p>
              </>
            )}
          </button>
          <input ref={zipInputRef} type="file" accept=".zip" className="sr-only" aria-label="Select ZIP file with label images" onChange={(e) => { const f = e.target.files?.[0]; if (f) setZipFile(f); }} />
          {zipFile && <button style={{ marginTop: "6px", fontSize: "12px", color: "#71767A", background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => setZipFile(null)}>Remove</button>}
        </div>

        {/* CSV upload */}
        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", padding: "20px" }}>
          <label htmlFor="csv-upload" style={{ fontSize: "12px", fontWeight: 700, color: "#565C65", textTransform: "uppercase", letterSpacing: "0.8px", display: "block", margin: "0 0 10px" }}>Application Data (CSV)</label>
          <button
            id="csv-upload"
            onClick={() => csvInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); csvInputRef.current?.click(); } }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setCsvFile(f); }}
            style={{ border: `2px dashed ${csvFile ? FEDERAL_BLUE : "#A9AEB1"}`, borderRadius: "4px", padding: "20px", textAlign: "center", cursor: "pointer", backgroundColor: csvFile ? "#F0F8FF" : "#FAFAFA", width: "100%" }}
            aria-label={csvFile ? `CSV file selected: ${csvFile.name}` : "Upload CSV file with application data"}
          >
            <div style={{ fontSize: "28px", marginBottom: "6px" }}>📄</div>
            {csvFile ? (
              <p style={{ fontSize: "13px", fontWeight: 600, color: FEDERAL_BLUE, margin: 0 }}>{csvFile.name}</p>
            ) : (
              <>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#1B1B1B", margin: "0 0 2px" }}>Click or drag CSV file</p>
                <p style={{ fontSize: "11px", color: "#71767A", margin: 0 }}>filename, brandName, classType…</p>
              </>
            )}
          </button>
          <input ref={csvInputRef} type="file" accept=".csv" className="sr-only" aria-label="Select CSV file with application data" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCsvFile(f); }} />
          {csvFile && <button style={{ marginTop: "6px", fontSize: "12px", color: "#71767A", background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => setCsvFile(null)}>Remove</button>}
        </div>
      </div>

      <div style={{ backgroundColor: "#EBF3F9", border: "1px solid #A8D0E6", borderRadius: "4px", padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#1a4480", margin: "0 0 4px" }}>CSV Format</p>
            <p style={{ fontSize: "11px", fontFamily: "monospace", color: "#1B1B1B", margin: 0 }}>
              filename, brandName, classType, alcoholContent, netContents, producerName, countryOfOrigin
            </p>
            <p style={{ fontSize: "11px", color: "#565C65", margin: "4px 0 0" }}>
              The <strong>filename</strong> column must match image filenames inside the ZIP exactly. Leave <strong>countryOfOrigin</strong> blank for domestic products.
            </p>
          </div>
          <a
            href="/samples/batch-sample.csv"
            download="batch-sample.csv"
            style={{ flexShrink: 0, fontSize: "12px", fontWeight: 600, color: FEDERAL_BLUE, border: `1px solid ${FEDERAL_BLUE}`, borderRadius: "4px", padding: "5px 12px", textDecoration: "none", whiteSpace: "nowrap" }}
          >
            ↓ Download Template
          </a>
        </div>
      </div>

      <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", padding: "14px 16px" }}>
        <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}>
          <input type="checkbox" style={{ marginTop: "2px", accentColor: FEDERAL_BLUE }} checked={useStandardWarning} onChange={(e) => setUseStandardWarning(e.target.checked)} />
          <span style={{ fontSize: "13px", color: "#1B1B1B" }}>Apply standard TTB government warning to all labels in batch</span>
        </label>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!zipFile || !csvFile || loading}
        style={{ width: "100%", backgroundColor: !zipFile || !csvFile || loading ? "#C9C9C9" : FEDERAL_BLUE, color: "white", border: "none", borderRadius: "4px", padding: "12px 24px", fontSize: "16px", fontWeight: 700, cursor: !zipFile || !csvFile || loading ? "not-allowed" : "pointer", fontFamily: "'Public Sans', 'Source Sans Pro', system-ui, sans-serif", transition: "background-color 0.15s ease" }}
      >
        {loading ? "Processing Batch…" : "Run Batch Verification"}
      </button>

      {loading && (
        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", padding: "40px", textAlign: "center" }} role="status" aria-live="polite">
          <div style={{ fontSize: "36px", marginBottom: "12px", animation: "pulse 1.5s infinite" }}>⚙️</div>
          <p style={{ fontSize: "16px", fontWeight: 600, color: "#1B1B1B", margin: "0 0 4px" }}>Processing batch…</p>
          <p style={{ fontSize: "13px", color: "#71767A", margin: 0 }}>Running OCR on each label — this may take up to 30 seconds</p>
        </div>
      )}

      {result?.error && (
        <div style={{ backgroundColor: "#FDEAEA", border: "1px solid #9E1B1B", borderRadius: "4px", padding: "16px" }} role="alert">
          <p style={{ color: "#9E1B1B", fontWeight: 600, margin: 0, fontSize: "14px" }}>{result.error}</p>
        </div>
      )}

      {result && !result.error && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }} role="region" aria-live="polite" aria-label="Batch verification results">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            {[
              { label: "Total", value: result.summary.total, color: "#1B1B1B", bg: "#FFFFFF" },
              { label: "Approved", value: result.summary.passed, color: "#00521C", bg: "#E5F4EC" },
              { label: "Needs Review", value: result.summary.needsReview, color: "#925C00", bg: "#FEF3E2" },
              { label: "Rejected", value: result.summary.failed, color: "#9E1B1B", bg: "#FDEAEA" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ backgroundColor: bg, border: "1px solid #D9D9D9", borderRadius: "4px", padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: "28px", fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: "12px", color: "#565C65", marginTop: "2px" }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #D9D9D9" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#1B1B1B" }}>Batch Results</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#F0F0F0" }}>
                  {["Filename", "Status", "Notes", "Detail"].map((h, i) => (
                    <th key={h} scope="col" style={{ padding: "8px 16px", textAlign: i === 3 ? "right" : "left", fontWeight: 700, color: "#565C65", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <React.Fragment key={item.filename}>
                    <tr style={{ borderTop: "1px solid #E8E8E8", backgroundColor: expandedRow === item.filename ? "#F7F9FC" : "#FFFFFF" }}>
                      <td style={{ padding: "10px 16px", fontFamily: "monospace", color: "#1B1B1B" }}>{item.filename}</td>
                      <td style={{ padding: "10px 16px" }}><StatusDot status={item.overallStatus} /></td>
                      <td style={{ padding: "10px 16px", fontSize: "11px", color: "#71767A" }}>{item.error ? "—" : item.imageQualityNotes || "—"}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right" }}>
                        {item.results && (
                          <button
                            style={{ fontSize: "11px", color: FEDERAL_BLUE, background: "none", border: `1px solid ${FEDERAL_BLUE}`, borderRadius: "4px", padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}
                            onClick={() => setExpandedRow(expandedRow === item.filename ? null : item.filename)}
                          >
                            {expandedRow === item.filename ? "Hide" : "View"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {item.error && (
                      <tr style={{ borderTop: "1px solid #E8E8E8" }}>
                        <td colSpan={4} style={{ padding: "10px 16px", backgroundColor: "#FDEAEA" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                            <span style={{ color: "#9E1B1B", fontWeight: 700, fontSize: "13px", flexShrink: 0 }}>Error:</span>
                            <span style={{ color: "#9E1B1B", fontSize: "13px" }}>{item.error}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {expandedRow === item.filename && item.results && (
                      <tr style={{ borderTop: "1px solid #E8E8E8" }}>
                        <td colSpan={4} style={{ padding: "16px" }}>
                          <FieldResults
                            results={item.results}
                            overrides={overrides[item.filename] || {}}
                            onOverride={(key) => setOverrides((p) => ({ ...p, [item.filename]: { ...(p[item.filename] || {}), [key]: true } }))}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
