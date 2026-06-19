import sharp from 'sharp';

const BG = '#007AFF'; // accent blue
const SIZES = [192, 512, 180];

async function generate() {
  for (const size of SIZES) {
    // Create a rounded-rect icon with 💈 emoji rendered as SVG
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#007AFF"/>
          <stop offset="100%" stop-color="#5856D6"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)"/>
      <text x="${size / 2}" y="${size * 0.68}" text-anchor="middle" font-size="${size * 0.52}" fill="white" font-family="sans-serif">💈</text>
    </svg>`;

    const name = size === 180 ? 'apple-icon-180.png' : `icon-${size}.png`;
    await sharp(Buffer.from(svg)).png().toFile(`public/${name}`);
    console.log(`Generated public/${name} (${size}x${size})`);
  }

  // Generate favicon (32x32 PNG, smaller version)
  const favSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="7" fill="#007AFF"/>
    <text x="16" y="22" text-anchor="middle" font-size="17" fill="white">💈</text>
  </svg>`;
  await sharp(Buffer.from(favSvg)).png().toFile('public/favicon.png');
  console.log('Generated public/favicon.png');
}

generate().catch(e => { console.error(e); process.exit(1); });
