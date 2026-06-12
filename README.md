# TTB Label Verification System

A prototype that automates alcohol label compliance review for the Alcohol and Tobacco Tax and Trade Bureau (TTB). An agent opens an application, the system reads the label artwork with on-device OCR, and reports — field by field — whether the printed label matches what was submitted in the COLA application.

Built for the TTB AI-Powered Alcohol Label Verification take-home assessment.

---

## Live Demo

**[https://ttb-label-verifier-nu.vercel.app](https://ttb-label-verifier-nu.vercel.app)**

No login, no API key, no setup required. Open the demo, select any application from the queue, and click **Review**. Results appear in a few seconds.

Six demo applications cover all three verdicts:

| Application | Product | Expected Verdict |
|---|---|---|
| TTB-2024-001 | Old Tom Bourbon | APPROVED |
| TTB-2024-002 | Silver Ridge Cabernet | APPROVED |
| TTB-2024-003 | Iron Anvil IPA | APPROVED |
| TTB-2024-004 | Glen Cairn Scotch | APPROVED |
| TTB-2024-005 | Silverpeak Vodka | REJECTED — government warning in title case |
| TTB-2024-006 | Caribbean Gold Rum | NEEDS REVIEW — brand name abbreviated on label |

---

## Setup and Run Instructions

### Prerequisites

- Node.js 18 or higher
- npm

No API keys. No external services. All OCR runs on-server.

### Install and run locally

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

## How We Addressed Each Stakeholder

### Sarah Chen — Deputy Director of Label Compliance

**"If we can't get results back in about 5 seconds, nobody's going to use it."**
→ The previous vendor's 30–40 second response times came from spinning up an OCR engine on every request. We pin a single Tesseract worker at module load time so the WASM engine and language model stay warm between requests. Cold-start on first request takes a few seconds; subsequent requests return in 2–4 seconds per label.

**"We need something my mother could figure out — she's 73."**
→ The UI follows U.S. Web Design System conventions (the same visual language agents see across federal tools), uses plain-English status labels with color coding, and has no hidden controls or multi-step flows. The primary task — review a label — is a single click from the queue.

**"During peak season, big importers dump 200, 300 label applications on us at once."** *(Janet from Seattle's longstanding request)*
→ Two batch modes address this: Bulk Review accepts a pasted list of application numbers and runs them all at once with a live progress report; Batch Upload accepts a ZIP of label images plus a CSV of application data for labels not yet in COLA.

---

### Marcus Williams — IT Systems Administrator

**"Our network blocks outbound traffic to a lot of domains... half their features didn't work because our firewall blocked connections to their ML endpoints."**
→ All OCR runs on-server with Tesseract.js. The trained language model ships inside the deployment. No outbound network calls are made during verification — not to any ML API, cloud vision service, or external domain.

**"There's PII considerations, document retention policies, the usual federal compliance stuff."**
→ The system is stateless by design. No label images, application data, or verification results are stored anywhere. Each request is processed in memory and discarded. Nothing persists between sessions.

**"We're not looking to integrate with COLA directly — think of this as a standalone proof-of-concept."**
→ Application data is isolated behind a single module (`lib/cola-applications.ts`) that simulates a COLA API call. Swapping it for a real Azure/.NET endpoint is a one-file change when that integration is ready.

---

### Dave Morrison — Senior Compliance Agent (28 years)

**"The brand name was 'STONE'S THROW' on the label but 'Stone's Throw' in the application. Technically a mismatch? Sure. But it's obviously the same thing. You need judgment."**
→ Non-critical fields use normalized fuzzy comparison: lowercase, strip punctuation, collapse whitespace, then check containment with a minimum 60% length-ratio guard. `STONE'S THROW` and `Stone's Throw` both normalize to `stones throw` and match exactly. Genuine near-matches surface as **Needs Review** so the agent makes the final call rather than the system rejecting something obvious.

---

### Jenny Park — Junior Compliance Agent (8 months)

**"The 'GOVERNMENT WARNING:' part has to be in all caps and bold. People try to get creative with the warning all the time."**
→ The government warning check is strict and non-overridable. It verifies the full warning text verbatim (after whitespace normalization) and separately checks that `GOVERNMENT WARNING:` appears in all caps. Demo application TTB-2024-005 intentionally uses title case (`Government Warning:`) and receives a REJECTED verdict, isolating exactly the violation Jenny described.

**"Bold... I caught one last month where they used 'Government Warning' in title case instead of all caps."**
→ Capitalization is verified automatically. Bold weight cannot be detected from a raster image without a computer vision model (blocked by the network restriction Marcus described). The system flags this explicitly — *"Bold formatting could not be verified — confirm visually"* — so the agent knows to check rather than the gap being silently ignored. PDF-native formatting extraction is the planned fix; see Future Improvements.

**"It would be amazing if the tool could handle images that aren't perfectly shot."**
→ The preprocessing pipeline converts uploads to greyscale and normalizes contrast before OCR to handle lighting and glare. Full perspective correction (curved bottles, extreme angles) is documented as the highest-impact next improvement but was not in scope for the prototype.

---

## Approach

### The core problem

TTB agents manually compare every field on a printed label against the submitted COLA application — brand name, class/type, alcohol content, net contents, producer name, country of origin, and the government warning. At 5–10 minutes per label, with hundreds of applications at peak season, this is a bottleneck that automation should eliminate.

### Three verification workflows

**Application Review** — the primary queue. The agent sees their assigned applications listed with applicant, product type, submission date, and a label thumbnail. One click runs OCR and returns a verdict. Badges persist on each row so the agent can track what's left without re-opening anything.

**Bulk Review** — paste any number of application numbers and get a combined report. Built for supervisors and QA running entire batches without opening each application individually.

**Batch Upload** — upload a ZIP of label images and a CSV of application data. Designed for importers submitting labels that are not yet in COLA, or for processing historical records.

### Why Tesseract instead of a cloud vision model

The government network blocks outbound traffic to most domains, including commercial AI endpoints such as the Claude Vision API. Every OCR operation in this system runs on-server using [Tesseract.js](https://github.com/naptha/tesseract.js), with the English language model (`eng.traineddata`) bundled directly into the deployment. No label image ever leaves the environment. This also sidesteps PII and data-retention concerns — there is no third party receiving submission data.

The trade-off is accuracy on difficult images. A cloud vision model would handle low-resolution photographs, glare, and skew more reliably than Tesseract. We partially compensate with a persistent Tesseract worker (avoiding re-loading the 5 MB WASM engine on every request) and field-level fuzzy matching to absorb minor OCR noise.

### Comparison logic

Each field uses the comparison method appropriate to its regulatory requirement:

- **Alcohol content** — compared by ABV percentage only. OCR frequently reorders tokens like `45% ALC./VOL. 90 PROOF`, so we extract the numeric percentage and compare that alone.
- **Government warning** — strict containment check after whitespace normalization. The full required text must appear on the label verbatim.
- **All other fields** — normalized (lowercase, strip punctuation, collapse whitespace) and compared with a length-ratio guard. If one value contains the other and the shorter is at least 60% of the longer, the result is **Fuzzy Match — Needs Review** rather than an outright failure. This handles real-world cases like `STONE'S THROW` vs. `Stone's Throw` or an abbreviated producer name.

### Verdicts

- **APPROVED** — all required fields match (exact or fuzzy with no flags)
- **NEEDS REVIEW** — at least one fuzzy match; no outright failures
- **REJECTED** — one or more fields are missing from the label or mismatched

---

## Tools Used

| Tool | Purpose |
|---|---|
| Next.js 16 (App Router + Turbopack) | Framework and serverless API routes |
| React 19 | UI |
| Tesseract.js 5 | On-server OCR — no external calls |
| JSZip | ZIP extraction for batch upload mode |
| Tailwind CSS v3 | Styling |
| TypeScript | Type safety throughout |
| Vitest | Unit tests |
| Vercel | Deployment |

---

## Assumptions Made

**No live COLA integration.** Direct COLA integration is out of scope for the prototype. `lib/cola-applications.ts` holds six simulated records standing in for what would be an Azure/COLA .NET API call. The single-application and bulk review flows are structured so that swapping this module for a real API client requires no other changes.

**Clean label artwork for the demo.** The six sample labels are clean PNG files exported from SVG, which gives Tesseract its best chance. Real submissions are often photographs taken at angles, under bad lighting, or with glare from shrink wrap. The preprocessing path handles those cases but the demo does not exercise that code path heavily.

**Stateless by design.** No user accounts, no session storage, no database. Every verification is stateless and nothing is retained between sessions. This avoids PII and document-retention questions that would require legal review before a production deployment.

**Synchronous batch processing.** Batch jobs process all images within the request lifecycle. A production system handling 200–300 labels would need a durable job queue with progress callbacks and retry logic.

**Fixed CSV schema for batch upload.** The CSV must have a `filename` column whose values match image filenames in the ZIP exactly. A downloadable template is provided in-app.

---

## Limitations

### Bold and font-size formatting cannot be verified

TTB regulations require the government warning to appear in **bold** at a minimum font size. This prototype verifies the warning text and capitalization but cannot verify bold weight or font size from a raster image.

Detecting typographic properties from pixels requires either (a) a computer vision model trained specifically for text attribute classification, or (b) access to the source file where font metadata is encoded directly. Option (a) is blocked by the same network restriction that ruled out cloud OCR. Option (b) is achievable — see Future Improvements below.

For now, the system flags a note on government warning results: *"Bold formatting and minimum font size could not be verified — confirm visually."* This surfaces the gap to the agent rather than silently skipping it.

### OCR accuracy degrades on poor photographs

Tesseract performs well on clean, high-contrast labels (92–95% confidence on the demo labels) but accuracy drops on photos with motion blur, glare, extreme angles, or very small text. A cloud vision model would handle these cases better. Until network restrictions allow it, images below a confidence threshold prompt the agent to request a better photograph rather than accepting a low-confidence result.

### No multi-language support

The OCR model is English only. Labels in Spanish or other languages permitted in some product categories will extract poorly. Adding language models is straightforward technically but was not scoped for this prototype.

### No deskew or dewarp

Photographs of labels on curved bottles or taken at an angle need geometric correction before OCR. The preprocessing pipeline converts to greyscale and normalizes contrast but does not correct perspective distortion. This is the highest-impact single improvement for real-world photo submissions.

---

## Future Improvements

**1. PDF-native formatting extraction**
If TTB required label artwork to be submitted as PDF (which many applicants already do), font metadata — bold weight, point size, typeface — is encoded in the file structure and extractable without any ML. A `pdf-parse` integration could verify bold and font-size requirements programmatically, closing the largest remaining gap without touching the network restriction.

**2. Deskew and dewarp preprocessing**
Adding an OpenCV-based perspective correction step before OCR would handle curved-bottle photographs and images taken at an angle. This runs locally with no network dependency.

**3. Live COLA API integration**
Replace `lib/cola-applications.ts` with a real call to the COLA/Azure .NET API. The interface is already isolated behind a single async function; the swap is a one-file change once API credentials and the endpoint contract are available.

**4. Asynchronous job queue for batch processing**
Move bulk and batch jobs off the request lifecycle onto a durable queue (Redis + BullMQ or similar). Return a job ID immediately, stream progress via Server-Sent Events, and persist results so the agent can close the tab and come back. This is the critical path for the 200–300 label peak-season workload.

**5. Network-approved cloud OCR**
If TTB's IT security team approves specific domains through the firewall, switching the OCR backend to Azure Document Intelligence (already within the Microsoft government cloud boundary many agencies use) would dramatically improve accuracy on difficult images while maintaining data-residency guarantees. The comparison and UI layers are backend-agnostic and would not need to change.

**6. Agent feedback loop**
When an agent overrides a fuzzy-match verdict, capture that correction. Over time these corrections become training signal to improve the field-extraction heuristics — or, if a network-approved ML model becomes available, to fine-tune it on TTB-specific label formats.

---

*Built for the TTB AI-Powered Alcohol Label Verification take-home assessment.*
