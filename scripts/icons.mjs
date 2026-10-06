// Renders the IRONHEART mark to PNG icons with sharp (bundled with Next). Run: node scripts/icons.mjs
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const mark = (scale) => `
  <g transform="translate(256 262) scale(${scale}) translate(-256 -262)">
    <path d="M256 430 C 120 330 70 260 70 180 C 70 120 115 78 170 78 C 210 78 240 100 256 130 C 272 100 302 78 342 78 C 397 78 442 120 442 180 C 442 260 392 330 256 430 Z"
      fill="none" stroke="#D4AF37" stroke-width="34" stroke-linejoin="round"/>
    <rect x="130" y="232" width="252" height="22" rx="6" fill="#F5C542"/>
    <rect x="150" y="196" width="30" height="94" rx="8" fill="#D4AF37"/>
    <rect x="332" y="196" width="30" height="94" rx="8" fill="#D4AF37"/>
    <rect x="112" y="214" width="22" height="58" rx="6" fill="#D4AF37"/>
    <rect x="378" y="214" width="22" height="58" rx="6" fill="#D4AF37"/>
  </g>`;
const svg = (rounded, scale) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${rounded ? 96 : 0}" fill="#0A0A0A"/>${mark(scale)}</svg>`);

mkdirSync("public/icons", { recursive: true });
await sharp(svg(true, 1)).resize(512).png().toFile("public/icons/512.png");
await sharp(svg(true, 1)).resize(192).png().toFile("public/icons/192.png");
await sharp(svg(false, 0.78)).resize(512).png().toFile("public/icons/maskable.png"); // content inside the 80% safe zone
await sharp(svg(false, 0.9)).resize(180).png().toFile("public/icons/180.png");       // iOS adds its own rounding
console.log("icons written");
