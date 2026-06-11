// lib/verify-logic.ts
// Pure logic extracted from route.ts and route-batch.ts — no HTTP, no Anthropic client.
// Import these in both API routes and in tests.

export const GOVERNMENT_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

export const FIELDS = [
  { key: "brandName", label: "Brand Name" },
  { key: "classType", label: "Class/Type" },
  { key: "alcoholContent", label: "Alcohol Content" },
  { key: "netContents", label: "Net Contents" },
  { key: "producerName", label: "Producer Name & Address" },
  { key: "countryOfOrigin", label: "Country of Origin" },
  { key: "governmentWarning", label: "Government Warning" },
];

export type FieldResult = {
  field: string;
  key: string;
  appValue: string | null;
  labelValue: string | null;
  status: string;
  isStrict?: boolean;
};

export type OverallStatus = "pass" | "fail" | "needs_review";

export function normalizeField(s: string): string {
  return s.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

export function compareField(
  key: string,
  label: string,
  appValue: string | undefined | null,
  labelValue: string | null
): FieldResult {
  // Both absent
  if (!appValue && !labelValue) {
    return { field: label, key, appValue: null, labelValue: null, status: "not_required" };
  }

  // In application but missing on label
  if (appValue && !labelValue) {
    return { field: label, key, appValue, labelValue: null, status: "missing_on_label" };
  }

  // On label but not in application
  if (!appValue && labelValue) {
    // Country of origin: if blank in application, always not_required
    if (key === "countryOfOrigin") {
      return { field: label, key, appValue: null, labelValue, status: "not_required" };
    }
    return { field: label, key, appValue: null, labelValue, status: "not_in_application" };
  }

  // Government warning — strict whitespace-normalized containment, case-sensitive
  if (key === "governmentWarning") {
    const normalizedLabel = (labelValue || "").replace(/\s+/g, " ").trim();
    const normalizedExpected = (appValue || "").replace(/\s+/g, " ").trim();
    const status = normalizedLabel.includes(normalizedExpected) ? "match" : "mismatch";
    return { field: label, key, appValue: appValue!, labelValue: labelValue!, status, isStrict: true };
  }

  // All other fields — normalize and fuzzy match with length ratio guard
  const normApp = normalizeField(appValue!);
  const normLabel = normalizeField(labelValue!);

  const lengthRatio =
    Math.min(normApp.length, normLabel.length) /
    Math.max(normApp.length, normLabel.length);

  let status: string;
  if (normApp === normLabel) {
    status = "match";
  } else if (
    (normApp.includes(normLabel) || normLabel.includes(normApp)) &&
    lengthRatio > 0.6
  ) {
    status = "fuzzy_match";
  } else {
    status = "mismatch";
  }

  return { field: label, key, appValue: appValue!, labelValue: labelValue!, status };
}

export function computeOverallStatus(results: FieldResult[]): OverallStatus {
  const hasMismatch = results.some(
    (r) => r.status === "mismatch" || r.status === "missing_on_label"
  );
  const hasFuzzy = results.some((r) => r.status === "fuzzy_match");
  return hasMismatch ? "fail" : hasFuzzy ? "needs_review" : "pass";
}

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i] || "";
      return obj;
    }, {} as Record<string, string>);
  });
}
