import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import MALDIVES_ISLANDS from "@/lib/maldivesIslands";

export const runtime = "nodejs";

// Facility names typed into the machines sheet sometimes use a different
// (but equally valid) Dhivehi-to-Latin transliteration than the one a
// geocoder indexes under — most commonly doubled vowels ("Vashafaaru",
// "Lhaimaagu") vs a single one ("Vashafaru", "Lhaimagu"). Collapsing
// repeated vowels lets a name match its listing in lib/maldivesIslands.js
// regardless of which spelling was typed.
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

async function googleGeocode(q, apiKey) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?components=country:MV&language=en&address=${encodeURIComponent(q)}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (data.status !== "OK") return [];
  return (data.results || []).map((r) => ({
    label: r.formatted_address,
    lat: r.geometry.location.lat,
    lon: r.geometry.location.lng,
  }));
}

// Thin server-side proxy for Google's Geocoding API, used to jump the
// Location map to a place the user searches for. Proxied so the API key
// stays server-side (never shipped to the browser) and never conflicts
// with the separate, referrer-restricted key the Maps JavaScript API
// itself uses to render the map.
export async function GET(req) {
  try {
    await requireSession();
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ results: [], error: "Geocoding isn't configured (GOOGLE_MAPS_API_KEY missing)." }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    if (!q || q.trim().length < 2) return NextResponse.json({ results: [] });

    let results = await googleGeocode(q, apiKey);

    // No hit on the exact spelling — see if this matches one of our known
    // islands once vowel-doubling is normalized away, and retry with its
    // canonical spelling plus atoll name (also helps disambiguate small
    // islands that share a name across atolls).
    if (results.length === 0) {
      const island = findIsland(q);
      if (island) {
        results = await googleGeocode(`${island.island}, ${island.atollName} Atoll, Maldives`, apiKey);
        if (results.length === 0) {
          results = await googleGeocode(island.island, apiKey);
        }
      }
    }

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ results: [], error: e.message }, { status: e.status || 500 });
  }
}
