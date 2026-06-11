"use client";

import React, { useState, useRef } from "react";
import Header from "./header";
import Title from "./title";
import Footer from "./footer";
import { COLA_APPLICATIONS, type ColaApplication } from "../lib/cola-applications";

const GOVERNMENT_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

type FieldResult = {
  field: string;
  key: string;
  appValue: string | null;
  labelValue: string | null;
  status: string;
  isStrict?: boolean;
  warningNotes?: string[];
};

type VerifyResponse = {
  results: FieldResult[];
  overallStatus: "pass" | "fail" | "needs_review";
  imageQualityNotes: string;
  error?: string;
};

type BatchItem = {
  filename: string;
  results?: FieldResult[];
  overallStatus: "pass" | "fail" | "needs_review";
  imageQualityNotes?: string;
  error?: string;
};

type BatchResponse = {
  items: BatchItem[];
  summary: { total: number; passed: number; needsReview: number; failed: number };
  error?: string;
};


const FEDERAL_BLUE = "#005EA2";
const FEDERAL_DARK = "#1a4480";

const overallConfig = {
  pass: { label: "APPROVED", textColor: "#00521C", bgColor: "#E5F4EC", borderColor: "#00521C", icon: "✓" },
  needs_review: { label: "NEEDS REVIEW", textColor: "#925C00", bgColor: "#FEF3E2", borderColor: "#E5A000", icon: "⚠" },
  fail: { label: "REJECTED", textColor: "#9E1B1B", bgColor: "#FDEAEA", borderColor: "#9E1B1B", icon: "✗" },
};

const statusConfig: Record<string, { label: string; badgeBg: string; badgeText: string; borderColor: string }> = {
  match: { label: "Match", badgeBg: "#E5F4EC", badgeText: "#00521C", borderColor: "#00521C" },
  fuzzy_match: { label: "Likely Match — Review", badgeBg: "#FEF3E2", badgeText: "#925C00", borderColor: "#E5A000" },
  mismatch: { label: "Mismatch", badgeBg: "#FDEAEA", badgeText: "#9E1B1B", borderColor: "#9E1B1B" },
  missing_on_label: { label: "Missing on Label", badgeBg: "#FDEAEA", badgeText: "#9E1B1B", borderColor: "#9E1B1B" },
  not_in_application: { label: "Not in Application", badgeBg: "#FFF4E0", badgeText: "#7A4F00", borderColor: "#E5A000" },
  not_required: { label: "N/A", badgeBg: "#F0F0F0", badgeText: "#71767A", borderColor: "#C9C9C9" },
};


