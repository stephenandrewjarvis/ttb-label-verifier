"use client";

import React, { useState } from "react";
import { COLA_APPLICATIONS } from "../../lib/cola-applications";
import FieldResults from "./FieldResults";
import { FEDERAL_BLUE, FEDERAL_DARK, GOVERNMENT_WARNING, overallConfig, type BulkItem, type VerifyResponse } from "./constants";

function StatusDot({ status }: { status: "pass" | "fail" | "needs_review" }) {
  const cfg = overallConfig[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
      <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: cfg.borderColor, flexShrink: 0 }} />
      <span style={{ fontSize: "12px", fontWeight: 700, color: cfg.textColor }}>{cfg.label}</span>
    </span>
  );
}

export default function BulkReview() {
  const queueApps = Object.values(COLA_APPLICATIONS);
  const [bulkInput, setBulkInput] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Record<string, boolean>>>({});

  const handleBulkReview = async () => {
    const numbers = bulkInput
      .split(/[\n,]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);
    if (numbers.length === 0) return;

    setBulkLoading(true);
    setBulkItems([]);
    setExpandedRow(null);
    setOverrides({});
    setBulkProgress({ done: 0, total: numbers.length });

    const results: BulkItem[] = [];

    for (const appNumber of numbers) {
      const app = COLA_APPLICATIONS[appNumber];
      if (!app) {
        results.push({ appNumber, overallStatus: "not_found", error: `Application ${appNumber} not found in COLA` });
        setBulkProgress({ done: results.length, total: numbers.length });
        setBulkItems([...results]);
        continue;
      }

      try {
        const imageRes = await fetch(app.labelImagePath);
        const imageBlob = await imageRes.blob();
        const filename = app.labelImagePath.split("/").pop() ?? "label.png";
        const mimeType = imageBlob.type || (filename.endsWith(".svg") ? "image/svg+xml" : "image/png");
        const imageFile = new File([imageBlob], filename, { type: mimeType });
        const applicationData: Record<string, string> = {
          appNumber: app.appNumber,
          brandName: app.brandName,
          classType: app.classType,
          alcoholContent: app.alcoholContent,
          netContents: app.netContents,
          producerName: app.producerName,
          countryOfOrigin: app.countryOfOrigin,
          governmentWarning: GOVERNMENT_WARNING,
        };
        const fd = new FormData();
        fd.append("image", imageFile);
        fd.append("applicationData", JSON.stringify(applicationData));
        const verifyRes = await fetch("/api/verify", { method: "POST", body: fd });
        const verifyData: VerifyResponse = await verifyRes.json();
        const statuses = verifyData.results.map((r) => r.status);
        const overall = statuses.some((s) => s === "mismatch" || s === "missing_on_label")
          ? "fail"
          : statuses.some((s) => s === "fuzzy_match")
          ? "needs_review"
          : "pass";
        results.push({ appNumber, applicantName: app.applicantName, classType: app.classType, overallStatus: overall, results: verifyData.results });
      } catch (err) {
        results.push({ appNumber, applicantName: app.applicantName, overallStatus: "fail", error: `Verification failed: ${err instanceof Error ? err.message : "Unknown error"}` });
      }

      setBulkProgress({ done: results.length, total: numbers.length });
      setBulkItems([...results]);
    }

    setBulkLoading(false);
    setBulkProgress(null);
  };

  const passed = bulkItems.filter((i) => i.overallStatus === "pass").length;
  const needsReview = bulkItems.filter((i) => i.overallStatus === "needs_review").length;
  const failed = bulkItems.filter((i) => i.overallStatus === "fail").length;
  const notFound = bulkItems.filter((i) => i.overallStatus === "not_found").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      <div style={{ backgroundColor: "#EBF3F9", border: "1px solid #A8D0E6", borderRadius: "4px", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: FEDERAL_DARK }}>Bulk Review — COLA Application Numbers</span>
        <span style={{ fontSize: "11px", color: "#71767A" }}>Pulls label and application data directly from COLA · No file uploads required</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "16px", alignItems: "start" }}>
        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", padding: "20px" }}>
          <label htmlFor="bulk-input" style={{ fontSize: "12px", fontWeight: 700, color: "#565C65", textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: "6px" }}>
            Application Numbers
          </label>
          <p style={{ fontSize: "12px", color: "#71767A", margin: "0 0 10px" }}>
            Enter one application number per line, or comma-separated. The system will pull each application from COLA and verify the label automatically.
          </p>
          <textarea
            id="bulk-input"
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder={"TTB-2024-001\nTTB-2024-002\nTTB-2024-003"}
            rows={8}
            style={{ width: "100%", border: "1px solid #A9AEB1", borderRadius: "4px", padding: "10px 12px", fontSize: "14px", fontFamily: "monospace", color: "#1B1B1B", resize: "vertical", boxSizing: "border-box", outline: "none" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", padding: "16px" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#565C65", textTransform: "uppercase", letterSpacing: "0.8px", margin: "0 0 8px" }}>How it works</p>
            <ol style={{ fontSize: "12px", color: "#565C65", margin: 0, paddingLeft: "16px", lineHeight: 1.8 }}>
              <li>Enter TTB application numbers</li>
              <li>System fetches each application from COLA</li>
              <li>OCR runs on the attached label artwork</li>
              <li>Results are compiled into a summary report</li>
            </ol>
          </div>
          <div style={{ backgroundColor: "#F0F0F0", border: "1px solid #D9D9D9", borderRadius: "4px", padding: "12px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#565C65", margin: "0 0 4px" }}>Demo numbers</p>
            <p style={{ fontSize: "11px", fontFamily: "monospace", color: "#1B1B1B", margin: 0, lineHeight: 1.8 }}>
              {queueApps.map((a) => <React.Fragment key={a.appNumber}>{a.appNumber}<br /></React.Fragment>)}
            </p>
            <button
              style={{ marginTop: "8px", fontSize: "11px", fontWeight: 600, color: FEDERAL_BLUE, background: "none", border: `1px solid ${FEDERAL_BLUE}`, borderRadius: "4px", padding: "3px 10px", cursor: "pointer" }}
              onClick={() => setBulkInput(queueApps.map((a) => a.appNumber).join("\n"))}
            >
              Load all {queueApps.length}
            </button>
          </div>
          <button
            onClick={handleBulkReview}
            disabled={!bulkInput.trim() || bulkLoading}
            style={{ backgroundColor: !bulkInput.trim() || bulkLoading ? "#C9C9C9" : FEDERAL_BLUE, color: "white", border: "none", borderRadius: "4px", padding: "12px 20px", fontSize: "15px", fontWeight: 700, cursor: !bulkInput.trim() || bulkLoading ? "not-allowed" : "pointer", fontFamily: "'Public Sans', system-ui, sans-serif" }}
          >
            {bulkLoading ? "Running…" : "Run Bulk Review"}
          </button>
        </div>
      </div>

      {bulkLoading && bulkProgress && (
        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", padding: "16px" }} role="status">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#1B1B1B" }}>Processing…</span>
            <span style={{ fontSize: "12px", color: "#71767A" }}>{bulkProgress.done} of {bulkProgress.total}</span>
          </div>
          <div style={{ backgroundColor: "#E8E8E8", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
            <div style={{ backgroundColor: FEDERAL_BLUE, height: "100%", width: `${(bulkProgress.done / bulkProgress.total) * 100}%`, transition: "width 0.3s ease", borderRadius: "4px" }} />
          </div>
        </div>
      )}

      {bulkItems.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {!bulkLoading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
              {[
                { label: "Total", value: bulkItems.length, color: "#1B1B1B", bg: "#FFFFFF" },
                { label: "Approved", value: passed, color: "#00521C", bg: "#E5F4EC" },
                { label: "Needs Review", value: needsReview, color: "#925C00", bg: "#FEF3E2" },
                { label: "Rejected", value: failed, color: "#9E1B1B", bg: "#FDEAEA" },
                { label: "Not Found", value: notFound, color: "#71767A", bg: "#F0F0F0" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ backgroundColor: bg, border: "1px solid #D9D9D9", borderRadius: "4px", padding: "14px", textAlign: "center" }}>
                  <div style={{ fontSize: "26px", fontWeight: 700, color }}>{value}</div>
                  <div style={{ fontSize: "11px", color: "#565C65", marginTop: "2px" }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #D9D9D9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#1B1B1B" }}>Bulk Review Results</span>
              {bulkLoading && <span style={{ fontSize: "12px", color: "#71767A" }}>Results updating as each label completes…</span>}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#F0F0F0" }}>
                  {["Application", "Applicant", "Class/Type", "Status", "Detail"].map((h, i) => (
                    <th key={h} scope="col" style={{ padding: "8px 16px", textAlign: i === 4 ? "right" : "left", fontWeight: 700, color: "#565C65", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bulkItems.map((item) => (
                  <React.Fragment key={item.appNumber}>
                    <tr style={{ borderTop: "1px solid #E8E8E8", backgroundColor: expandedRow === item.appNumber ? "#F7F9FC" : "#FFFFFF" }}>
                      <td style={{ padding: "10px 16px", fontFamily: "monospace", fontWeight: 600, color: "#1B1B1B" }}>{item.appNumber}</td>
                      <td style={{ padding: "10px 16px", color: "#1B1B1B" }}>{item.applicantName ?? "—"}</td>
                      <td style={{ padding: "10px 16px", color: "#565C65", fontSize: "12px" }}>{item.classType ?? "—"}</td>
                      <td style={{ padding: "10px 16px" }}>
                        {item.overallStatus === "not_found"
                          ? <span style={{ fontSize: "12px", fontWeight: 700, color: "#71767A" }}>Not Found</span>
                          : <StatusDot status={item.overallStatus as "pass" | "fail" | "needs_review"} />}
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right" }}>
                        {item.results && (
                          <button
                            style={{ fontSize: "11px", color: FEDERAL_BLUE, background: "none", border: `1px solid ${FEDERAL_BLUE}`, borderRadius: "4px", padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}
                            onClick={() => setExpandedRow(expandedRow === item.appNumber ? null : item.appNumber)}
                          >
                            {expandedRow === item.appNumber ? "Hide" : "View"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {item.error && item.overallStatus !== "not_found" && (
                      <tr style={{ borderTop: "1px solid #E8E8E8" }}>
                        <td colSpan={5} style={{ padding: "10px 16px", backgroundColor: "#FDEAEA" }}>
                          <span style={{ color: "#9E1B1B", fontSize: "12px" }}>{item.error}</span>
                        </td>
                      </tr>
                    )}
                    {item.overallStatus === "not_found" && (
                      <tr style={{ borderTop: "1px solid #E8E8E8" }}>
                        <td colSpan={5} style={{ padding: "8px 16px", backgroundColor: "#F8F8F8" }}>
                          <span style={{ color: "#71767A", fontSize: "12px" }}>Application not found in COLA — number may be incorrect or not yet in the system.</span>
                        </td>
                      </tr>
                    )}
                    {expandedRow === item.appNumber && item.results && (
                      <tr style={{ borderTop: "1px solid #E8E8E8" }}>
                        <td colSpan={5} style={{ padding: "16px" }}>
                          <FieldResults
                            results={item.results}
                            overrides={overrides[item.appNumber] || {}}
                            onOverride={(key) => setOverrides((p) => ({ ...p, [item.appNumber]: { ...(p[item.appNumber] || {}), [key]: true } }))}
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
