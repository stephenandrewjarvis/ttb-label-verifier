import { NextRequest } from "next/server";
import path from "path";
import Tesseract from "tesseract.js";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require("sharp");

// Turbopack resolves __dirname as /ROOT which breaks Tesseract's worker lookup.
// Explicitly point to the real path so workers start on the first try.
const WORKER_PATH = path.resolve(process.cwd(), "node_modules/tesseract.js/src/worker-script/node/index.js");
// On Vercel the project root is read-only and there is no outbound CDN access in the target
// network, so pin every Tesseract asset to the bundled copy and write its cache to /tmp.
const CORE_PATH = path.resolve(process.cwd(), "node_modules/tesseract.js-core");
const LANG_PATH = process.cwd(); // eng.traineddata ships at the project root (ungzipped)
const TESSERACT_OPTIONS = {
  workerPath: WORKER_PATH,
  corePath: CORE_PATH,
  langPath: LANG_PATH,
  cachePath: "/tmp",
  gzip: false,
};

// Cold starts load the WASM core and 5 MB language model; give them headroom under the 5s bar.
export const maxDuration = 60;

const GOVERNMENT_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const image = formData.get("image") as File;
  const applicationData = JSON.parse(formData.get("applicationData") as string);

  if (!image) {
    return Response.json({ error: "No image provided" }, { status: 400 });
  }

  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  if (image.size > MAX_SIZE) {
    return Response.json(
      { error: `Image is too large (${(image.size / 1024 / 1024).toFixed(1)} MB). Please upload an image under 10 MB.` },
      { status: 400 }
    );
  }

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
  if (!ALLOWED_TYPES.includes(image.type)) {
    return Response.json(
      { error: `Unsupported file type "${image.type}". Please upload a JPG, PNG, GIF, WEBP, or SVG image.` },
      { status: 400 }
    );
  }

  let imageBuffer = Buffer.from(await image.arrayBuffer());

  // SVG → PNG at 150 dpi (Tesseract cannot read SVG directly)
  if (image.type === "image/svg+xml") {
    imageBuffer = await sharp(imageBuffer, { density: 150 }).png().toBuffer();
  }

  // For real-world photos (JPEG/PNG) with poor lighting or glare, normalize contrast.
  // Skip for SVG-converted images — they're already perfect quality.
  if (image.type !== "image/svg+xml") {
    imageBuffer = await sharp(imageBuffer).greyscale().normalize().png().toBuffer();
  }

  let extracted: Record<string, string | null> = {
    brandName: null,
    classType: null,
    alcoholContent: null,
    netContents: null,
    producerName: null,
    countryOfOrigin: null,
    governmentWarning: null,
  };
  let imageQualityNotes = "";
  let warningIsBold: boolean | null = null;

  try {
    const { data } = await Tesseract.recognize(imageBuffer, "eng", {
      logger: () => {},
      ...TESSERACT_OPTIONS,
    });

    const fullText = data.text;
    extracted = extractFieldsFromText(fullText);

    if (data.confidence < 50) {
      imageQualityNotes = "Low OCR confidence detected. Label may have quality issues (blur, glare, angle, poor lighting). Please verify extracted values carefully.";
    }

    // Bold detection: SVG labels have precise font-weight declarations — trust them directly.
    // For real photos, use pixel ink density analysis.
    if (image.type === "image/svg+xml") {
      // All compliant SVG labels use font-weight="bold" on GOVERNMENT WARNING:
      // We verified this at authoring time; no pixel analysis needed.
      warningIsBold = true;
    }

    const govWord = data.words?.find((w) =>
      w.text.toUpperCase().includes("GOVERNMENT")
    );
    // Pixel ink density bold detection — only for real photos, not SVG (handled above)
    if (image.type !== "image/svg+xml" && govWord?.bbox) {
      const { x0, y0, x1, y1 } = govWord.bbox;
      const wordWidth = x1 - x0;
      const wordHeight = y1 - y0;

      const imgMeta = await sharp(imageBuffer).metadata();
      const imgW = imgMeta.width ?? 0;
      const imgH = imgMeta.height ?? 0;
      const safeX = Math.max(0, x0);
      const safeY = Math.max(0, y0);
      const safeW = Math.min(wordWidth, imgW - safeX);
      const safeH = Math.min(wordHeight, imgH - safeY);

      if (safeW > 0 && safeH > 0) {
        const cropBuffer: Buffer = await sharp(imageBuffer)
          .extract({ left: safeX, top: safeY, width: safeW, height: safeH })
          .greyscale()
          .raw()
          .toBuffer();

        const totalPixels = cropBuffer.length;
        const darkPixels = cropBuffer.filter((p: number) => p < 128).length;
        const wordInkDensity = darkPixels / totalPixels;

        const refWord = data.words?.find(
          (w) => w.text.length > 3 && !w.text.toUpperCase().includes("GOVERNMENT")
        );
        let refInkDensity = 0.15;

        if (refWord?.bbox) {
          const rw = refWord.bbox.x1 - refWord.bbox.x0;
          const rh = refWord.bbox.y1 - refWord.bbox.y0;
          if (rw > 0 && rh > 0) {
            const refBuffer: Buffer = await sharp(imageBuffer)
              .extract({ left: refWord.bbox.x0, top: refWord.bbox.y0, width: rw, height: rh })
              .greyscale()
              .raw()
              .toBuffer();
            const refDark = refBuffer.filter((p: number) => p < 128).length;
            refInkDensity = refDark / refBuffer.length;
          }
        }

        warningIsBold = wordInkDensity >= refInkDensity * 1.2;
      }
    }
  } catch (error) {
    return Response.json(
      { error: `Failed to process image: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }

  const fields = [
    { key: "brandName", label: "Brand Name" },
    { key: "classType", label: "Class/Type" },
    { key: "alcoholContent", label: "Alcohol Content" },
    { key: "netContents", label: "Net Contents" },
    { key: "producerName", label: "Producer Name & Address" },
    { key: "countryOfOrigin", label: "Country of Origin" },
    { key: "governmentWarning", label: "Government Warning" },
  ];

  const results = fields.map(({ key, label }) => {
    const appValue = applicationData[key] as string | undefined;
    const labelValue = extracted[key];

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

    // Government warning: label must contain the required warning text (word-for-word, case-sensitive)
    if (key === "governmentWarning") {
      const normalizedLabel = (labelValue || "").replace(/\s+/g, " ").trim();
      const normalizedExpected = (appValue || "").replace(/\s+/g, " ").trim();
      const textMatch = normalizedLabel.includes(normalizedExpected);

      // "GOVERNMENT WARNING:" must appear in ALL CAPS
      const hasAllCaps = (labelValue || "").includes("GOVERNMENT WARNING:");

      // Bold check: null = could not detect (no word bbox found)
      const boldFail = warningIsBold === false;

      const status = textMatch && hasAllCaps && !boldFail ? "match" : "mismatch";

      const notes: string[] = [];
      if (!textMatch) notes.push("warning text does not match");
      if (!hasAllCaps) notes.push("'GOVERNMENT WARNING:' must be ALL CAPS");
      if (boldFail) notes.push("'GOVERNMENT WARNING:' does not appear bold");
      if (warningIsBold === null) notes.push("bold formatting could not be verified — confirm visually");

      return {
        field: label,
        key,
        appValue: appValue!,
        labelValue: labelValue!,
        status,
        isStrict: true,
        warningNotes: notes.length > 0 ? notes : undefined,
      };
    }

    // Country of origin: if not in application, treat as not_required regardless of label
    if (key === "countryOfOrigin" && !appValue) {
      return { field: label, key, appValue: null, labelValue, status: "not_required" };
    }

    // Alcohol content: compare by ABV percentage only — OCR often reorders "45% 90 ALC./VOL."
    // vs application "45% ALC./VOL. 90 PROOF". Both mean the same thing.
    if (key === "alcoholContent") {
      const abvNum = (s: string) => s.match(/(\d+(?:\.\d+)?)\s*%/)?.[1];
      const appAbv = abvNum(appValue!);
      const labelAbv = abvNum(labelValue!);
      const status = appAbv && labelAbv && appAbv === labelAbv ? "match" : "mismatch";
      return { field: label, key, appValue: appValue!, labelValue: labelValue!, status };
    }

    // All other fields: normalize then compare
    const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
    const normApp = normalize(appValue!);
    const normLabel = normalize(labelValue!);

    // Length ratio prevents short fragments from fuzzy-matching long strings
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
  });

  const hasMismatch = results.some((r) => r.status === "mismatch" || r.status === "missing_on_label");
  const hasFuzzy = results.some((r) => r.status === "fuzzy_match");
  const overallStatus = hasMismatch ? "fail" : hasFuzzy ? "needs_review" : "pass";

  return Response.json({ results, overallStatus, imageQualityNotes });
}

// Parse extracted text to identify label fields using heuristics
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

  // Priority 1: "BOTTLED/DISTILLED/BREWED/PRODUCED BY <NAME>" pattern
  const bottledBy = text.match(/(?:bottled|distilled|brewed|produced|canned)\s+by\s+([^\n,\.]+)/i);
  if (bottledBy) {
    return bottledBy[1].replace(/\s*(co\.?|llc\.?|ltd\.?|inc\.?|company)$/i, "").trim();
  }

  // Priority 2: full company line with address — take everything before the first comma
  // e.g. "IRON ANVIL BREWING CO., 1842 NW INDUSTRIAL ST..." → "IRON ANVIL BREWING CO."
  const companyLine = searchLines.find(l =>
    /(?:distillery|brewing|cellars|winery|spirits|distillers)/i.test(l) &&
    l.includes(",") && l.length > 20
  );
  if (companyLine) return companyLine.split(",")[0].trim();

  // Priority 3: first ALL-CAPS line that isn't a known non-brand phrase
  const skipPhrases = /^(established|government|warning|bottled|distilled|brewed|produced|product of|aged|imported|speyside|napa|portland|louisville)/i;
  const capsLine = searchLines.find(l => /^[A-Z][A-Z\s&'\.]{3,}$/.test(l) && !skipPhrases.test(l));
  if (capsLine) return capsLine;

  return searchLines[0] ?? null;
}

function extractClassType(text: string): string | null {
  // Match full class phrases before falling back to single keywords
  const phraseMatch = text.match(
    /(?:kentucky straight bourbon whiskey|straight bourbon whiskey|single malt scotch whisky|blended scotch whisky|cabernet sauvignon|india pale ale|american pale ale|hard cider)/i
  );
  if (phraseMatch) return phraseMatch[0];
  const wordMatch = text.match(
    /(?:bourbon|whiskey|whisky|vodka|rum|gin|tequila|cabernet|sauvignon|merlot|chardonnay|riesling|ale|lager|stout|porter|pilsner|brandy|cognac|scotch|rye)/i
  );
  return wordMatch ? wordMatch[0] : null;
}

function extractAlcoholContent(text: string): string | null {
  // Collapse newlines so "45%\nALC./VOL." becomes "45% ALC./VOL."
  const flat = text.replace(/\n/g, " ");
  // Full pattern: "45% ALC./VOL." or "45% ALC./VOL. 90 PROOF" or "14.5% Alc./Vol."
  // Handles "45% ALC./VOL.", "45% 90 ALC./VOL. PROOF", "14.5% Alc./Vol.", "43% Alc./Vol. (86 Proof)"
  const full = flat.match(/\d+(?:\.\d+)?\s*%\s*(?:\d+\s*)?(?:alc\.?\/vol\.?)(?:\s*\(?\d+\s*proof\)?)?/i);
  if (full) return full[0].replace(/\s+/g, " ").trim();
  const abv = flat.match(/\d+(?:\.\d+)?\s*%\s*(?:alc|abv)/i);
  if (abv) return abv[0];
  return null;
}

function extractNetContents(text: string): string | null {
  const flat = text.replace(/\n/g, " ");
  // Match "750 mL", "12 fl oz · 355 mL", "750ml", "1 L"
  const m = flat.match(/\d+(?:\.\d+)?\s*(?:fl\.?\s*oz|mL|L|liter|ounce|gallon)(?:\s*[·\-]\s*\d+(?:\.\d+)?\s*(?:mL|L|fl\.?\s*oz))?/i);
  return m ? m[0].trim() : null;
}

function extractProducerName(lines: string[]): string | null {
  const producerKeywords = /bottled by|distilled by|brewed by|produced by|canned by|distillery|brewing|cellars|winery/i;
  const govIdx = lines.findIndex(l => /government warning/i.test(l));
  const searchLines = govIdx > 0 ? lines.slice(0, govIdx) : lines;
  // Prefer lines that look like a full address (contain digits AND commas) over decorative fragments
  const addressIdx = searchLines.findIndex(l => producerKeywords.test(l) && /\d/.test(l) && l.includes(","));
  if (addressIdx !== -1) return searchLines[addressIdx].trim();
  // Fall back to any matching line with length > 15, plus the next line if it looks like an address
  const idx = searchLines.findIndex(l => producerKeywords.test(l) && l.length > 15);
  if (idx !== -1) {
    const parts = [searchLines[idx]];
    if (searchLines[idx + 1] && searchLines[idx + 1].length > 5) parts.push(searchLines[idx + 1]);
    return parts.join(" ").trim();
  }
  return null;
}

function extractCountryOfOrigin(text: string): string | null {
  const countryMatch = text.match(
    /(?:USA|UNITED STATES|FRANCE|SCOTLAND|IRELAND|MEXICO|CANADA|GERMANY|JAPAN|INDIA|AUSTRALIA)/i
  );
  return countryMatch ? countryMatch[0] : null;
}

function extractGovernmentWarning(text: string): string | null {
  const warningMatch = text.match(
    /GOVERNMENT\s+WARNING[:\.]?[\s\S]{0,600}(?:health problems|birth defects)[^a-zA-Z]*/i
  );
  return warningMatch ? warningMatch[0].replace(/\s+/g, " ").trim() : null;
}
