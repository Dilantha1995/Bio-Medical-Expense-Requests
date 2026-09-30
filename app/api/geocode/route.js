import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import MALDIVES_ISLANDS from "@/lib/maldivesIslands";

export const runtime = "nodejs";

// Facility names typed into the machines sheet often use a different
// (but equally valid) Dhivehi-to-Latin transliteration than the one
// OpenStreetMap/Nominatim indexes under — most commonly doubled vowels
// ("Vashafaaru", "Lhaimaagu") where OSM has a single one ("Vashafaru",
// "Lhaimagu"). Collapsing repeated vowels lets a name match its listing
// in lib/maldivesIslands.js regardless of which spelling was typed.
function normalize(str) {
  return String(str).trim().toLowerCase().replace(/([aeiou])\1+/g, "$1");
}

function findIsland(query) {
  // Callers sometimes pass "<facility>, Maldives" — match on just the
  // facility/island part before the comma.
  const firstPart = String(query).split(",")[0];
  const target = normalize(firstPart);
  if (!target) return null;
  return MALDIVES_ISLANDS.find((i) => normalize(i.island) === target) || null;
}

async function nominatimSearch(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=mv&limit=8&accept-language=en&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "PSMS-Travel-App/1.0 (internal machine location lookup)" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data || []).map((r) => ({
    label: r.display_name,
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
  }));
}

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

    let results = await nominatimSearch(q);

    // No hit on the exact spelling — see if this matches one of our known
    // islands once vowel-doubling is normalized away, and retry with its
    // canonical spelling plus atoll name (which also helps Nominatim
    // disambiguate small islands that share a name across atolls).
    if (results.length === 0) {
      const island = findIsland(q);
      if (island) {
        results = await nominatimSearch(`${island.island}, ${island.atollName} Atoll, Maldives`);
        if (results.length === 0) {
          results = await nominatimSearch(island.island);
        }
      }
    }

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ results: [], error: e.message }, { status: e.status || 500 });
  }
}
