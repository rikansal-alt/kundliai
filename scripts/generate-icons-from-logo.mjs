/**
 * Generate PWA icons and favicon from logo.png
 * Run: node scripts/generate-icons-from-logo.mjs
 *
 * Requires: sharp (npm install sharp --save-dev)
 * If sharp is not available, manually resize public/logo.png to the sizes below.
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function main() {
  try {
    const sharp = (await import("sharp")).default;
    const logo = join(ROOT, "public", "logo.png");

    for (const size of SIZES) {
      const output = join(ROOT, "public", "icons", `icon-${size}.png`);
      await sharp(logo)
        .resize(size, size, { fit: "contain", background: { r: 250, g: 249, b: 246, alpha: 1 } })
        .png()
        .toFile(output);
      console.log(`Generated: icons/icon-${size}.png`);
    }

    // Favicon (32x32)
    const favicon = join(ROOT, "public", "favicon.ico");
    await sharp(logo)
      .resize(32, 32, { fit: "contain", background: { r: 250, g: 249, b: 246, alpha: 1 } })
      .png()
      .toFile(favicon.replace(".ico", ".png"));
    console.log("Generated: favicon.png");
    console.log("\nDone! To use as .ico, convert favicon.png manually or use an online converter.");
  } catch (e) {
    console.error("sharp not available. Install with: npm install sharp --save-dev");
    console.error("Then run this script again.");
    console.error(e.message);
  }
}

main();
