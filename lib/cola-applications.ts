// Simulated COLA application database.
// In production this would be fetched from Azure / the COLA .NET API.
// Each record matches what an agent sees when they open an application in COLA Online.

export type ColaApplication = {
  appNumber: string;
  applicantName: string;
  submittedDate: string;
  brandName: string;
  classType: string;
  alcoholContent: string;
  netContents: string;
  producerName: string;
  countryOfOrigin: string;
  labelImagePath: string; // path under /public — simulates the label artwork attached to the COLA application
};

export const COLA_APPLICATIONS: Record<string, ColaApplication> = {
  "TTB-2024-001": {
    appNumber: "TTB-2024-001",
    applicantName: "Old Tom Distillery Co.",
    submittedDate: "2024-03-15",
    brandName: "OLD TOM DISTILLERY",
    classType: "Kentucky Straight Bourbon Whiskey",
    alcoholContent: "45% ALC./VOL. 90 PROOF",
    netContents: "750 mL",
    producerName: "BOTTLED BY OLD TOM DISTILLERY CO. 123 BOURBON TRAIL, LOUISVILLE, KENTUCKY 40202",
    countryOfOrigin: "",
    labelImagePath: "/samples/label-bourbon.svg",
  },
  "TTB-2024-002": {
    appNumber: "TTB-2024-002",
    applicantName: "Silver Ridge Cellars LLC",
    submittedDate: "2024-04-02",
    brandName: "SILVER RIDGE CELLARS",
    classType: "Cabernet Sauvignon",
    alcoholContent: "14.5% Alc./Vol.",
    netContents: "750 mL",
    producerName: "SILVER RIDGE CELLARS, 4500 SILVERADO TRAIL, NAPA, CA 94558",
    countryOfOrigin: "",
    labelImagePath: "/samples/label-wine.svg",
  },
  "TTB-2024-003": {
    appNumber: "TTB-2024-003",
    applicantName: "Iron Anvil Brewing Company",
    submittedDate: "2024-04-18",
    brandName: "IRON ANVIL BREWING CO.",
    classType: "India Pale Ale",
    alcoholContent: "6.8% ALC./VOL.",
    netContents: "12 fl oz · 355 mL",
    producerName: "IRON ANVIL BREWING CO., 1842 NW INDUSTRIAL ST, PORTLAND, OR 97209",
    countryOfOrigin: "",
    labelImagePath: "/samples/label-beer.svg",
  },
  "TTB-2024-004": {
    appNumber: "TTB-2024-004",
    applicantName: "Glen Cairn Distillery Ltd.",
    submittedDate: "2024-05-07",
    brandName: "GLEN CAIRN DISTILLERY LTD",
    classType: "Single Malt Scotch Whisky",
    alcoholContent: "43% Alc./Vol. (86 Proof)",
    netContents: "700 mL",
    producerName: "GLEN CAIRN DISTILLERY LTD., DUFFTOWN, BANFFSHIRE AB55 4DH, SCOTLAND",
    countryOfOrigin: "SCOTLAND",
    labelImagePath: "/samples/label-scotch.svg",
  },
};
