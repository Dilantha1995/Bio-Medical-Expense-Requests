// Canonical machine models this app knows about, used to normalize
// messy spreadsheet product names during bulk import and to attach a
// sensible default picture/category/company when one isn't already set.
// Anything that doesn't match one of these patterns is kept as-is (the
// raw name from the spreadsheet) rather than dropped.
const MACHINE_MODELS = [
  { name: "Vitros5600", match: /5600/i, category: "Chemistry Analyzer", brand: "Vitros", company: "PSMS", picture: "/machines/vitros-350-450.webp" },
  { name: "Vitros3600", match: /3600/i, category: "Chemistry Analyzer", brand: "Vitros", company: "PSMS", picture: "/machines/vitros-350-450.webp" },
  { name: "Vitros450", match: /\b450\b/i, category: "Chemistry Analyzer", brand: "Vitros", company: "PSMS", picture: "/machines/vitros-350-450.webp" },
  { name: "Vitros350", match: /\b350\b/i, category: "Chemistry Analyzer", brand: "Vitros", company: "PSMS", picture: "/machines/vitros-350-450.webp" },
  { name: "Fuji Film NX700", match: /nx\s*-?\s*700/i, category: "Chemistry Analyzer", brand: "FujiFilm", company: "PPM", picture: "/machines/fujifilm-nx700.jpg" },
  { name: "FujiFilm NX600", match: /nx\s*-?\s*600/i, category: "Chemistry Analyzer", brand: "FujiFilm", company: "PPM", picture: "/machines/fujifilm-nx600.webp" },
  { name: "Fuji Film NX500", match: /nx\s*-?\s*500/i, category: "Chemistry Analyzer", brand: "FujiFilm", company: "PPM", picture: "/machines/fujifilm-nx500.jpg" },
  { name: "VIDAS KUBE - Analyzer", match: /vidas\s*kube/i, category: "Immunoassay Analyzer", brand: "Vidas", company: "PPM", picture: "/machines/vidas-kube.png" },
  { name: "VIDAS 3 - Analyzer", match: /vidas\s*3\b/i, category: "Immunoassay Analyzer", brand: "Vidas", company: "PPM", picture: null },
  { name: "Yumizen H 2500 DX (Horiba)", match: /yumizen\s*h\s*2500/i, category: "Hematology Analyzer", brand: "Horiba", company: "PPM", picture: "/machines/yumizen-h2500.webp" },
  { name: "Yumizen H500E OT", match: /yumizen\s*h\s*500/i, category: "Hematology Analyzer", brand: "Horiba", company: "PPM", picture: "/machines/yumizen-h500.webp" },
  { name: "Yumizen M300", match: /yumizen\s*m\s*300/i, category: "Hematology Analyzer", brand: "Horiba", company: "PPM", picture: "/machines/yumizen-m300.png" },
  { name: "YUMIZEN D-20", match: /yumizen\s*d\s*-?\s*20/i, category: "Hematology Analyzer", brand: "Horiba", company: "PPM", picture: "/machines/yumizen-d20.png" },
  { name: "Petra XLR", match: /pe(?:n?t)ra\s*xlr/i, category: "Hematology Analyzer", brand: "Horiba", company: "PPM", picture: null },
];

/**
 * Matches a raw product/description string from an import spreadsheet
 * against the known machine models. Returns the canonical model info, or
 * null if nothing matched (caller should fall back to the raw name).
 */
export function matchMachineModel(rawName) {
  if (!rawName) return null;
  const text = String(rawName);
  return MACHINE_MODELS.find((m) => m.match.test(text)) || null;
}

/**
 * Looks up the default picture for a machine record's stored name — an
 * exact (case-insensitive) match against the canonical model names, not
 * the fuzzy spreadsheet-text matching matchMachineModel() does. Used to
 * backfill photos onto machines that were created before a default
 * picture existed for their model.
 */
export function pictureForMachineName(name) {
  if (!name) return null;
  const lower = String(name).trim().toLowerCase();
  const model = MACHINE_MODELS.find((m) => m.name.toLowerCase() === lower);
  return model?.picture || null;
}

export default MACHINE_MODELS;
