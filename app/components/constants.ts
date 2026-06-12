export const FEDERAL_BLUE = "#005EA2";
export const FEDERAL_DARK = "#1a4480";

export const GOVERNMENT_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

export const overallConfig = {
  pass: { label: "APPROVED", textColor: "#00521C", bgColor: "#E5F4EC", borderColor: "#00521C", icon: "✓" },
  needs_review: { label: "NEEDS REVIEW", textColor: "#925C00", bgColor: "#FEF3E2", borderColor: "#E5A000", icon: "⚠" },
  fail: { label: "REJECTED", textColor: "#9E1B1B", bgColor: "#FDEAEA", borderColor: "#9E1B1B", icon: "✗" },
};

export const statusConfig: Record<string, { label: string; badgeBg: string; badgeText: string; borderColor: string }> = {
  match: { label: "Match", badgeBg: "#E5F4EC", badgeText: "#00521C", borderColor: "#00521C" },
  fuzzy_match: { label: "Likely Match — Review", badgeBg: "#FEF3E2", badgeText: "#925C00", borderColor: "#E5A000" },
  mismatch: { label: "Mismatch", badgeBg: "#FDEAEA", badgeText: "#9E1B1B", borderColor: "#9E1B1B" },
  missing_on_label: { label: "Missing on Label", badgeBg: "#FDEAEA", badgeText: "#9E1B1B", borderColor: "#9E1B1B" },
  not_in_application: { label: "Not in Application", badgeBg: "#FFF4E0", badgeText: "#7A4F00", borderColor: "#E5A000" },
  not_required: { label: "N/A", badgeBg: "#F0F0F0", badgeText: "#71767A", borderColor: "#C9C9C9" },
};

export type FieldResult = {
  field: string;
  key: string;
  appValue: string | null;
  labelValue: string | null;
  status: string;
  isStrict?: boolean;
  warningNotes?: string[];
};

export type VerifyResponse = {
  results: FieldResult[];
  overallStatus: "pass" | "fail" | "needs_review";
  imageQualityNotes: string;
  error?: string;
};

export type BatchItem = {
  filename: string;
  results?: FieldResult[];
  overallStatus: "pass" | "fail" | "needs_review";
  imageQualityNotes?: string;
  error?: string;
};

export type BatchResponse = {
  items: BatchItem[];
  summary: { total: number; passed: number; needsReview: number; failed: number };
  error?: string;
};

export type BulkItem = {
  appNumber: string;
  applicantName?: string;
  classType?: string;
  overallStatus: "pass" | "fail" | "needs_review" | "not_found";
  results?: FieldResult[];
  error?: string;
};

export function statusDot(status: "pass" | "fail" | "needs_review") {
  const cfg = overallConfig[status];
  return { cfg };
}
