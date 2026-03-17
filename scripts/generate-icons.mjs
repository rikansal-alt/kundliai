import { createCanvas } from "canvas";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outDir = join(process.cwd(), "public/icons");

mkdirSync(outDir, { recursive: true });

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#FFFBF0";
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.22);
  ctx.fill();

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.22;
  const rayLen = size * 0.16;
  const rayStart = size * 0.27;

  // Rays
  ctx.strokeStyle = "#D4880A";
  ctx.lineWidth = size * 0.04;
  ctx.lineCap = "round";
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * rayStart, cy + Math.sin(angle) * rayStart);
    ctx.lineTo(cx + Math.cos(angle) * (rayStart + rayLen), cy + Math.sin(angle) * (rayStart + rayLen));
    ctx.stroke();
  }

  // Sun circle
  ctx.fillStyle = "#D4880A";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Inner highlight
  ctx.fillStyle = "rgba(255,220,120,0.35)";
  ctx.beginPath();
  ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.5, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toBuffer("image/png");
}

for (const size of sizes) {
  const buf = drawIcon(size);
  const path = join(outDir, `icon-${size}.png`);
  writeFileSync(path, buf);
  console.log(`✓ icon-${size}.png`);
}

console.log("All icons generated.");
