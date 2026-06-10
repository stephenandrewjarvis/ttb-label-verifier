import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic();

const GOVERNMENT_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const image = formData.get("image") as File;
  const applicationData = JSON.parse(formData.get("applicationData") as string);

  if (!image) {
    return Response.json({ error: "No image provided" }, { status: 400 });
  }

  const bytes = await image.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mediaType = image.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  const prompt = `You are a TTB (Alcohol and Tobacco Tax and Trade Bureau) label compliance checker. Analyze this alcohol beverage label image and extract the following fields exactly as they appear on the label.

Extract these fields (return null if not visible or not present):
- brandName: The brand name of the product
- classType: The class/type designation (e.g., "Kentucky Straight Bourbon Whiskey")
- alcoholContent: The alcohol by volume percentage and proof (e.g., "45% Alc./Vol. (90 Proof)")
- netContents: The net contents/volume (e.g., "750 mL")
- producerName: Name and address of the bottler/producer
- countryOfOrigin: Country of origin (for imports)
- governmentWarning: The full government warning statement exactly as it appears, including capitalization

For the governmentWarning field, transcribe it EXACTLY character by character, preserving all capitalization.

If the image is blurry, angled, or has glare, extract what you can and note any fields that were unclear.

Respond ONLY with a JSON object in this exact format:
{
  "extracted": {
    "brandName": "...",
    "classType": "...",
    "alcoholContent": "...",
    "netContents": "...",
    "producerName": "...",
    "countryOfOrigin": "...",
    "governmentWarning": "..."
  },
  "imageQualityNotes": "any notes about image quality issues"
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    return Response.json({ error: "Unexpected response from AI" }, { status: 500 });
  }

  let extracted: Record<string, string | null>;
  let imageQualityNotes: string = "";

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]);
    extracted = parsed.extracted;
    imageQualityNotes = parsed.imageQualityNotes || "";
  } catch {
    return Response.json({ error: "Failed to parse AI response" }, { status: 500 });
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
      return { field: label, key, appValue: null, labelValue, status: "not_in_application" };
    }

    // Government warning: label must contain the required warning text (word-for-word, case-sensitive)
    if (key === "governmentWarning") {
      const normalizedLabel = (labelValue || "").replace(/\s+/g, " ").trim();
      const normalizedExpected = (appValue || "").replace(/\s+/g, " ").trim();
      // Check containment — label may have surrounding text but must include the full warning
      const status = normalizedLabel.includes(normalizedExpected) ? "match" : "mismatch";
      return { field: label, key, appValue: appValue!, labelValue: labelValue!, status, isStrict: true };
    }

    // All other fields: normalize then compare
    const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
    const normApp = normalize(appValue!);
    const normLabel = normalize(labelValue!);

    let status: string;
    if (normApp === normLabel) {
      status = "match";
    } else if (normApp.includes(normLabel) || normLabel.includes(normApp)) {
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
