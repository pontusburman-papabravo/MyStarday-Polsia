/**
 * Generate PNG icons for PWA using pure JavaScript
 * Creates: icon-192.png, icon-512.png, apple-touch-icon.png, favicon-32.png
 */
const fs = require('fs');
const zlib = require('zlib');

// PNG generation from scratch
function createPNG(width, height, pixels) {
  // pixels: Uint8Array of RGBA values, row by row

  function crc32(buf) {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c;
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function writeUint32(buf, offset, val) {
    buf[offset] = (val >>> 24) & 0xFF;
    buf[offset+1] = (val >>> 16) & 0xFF;
    buf[offset+2] = (val >>> 8) & 0xFF;
    buf[offset+3] = val & 0xFF;
  }

  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    writeUint32(lenBuf, 0, data.length);
    const crcBuf = Buffer.alloc(4);
    const crcData = Buffer.concat([typeBuf, data]);
    writeUint32(crcBuf, 0, crc32(crcData));
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  writeUint32(ihdr, 0, width);
  writeUint32(ihdr, 4, height);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw image data with filter byte per row
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter type: None
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      rawData.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]);
    }
  }
  const raw = Buffer.from(rawData);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

// Draw a star icon
function renderIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;   // star outer radius
  const innerR = size * 0.18;   // star inner radius
  const cornerR = size * 0.15;  // background rounded corners
  const padding = size * 0.05;  // safe zone padding (maskable)

  // Gold gradient colors
  const GOLD_DARK  = [0xC9, 0x7D, 0x0E]; // #C97D0E
  const GOLD_MID   = [0xF5, 0xA6, 0x23]; // #F5A623
  const GOLD_LIGHT = [0xFD, 0xE9, 0xB0]; // #FDE9B0
  const STAR_COLOR = [0xFF, 0xFF, 0xFF];  // white star

  function inRoundedRect(x, y, w, h, r) {
    if (x < r || x > w - r) {
      if (y < r || y > h - r) {
        const dx = x < r ? r - x : x - (w - r);
        const dy = y < r ? r - y : y - (h - r);
        return dx * dx + dy * dy <= r * r;
      }
    }
    return x >= 0 && x <= w && y >= 0 && y <= h;
  }

  function inStar(px, py) {
    const dx = px - cx;
    const dy = py - cy;
    const angle = Math.atan2(dy, dx) + Math.PI / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const n = 5;
    const sectorAngle = (2 * Math.PI) / n;
    const normalizedAngle = ((angle % sectorAngle) + sectorAngle) % sectorAngle;
    // Linear interpolation between inner and outer radius
    const t = normalizedAngle / sectorAngle;
    const nearestOuter = t < 0.5 ? t * 2 : (1 - t) * 2;
    const r = innerR + (outerR - innerR) * nearestOuter;
    return dist <= r;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const px = x + 0.5;
      const py = y + 0.5;

      // Check if in rounded rect background
      const inBg = inRoundedRect(px, py, size, size, cornerR);

      if (!inBg) {
        pixels[idx+3] = 0; // transparent
        continue;
      }

      // Background gradient (top lighter, bottom darker)
      const gradT = py / size;
      const r = Math.round(GOLD_LIGHT[0] + (GOLD_DARK[0] - GOLD_LIGHT[0]) * gradT);
      const g = Math.round(GOLD_LIGHT[1] + (GOLD_DARK[1] - GOLD_LIGHT[1]) * gradT);
      const b = Math.round(GOLD_LIGHT[2] + (GOLD_DARK[2] - GOLD_LIGHT[2]) * gradT);

      // Check if in star
      if (inStar(px, py)) {
        // Star is white
        pixels[idx]   = STAR_COLOR[0];
        pixels[idx+1] = STAR_COLOR[1];
        pixels[idx+2] = STAR_COLOR[2];
        pixels[idx+3] = 242; // ~95% opacity
      } else {
        pixels[idx]   = r;
        pixels[idx+1] = g;
        pixels[idx+2] = b;
        pixels[idx+3] = 255;
      }
    }
  }

  return pixels;
}

// Generate icons
const sizes = [
  { size: 16,  name: 'favicon-16.png' },
  { size: 32,  name: 'favicon-32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
];

for (const { size, name } of sizes) {
  console.log(`Generating ${name} (${size}x${size})...`);
  const pixels = renderIcon(size);
  const png = createPNG(size, size, pixels);
  fs.writeFileSync(`public/${name}`, png);
  console.log(`  ✓ Written ${png.length} bytes`);
}

console.log('\nAll icons generated!');
