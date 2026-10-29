/**
 * Pure TypeScript Zero-Dependency QR Code Generator
 * Fully compliant with ISO/IEC 18004 specification (Versions 1-10)
 * Uses standard Reed-Solomon GF(256), BCH error-correcting codes,
 * multi-block codeword interleaving, automatic version & mask selection,
 * and standard 4-module quiet zone margin.
 */

// Error correction levels according to ISO 18004 2-bit indicators
export const QrErrorCorrectLevel = {
  L: 1, // 01 in binary (7% recovery)
  M: 0, // 00 in binary (15% recovery, default)
  Q: 3, // 11 in binary (25% recovery)
  H: 2, // 10 in binary (30% recovery)
} as const;

export type QrEcLevel = keyof typeof QrErrorCorrectLevel;

const QRMode = {
  MODE_8BIT_BYTE: 1 << 2,
};

const QRMaskPattern = {
  PATTERN000: 0,
  PATTERN001: 1,
  PATTERN010: 2,
  PATTERN011: 3,
  PATTERN100: 4,
  PATTERN101: 5,
  PATTERN110: 6,
  PATTERN111: 7,
};

// Alignment pattern centers for versions 1 to 10 according to ISO/IEC 18004 Table E.1
const PATTERN_POSITION_TABLE = [
  [],
  [18],
  [22],
  [26],
  [30],
  [34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

// Standard RS blocks: [totalCodewords, dataCodewords]
// Format: for each version (1..10), [L, M, Q, H]
// Each entry is array of [count, totalCount, dataCount]
type RSBlockGroup = [number, number, number][];
const RS_BLOCK_TABLE: RSBlockGroup[][] = [
  // Version 1
  [
    [[1, 26, 19]],
    [[1, 26, 16]],
    [[1, 26, 13]],
    [[1, 26, 9]],
  ],
  // Version 2
  [
    [[1, 44, 34]],
    [[1, 44, 28]],
    [[1, 44, 22]],
    [[1, 44, 16]],
  ],
  // Version 3
  [
    [[1, 70, 55]],
    [[1, 70, 44]],
    [[2, 35, 17]],
    [[2, 35, 13]],
  ],
  // Version 4
  [
    [[1, 100, 80]],
    [[2, 50, 32]],
    [[2, 50, 24]],
    [[4, 25, 9]],
  ],
  // Version 5
  [
    [[1, 134, 108]],
    [[2, 67, 43]],
    [[2, 33, 15], [2, 34, 16]],
    [[2, 33, 11], [2, 34, 12]],
  ],
  // Version 6
  [
    [[2, 86, 68]],
    [[4, 43, 27]],
    [[4, 43, 19]],
    [[4, 43, 15]],
  ],
  // Version 7
  [
    [[2, 98, 78]],
    [[4, 49, 31]],
    [[2, 32, 14], [4, 33, 15]],
    [[4, 39, 13], [1, 40, 14]],
  ],
  // Version 8
  [
    [[2, 121, 97]],
    [[2, 60, 38], [2, 61, 39]],
    [[4, 40, 18], [2, 41, 19]],
    [[4, 40, 14], [2, 41, 15]],
  ],
  // Version 9
  [
    [[2, 146, 116]],
    [[3, 58, 36], [2, 59, 37]],
    [[4, 36, 16], [4, 37, 17]],
    [[4, 36, 12], [4, 37, 13]],
  ],
  // Version 10
  [
    [[2, 86, 68], [2, 87, 69]],
    [[4, 69, 43], [1, 70, 44]],
    [[6, 43, 19], [2, 44, 20]],
    [[6, 43, 15], [2, 44, 16]],
  ],
];

function getRsBlockTable(typeNumber: number, errorCorrectLevel: number): RSBlockGroup {
  let ecIndex = 1; // Default M
  switch (errorCorrectLevel) {
    case QrErrorCorrectLevel.L:
      ecIndex = 0;
      break;
    case QrErrorCorrectLevel.M:
      ecIndex = 1;
      break;
    case QrErrorCorrectLevel.Q:
      ecIndex = 2;
      break;
    case QrErrorCorrectLevel.H:
      ecIndex = 3;
      break;
  }
  return RS_BLOCK_TABLE[typeNumber - 1][ecIndex];
}

// Galois Field GF(256) Math
const QRMath = (() => {
  const EXP_TABLE = new Uint8Array(256);
  const LOG_TABLE = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x >= 256) x ^= 0x11d;
  }
  return {
    glog(n: number) {
      if (n < 1) throw new Error('glog(' + n + ')');
      return LOG_TABLE[n];
    },
    gexp(n: number) {
      while (n < 0) n += 255;
      while (n >= 255) n -= 255;
      return EXP_TABLE[n];
    },
  };
})();

