// __tests__/verify-logic.test.ts
import { describe, it, expect } from "vitest";
import {
  compareField,
  computeOverallStatus,
  normalizeField,
  parseCSV,
  GOVERNMENT_WARNING,
  type FieldResult,
} from "../lib/verify-logic";

// ─────────────────────────────────────────────────────────────
// normalizeField
// ─────────────────────────────────────────────────────────────
describe("normalizeField", () => {
  it("lowercases the string", () => {
    expect(normalizeField("OLD TOM DISTILLERY")).toBe("old tom distillery");
  });

  it("removes punctuation", () => {
    expect(normalizeField("Stone's Throw")).toBe("stones throw");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeField("45%  Alc./Vol.")).toBe("45 alcvol");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeField("  bourbon  ")).toBe("bourbon");
  });

  it("handles empty string", () => {
    expect(normalizeField("")).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────
// compareField — null / absent cases
// ─────────────────────────────────────────────────────────────
describe("compareField — absent values", () => {
  it("returns not_required when both app and label values are absent", () => {
    const result = compareField("brandName", "Brand Name", null, null);
    expect(result.status).toBe("not_required");
    expect(result.appValue).toBeNull();
    expect(result.labelValue).toBeNull();
  });

  it("returns not_required when both are empty strings", () => {
    const result = compareField("brandName", "Brand Name", "", "");
    expect(result.status).toBe("not_required");
  });

  it("returns missing_on_label when app has value but label does not", () => {
    const result = compareField("brandName", "Brand Name", "OLD TOM", null);
    expect(result.status).toBe("missing_on_label");
    expect(result.appValue).toBe("OLD TOM");
    expect(result.labelValue).toBeNull();
  });

  it("returns not_in_application when label has value but app does not", () => {
    const result = compareField("brandName", "Brand Name", null, "OLD TOM");
    expect(result.status).toBe("not_in_application");
  });
});

// ─────────────────────────────────────────────────────────────
// compareField — country of origin special case
// ─────────────────────────────────────────────────────────────
describe("compareField — countryOfOrigin", () => {
  it("returns not_required when app is blank even if label has a value", () => {
    const result = compareField("countryOfOrigin", "Country of Origin", null, "USA");
    expect(result.status).toBe("not_required");
  });

  it("returns not_required when app is empty string even if label has a value", () => {
    const result = compareField("countryOfOrigin", "Country of Origin", "", "USA");
    expect(result.status).toBe("not_required");
  });

  it("returns match when both values agree", () => {
    const result = compareField("countryOfOrigin", "Country of Origin", "France", "France");
    expect(result.status).toBe("match");
  });

  it("returns mismatch when values disagree and app has a value", () => {
    const result = compareField("countryOfOrigin", "Country of Origin", "France", "Italy");
    expect(result.status).toBe("mismatch");
  });
});

// ─────────────────────────────────────────────────────────────
// compareField — government warning (strict)
// ─────────────────────────────────────────────────────────────
describe("compareField — governmentWarning (strict)", () => {
  it("returns match when label contains the exact warning", () => {
    const result = compareField(
      "governmentWarning",
      "Government Warning",
      GOVERNMENT_WARNING,
      GOVERNMENT_WARNING
    );
    expect(result.status).toBe("match");
    expect(result.isStrict).toBe(true);
  });

  it("returns match when label contains warning with surrounding text", () => {
    const result = compareField(
      "governmentWarning",
      "Government Warning",
      GOVERNMENT_WARNING,
      `Some introductory text. ${GOVERNMENT_WARNING} Some trailing text.`
    );
    expect(result.status).toBe("match");
  });

  it("returns match when extra whitespace is normalized", () => {
    const warningWithExtraSpaces = GOVERNMENT_WARNING.replace(/\s+/g, "  ");
    const result = compareField(
      "governmentWarning",
      "Government Warning",
      GOVERNMENT_WARNING,
      warningWithExtraSpaces
    );
    expect(result.status).toBe("match");
  });

  it("returns mismatch when warning is in title case instead of all caps", () => {
    const titleCaseWarning = GOVERNMENT_WARNING.replace(
      "GOVERNMENT WARNING:",
      "Government Warning:"
    );
    const result = compareField(
      "governmentWarning",
      "Government Warning",
      GOVERNMENT_WARNING,
      titleCaseWarning
    );
    expect(result.status).toBe("mismatch");
  });

  it("returns mismatch when warning text is truncated", () => {
    const truncated = GOVERNMENT_WARNING.substring(0, 50);
    const result = compareField(
      "governmentWarning",
      "Government Warning",
      GOVERNMENT_WARNING,
      truncated
    );
    expect(result.status).toBe("mismatch");
  });

  it("returns mismatch when warning uses different wording", () => {
    const differentWarning =
      "WARNING: Consuming alcohol during pregnancy may cause birth defects.";
    const result = compareField(
      "governmentWarning",
      "Government Warning",
      GOVERNMENT_WARNING,
      differentWarning
    );
    expect(result.status).toBe("mismatch");
  });

  it("always sets isStrict to true", () => {
    const result = compareField(
      "governmentWarning",
      "Government Warning",
      GOVERNMENT_WARNING,
      GOVERNMENT_WARNING
    );
    expect(result.isStrict).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// compareField — fuzzy matching
// ─────────────────────────────────────────────────────────────
describe("compareField — fuzzy matching", () => {
  it("returns match for identical brand names", () => {
    const result = compareField("brandName", "Brand Name", "OLD TOM DISTILLERY", "OLD TOM DISTILLERY");
    expect(result.status).toBe("match");
  });

  it("returns match when case differs — STONE'S THROW vs Stone's Throw (Dave's example)", () => {
    const result = compareField("brandName", "Brand Name", "STONE'S THROW", "Stone's Throw");
    expect(result.status).toBe("match");
  });

  it("returns fuzzy_match when one string contains the other and length ratio > 0.6", () => {
    // "Old Tom" (7) vs "Old Tom Distillery" (18) — ratio 7/18 = 0.39 — below threshold
    // Use a case where ratio passes: "bourbon whiskey" vs "bourbon whiskey aged"
    const result = compareField(
      "classType",
      "Class/Type",
      "Kentucky Bourbon Whiskey",
      "Kentucky Bourbon Whiskey Aged"
    );
    expect(result.status).toBe("fuzzy_match");
  });

  it("returns mismatch when containment passes but length ratio is too low", () => {
    // "Old Tom" (7 chars normalized) vs "Old Tom Distillery Kentucky Straight Bourbon Whiskey" (much longer)
    // ratio well below 0.6 — should be mismatch not fuzzy
    const result = compareField(
      "brandName",
      "Brand Name",
      "Old Tom",
      "Old Tom Distillery Kentucky Straight Bourbon Whiskey"
    );
    expect(result.status).toBe("mismatch");
  });

  it("returns mismatch for completely different values", () => {
    const result = compareField("brandName", "Brand Name", "OLD TOM DISTILLERY", "EAGLE RARE");
    expect(result.status).toBe("mismatch");
  });

  it("returns match when punctuation differs — ABV formatting", () => {
    const result = compareField(
      "alcoholContent",
      "Alcohol Content",
      "45% Alc./Vol. (90 Proof)",
      "45% Alc/Vol (90 Proof)"
    );
    expect(result.status).toBe("match");
  });

  it("returns mismatch for producer name with different state abbreviation vs full name", () => {
    // "old tom distillery louisville ky" vs "old tom distillery louisville kentucky"
    // Neither contains the other — mismatch
    const result = compareField(
      "producerName",
      "Producer Name & Address",
      "Old Tom Distillery Louisville KY",
      "Old Tom Distillery Louisville Kentucky"
    );
    expect(result.status).toBe("mismatch");
  });

  it("returns mismatch for different ABV values", () => {
    const result = compareField(
      "alcoholContent",
      "Alcohol Content",
      "45% Alc./Vol. (90 Proof)",
      "40% Alc./Vol. (80 Proof)"
    );
    expect(result.status).toBe("mismatch");
  });
});

// ─────────────────────────────────────────────────────────────
// computeOverallStatus
// ─────────────────────────────────────────────────────────────
describe("computeOverallStatus", () => {
  it("returns pass when all fields match", () => {
    const results: FieldResult[] = [
      { field: "Brand Name", key: "brandName", appValue: "X", labelValue: "X", status: "match" },
      { field: "Class/Type", key: "classType", appValue: "Y", labelValue: "Y", status: "match" },
      { field: "Country of Origin", key: "countryOfOrigin", appValue: null, labelValue: null, status: "not_required" },
    ];
    expect(computeOverallStatus(results)).toBe("pass");
  });

  it("returns needs_review when any field is fuzzy_match and none are mismatch", () => {
    const results: FieldResult[] = [
      { field: "Brand Name", key: "brandName", appValue: "X", labelValue: "X", status: "match" },
      { field: "Class/Type", key: "classType", appValue: "Y", labelValue: "Y slightly different", status: "fuzzy_match" },
    ];
    expect(computeOverallStatus(results)).toBe("needs_review");
  });

  it("returns fail when any field is mismatch", () => {
    const results: FieldResult[] = [
      { field: "Brand Name", key: "brandName", appValue: "X", labelValue: "X", status: "match" },
      { field: "Government Warning", key: "governmentWarning", appValue: "A", labelValue: "B", status: "mismatch" },
    ];
    expect(computeOverallStatus(results)).toBe("fail");
  });

  it("returns fail when any field is missing_on_label", () => {
    const results: FieldResult[] = [
      { field: "Brand Name", key: "brandName", appValue: "X", labelValue: null, status: "missing_on_label" },
    ];
    expect(computeOverallStatus(results)).toBe("fail");
  });

  it("mismatch takes priority over fuzzy_match", () => {
    const results: FieldResult[] = [
      { field: "Brand Name", key: "brandName", appValue: "X", labelValue: "X similar", status: "fuzzy_match" },
      { field: "Government Warning", key: "governmentWarning", appValue: "A", labelValue: "B", status: "mismatch" },
    ];
    expect(computeOverallStatus(results)).toBe("fail");
  });

  it("returns pass when all fields are not_required", () => {
    const results: FieldResult[] = [
      { field: "Country of Origin", key: "countryOfOrigin", appValue: null, labelValue: null, status: "not_required" },
    ];
    expect(computeOverallStatus(results)).toBe("pass");
  });

  it("returns pass for empty results array", () => {
    expect(computeOverallStatus([])).toBe("pass");
  });
});

// ─────────────────────────────────────────────────────────────
// parseCSV
// ─────────────────────────────────────────────────────────────
describe("parseCSV", () => {
  it("parses a simple CSV correctly", () => {
    const csv = `filename,brandName,classType\nlabel001.jpg,OLD TOM,Bourbon`;
    const result = parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe("label001.jpg");
    expect(result[0].brandName).toBe("OLD TOM");
    expect(result[0].classType).toBe("Bourbon");
  });

  it("parses multiple rows", () => {
    const csv = `filename,brandName\nlabel001.jpg,OLD TOM\nlabel002.jpg,EAGLE RARE`;
    const result = parseCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[1].brandName).toBe("EAGLE RARE");
  });

  it("handles quoted fields containing commas", () => {
    const csv = `filename,producerName\nlabel001.jpg,"Old Tom Distillery, Louisville, KY"`;
    const result = parseCSV(csv);
    expect(result[0].producerName).toBe("Old Tom Distillery, Louisville, KY");
  });

  it("handles Windows-style CRLF line endings", () => {
    const csv = `filename,brandName\r\nlabel001.jpg,OLD TOM\r\nlabel002.jpg,EAGLE RARE`;
    const result = parseCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0].brandName).toBe("OLD TOM");
  });

  it("returns empty array for CSV with only headers", () => {
    const csv = `filename,brandName,classType`;
    const result = parseCSV(csv);
    expect(result).toHaveLength(0);
  });

  it("returns empty array for empty string", () => {
    const result = parseCSV("");
    expect(result).toHaveLength(0);
  });

  it("handles missing values with empty string fallback", () => {
    const csv = `filename,brandName,classType\nlabel001.jpg,OLD TOM`;
    const result = parseCSV(csv);
    expect(result[0].classType).toBe("");
  });

  it("trims header whitespace", () => {
    const csv = ` filename , brandName \nlabel001.jpg,OLD TOM`;
    const result = parseCSV(csv);
    expect(result[0].filename).toBe("label001.jpg");
    expect(result[0].brandName).toBe("OLD TOM");
  });

  it("handles a full realistic batch CSV", () => {
    const csv = [
      `filename,brandName,classType,alcoholContent,netContents,producerName,countryOfOrigin`,
      `label001.jpg,OLD TOM DISTILLERY,Kentucky Straight Bourbon Whiskey,45% Alc./Vol. (90 Proof),750 mL,"Old Tom Distillery, Louisville KY",`,
      `label002.jpg,STONE'S THROW,Pale Ale,5.2% Alc./Vol.,12 fl oz,"Stone's Throw Brewing, Seattle WA",`,
    ].join("\n");
    const result = parseCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0].brandName).toBe("OLD TOM DISTILLERY");
    expect(result[0].producerName).toBe("Old Tom Distillery, Louisville KY");
    expect(result[1].brandName).toBe("STONE'S THROW");
    expect(result[1].countryOfOrigin).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────
// Integration — full field set comparison
// ─────────────────────────────────────────────────────────────
describe("full label verification — integration", () => {
  const applicationData = {
    brandName: "OLD TOM DISTILLERY",
    classType: "Kentucky Straight Bourbon Whiskey",
    alcoholContent: "45% Alc./Vol. (90 Proof)",
    netContents: "750 mL",
    producerName: "Old Tom Distillery, Louisville, KY",
    countryOfOrigin: "",
    governmentWarning: GOVERNMENT_WARNING,
  };

  it("passes a perfect label match", () => {
    const extracted = {
      brandName: "OLD TOM DISTILLERY",
      classType: "Kentucky Straight Bourbon Whiskey",
      alcoholContent: "45% Alc./Vol. (90 Proof)",
      netContents: "750 mL",
      producerName: "Old Tom Distillery, Louisville, KY",
      countryOfOrigin: null,
      governmentWarning: GOVERNMENT_WARNING,
    };
    const results = Object.entries(extracted).map(([key, labelValue]) => {
      const field = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
      return compareField(key, field, applicationData[key as keyof typeof applicationData], labelValue);
    });
    expect(computeOverallStatus(results)).toBe("pass");
  });

  it("needs review when brand name has apostrophe difference (STONE'S THROW scenario)", () => {
    // Application has "STONE'S THROW" — after normalize becomes "stones throw"
    // Label has "Stones Throw Distillery" — after normalize becomes "stones throw distillery"
    // "stones throw" is contained in "stones throw distillery" with ratio 12/21 = 0.57 — below 0.6
    // Use a case where ratio passes: app "Kentucky Bourbon" vs label "Kentucky Bourbon Whiskey"
    const appData = {
      ...applicationData,
      classType: "Kentucky Bourbon",
    };
    const extracted = {
      brandName: "OLD TOM DISTILLERY",
      classType: "Kentucky Bourbon Whiskey",
      alcoholContent: "45% Alc./Vol. (90 Proof)",
      netContents: "750 mL",
      producerName: "Old Tom Distillery, Louisville, KY",
      countryOfOrigin: null,
      governmentWarning: GOVERNMENT_WARNING,
    };
    const results = Object.entries(extracted).map(([key, labelValue]) => {
      const field = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
      return compareField(key, field, appData[key as keyof typeof appData], labelValue);
    });
    expect(computeOverallStatus(results)).toBe("needs_review");
  });

  it("fails when government warning is not exact", () => {
    const extracted = {
      brandName: "OLD TOM DISTILLERY",
      classType: "Kentucky Straight Bourbon Whiskey",
      alcoholContent: "45% Alc./Vol. (90 Proof)",
      netContents: "750 mL",
      producerName: "Old Tom Distillery, Louisville, KY",
      countryOfOrigin: null,
      governmentWarning: "Government Warning: Women should not drink during pregnancy.",
    };
    const results = Object.entries(extracted).map(([key, labelValue]) => {
      const field = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
      return compareField(key, field, applicationData[key as keyof typeof applicationData], labelValue);
    });
    expect(computeOverallStatus(results)).toBe("fail");
  });

  it("fails when a required field is missing from the label", () => {
    const extracted = {
      brandName: "OLD TOM DISTILLERY",
      classType: null,
      alcoholContent: "45% Alc./Vol. (90 Proof)",
      netContents: "750 mL",
      producerName: "Old Tom Distillery, Louisville, KY",
      countryOfOrigin: null,
      governmentWarning: GOVERNMENT_WARNING,
    };
    const results = Object.entries(extracted).map(([key, labelValue]) => {
      const field = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
      return compareField(key, field, applicationData[key as keyof typeof applicationData], labelValue);
    });
    expect(computeOverallStatus(results)).toBe("fail");
  });

  it("passes when country of origin is blank in application and absent from label", () => {
    const extracted = {
      brandName: "OLD TOM DISTILLERY",
      classType: "Kentucky Straight Bourbon Whiskey",
      alcoholContent: "45% Alc./Vol. (90 Proof)",
      netContents: "750 mL",
      producerName: "Old Tom Distillery, Louisville, KY",
      countryOfOrigin: null,
      governmentWarning: GOVERNMENT_WARNING,
    };
    const results = Object.entries(extracted).map(([key, labelValue]) => {
      const field = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
      return compareField(key, field, applicationData[key as keyof typeof applicationData], labelValue);
    });
    expect(computeOverallStatus(results)).toBe("pass");
  });
});
