import fs from "fs";
import path from "path";

let cache = null;

export function getLogoDataUris() {
  if (cache) return cache;
  const psmsPath = path.join(process.cwd(), "public", "psms-logo.jpg");
  const ppmPath = path.join(process.cwd(), "public", "propharma-logo.jpg");

  const psms = fs.existsSync(psmsPath)
    ? `data:image/jpeg;base64,${fs.readFileSync(psmsPath).toString("base64")}`
    : null;
  const ppm = fs.existsSync(ppmPath)
    ? `data:image/jpeg;base64,${fs.readFileSync(ppmPath).toString("base64")}`
    : null;

  cache = { psms, ppm };
  return cache;
}
