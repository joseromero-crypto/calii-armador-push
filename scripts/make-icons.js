import { deflateSync } from 'zlib';
import { writeFileSync } from 'fs';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length);
  const crcVal = Buffer.allocUnsafe(4);
  crcVal.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcVal]);
}

function makePNG(size, drawFn) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const rows = [];
  for (let y = 0; y < size; y++) {
    rows.push(0); // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = drawFn(x, y, size);
      rows.push(r, g, b);
    }
  }

  const compressed = deflateSync(Buffer.from(rows));

  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function bellPixel(x, y, size) {
  const BG   = [17, 17, 17];
  const BELL = [245, 158, 11]; // amber

  const nx = (x / size - 0.5) * 2;
  const ny = (y / size - 0.5) * 2;

  // dome (upper semicircle)
  const inDome = nx * nx + (ny + 0.08) * (ny + 0.08) < 0.28 && ny < 0.08;

  // skirt: widens from 0.08 to 0.62 linearly
  const skirtT = 0.08, skirtB = 0.55;
  const skirtW = 0.3 + ((ny - skirtT) / (skirtB - skirtT)) * 0.32;
  const inSkirt = ny >= skirtT && ny <= skirtB && Math.abs(nx) <= skirtW;

  // rim bar
  const inRim = Math.abs(ny - 0.60) < 0.075 && Math.abs(nx) < 0.68;

  // hanger
  const inHanger = Math.abs(nx) < 0.07 && ny >= -0.88 && ny <= -0.68;

  // clapper
  const inClapper = nx * nx + (ny - 0.75) * (ny - 0.75) < 0.012;

  if (inDome || inSkirt || inRim || inHanger || inClapper) return BELL;
  return BG;
}

writeFileSync('public/icon-192.png', makePNG(192, bellPixel));
writeFileSync('public/icon-512.png', makePNG(512, bellPixel));
console.log('Icons written: public/icon-192.png, public/icon-512.png');
