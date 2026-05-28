/**
 * Bundle favicon-16.png and favicon-32.png into a single favicon.ico
 */
const fs = require('fs');

const png16 = fs.readFileSync('public/favicon-16.png');
const png32 = fs.readFileSync('public/favicon-32.png');

// ICO format: ICONDIR + 2 x ICONDIRENTRY + image data
// ICONDIR: 6 bytes (reserved=0, type=1, count=2)
// ICONDIRENTRY: 16 bytes each
// Total header: 6 + 2*16 = 38 bytes

const headerSize = 6 + 2 * 16;
const offset1 = headerSize;
const offset2 = headerSize + png16.length;

const buf = Buffer.alloc(headerSize + png16.length + png32.length);
let pos = 0;

// ICONDIR
buf.writeUInt16LE(0, pos); pos += 2;     // reserved
buf.writeUInt16LE(1, pos); pos += 2;     // type: 1 = icon
buf.writeUInt16LE(2, pos); pos += 2;     // count: 2 images

// ICONDIRENTRY for 16x16
buf.writeUInt8(16, pos++);               // width
buf.writeUInt8(16, pos++);               // height
buf.writeUInt8(0, pos++);                // color count (0 = many)
buf.writeUInt8(0, pos++);                // reserved
buf.writeUInt16LE(1, pos); pos += 2;     // color planes
buf.writeUInt16LE(32, pos); pos += 2;    // bits per pixel
buf.writeUInt32LE(png16.length, pos); pos += 4;
buf.writeUInt32LE(offset1, pos); pos += 4;

// ICONDIRENTRY for 32x32
buf.writeUInt8(32, pos++);
buf.writeUInt8(32, pos++);
buf.writeUInt8(0, pos++);
buf.writeUInt8(0, pos++);
buf.writeUInt16LE(1, pos); pos += 2;
buf.writeUInt16LE(32, pos); pos += 2;
buf.writeUInt32LE(png32.length, pos); pos += 4;
buf.writeUInt32LE(offset2, pos); pos += 4;

// Image data
png16.copy(buf, headerSize);
png32.copy(buf, headerSize + png16.length);

fs.writeFileSync('public/favicon.ico', buf);
console.log(`favicon.ico written: ${buf.length} bytes`);
