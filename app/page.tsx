"use client";

import { useState, useRef } from "react";

const GOVERNMENT_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

type FieldResult = {
  field: string;
  key: string;
  appValue: string | null;
  labelValue: string | null;
  status: string;
  isStrict?: boolean;
};

type VerifyResponse = {
  results: FieldResult[];
  overallStatus: "pass" | "fail" | "needs_review";
  imageQualityNotes: string;
  error?: string;
};

const FIELDS = [
  { key: "brandName", label: "Brand Name", placeholder: "e.g. OLD TOM DISTILLERY" },
  { key: "classType", label: "Class / Type", placeholder: "e.g. Kentucky Straight Bourbon Whiskey" },
  { key: "alcoholContent", label: "Alcohol Content", placeholder: "e.g. 45% Alc./Vol. (90 Proof)" },
  { key: "netContents", label: "Net Contents", placeholder: "e.g. 750 mL" },
  { key: "producerName", label: "Producer Name & Address", placeholder: "e.g. Old Tom Distillery, Louisville, KY" },
  { key: "countryOfOrigin", label: "Country of Origin", placeholder: "e.g. USA (leave blank if domestic)" },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  match: { label: "Match", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  fuzzy_match: { label: "Likely Match — Review", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  mismatch: { label: "Mismatch", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  missing_on_label: { label: "Missing on Label", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  not_in_application: { label: "Not in Application", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  not_required: { label: "N/A", color: "text-gray-400", bg: "bg-gray-50 border-gray-200" },
};

const overallConfig = {
  pass: { label: "APPROVED", color: "text-green-700", bg: "bg-green-100 border-green-300" },
  needs_review: { label: "NEEDS REVIEW", color: "text-yellow-700", bg: "bg-yellow-100 border-yellow-300" },
  fail: { label: "REJECTED", color: "text-red-700", bg: "bg-red-100 border-red-300" },
};

export default function Home() {
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [useStandardWarning, setUseStandardWarning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (file: File) => {
    setImage(file);
    setImageUrl(URL.createObjectURL(file));
    setResult(null);
    setOverrides({});
  };

  const handleSubmit = async () => {
    if (!image) return;
    setLoading(true);
    setResult(null);
    setOverrides({});

    const applicationData = { ...formData };
    if (useStandardWarning) {
      applicationData.governmentWarning = GOVERNMENT_WARNING;
    }

    const fd = new FormData();
    fd.append("image", image);
    fd.append("applicationData", JSON.stringify(applicationData));

    try {
      const res = await fetch("/api/verify", { method: "POST", body: fd });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ results: [], overallStatus: "fail", imageQualityNotes: "", error: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const effectiveStatus = (r: FieldResult): string => {
    if (overrides[r.key] && r.status === "fuzzy_match") return "match";
    return r.status;
  };

  const effectiveOverall = (): "pass" | "fail" | "needs_review" => {
    if (!result) return "fail";
    const statuses = result.results.map((r) => effectiveStatus(r));
    if (statuses.some((s) => s === "mismatch" || s === "missing_on_label")) return "fail";
    if (statuses.some((s) => s === "fuzzy_match")) return "needs_review";
    return "pass";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">TTB Label Verification</h1>
          <p className="text-sm text-gray-500 mt-1">AI-powered alcohol label compliance checker</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Inputs */}
          <div className="space-y-6">
            {/* Image Upload */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Upload Label Image</h2>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleImageChange(file);
                }}
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="Label preview" className="max-h-48 mx-auto rounded object-contain" />
                ) : (
                  <div>
                    <div className="text-4xl mb-2">📷</div>
                    <p className="text-gray-600 font-medium">Click or drag to upload label image</p>
                    <p className="text-gray-400 text-sm mt-1">JPG, PNG, WEBP supported</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageChange(file);
                }}
              />
              {imageUrl && (
                <button
                  className="mt-2 text-sm text-gray-400 hover:text-gray-600"
                  onClick={() => { setImage(null); setImageUrl(null); setResult(null); }}
                >
                  Remove image
                </button>
              )}
            </div>

            {/* Application Data */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Enter Application Data</h2>
              <div className="space-y-4">
                {FIELDS.map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      type="text"
                      placeholder={placeholder}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData[key] || ""}
                      onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))}
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Government Warning</label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={useStandardWarning}
                      onChange={(e) => setUseStandardWarning(e.target.checked)}
                    />
                    <span className="text-sm text-gray-600">Use standard TTB warning text</span>
                  </label>
                  {!useStandardWarning && (
                    <textarea
                      className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                      placeholder="Enter custom warning text..."
                      value={formData.governmentWarning || ""}
                      onChange={(e) => setFormData((p) => ({ ...p, governmentWarning: e.target.value }))}
                    />
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!image || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl text-lg transition-colors"
            >
              {loading ? "Analyzing Label..." : "Verify Label"}
            </button>
          </div>

          {/* Right: Results */}
          <div>
            {loading && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <div className="text-4xl mb-4 animate-pulse">🔍</div>
                <p className="text-gray-600 font-medium text-lg">Analyzing label...</p>
                <p className="text-gray-400 text-sm mt-1">Extracting fields with AI</p>
              </div>
            )}

            {result?.error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <p className="text-red-700 font-medium">{result.error}</p>
              </div>
            )}

            {result && !result.error && (
              <div className="space-y-4">
                {/* Overall status */}
                <div className={`rounded-xl border-2 p-6 text-center ${overallConfig[effectiveOverall()].bg}`}>
                  <div className={`text-3xl font-bold ${overallConfig[effectiveOverall()].color}`}>
                    {overallConfig[effectiveOverall()].label}
                  </div>
                  {result.imageQualityNotes && (
                    <p className="text-sm text-gray-500 mt-2">⚠️ {result.imageQualityNotes}</p>
                  )}
                </div>

                {/* Field results */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <h2 className="text-lg font-semibold text-gray-900 px-6 py-4 border-b border-gray-100">
                    Field-by-Field Results
                  </h2>
                  <div className="divide-y divide-gray-100">
                    {result.results.map((r) => {
                      const status = effectiveStatus(r);
                      const cfg = statusConfig[status] || statusConfig.mismatch;
                      return (
                        <div key={r.key} className={`p-4 border-l-4 ${cfg.bg}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900 text-sm">{r.field}</span>
                            <div className="flex items-center gap-2">
                              {r.isStrict && (
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">strict</span>
                              )}
                              <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                            </div>
                          </div>
                          {r.appValue && (
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">Application:</span>{" "}
                              <span className="font-mono">{r.key === "governmentWarning" ? r.appValue.substring(0, 60) + "..." : r.appValue}</span>
                            </div>
                          )}
                          {r.labelValue && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              <span className="font-medium">Label:</span>{" "}
                              <span className="font-mono">{r.key === "governmentWarning" ? r.labelValue.substring(0, 60) + "..." : r.labelValue}</span>
                            </div>
                          )}
                          {r.status === "fuzzy_match" && !overrides[r.key] && (
                            <button
                              className="mt-2 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-medium px-3 py-1 rounded-full transition-colors"
                              onClick={() => setOverrides((p) => ({ ...p, [r.key]: true }))}
                            >
                              Approve as match
                            </button>
                          )}
                          {overrides[r.key] && (
                            <span className="mt-2 inline-block text-xs text-green-600 font-medium">✓ Manually approved</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {!loading && !result && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <p className="font-medium">Results will appear here</p>
                <p className="text-sm mt-1">Upload a label and enter application data to begin</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
