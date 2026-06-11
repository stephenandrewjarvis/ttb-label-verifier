# TTB Label Verification System

A prototype that automates alcohol label compliance review for the Alcohol and Tobacco Tax and Trade Bureau (TTB). An agent opens an application, the system reads the label artwork with on-device OCR, and it reports — field by field — whether the printed label matches what was submitted in the COLA application.

Built in response to the TTB AI-Powered Alcohol Label Verification take-home assessment.

---

## Live Demo

**[https://ttb-label-verifier.vercel.app](https://ttb-label-verifier.vercel.app)**

No login, no API key, no setup required to try it — open the demo, click **Review** on any application in the queue, and you'll see verification results in a few seconds.

---

## Setup and Run Instructions

### Prerequisites

- Node.js 18 or higher

That's it. There are **no API keys and no external services** to configure — all OCR runs locally (see [Why no cloud AI](#why-no-cloud-ai) below).

### Install and run

```bash
git clone https://github.com/stephenandrewjarvis/ttb-label-verifier.git
cd ttb-label-verifier
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for production

```bash
npm run build
npm start
```

### Run tests

```bash
npm test
```

---

## How It Works

The app has three modes, reached from the tabs at the top. Each maps to a real workflow described in the stakeholder interviews.

### 1. Application Review — the single-agent queue

This is the primary flow. It simulates what an agent sees when COLAs Online hands them their assigned applications. A queue lists pending applications with applicant, class/type, submission date, and a label thumbnail. The agent clicks **Review** on one, and the system:

1. Pulls the application data and label artwork from COLA (simulated by `lib/cola-applications.ts`)
2. Runs OCR on the label
3. Compares every required field and renders a pass / needs-review / fail verdict

A colored badge appears next to each application once reviewed, so the agent can see at a glance what's left in their queue. No typing, no file handling — it mirrors the real "open application → check label" task that Sarah Chen described as taking 5–10 minutes per label by hand.

### 2. Bulk Review — paste a list of application numbers

For supervisors or QA running many applications at once. Paste application numbers (one per line or comma-separated), and the system pulls each from COLA, runs OCR, and compiles a summary report with live progress and expandable per-field detail. This directly addresses the peak-season pain Sarah raised — big importers dumping 200–300 applications that today are processed one at a time.

### 3. Batch Upload — external images + CSV

For labels that aren't in COLA (importers, legacy artwork). Upload a ZIP of label images plus a CSV of application data; the system processes all of them and returns a summary table. This is Janet from Seattle's longstanding batch request.

---

## Approach and Technical Decisions

### Why no cloud AI

Marcus Williams flagged that TTB's network blocks outbound traffic to most domains, and that the previous scanning vendor's features broke because the firewall blocked their ML endpoints. That constraint drove the single most important decision in this prototype:

**All OCR runs on-server with [Tesseract.js](https://github.com/naptha/tesseract.js) — no external API calls, no cloud vision service, no data ever leaving the environment.** The trained OCR model (`eng.traineddata`) ships with the app. This means the tool will actually run inside TTB's network, and it sidesteps the PII and data-retention concerns Marcus raised, since label images are never transmitted anywhere.

The trade-off is accuracy: a cloud vision model would extract messy real-world photos more reliably than Tesseract. We mitigate this with an image-preprocessing pipeline (below) and a human-in-the-loop review step, but it's an honest limitation — see [Assumptions and Trade-offs](#assumptions-and-trade-offs).

### Speed — the 5-second bar

Sarah was explicit: the last vendor took 30–40 seconds per label and agents abandoned it. Running OCR locally with a persistent Tesseract worker returns results in roughly 2–4 seconds per label, under the 5-second threshold she called non-negotiable. (An early bug where the OCR worker crashed and silently retried pushed response times to 70+ seconds; pinning the worker path fixed it — a reminder that the 5-second bar is fragile and worth guarding in production.)

### Image preprocessing

Because Tesseract is more sensitive to image quality than a cloud model, `sharp` normalizes input before OCR:

- **Vector labels (SVG)** are rasterized at higher density and read directly — they're already clean.
- **Real-world photos** are converted to greyscale and contrast-normalized to handle the bad lighting, angles, and glare Jenny Park described.

This partially addresses Jenny's "labels aren't perfectly shot" concern. It is not a substitute for a full computer-vision deskew/dewarp pipeline, which would be the production next step.

### Fuzzy match with human override

Dave Morrison gave the definitive example: `STONE'S THROW` on the label vs. `Stone's Throw` in the application — technically a mismatch, obviously the same thing. A binary system would generate noise and erode trust. Fields use normalized comparison with a length-ratio guard (minimum 0.6) to catch obvious equivalences, surface them as **"Likely Match — Review"** rather than failures, and let the agent approve with one click. Alcohol content is compared by ABV percentage alone, because OCR frequently reorders the `45% ALC./VOL. 90 PROOF` tokens.

### Strict government warning validation

Jenny Park was emphatic that the warning must be exact — word-for-word, with `GOVERNMENT WARNING:` in all caps and bold. This is the only field that **cannot** be overridden, and it checks three things independently:

1. **Text** — the label must contain the full required warning verbatim (after whitespace normalization)
2. **Caps** — `GOVERNMENT WARNING:` must appear in all caps
3. **Bold** — for vector labels we trust the font-weight declaration; for photos we measure pixel ink density against neighboring text

Each failure produces a specific note ("'GOVERNMENT WARNING:' does not appear bold") rather than a generic rejection, so the agent knows exactly what's wrong.

### UI simplicity

Sarah's benchmark was her 73-year-old mother. The interface is clean and obvious — a queue on the left, results on the right, every status color-coded with a plain-English label, no hidden controls and no account. It follows U.S. Web Design System conventions (federal blue `#005EA2`, the two-bar government header) so it feels native to a federal workflow rather than like outside software.

---

## Architecture

```
app/
├── page.tsx                  # Main UI — Application Review, Bulk Review, Batch Upload
├── header.tsx / title.tsx / footer.tsx   # USWDS government chrome
├── layout.tsx / globals.css  # Fonts, USWDS color system
└── api/
    ├── cola-lookup/route.ts  # Fetch one application by number (simulates COLA/Azure)
    ├── verify/route.ts       # Single-label OCR + field comparison
    └── verify-batch/route.ts # ZIP + CSV batch OCR

lib/
├── cola-applications.ts      # Simulated COLA application database (4 demo records)
└── verify-logic.ts           # Pure comparison logic — shared by routes and tests

public/samples/               # Demo label artwork (SVG) + batch CSV/ZIP templates
tests/verify-logic.test.ts    # 49 unit tests
```

### Tools Used

| Tool | Purpose |
|---|---|
| Next.js 16 (App Router) | Framework and API routes |
| React 19 | UI |
| Tesseract.js | On-server OCR — no external calls |
| sharp | Image preprocessing (rasterize, greyscale, normalize) |
| JSZip | ZIP extraction for batch mode |
| TypeScript | Type safety throughout |
| Vitest | Unit tests (49) |
| Vercel | Deployment |

---

## Assumptions and Trade-offs

**No COLA integration.** Per Marcus, direct COLA integration is out of scope. `lib/cola-applications.ts` holds five simulated applications standing in for what would be an Azure/COLA `.NET` API call. The Application Review and Bulk Review flows are built so that swapping this module for a real API client is the only change needed.

**One application is intentionally non-compliant.** `TTB-2024-005` (Silverpeak Vodka) has every field matching *except* a government warning printed as "Government Warning:" in title case instead of the required ALL CAPS — Jenny Park's exact real-world example. Reviewing it returns a **REJECTED** verdict, so an evaluator can see the strict warning check reject something rather than only seeing passing labels.

**On-device OCR over cloud accuracy.** Tesseract was chosen specifically to satisfy the network/firewall constraint, accepting lower raw accuracy on messy photos than a cloud vision model would give. The preprocessing pipeline and human review step compensate, but very poor images may still need an agent to request a better photo — which matches current practice.

**No authentication or persistence.** The prototype stores nothing between sessions; every verification is stateless. This sidesteps the PII and document-retention concerns Marcus flagged for production.

**Synchronous batch processing.** Batch and bulk jobs process sequentially/in-parallel within the request. A production system handling 200–300 labels would want a job queue with durable progress — noted but out of scope.

**SVG demo labels.** The sample labels are clean vector artwork, which flatters OCR accuracy. Real submissions are photographs; the preprocessing path exists for them but is exercised less in the demo.

**Fixed CSV format.** Batch CSV requires a `filename` column matching image names in the ZIP exactly; column names are case-sensitive. A template is downloadable in-app.

---

## Requirements Coverage

| Requirement (from stakeholder interviews) | Status |
|---|---|
| Verify label fields against application data | ✓ |
| Extract fields from label image automatically | ✓ Tesseract OCR |
| Field-by-field match report | ✓ |
| Results in under ~5 seconds | ✓ ~2–4s per label |
| Works inside a firewalled network (no external ML) | ✓ On-server OCR |
| Fuzzy match with human judgment (STONE'S THROW) | ✓ Override on non-exact fields |
| Exact government warning — text, ALL CAPS, bold | ✓ Strict, non-overridable |
| Handle imperfect images (angle, glare, lighting) | ◑ Preprocessing pipeline; partial |
| Batch upload for large importers | ✓ Bulk Review + Batch Upload |
| Simple UI for low-tech-comfort agents | ✓ USWDS, two-pane, no hidden controls |
| Unit tests | ✓ 49 tests on comparison logic |

---

*Built for the TTB AI-Powered Alcohol Label Verification take-home assessment.*
