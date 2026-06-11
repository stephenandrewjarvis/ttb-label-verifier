import { NextRequest } from "next/server";
import path from "path";
import JSZip from "jszip";
import Tesseract from "tesseract.js";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require("sharp");

export const maxDuration = 60;

const WORKER_PATH = path.resolve(process.cwd(), "node_modules/tesseract.js/src/worker-script/node/index.js");
// Pin Tesseract assets to the bundled copies and cache to /tmp — Vercel root is read-only
// and the target network has no outbound CDN access. See next.config.ts tracing includes.
const CORE_PATH = path.resolve(process.cwd(), "node_modules/tesseract.js-core");
const LANG_PATH = process.cwd();
const TESSERACT_OPTIONS = {
  workerPath: WORKER_PATH,
  corePath: CORE_PATH,
  langPath: LANG_PATH,
  cachePath: "/tmp",
  gzip: false,
};

const GOVERNMENT_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

const FIELDS = [
  { key: "brandName", label: "Brand Name" },
  { key: "classType", label: "Class/Type" },
  { key: "alcoholContent", label: "Alcohol Content" },
  { key: "netContents", label: "Net Contents" },
  { key: "producerName", label: "Producer Name & Address" },
  { key: "countryOfOrigin", label: "Country of Origin" },
  { key: "governmentWarning", label: "Government Warning" },
];

// Parse CSV text into array of objects using header row
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    // Handle quoted fields with commas inside
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

