import { NextResponse } from "next/server";
import { upsertExternalEvents, setSchoolMenu } from "@/lib/repo";

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const expected = process.env.INGEST_TOKEN;
  if (expected && token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (body.type === "calendar_events" && Array.isArray(body.events)) {
      await upsertExternalEvents(body.events);
      return NextResponse.json({ success: true, count: body.events.length });
    }
    if (body.type === "school_menu" && body.date && body.lunch) {
      await setSchoolMenu(body.date, body.lunch);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Unknown payload type" }, { status: 400 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
