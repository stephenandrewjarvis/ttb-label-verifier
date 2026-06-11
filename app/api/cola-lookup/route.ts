import { NextRequest } from "next/server";
import { COLA_APPLICATIONS } from "@/lib/cola-applications";

export async function GET(req: NextRequest) {
  const appNumber = req.nextUrl.searchParams.get("appNumber")?.trim().toUpperCase();

  if (!appNumber) {
    return Response.json({ error: "Application number required" }, { status: 400 });
  }

  const application = COLA_APPLICATIONS[appNumber];
  if (!application) {
    return Response.json({ error: `Application ${appNumber} not found` }, { status: 404 });
  }

  return Response.json(application);
}
