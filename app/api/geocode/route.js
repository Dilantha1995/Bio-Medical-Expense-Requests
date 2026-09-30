import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

// Thin server-side proxy for Nominatim (OpenStreetMap) search, used to jump
// the Location map to a place the user searches for. Proxied rather than
// called from the browser so we can set the User-Agent Nominatim's usage
// policy requires, restrict results to the Maldives, and keep the request
// rate reasonable.
export async function GET(req) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    if (!q || q.trim().length < 2) return NextResponse.json({ results: [] });

    const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=mv&limit=8&accept-language=en&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "PSMS-Travel-App/1.0 (internal machine location lookup)" },
    });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();
    const results = (data || []).map((r) => ({
      label: r.display_name,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
    }));
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ results: [], error: e.message }, { status: e.status || 500 });
  }
}