class QRPolynomial {
  num: number[];
  constructor(num: number[], shift = 0) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset];
    }
    for (let i = num.length - offset; i < this.num.length; i++) {
      this.num[i] = 0;
    }
  }

  get(index: number): number {
    return this.num[index];
  }

  getLength(): number {
    return this.num.length;
  }

  multiply(e: QRPolynomial): QRPolynomial {
    const num = new Array(this.getLength() + e.getLength() - 1).fill(0);
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
      }
    }
    return new QRPolynomial(num);
  }

  mod(e: QRPolynomial): QRPolynomial {
    if (this.getLength() - e.getLength() < 0) return this;
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    const num = new Array(this.getLength());
    for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
    for (let i = 0; i < e.getLength(); i++) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    }
    return new QRPolynomial(num).mod(e);
  }
}

class QRBitBuffer {
  buffer: number[] = [];
  length = 0;

  get(index: number): boolean {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
  }

  put(num: number, length: number): void {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }

  putBit(bit: boolean): void {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    }
    this.length++;
  }
}

const QRUtil = {
  getBCHTypeInfo(data: number): number {
    let d = data << 10;
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(G15) >= 0) {
      d ^= G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(G15));
    }
    return ((data << 10) | d) ^ G15_MASK;
  },

  getBCHTypeNumber(data: number): number {
    let d = data << 12;
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(G18) >= 0) {
      d ^= G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(G18));
    }
    return (data << 12) | d;
  },

  getBCHDigit(data: number): number {
    let digit = 0;
    while (data !== 0) {
      digit++;
      data >>>= 1;
    }
    return digit;
  },

  getPatternPosition(typeNumber: number): number[] {
    return PATTERN_POSITION_TABLE[typeNumber - 1] || [];
  },

  getMask(maskPattern: number, i: number, j: number): boolean {
    switch (maskPattern) {
      case QRMaskPattern.PATTERN000:
        return (i + j) % 2 === 0;
      case QRMaskPattern.PATTERN001:
        return i % 2 === 0;
      case QRMaskPattern.PATTERN010:
        return j % 3 === 0;
      case QRMaskPattern.PATTERN011:
        return (i + j) % 3 === 0;
      case QRMaskPattern.PATTERN100:
        return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case QRMaskPattern.PATTERN101:
        return ((i * j) % 2) + ((i * j) % 3) === 0;
      case QRMaskPattern.PATTERN110:
        return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
      case QRMaskPattern.PATTERN111:
        return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
      default:
        throw new Error('bad maskPattern:' + maskPattern);
    }
  },

  getErrorCorrectPolynomial(errorCorrectLength: number): QRPolynomial {
    let a = new QRPolynomial([1], 0);
    for (let i = 0; i < errorCorrectLength; i++) {
      a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
    }
    return a;
  },

  getLengthInBits(mode: number, type: number): number {
    if (1 <= type && type < 10) {
      switch (mode) {
        case QRMode.MODE_8BIT_BYTE:
          return 8;
        default:
          throw new Error('mode:' + mode);
      }
    } else if (type < 27) {
      switch (mode) {
        case QRMode.MODE_8BIT_BYTE:
          return 16;
        default:
          throw new Error('mode:' + mode);
      }
    }
    return 16;
  },

  getLostPoint(qr: QRCodeModel): number {
    const moduleCount = qr.getModuleCount();
    let lostPoint = 0;

    // LEVEL 1: Same color 5 in a row
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        let sameCount = 0;
        const dark = qr.isDark(row, col);
        for (let r = -1; r <= 1; r++) {
          if (row + r < 0 || moduleCount <= row + r || r === 0) continue;
          if (dark === qr.isDark(row + r, col)) sameCount++;
        }
        if (sameCount > 5) lostPoint += 3 + sameCount - 5;

        sameCount = 0;
        for (let c = -1; c <= 1; c++) {
          if (col + c < 0 || moduleCount <= col + c || c === 0) continue;
          if (dark === qr.isDark(row, col + c)) sameCount++;
        }
        if (sameCount > 5) lostPoint += 3 + sameCount - 5;
      }
    }

    // LEVEL 2: 2x2 blocks of same color
    for (let row = 0; row < moduleCount - 1; row++) {
      for (let col = 0; col < moduleCount - 1; col++) {
        let count = 0;
        if (qr.isDark(row, col)) count++;
        if (qr.isDark(row + 1, col)) count++;
        if (qr.isDark(row, col + 1)) count++;
        if (qr.isDark(row + 1, col + 1)) count++;
        if (count === 0 || count === 4) lostPoint += 3;
      }
    }

    // LEVEL 3: 1:1:3:1:1 pattern
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount - 6; col++) {
        if (
          qr.isDark(row, col) &&
          !qr.isDark(row, col + 1) &&
          qr.isDark(row, col + 2) &&
          qr.isDark(row, col + 3) &&
          qr.isDark(row, col + 4) &&
          !qr.isDark(row, col + 5) &&
          qr.isDark(row, col + 6)
        ) {
          lostPoint += 40;
        }
      }
    }
    for (let col = 0; col < moduleCount; col++) {
      for (let row = 0; row < moduleCount - 6; row++) {
        if (
          qr.isDark(row, col) &&
          !qr.isDark(row + 1, col) &&
          qr.isDark(row + 2, col) &&
          qr.isDark(row + 3, col) &&
          qr.isDark(row + 4, col) &&
          !qr.isDark(row + 5, col) &&
          qr.isDark(row + 6, col)
        ) {
          lostPoint += 40;
        }
      }
    }

    // LEVEL 4: Proportion of dark modules
    let darkCount = 0;
    for (let col = 0; col < moduleCount; col++) {
      for (let row = 0; row < moduleCount; row++) {
        if (qr.isDark(row, col)) darkCount++;
      }
    }
    const ratio = Math.abs((100 * darkCount) / moduleCount / moduleCount - 50) / 5;
    lostPoint += ratio * 10;

    return lostPoint;
  },
};

