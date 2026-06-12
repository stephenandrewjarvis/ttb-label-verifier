"use client";

import React, { useState } from "react";
import Header from "./header";
import Title from "./title";
import Footer from "./footer";
import FieldResults from "./components/FieldResults";
import BulkReview from "./components/BulkReview";
import BatchUpload from "./components/BatchUpload";
import { COLA_APPLICATIONS, type ColaApplication } from "../lib/cola-applications";
import { FEDERAL_BLUE, FEDERAL_DARK, GOVERNMENT_WARNING, overallConfig, type FieldResult, type VerifyResponse } from "./components/constants";

export default function Page() {
  const [mode, setMode] = useState<"single" | "bulk" | "batch">("single");

  // Application Review state
  const queueApps = Object.values(COLA_APPLICATIONS);
  const [selectedApp, setSelectedApp] = useState<ColaApplication | null>(null);
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, "pending" | "reviewing" | "complete">>({});
  const [appResults, setAppResults] = useState<Record<string, VerifyResponse>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const handleStartReview = async (app: ColaApplication) => {
    setSelectedApp(app);
    setResult(null);
    setOverrides({});
    setReviewStatuses((p) => ({ ...p, [app.appNumber]: "reviewing" }));
    setLoading(true);
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
      const verifyData = await verifyRes.json();
      setResult(verifyData);
      setAppResults((p) => ({ ...p, [app.appNumber]: verifyData }));
      setReviewStatuses((p) => ({ ...p, [app.appNumber]: "complete" }));
    } catch (err) {
      const errData: VerifyResponse = { results: [], overallStatus: "fail", imageQualityNotes: "", error: `Verification failed: ${err instanceof Error ? err.message : "Unknown error"}` };
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

  const getAppStatus = (r: VerifyResponse): "pass" | "fail" | "needs_review" => {
    if (!r || r.error) return "fail";
    const statuses = r.results.map((f) => f.status);
    if (statuses.some((s) => s === "mismatch" || s === "missing_on_label")) return "fail";
    if (statuses.some((s) => s === "fuzzy_match")) return "needs_review";
    return "pass";
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Public Sans', 'Source Sans Pro', system-ui, sans-serif", backgroundColor: "#F0F0F0", fontSize: "16px", lineHeight: 1.6 }}>
      <Header />
      <Title />

      {/* Mode tabs */}
      <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid #D9D9D9", padding: "0 24px" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", display: "flex" }}>
          {(["single", "bulk", "batch"] as const).map((key) => {
            const labels = { single: "Application Review", bulk: "Bulk Review", batch: "Batch Upload" };
            return (
              <button
                key={key}
                onClick={() => setMode(key)}
                style={{ padding: "12px 20px", fontSize: "15px", fontWeight: mode === key ? 700 : 400, color: mode === key ? FEDERAL_BLUE : "#565C65", backgroundColor: "transparent", border: "none", borderBottom: mode === key ? `3px solid ${FEDERAL_BLUE}` : "3px solid transparent", cursor: "pointer", fontFamily: "'Public Sans', 'Source Sans Pro', system-ui, sans-serif" }}
              >
                {labels[key]}
              </button>
            );
          })}
        </div>
      </div>

      <main id="main" style={{ flex: 1, maxWidth: "1080px", width: "100%", margin: "0 auto", padding: "24px", boxSizing: "border-box" }}>

        {/* Application Review */}
        {mode === "single" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ backgroundColor: "#EBF3F9", border: "1px solid #A8D0E6", borderRadius: "4px", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: FEDERAL_DARK }}>COLAs Online — Label Verification Queue</span>
                <span style={{ fontSize: "11px", backgroundColor: "#D1E7F5", color: FEDERAL_DARK, padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>
                  {queueApps.filter((a) => !reviewStatuses[a.appNumber] || reviewStatuses[a.appNumber] === "pending").length} pending
                </span>
              </div>
              <span style={{ fontSize: "11px", color: "#71767A" }}>Simulated COLA data — production would load from Azure</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "16px", alignItems: "start" }}>
              {/* Queue */}
              <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #D9D9D9", backgroundColor: "#F8F8F8" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#1B1B1B", textTransform: "uppercase", letterSpacing: "0.5px" }}>Applications Awaiting Review</span>
                </div>
                {queueApps.map((app, i) => {
                  const qStatus = reviewStatuses[app.appNumber] || "pending";
                  const isSelected = selectedApp?.appNumber === app.appNumber;
                  const isReviewing = qStatus === "reviewing";
                  const isComplete = qStatus === "complete";
                  const appResult = appResults[app.appNumber];
                  const resultStatus = isComplete && appResult ? getAppStatus(appResult) : null;
                  return (
                    <div
                      key={app.appNumber}
                      style={{ borderBottom: i < queueApps.length - 1 ? "1px solid #E8E8E8" : "none", borderLeft: isSelected ? `3px solid ${FEDERAL_BLUE}` : "3px solid transparent", backgroundColor: isSelected ? "#F7FAFD" : "#FFFFFF", padding: "14px 16px" }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                            <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#71767A" }}>{app.appNumber}</span>
                            {isComplete && resultStatus && (
                              <span style={{ fontSize: "10px", fontWeight: 700, color: overallConfig[resultStatus].textColor, backgroundColor: overallConfig[resultStatus].bgColor, padding: "1px 6px", borderRadius: "10px" }}>
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
                          style={{ flexShrink: 0, fontSize: "12px", fontWeight: 700, color: isReviewing || (isSelected && loading) ? "#71767A" : FEDERAL_BLUE, backgroundColor: isReviewing || (isSelected && loading) ? "#F0F0F0" : "#EBF3F9", border: `1px solid ${isReviewing || (isSelected && loading) ? "#C9C9C9" : FEDERAL_BLUE}`, borderRadius: "4px", padding: "5px 12px", cursor: isReviewing || (isSelected && loading) ? "not-allowed" : "pointer", fontFamily: "'Public Sans', system-ui, sans-serif" }}
                        >
                          {isSelected && loading ? "Analyzing…" : isComplete ? "Re-review" : "Review"}
                        </button>
                      </div>
                      <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <img src={app.labelImagePath} alt={`${app.brandName} label`} style={{ height: "40px", width: "auto", objectFit: "contain", borderRadius: "2px", border: "1px solid #E8E8E8", backgroundColor: "#FAFAFA" }} />
                        <span style={{ fontSize: "11px", color: "#565C65", fontStyle: "italic" }}>{app.brandName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Review panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }} role="region" aria-live="polite" aria-label="Label verification results">
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

                {loading && (
                  <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: "4px", padding: "40px", textAlign: "center" }} role="status">
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔍</div>
                    <p style={{ fontSize: "16px", fontWeight: 600, color: "#1B1B1B", margin: "0 0 4px" }}>Analyzing label…</p>
                    <p style={{ fontSize: "13px", color: "#71767A", margin: 0 }}>Running OCR and comparing against COLA application data…</p>
                  </div>
                )}

                {result?.error && (
                  <div style={{ backgroundColor: "#FDEAEA", border: "1px solid #9E1B1B", borderRadius: "4px", padding: "16px" }} role="alert">
                    <p style={{ color: "#9E1B1B", fontWeight: 600, margin: 0, fontSize: "14px" }}>{result.error}</p>
                  </div>
                )}

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

        {mode === "bulk" && <BulkReview />}
        {mode === "batch" && <BatchUpload />}

      </main>
      <Footer />
    </div>
  );
}
