import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. High quality modern SVG Icon (Brand Blue with QR and Clock outline)
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#1E3A8A" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Background Rounded Canvas -->
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)" />

  <!-- Center Card Badge -->
  <g filter="url(#shadow)" transform="translate(96, 96)">
    <rect width="320" height="320" rx="48" fill="#FFFFFF" />
    
    <!-- QR Corner Markers -->
    <!-- Top-Left Marker -->
    <rect x="44" y="44" width="76" height="76" rx="16" fill="#2563EB" />
    <rect x="58" y="58" width="48" height="48" rx="8" fill="#FFFFFF" />
    <rect x="68" y="68" width="28" height="28" rx="4" fill="#2563EB" />

    <!-- Top-Right Marker -->
    <rect x="200" y="44" width="76" height="76" rx="16" fill="#2563EB" />
    <rect x="214" y="58" width="48" height="48" rx="8" fill="#FFFFFF" />
    <rect x="224" y="68" width="28" height="28" rx="4" fill="#2563EB" />

    <!-- Bottom-Left Marker -->
    <rect x="44" y="200" width="76" height="76" rx="16" fill="#2563EB" />
    <rect x="58" y="214" width="48" height="48" rx="8" fill="#FFFFFF" />
    <rect x="68" y="224" width="28" height="28" rx="4" fill="#2563EB" />

    <!-- Center Clock / Check Accent -->
    <circle cx="210" cy="210" r="48" fill="#EFF6FF" stroke="#2563EB" stroke-width="8" />
    <path d="M210 186 V210 L226 218" stroke="#2563EB" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon);
fs.writeFileSync(path.join(__dirname, '../public/favicon.svg'), svgIcon);

console.log('PWA SVG icons created in public/icons/icon.svg and public/favicon.svg');