// Reusable field results list used by both single and batch drill-down
function FieldResults({ results, overrides, onOverride }: {
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

export default function Page() {
  // Mode toggle
  const [mode, setMode] = useState<"single" | "batch" | "bulk">("single");

  // ── Application Review state ──
  const queueApps = Object.values(COLA_APPLICATIONS);
  const [selectedApp, setSelectedApp] = useState<ColaApplication | null>(null);
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, "pending" | "reviewing" | "complete">>({});
  const [appResults, setAppResults] = useState<Record<string, VerifyResponse>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  // ── Batch mode state ──
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [batchUseStandardWarning, setBatchUseStandardWarning] = useState(true);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResponse | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [batchOverrides, setBatchOverrides] = useState<Record<string, Record<string, boolean>>>({});
  const zipInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // ── Bulk Review state ──
  type BulkItem = {
    appNumber: string;
    applicantName?: string;
    classType?: string;
    overallStatus: "pass" | "fail" | "needs_review" | "not_found";
    results?: FieldResult[];
    error?: string;
  };
  const [bulkInput, setBulkInput] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkExpandedRow, setBulkExpandedRow] = useState<string | null>(null);
  const [bulkOverrides, setBulkOverrides] = useState<Record<string, Record<string, boolean>>>({});

  // ── Application Review handlers ──
  const handleStartReview = async (app: ColaApplication) => {
    setSelectedApp(app);
    setResult(null);
    setOverrides({});
    setReviewStatuses((p) => ({ ...p, [app.appNumber]: "reviewing" }));
    setLoading(true);
    try {
      const imageRes = await fetch(app.labelImagePath);
      const imageBlob = await imageRes.blob();
      const filename = app.labelImagePath.split("/").pop() ?? "label.svg";
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
      const verifyData = await verifyRes.json();
      setResult(verifyData);
      setAppResults((p) => ({ ...p, [app.appNumber]: verifyData }));
      setReviewStatuses((p) => ({ ...p, [app.appNumber]: "complete" }));
    } catch (err) {
      const errData = { results: [], overallStatus: "fail" as const, imageQualityNotes: "", error: `Verification failed: ${err instanceof Error ? err.message : "Unknown error"}` };
      setResult(errData);
      setAppResults((p) => ({ ...p, [app.appNumber]: errData }));
      setReviewStatuses((p) => ({ ...p, [app.appNumber]: "complete" }));
    } finally {
      setLoading(false);
    }
  };

  const effectiveStatus = (r: FieldResult) =>
    overrides[r.key] && r.status === "fuzzy_match" ? "match" : r.status;

  const effectiveOverall = (): "pass" | "fail" | "needs_review" => {
    if (!result) return "fail";
    const statuses = result.results.map((r) => effectiveStatus(r));
    if (statuses.some((s) => s === "mismatch" || s === "missing_on_label")) return "fail";
    if (statuses.some((s) => s === "fuzzy_match")) return "needs_review";
    return "pass";
  };

  // ── Batch mode handlers ──
  const handleBatchSubmit = async () => {
    if (!zipFile || !csvFile) return;
    setBatchLoading(true);
    setBatchResult(null);
    setExpandedRow(null);
    setBatchOverrides({});
    const fd = new FormData();
    fd.append("zip", zipFile);
    fd.append("csv", csvFile);
    fd.append("useStandardWarning", String(batchUseStandardWarning));
    try {
      const res = await fetch("/api/verify-batch", { method: "POST", body: fd });
      setBatchResult(await res.json());
    } catch {
      setBatchResult({ items: [], summary: { total: 0, passed: 0, needsReview: 0, failed: 0 }, error: "Network error. Please try again." });
    } finally {
      setBatchLoading(false);
    }
  };

  // ── Bulk Review handler ──
  const handleBulkReview = async () => {
    const numbers = bulkInput
      .split(/[\n,]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);
    if (numbers.length === 0) return;

    setBulkLoading(true);
    setBulkItems([]);
    setBulkExpandedRow(null);
    setBulkOverrides({});
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
        const filename = app.labelImagePath.split("/").pop() ?? "label.svg";
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

  const statusDot = (status: "pass" | "fail" | "needs_review") => {
    const cfg = overallConfig[status];
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: cfg.borderColor, flexShrink: 0 }} />
        <span style={{ fontSize: "12px", fontWeight: 700, color: cfg.textColor }}>{cfg.label}</span>
      </span>
    );
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Public Sans', 'Source Sans Pro', system-ui, sans-serif", backgroundColor: "#F0F0F0", fontSize: "16px", lineHeight: 1.6 }}>

      <Header />
      <Title />

      {/* Mode toggle */}
      <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid #D9D9D9", padding: "0 24px" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", display: "flex", gap: "0" }}>
          {([
            { key: "single", label: "Application Review" },
            { key: "bulk", label: "Bulk Review" },
            { key: "batch", label: "Batch Upload" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              style={{
                padding: "12px 20px",
                fontSize: "15px",
                fontWeight: mode === key ? 700 : 400,
                color: mode === key ? FEDERAL_BLUE : "#565C65",
                backgroundColor: "transparent",
                border: "none",
                borderBottom: mode === key ? `3px solid ${FEDERAL_BLUE}` : "3px solid transparent",
                cursor: "pointer",
                fontFamily: "'Public Sans', 'Source Sans Pro', system-ui, sans-serif",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN ── */}
      <main id="main" style={{ flex: 1, maxWidth: "1080px", width: "100%", margin: "0 auto", padding: "24px", boxSizing: "border-box" }}>

        {/* ── APPLICATION REVIEW MODE ── */}
        {mode === "single" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Context banner */}
            <div style={{ backgroundColor: "#EBF3F9", border: "1px solid #A8D0E6", borderRadius: "4px", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: FEDERAL_DARK }}>COLAs Online — Label Verification Queue</span>
                <span style={{ fontSize: "11px", backgroundColor: "#D1E7F5", color: FEDERAL_DARK, padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>
                  {queueApps.filter(a => !reviewStatuses[a.appNumber] || reviewStatuses[a.appNumber] === "pending").length} pending
                </span>
              </div>
              <span style={{ fontSize: "11px", color: "#71767A" }}>Simulated COLA data — production would load from Azure</span>
            </div>

            {/* Main two-column layout */}
            <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "16px", alignItems: "start" }}>

              {/* Left — application queue */}
              <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #D9D9D9", backgroundColor: "#F8F8F8" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#1B1B1B", textTransform: "uppercase", letterSpacing: "0.5px" }}>Applications Awaiting Review</span>
                </div>
                <div>
                  {queueApps.map((app, i) => {
                    const qStatus = reviewStatuses[app.appNumber] || "pending";
                    const isSelected = selectedApp?.appNumber === app.appNumber;
                    const isReviewing = qStatus === "reviewing";
                    const isComplete = qStatus === "complete";
                    const appResult = appResults[app.appNumber];
                    const getAppStatus = (r: VerifyResponse): "pass" | "fail" | "needs_review" => {
                      if (!r || r.error) return "fail";
                      const statuses = r.results.map(f => f.status);
                      if (statuses.some(s => s === "mismatch" || s === "missing_on_label")) return "fail";
                      if (statuses.some(s => s === "fuzzy_match")) return "needs_review";
                      return "pass";
                    };
                    const resultStatus = isComplete && appResult ? getAppStatus(appResult) : null;
                    return (
                      <div
                        key={app.appNumber}
                        style={{
                          borderBottom: i < queueApps.length - 1 ? "1px solid #E8E8E8" : "none",
                          borderLeft: isSelected ? `3px solid ${FEDERAL_BLUE}` : "3px solid transparent",
                          backgroundColor: isSelected ? "#F7FAFD" : "#FFFFFF",
                          padding: "14px 16px",
                          transition: "background-color 0.1s",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                              <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#71767A" }}>{app.appNumber}</span>
                              {isComplete && resultStatus && (
                                <span style={{
                                  fontSize: "10px", fontWeight: 700,
                                  color: overallConfig[resultStatus].textColor,
                                  backgroundColor: overallConfig[resultStatus].bgColor,
                                  padding: "1px 6px", borderRadius: "10px",
                                }}>
                                  {overallConfig[resultStatus].icon} {overallConfig[resultStatus].label}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "#1B1B1B", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.applicantName}</div>
                            <div style={{ fontSize: "11px", color: "#71767A" }}>{app.classType} · Submitted {app.submittedDate}</div>
                          </div>
                          <button
                            onClick={() => handleStartReview(app)}
                            disabled={isReviewing || (isSelected && loading)}
                            style={{
                              flexShrink: 0,
                              fontSize: "12px",
                              fontWeight: 700,
                              color: isReviewing || (isSelected && loading) ? "#71767A" : FEDERAL_BLUE,
                              backgroundColor: isReviewing || (isSelected && loading) ? "#F0F0F0" : "#EBF3F9",
                              border: `1px solid ${isReviewing || (isSelected && loading) ? "#C9C9C9" : FEDERAL_BLUE}`,
                              borderRadius: "4px",
                              padding: "5px 12px",
                              cursor: isReviewing || (isSelected && loading) ? "not-allowed" : "pointer",
                              fontFamily: "'Public Sans', system-ui, sans-serif",
                            }}
                          >
                            {isSelected && loading ? "Analyzing…" : isComplete ? "Re-review" : "Review"}
                          </button>
                        </div>
                        {/* Label thumbnail */}
                        <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                          <img src={app.labelImagePath} alt={`${app.brandName} label`} style={{ height: "40px", width: "auto", objectFit: "contain", borderRadius: "2px", border: "1px solid #E8E8E8", backgroundColor: "#FAFAFA" }} />
                          <span style={{ fontSize: "11px", color: "#565C65", fontStyle: "italic" }}>{app.brandName}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right — review panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }} role="region" aria-live="polite" aria-label="Label verification results">

                {/* Application detail header */}
                {selectedApp && (
                  <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ backgroundColor: "#F0F7FF", borderBottom: "1px solid #A8D0E6", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: FEDERAL_BLUE }}>Application {selectedApp.appNumber}</span>
                      <span style={{ fontSize: "11px", color: "#71767A" }}>{selectedApp.applicantName} · Submitted {selectedApp.submittedDate}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 150px" }}>
                      <div style={{ padding: "12px 16px", borderRight: "1px solid #E8E8E8" }}>
                        {[
                          { label: "Brand", value: selectedApp.brandName },
                          { label: "Class/Type", value: selectedApp.classType },
                          { label: "ABV", value: selectedApp.alcoholContent },
                          { label: "Net Contents", value: selectedApp.netContents },
                          { label: "Producer", value: selectedApp.producerName },
                          ...(selectedApp.countryOfOrigin ? [{ label: "Country", value: selectedApp.countryOfOrigin }] : []),
                        ].map(({ label, value }) => (
                          <div key={label} style={{ marginBottom: "5px", display: "flex", gap: "8px", alignItems: "baseline" }}>
                            <span style={{ fontSize: "10px", fontWeight: 700, color: "#71767A", textTransform: "uppercase", letterSpacing: "0.5px", flexShrink: 0, width: "72px" }}>{label}</span>
                            <span style={{ fontSize: "12px", color: "#1B1B1B", fontFamily: "monospace" }}>{value}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: "12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#FAFAFA" }}>
                        <p style={{ fontSize: "10px", fontWeight: 700, color: "#71767A", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px" }}>Label Artwork</p>
                        <img src={selectedApp.labelImagePath} alt="Label artwork" style={{ width: "100%", maxHeight: "180px", objectFit: "contain", borderRadius: "2px" }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading */}
                {loading && (
                  <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", padding: "40px", textAlign: "center" }} role="status">
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔍</div>
                    <p style={{ fontSize: "16px", fontWeight: 600, color: "#1B1B1B", margin: "0 0 4px" }}>Analyzing label…</p>
                    <p style={{ fontSize: "13px", color: "#71767A", margin: 0 }}>Running OCR and comparing against COLA application data…</p>
                  </div>
                )}

                {/* Error */}
                {result?.error && (
                  <div style={{ backgroundColor: "#FDEAEA", border: "1px solid #9E1B1B", borderRadius: "4px", padding: "16px" }} role="alert">
                    <p style={{ color: "#9E1B1B", fontWeight: 600, margin: 0, fontSize: "14px" }}>{result.error}</p>
                  </div>
                )}

                {/* Results */}
                {result && !result.error && !loading && (() => {
                  const overall = effectiveOverall();
                  const cfg = overallConfig[overall];
                  return (
                    <>
                      <div style={{ backgroundColor: cfg.bgColor, border: `2px solid ${cfg.borderColor}`, borderRadius: "4px", padding: "20px", textAlign: "center" }}>
                        <div style={{ fontSize: "28px", fontWeight: 700, color: cfg.textColor, letterSpacing: "1.5px" }}>{cfg.icon} {cfg.label}</div>
                        {result.imageQualityNotes && <p style={{ fontSize: "12px", color: "#565C65", margin: "8px 0 0" }}>⚠ {result.imageQualityNotes}</p>}
                      </div>
                      <FieldResults results={result.results} overrides={overrides} onOverride={(key) => setOverrides((p) => ({ ...p, [key]: true }))} />
                    </>
                  );
                })()}

                {/* Empty state */}
                {!loading && !result && !selectedApp && (
                  <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", padding: "60px 40px", textAlign: "center", color: "#71767A" }}>
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>👈</div>
                    <p style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 4px", color: "#1B1B1B" }}>Select an application to begin</p>
                    <p style={{ fontSize: "13px", margin: 0 }}>Click <strong>Review</strong> next to an application in the queue to run automated label verification.</p>
                  </div>
                )}

                {!loading && !result && selectedApp && (
                  <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", padding: "40px", textAlign: "center", color: "#71767A" }}>
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>📋</div>
                    <p style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 4px", color: "#1B1B1B" }}>Ready to review</p>
                    <p style={{ fontSize: "13px", margin: 0 }}>Click <strong>Review</strong> to run automated OCR verification on this label.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── BULK REVIEW MODE ── */}
        {mode === "bulk" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Context banner */}
            <div style={{ backgroundColor: "#EBF3F9", border: "1px solid #A8D0E6", borderRadius: "4px", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: FEDERAL_DARK }}>Bulk Review — COLA Application Numbers</span>
              <span style={{ fontSize: "11px", color: "#71767A" }}>Pulls label and application data directly from COLA · No file uploads required</span>
            </div>

            {/* Input + button */}
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

            {/* Progress */}
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

            {/* Results */}
            {bulkItems.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                {/* Summary stats */}
                {!bulkLoading && (() => {
                  const passed = bulkItems.filter(i => i.overallStatus === "pass").length;
                  const needsReview = bulkItems.filter(i => i.overallStatus === "needs_review").length;
                  const failed = bulkItems.filter(i => i.overallStatus === "fail").length;
                  const notFound = bulkItems.filter(i => i.overallStatus === "not_found").length;
                  return (
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
                  );
                })()}

                {/* Results table */}
                <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #D9D9D9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#1B1B1B" }}>Bulk Review Results</span>
                    {bulkLoading && <span style={{ fontSize: "12px", color: "#71767A" }}>Results updating as each label completes…</span>}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#F0F0F0" }}>
                        <th scope="col" style={{ padding: "8px 16px", textAlign: "left", fontWeight: 700, color: "#565C65", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Application</th>
                        <th scope="col" style={{ padding: "8px 16px", textAlign: "left", fontWeight: 700, color: "#565C65", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Applicant</th>
                        <th scope="col" style={{ padding: "8px 16px", textAlign: "left", fontWeight: 700, color: "#565C65", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Class/Type</th>
                        <th scope="col" style={{ padding: "8px 16px", textAlign: "left", fontWeight: 700, color: "#565C65", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</th>
                        <th scope="col" style={{ padding: "8px 16px", textAlign: "right", fontWeight: 700, color: "#565C65", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkItems.map((item, i) => (
                        <React.Fragment key={item.appNumber}>
                          <tr style={{ borderTop: "1px solid #E8E8E8", backgroundColor: bulkExpandedRow === item.appNumber ? "#F7F9FC" : "#FFFFFF" }}>
                            <td style={{ padding: "10px 16px", fontFamily: "monospace", fontWeight: 600, color: "#1B1B1B" }}>{item.appNumber}</td>
                            <td style={{ padding: "10px 16px", color: "#1B1B1B" }}>{item.applicantName ?? "—"}</td>
                            <td style={{ padding: "10px 16px", color: "#565C65", fontSize: "12px" }}>{item.classType ?? "—"}</td>
                            <td style={{ padding: "10px 16px" }}>
                              {item.overallStatus === "not_found" ? (
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#71767A" }}>Not Found</span>
                              ) : (
                                statusDot(item.overallStatus as "pass" | "fail" | "needs_review")
                              )}
                            </td>
                            <td style={{ padding: "10px 16px", textAlign: "right" }}>
                              {item.results && (
                                <button
                                  style={{ fontSize: "11px", color: FEDERAL_BLUE, background: "none", border: `1px solid ${FEDERAL_BLUE}`, borderRadius: "4px", padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}
                                  onClick={() => setBulkExpandedRow(bulkExpandedRow === item.appNumber ? null : item.appNumber)}
                                >
                                  {bulkExpandedRow === item.appNumber ? "Hide" : "View"}
                                </button>
                              )}
                            </td>
                          </tr>
                          {item.error && item.overallStatus !== "not_found" && (
                            <tr key={`${item.appNumber}-error`} style={{ borderTop: "1px solid #E8E8E8" }}>
                              <td colSpan={5} style={{ padding: "10px 16px", backgroundColor: "#FDEAEA" }}>
                                <span style={{ color: "#9E1B1B", fontSize: "12px" }}>{item.error}</span>
                              </td>
                            </tr>
                          )}
                          {item.overallStatus === "not_found" && (
                            <tr key={`${item.appNumber}-notfound`} style={{ borderTop: "1px solid #E8E8E8" }}>
                              <td colSpan={5} style={{ padding: "8px 16px", backgroundColor: "#F8F8F8" }}>
                                <span style={{ color: "#71767A", fontSize: "12px" }}>Application not found in COLA — number may be incorrect or not yet in the system.</span>
                              </td>
                            </tr>
                          )}
                          {bulkExpandedRow === item.appNumber && item.results && (
                            <tr key={`${item.appNumber}-detail`} style={{ borderTop: "1px solid #E8E8E8" }}>
                              <td colSpan={5} style={{ padding: "16px" }}>
                                <FieldResults
                                  results={item.results}
                                  overrides={bulkOverrides[item.appNumber] || {}}
                                  onOverride={(key) => setBulkOverrides((p) => ({ ...p, [item.appNumber]: { ...(p[item.appNumber] || {}), [key]: true } }))}
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
        )}

        {/* ── BATCH MODE ── */}
        {mode === "batch" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Batch inputs */}
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

            {/* CSV format hint + download */}
            <div style={{ backgroundColor: "#EBF3F9", border: "1px solid #A8D0E6", borderRadius: "4px", padding: "12px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: FEDERAL_DARK, margin: "0 0 4px" }}>CSV Format</p>
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

            {/* Government warning toggle */}
            <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", padding: "14px 16px" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}>
                <input type="checkbox" style={{ marginTop: "2px", accentColor: FEDERAL_BLUE }} checked={batchUseStandardWarning} onChange={(e) => setBatchUseStandardWarning(e.target.checked)} />
                <span style={{ fontSize: "13px", color: "#1B1B1B" }}>Apply standard TTB government warning to all labels in batch</span>
              </label>
            </div>

            <button onClick={handleBatchSubmit} disabled={!zipFile || !csvFile || batchLoading} style={{ width: "100%", backgroundColor: !zipFile || !csvFile || batchLoading ? "#C9C9C9" : FEDERAL_BLUE, color: "white", border: "none", borderRadius: "4px", padding: "12px 24px", fontSize: "16px", fontWeight: 700, cursor: !zipFile || !csvFile || batchLoading ? "not-allowed" : "pointer", fontFamily: "'Public Sans', 'Source Sans Pro', system-ui, sans-serif", transition: "background-color 0.15s ease" }}>
              {batchLoading ? "Processing Batch…" : "Run Batch Verification"}
            </button>

            {/* Batch loading */}
            {batchLoading && (
              <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", padding: "40px", textAlign: "center" }} role="status" aria-live="polite">
                <div style={{ fontSize: "36px", marginBottom: "12px", animation: "pulse 1.5s infinite" }}>⚙️</div>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "#1B1B1B", margin: "0 0 4px" }}>Processing batch…</p>
                <p style={{ fontSize: "13px", color: "#71767A", margin: 0 }}>Running OCR on each label — this may take up to 30 seconds</p>
              </div>
            )}

            {/* Batch error */}
            {batchResult?.error && (
              <div style={{ backgroundColor: "#FDEAEA", border: "1px solid #9E1B1B", borderRadius: "4px", padding: "16px" }} role="alert">
                <p style={{ color: "#9E1B1B", fontWeight: 600, margin: 0, fontSize: "14px" }}>{batchResult.error}</p>
              </div>
            )}

            {/* Batch results */}
            {batchResult && !batchResult.error && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }} role="region" aria-live="polite" aria-label="Batch verification results">

                {/* Summary stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                  {[
                    { label: "Total", value: batchResult.summary.total, color: "#1B1B1B", bg: "#FFFFFF" },
                    { label: "Approved", value: batchResult.summary.passed, color: "#00521C", bg: "#E5F4EC" },
                    { label: "Needs Review", value: batchResult.summary.needsReview, color: "#925C00", bg: "#FEF3E2" },
                    { label: "Rejected", value: batchResult.summary.failed, color: "#9E1B1B", bg: "#FDEAEA" },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} style={{ backgroundColor: bg, border: "1px solid #D9D9D9", borderRadius: "4px", padding: "16px", textAlign: "center" }}>
                      <div style={{ fontSize: "28px", fontWeight: 700, color }}>{value}</div>
                      <div style={{ fontSize: "12px", color: "#565C65", marginTop: "2px" }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Results table */}
                <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #D9D9D9" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#1B1B1B" }}>Batch Results</span>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#F0F0F0" }}>
                        <th scope="col" style={{ padding: "8px 16px", textAlign: "left", fontWeight: 700, color: "#565C65", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Filename</th>
                        <th scope="col" style={{ padding: "8px 16px", textAlign: "left", fontWeight: 700, color: "#565C65", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</th>
                        <th scope="col" style={{ padding: "8px 16px", textAlign: "left", fontWeight: 700, color: "#565C65", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Notes</th>
                        <th scope="col" style={{ padding: "8px 16px", textAlign: "right", fontWeight: 700, color: "#565C65", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchResult.items.map((item, i) => (
                        <React.Fragment key={item.filename}>
                          <tr key={item.filename} style={{ borderTop: "1px solid #E8E8E8", backgroundColor: expandedRow === item.filename ? "#F7F9FC" : "#FFFFFF" }}>
                            <td style={{ padding: "10px 16px", fontFamily: "monospace", color: "#1B1B1B" }}>{item.filename}</td>
                            <td style={{ padding: "10px 16px" }}>{statusDot(item.overallStatus)}</td>
                            <td style={{ padding: "10px 16px", fontSize: "11px", color: "#71767A" }}>
                              {item.error ? "—" : item.imageQualityNotes || "—"}
                            </td>
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
                            <tr key={`${item.filename}-error`} style={{ borderTop: "1px solid #E8E8E8" }}>
                              <td colSpan={4} style={{ padding: "10px 16px", backgroundColor: "#FDEAEA" }}>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                  <span style={{ color: "#9E1B1B", fontWeight: 700, fontSize: "13px", flexShrink: 0 }}>Error:</span>
                                  <span style={{ color: "#9E1B1B", fontSize: "13px" }}>{item.error}</span>
                                </div>
                              </td>
                            </tr>
                          )}
                          {expandedRow === item.filename && item.results && (
                            <tr key={`${item.filename}-detail`} style={{ borderTop: "1px solid #E8E8E8" }}>
                              <td colSpan={4} style={{ padding: "16px" }}>
                                <FieldResults
                                  results={item.results}
                                  overrides={batchOverrides[item.filename] || {}}
                                  onOverride={(key) => setBatchOverrides((p) => ({ ...p, [item.filename]: { ...(p[item.filename] || {}), [key]: true } }))}
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
        )}
      </main>

      <Footer />
    </div>
  );
}