class QRCodeModel {
  typeNumber: number;
  errorCorrectLevel: number;
  modules: (boolean | null)[][] = [];
  moduleCount = 0;
  dataList: number[] = [];

  constructor(typeNumber: number, errorCorrectLevel: number) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
  }

  addData(data: string): void {
    // UTF-8 encoding
    const bytes: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const code = data.charCodeAt(i);
      if (code < 128) bytes.push(code);
      else if (code < 2048) {
        bytes.push(192 | (code >> 6), 128 | (code & 63));
      } else {
        bytes.push(224 | (code >> 12), 128 | ((code >> 6) & 63), 128 | (code & 63));
      }
    }
    this.dataList = bytes;
  }

  isDark(row: number, col: number): boolean {
    if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
      return false;
    }
    return this.modules[row][col] === true;
  }

  getModuleCount(): number {
    return this.moduleCount;
  }

  make(): void {
    if (this.typeNumber < 1) {
      let typeNumber = 1;
      for (typeNumber = 1; typeNumber < 10; typeNumber++) {
        const rsBlocks = getRsBlockTable(typeNumber, this.errorCorrectLevel);
        let totalDataCount = 0;
        for (const block of rsBlocks) {
          totalDataCount += block[0] * block[2];
        }
        const buffer = this.createData(typeNumber);
        if (buffer.length <= totalDataCount * 8) break;
      }
      this.typeNumber = typeNumber;
    }
    this.makeImpl(false, this.getBestMaskPattern());
  }

  private makeImpl(test: boolean, maskPattern: number): void {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = Array.from({ length: this.moduleCount }, () =>
      Array(this.moduleCount).fill(null)
    );

    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);

    if (this.typeNumber >= 7) {
      this.setupTypeNumber(test);
    }

    const data = this.createBytes(this.typeNumber, this.errorCorrectLevel);
    this.mapData(data, maskPattern);
  }

  private setupPositionProbePattern(row: number, col: number): void {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue;
        if (
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          this.modules[row + r][col + c] = true;
        } else {
          this.modules[row + r][col + c] = false;
        }
      }
    }
  }

  private getBestMaskPattern(): number {
    let minLostPoint = 0;
    let pattern = 0;
    for (let i = 0; i < 8; i++) {
      this.makeImpl(true, i);
      const lostPoint = QRUtil.getLostPoint(this);
      if (i === 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }
    return pattern;
  }

  private setupTimingPattern(): void {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r][6] !== null) continue;
      this.modules[r][6] = r % 2 === 0;
    }
    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6][c] !== null) continue;
      this.modules[6][c] = c % 2 === 0;
    }
  }

  private setupPositionAdjustPattern(): void {
    const pos = QRUtil.getPatternPosition(this.typeNumber);
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i];
        const col = pos[j];
        // Skip alignment patterns that overlap with finder pattern zones
        if (
          (row <= 8 && col <= 8) ||
          (row <= 8 && col >= this.moduleCount - 8) ||
          (row >= this.moduleCount - 8 && col <= 8)
        ) {
          continue;
        }
        if (this.modules[row][col] !== null) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)) {
              this.modules[row + r][col + c] = true;
            } else {
              this.modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  }

  private setupTypeNumber(test: boolean): void {
    const bits = QRUtil.getBCHTypeNumber(this.typeNumber);
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      this.modules[Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] = mod;
    }
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      this.modules[(i % 3) + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  }

  private setupTypeInfo(test: boolean, maskPattern: number): void {
    const data = (this.errorCorrectLevel << 3) | maskPattern;
    const bits = QRUtil.getBCHTypeInfo(data);

    // Vertical
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 6) {
        this.modules[i][8] = mod;
      } else if (i < 8) {
        this.modules[i + 1][8] = mod;
      } else {
        this.modules[this.moduleCount - 15 + i][8] = mod;
      }
    }

    // Horizontal
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 8) {
        this.modules[8][this.moduleCount - i - 1] = mod;
      } else if (i === 8) {
        this.modules[8][15 - i - 1 + 1] = mod;
      } else {
        this.modules[8][15 - i - 1] = mod;
      }
    }

    // Dark module fixed point
    this.modules[this.moduleCount - 8][8] = !test;
  }

  private mapData(data: number[], maskPattern: number): void {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[row][col - c] === null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
            }
            const mask = QRUtil.getMask(maskPattern, row, col - c);
            if (mask) dark = !dark;
            this.modules[row][col - c] = dark;
            bitIndex--;
            if (bitIndex === -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  private createData(typeNumber: number): QRBitBuffer {
    const buffer = new QRBitBuffer();
    buffer.put(QRMode.MODE_8BIT_BYTE, 4);
    buffer.put(this.dataList.length, QRUtil.getLengthInBits(QRMode.MODE_8BIT_BYTE, typeNumber));
    for (const b of this.dataList) {
      buffer.put(b, 8);
    }
    return buffer;
  }

  private createBytes(typeNumber: number, errorCorrectLevel: number): number[] {
    const rsBlocks = getRsBlockTable(typeNumber, errorCorrectLevel);
    const buffer = this.createData(typeNumber);

    let totalDataCount = 0;
    for (const block of rsBlocks) {
      totalDataCount += block[0] * block[2];
    }

    // Standard 4-bit terminator (abbreviated if remaining capacity < 4)
    const padLength = Math.max(0, Math.min(4, totalDataCount * 8 - buffer.length));
    buffer.put(0, padLength);

    while (buffer.length % 8 !== 0) {
      buffer.putBit(false);
    }
    while (true) {
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(0xec, 8);
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(0x11, 8);
    }

    // Interleave data and EC
    const dcdata: number[][] = [];
    const ecdata: number[][] = [];
    let offset = 0;

    for (const block of rsBlocks) {
      const [blockCount, totalCount, dataCount] = block;
      for (let i = 0; i < blockCount; i++) {
        const dc: number[] = [];
        for (let j = 0; j < dataCount; j++) {
          dc.push(buffer.buffer[offset + j]);
        }
        offset += dataCount;

        const rsPoly = QRUtil.getErrorCorrectPolynomial(totalCount - dataCount);
        const rawPoly = new QRPolynomial(dc, rsPoly.getLength() - 1);
        const modPoly = rawPoly.mod(rsPoly);
        const ec: number[] = new Array(rsPoly.getLength() - 1).fill(0);
        for (let j = 0; j < ec.length; j++) {
          const modIndex = j + modPoly.getLength() - ec.length;
          ec[j] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
        }

        dcdata.push(dc);
        ecdata.push(ec);
      }
    }

    const data: number[] = [];
    let maxDcCount = 0;
    let maxEcCount = 0;
    for (const dc of dcdata) maxDcCount = Math.max(maxDcCount, dc.length);
    for (const ec of ecdata) maxEcCount = Math.max(maxEcCount, ec.length);

    for (let i = 0; i < maxDcCount; i++) {
      for (const dc of dcdata) {
        if (i < dc.length) data.push(dc[i]);
      }
    }
    for (let i = 0; i < maxEcCount; i++) {
      for (const ec of ecdata) {
        if (i < ec.length) data.push(ec[i]);
      }
    }

    return data;
  }
}

/**
 * Generate standard SVG string of the QR Code
 * @param text The string to encode (URL, text, etc)
 * @param size Desired SVG pixel width/height (default 180)
 * @param margin Quiet zone margin in modules (default 4 as per ISO 18004)
 */
export function generateQrSvg(text: string, size = 180, margin = 4): string {
  const qr = new QRCodeModel(0, QrErrorCorrectLevel.M);
  qr.addData(text);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const totalCount = moduleCount + margin * 2;
  const cellSize = size / totalCount;

  // Render SVG with crisp black modules on pure white background
  let pathD = '';
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (qr.isDark(r, c)) {
        const x = (c + margin) * cellSize;
        const y = (r + margin) * cellSize;
        pathD += `M${x.toFixed(2)},${y.toFixed(2)}h${cellSize.toFixed(2)}v${cellSize.toFixed(2)}h-${cellSize.toFixed(2)}z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
  <rect width="${size}" height="${size}" fill="#ffffff" rx="10" />
  <path d="${pathD}" fill="#000000" />
</svg>`;
}
