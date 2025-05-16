// pgmParser.ts

export interface PGMImage {
  width: number;
  height: number;
  maxVal: number;
  data: Uint8Array;
}

/**
 * 将 Uint8Array 转换为字符串
 */
function arrayToString(array: Uint8Array): string {
  return new TextDecoder("utf-8").decode(array);
}

/**
 * 解析 P2 (ASCII) 格式的 PGM 文件（从 Uint8Array）
 */
export function parsePGMFromBinary(array: Uint8Array): PGMImage | null {
  const data = arrayToString(array);
  return parsePGMFromString(data);
}

/**
 * 解析 P2 (ASCII) 格式的 PGM 文件（从字符串）
 */
export function parsePGMFromString(data: string): PGMImage | null {
  const lines = data.split(/\r?\n/).filter((line) => line.trim() !== "" && !line.startsWith("#"));

  if (lines[0] !== "P2") {
    alert("仅支持 P2（ASCII）PGM 格式");
    return null;
  }

  let ptr = 1;

  // 读取宽高
  let width = 0,
    height = 0;
  while (ptr < lines.length) {
    const [w, h] = lines[ptr].split(/\s+/).map(Number);
    if (!isNaN(w) && !isNaN(h)) {
      width = w;
      height = h;
      ptr++;
      break;
    }
    ptr++;
  }

  if (width <= 0 || height <= 0) {
    alert("无法读取图像尺寸");
    return null;
  }

  // 读取最大灰度值
  let maxVal = 0;
  while (ptr < lines.length) {
    const val = parseInt(lines[ptr], 10);
    if (!isNaN(val)) {
      maxVal = val;
      ptr++;
      break;
    }
    ptr++;
  }

  if (maxVal <= 0) {
    alert("无效的最大灰度值");
    return null;
  }

  // 剩下的就是像素数据，每个值一行
  const pixelData: number[] = [];
  for (let i = ptr; i < lines.length; i++) {
    const val = parseInt(lines[i], 10);
    if (!isNaN(val)) {
      pixelData.push(val);
    }
  }

  if (pixelData.length !== width * height) {
    alert(`像素数量不匹配：期望 ${width * height}，实际 ${pixelData.length}`);
    return null;
  }

  return {
    width,
    height,
    maxVal,
    data: new Uint8Array(pixelData),
  };
}

/**
 * 解析 P2 (ASCII) 格式的 PGM 文件
 */
export function parsePGM(data: string): PGMImage | null {
  const lines = data.split(/\r?\n/).filter((line) => line.trim() !== "" && !line.startsWith("#"));
  if (lines[0] !== "P2") {
    return null;
  }

  let ptr = 1;
  let width = 0,
    height = 0,
    maxVal = 0;

  while (ptr < lines.length) {
    const [w, h] = lines[ptr].split(/\s+/).map(Number);
    if (!isNaN(w) && !isNaN(h)) {
      width = w;
      height = h;
      ptr++;
      break;
    }
    ptr++;
  }

  while (ptr < lines.length) {
    const val = parseInt(lines[ptr], 10);
    if (!isNaN(val)) {
      maxVal = val;
      ptr++;
      break;
    }
    ptr++;
  }

  const pixelData: number[] = [];
  for (let i = ptr; i < lines.length; i++) {
    const val = parseInt(lines[i], 10);
    if (!isNaN(val)) {
      pixelData.push(val);
    }
  }

  if (pixelData.length !== width * height) {
    return null;
  }

  return {
    width,
    height,
    maxVal,
    data: new Uint8Array(pixelData),
  };
}
/**
 * 将编辑后的图像数据重新保存为 P2 格式的字符串
 */
export function createPGMFromData(image: PGMImage): string {
  const { width, height, maxVal, data } = image;

  let pgmStr = `P2\n${width} ${height}\n${maxVal}\n`;

  // 每个像素单独一行
  for (let i = 0; i < data.length; i++) {
    pgmStr += `${data[i]}\n`;
  }

  return pgmStr;
}