// Normalize and compare two field values
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function compareField(
  key: string,
  label: string,
  appValue: string | undefined,
  labelValue: string | null
) {
  if (!appValue && !labelValue) {
    return { field: label, key, appValue: null, labelValue: null, status: "not_required" };
  }
  if (appValue && !labelValue) {
    return { field: label, key, appValue, labelValue: null, status: "missing_on_label" };
  }
  if (!appValue && labelValue) {
    // Country of origin on label but blank in application = domestic product, not a violation
    if (key === "countryOfOrigin") {
      return { field: label, key, appValue: null, labelValue, status: "not_required" };
    }
    return { field: label, key, appValue: null, labelValue, status: "not_in_application" };
  }

  // Alcohol content: compare by ABV percentage only — OCR often reorders tokens
  if (key === "alcoholContent") {
    const abvNum = (s: string) => s.match(/(\d+(?:\.\d+)?)\s*%/)?.[1];
    const appAbv = abvNum(appValue!);
    const labelAbv = abvNum(labelValue!);
    const status = appAbv && labelAbv && appAbv === labelAbv ? "match" : "mismatch";
    return { field: label, key, appValue: appValue!, labelValue: labelValue!, status };
  }

  // Government warning — strict containment check
  if (key === "governmentWarning") {
    const normalizedLabel = (labelValue || "").replace(/\s+/g, " ").trim();
    const normalizedExpected = (appValue || "").replace(/\s+/g, " ").trim();
    const status = normalizedLabel.includes(normalizedExpected) ? "match" : "mismatch";
    return { field: label, key, appValue: appValue!, labelValue: labelValue!, status, isStrict: true };
  }

  // All other fields — normalize and fuzzy match with length ratio guard
  const normApp = normalize(appValue!);
  const normLabel = normalize(labelValue!);
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

// Extract fields from OCR text using heuristics
function extractFieldsFromText(text: string): Record<string, string | null> {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  return {
    brandName: extractBrandName(text, lines),
    classType: extractClassType(text),
    alcoholContent: extractAlcoholContent(text),
    netContents: extractNetContents(text),
    producerName: extractProducerName(lines),
    countryOfOrigin: extractCountryOfOrigin(text),
    governmentWarning: extractGovernmentWarning(text),
  };
}

function extractBrandName(text: string, lines: string[]): string | null {
  const govIdx = lines.findIndex(l => /government warning/i.test(l));
  const searchLines = govIdx > 0 ? lines.slice(0, govIdx) : lines;
  const bottledBy = text.match(/(?:bottled|distilled|brewed|produced|canned)\s+by\s+([^\n,\.]+)/i);
  if (bottledBy) return bottledBy[1].replace(/\s*(co\.?|llc\.?|ltd\.?|inc\.?|company)$/i, "").trim();
  const companyLine = searchLines.find(l =>
    /(?:distillery|brewing|cellars|winery|spirits|distillers)/i.test(l) && l.includes(",") && l.length > 20
  );
  if (companyLine) return companyLine.split(",")[0].trim();
  const skipPhrases = /^(established|government|warning|bottled|distilled|brewed|produced|product of|aged|imported|speyside|napa|portland|louisville)/i;
  const capsLine = searchLines.find(l => /^[A-Z][A-Z\s&'\.]{3,}$/.test(l) && !skipPhrases.test(l));
  return capsLine ?? searchLines[0] ?? null;
}

function extractClassType(text: string): string | null {
  const phraseMatch = text.match(
    /(?:kentucky straight bourbon whiskey|straight bourbon whiskey|single malt scotch whisky|blended scotch whisky|cabernet sauvignon|india pale ale|american pale ale)/i
  );
  if (phraseMatch) return phraseMatch[0];
  const wordMatch = text.match(
    /(?:bourbon|whiskey|whisky|vodka|rum|gin|tequila|cabernet|sauvignon|merlot|chardonnay|ale|lager|stout|porter|pilsner|brandy|cognac|scotch|rye)/i
  );
  return wordMatch ? wordMatch[0] : null;
}

function extractAlcoholContent(text: string): string | null {
  const flat = text.replace(/\n/g, " ");
  const full = flat.match(/\d+(?:\.\d+)?\s*%\s*(?:\d+\s*)?(?:alc\.?\/vol\.?)(?:\s*\(?\d+\s*proof\)?)?/i);
  if (full) return full[0].replace(/\s+/g, " ").trim();
  const abv = flat.match(/\d+(?:\.\d+)?\s*%\s*(?:alc|abv)/i);
  return abv ? abv[0] : null;
}

function extractNetContents(text: string): string | null {
  const flat = text.replace(/\n/g, " ");
  const m = flat.match(/\d+(?:\.\d+)?\s*(?:fl\.?\s*oz|mL|L|liter|ounce|gallon)(?:\s*[·\-]\s*\d+(?:\.\d+)?\s*(?:mL|L|fl\.?\s*oz))?/i);
  return m ? m[0].trim() : null;
}

function extractProducerName(lines: string[]): string | null {
  const producerKeywords = /bottled by|distilled by|brewed by|produced by|canned by|distillery|brewing|cellars|winery/i;
  const govIdx = lines.findIndex(l => /government warning/i.test(l));
  const searchLines = govIdx > 0 ? lines.slice(0, govIdx) : lines;
  const addressIdx = searchLines.findIndex(l => producerKeywords.test(l) && /\d/.test(l) && l.includes(","));
  if (addressIdx !== -1) return searchLines[addressIdx].trim();
  const idx = searchLines.findIndex(l => producerKeywords.test(l) && l.length > 15);
  if (idx !== -1) {
    const parts = [searchLines[idx]];
    if (searchLines[idx + 1] && searchLines[idx + 1].length > 5) parts.push(searchLines[idx + 1]);
    return parts.join(" ").trim();
  }
  return null;
}

function extractCountryOfOrigin(text: string): string | null {
  const m = text.match(/(?:USA|UNITED STATES|FRANCE|SCOTLAND|IRELAND|MEXICO|CANADA|GERMANY|JAPAN|INDIA|AUSTRALIA)/i);
  return m ? m[0] : null;
}

function extractGovernmentWarning(text: string): string | null {
  const m = text.match(/GOVERNMENT\s+WARNING[:\.]?[\s\S]{0,600}(?:health problems|birth defects)[^a-zA-Z]*/i);
  return m ? m[0].replace(/\s+/g, " ").trim() : null;
}

// Run Tesseract OCR extraction on a single image buffer
async function extractFromImage(
  imageBuffer: Buffer | ArrayBuffer
): Promise<{ extracted: Record<string, string | null>; imageQualityNotes: string }> {
  try {
    // Convert ArrayBuffer to Buffer if needed
    const bufferInput = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer);
    
    const { data } = await Tesseract.recognize(bufferInput, "eng", {
      logger: () => {},
      ...TESSERACT_OPTIONS,
    });

    const fullText = data.text;
    const extracted = extractFieldsFromText(fullText);
    
    let imageQualityNotes = "";
    if (data.confidence < 50) {
      imageQualityNotes = "Low OCR confidence detected. Label may have quality issues (blur, glare, angle, poor lighting). Please verify extracted values carefully.";
    }

    return { extracted, imageQualityNotes };
  } catch (error) {
    throw new Error(`OCR failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}


export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const zipFile = formData.get("zip") as File | null;
  const csvFile = formData.get("csv") as File | null;
  const useStandardWarning = formData.get("useStandardWarning") === "true";

  if (!zipFile || !csvFile) {
    return Response.json({ error: "Both a ZIP file and CSV file are required" }, { status: 400 });
  }

  const MAX_ZIP_SIZE = 50 * 1024 * 1024; // 50 MB
  if (zipFile.size > MAX_ZIP_SIZE) {
    return Response.json(
      { error: `ZIP file is too large (${(zipFile.size / 1024 / 1024).toFixed(1)} MB). Please upload a ZIP under 50 MB.` },
      { status: 400 }
    );
  }

  // Parse CSV
  const csvText = await csvFile.text();
  const rows = parseCSV(csvText);
  if (rows.length === 0) {
    return Response.json({ error: "CSV file is empty or has no data rows" }, { status: 400 });
  }

  // Validate CSV has filename column
  if (!rows[0].hasOwnProperty("filename")) {
    return Response.json({ error: "CSV must have a 'filename' column matching image filenames in the ZIP" }, { status: 400 });
  }

  // Extract ZIP contents into a map of filename -> ArrayBuffer
  const zipBuffer = await zipFile.arrayBuffer();
  const zip = await JSZip.loadAsync(zipBuffer);
  const imageMap: Record<string, ArrayBuffer> = {};
  for (const [path, file] of Object.entries(zip.files)) {
    if (!file.dir) {
      const filename = path.split("/").pop() || path;
      imageMap[filename] = await file.async("arraybuffer");
    }
  }

  // Process each CSV row
  const batchResults = await Promise.allSettled(
    rows.map(async (row) => {
      const filename = row.filename?.trim();
      if (!filename) {
        return { filename: "(missing)", error: "No filename in CSV row", overallStatus: "fail" as const };
      }

      const imageBuffer = imageMap[filename];
      if (!imageBuffer) {
        return { filename, error: `Image not found in ZIP: ${filename}`, overallStatus: "fail" as const };
      }

      // Build application data from CSV row
      const applicationData: Record<string, string> = {};
      for (const key of ["brandName", "classType", "alcoholContent", "netContents", "producerName", "countryOfOrigin"]) {
        if (row[key]) applicationData[key] = row[key];
      }
      if (useStandardWarning) {
        applicationData.governmentWarning = GOVERNMENT_WARNING;
      } else if (row.governmentWarning) {
        applicationData.governmentWarning = row.governmentWarning;
      }

      let buf = Buffer.from(imageBuffer);
      const isSvg = filename.toLowerCase().endsWith(".svg");
      if (isSvg) {
        buf = await sharp(buf, { density: 150 }).png().toBuffer();
      } else {
        // Normalize contrast for real-world photos; SVGs are already clean
        buf = await sharp(buf).greyscale().normalize().png().toBuffer();
      }
      const { extracted, imageQualityNotes } = await extractFromImage(buf);

      // Compare fields
      const results = FIELDS.map(({ key, label }) =>
        compareField(key, label, applicationData[key], extracted[key])
      );

      const hasMismatch = results.some((r) => r.status === "mismatch" || r.status === "missing_on_label");
      const hasFuzzy = results.some((r) => r.status === "fuzzy_match");
      const overallStatus = hasMismatch ? "fail" : hasFuzzy ? "needs_review" : "pass";

      return { filename, results, overallStatus, imageQualityNotes };
    })
  );

  // Flatten settled results
  const items = batchResults.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      filename: rows[i]?.filename || `row_${i + 1}`,
      error: r.reason?.message || "Unknown error",
      overallStatus: "fail" as const,
    };
  });

  const summary = {
    total: items.length,
    passed: items.filter((r) => r.overallStatus === "pass").length,
    needsReview: items.filter((r) => r.overallStatus === "needs_review").length,
    failed: items.filter((r) => r.overallStatus === "fail").length,
  };

  return Response.json({ items, summary });
}
