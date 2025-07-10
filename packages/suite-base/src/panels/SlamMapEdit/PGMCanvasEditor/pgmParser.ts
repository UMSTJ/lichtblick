import { PGMImage } from "@lichtblick/suite-base/panels/SlamMapEdit/PGMCanvasEditor/manager/PointInteractionManager";

export function parsePGMBuffer(buffer: ArrayBuffer): PGMImage | undefined {
  try {
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder("ascii");

    // 1. 使用正则表达式高效、准确地解析头部
    // 这样可以正确处理任何类型的空白字符组合
    // 我们先解码文件开头的一小部分，假设头部不会过长
    const headerChunk = decoder.decode(bytes.slice(0, 128)); // 解码一个合理的头部块大小
    const headerRegex = /^P5\s+(\d+)\s+(\d+)\s+(\d+)\s/;
    const match = headerChunk.match(headerRegex);

    if (!match) {
      console.error("无效的 PGM P5 头部格式。");
      return undefined;
    }

    // 2. 从正则表达式的匹配结果中提取数值
    const width = parseInt(match[1] ?? "0", 10);
    const height = parseInt(match[2] ?? "0", 10);
    const maxVal = parseInt(match[3] ?? "0", 10);

    if (width <= 0 || height <= 0 || maxVal <= 0) {
      console.error("无效的头部数值 (宽度、高度或最大值)。");
      return undefined;
    }

    // 3. 确定二进制像素数据的精确起始位置
    // 正则表达式完全匹配的字符串长度 (match[0].length) 就是头部的精确字节数
    const dataOffset = match[0].length;

    // 4. 准确地截取二进制像素数据
    const expectedDataLength = width * height;
    const rawPixelData = bytes.slice(dataOffset, dataOffset + expectedDataLength);

    if (rawPixelData.length !== expectedDataLength) {
      console.error(
        `像素数据大小不匹配。期望 ${expectedDataLength} 字节, 实际找到 ${rawPixelData.length} 字节。`,
      );
      return undefined;
    }

    // 5. *** 添加二值化处理 ***
    // 创建一个新的数组来存储处理后的数据
    // 逻辑：等于 0 的像素保持为 0 (黑色)，所有其他值变为 maxVal (白色)
    const processedPixelData = new Uint8Array(expectedDataLength);
    for (let i = 0; i < expectedDataLength; i++) {
      processedPixelData[i] = rawPixelData[i] === 0 ? 0 : maxVal;
    }

    return {
      width,
      height,
      maxVal,
      data: processedPixelData, // 返回处理后的数据
    };
  } catch (error) {
    console.error("PGM P5 解析错误:", error);
    return undefined;
  }
}
// PGM 解析函数
export function parsePGM(data: string): PGMImage | undefined {
  try {
    const lines = data.split(/\r?\n/).filter((line) => line.trim() !== "" && !line.startsWith("#"));
    if (lines[0] !== "P2") {
      console.error("Invalid PGM formatP2.");
      return undefined;
    }

    // 使用更高效的方式解析头部信息
    if (lines[1] == undefined || lines[2] == undefined) {
      console.error("Invalid PGM format1.");
      return undefined;
    }
    const dimensions = lines[1].split(/\s+/).map(Number);
    if (dimensions.length !== 2) {
      return undefined;
    }

    const [width, height] = dimensions;

    const maxVal = parseInt(lines[2], 10);
    if (
      width == undefined ||
      height == undefined ||
      isNaN(width) ||
      isNaN(height) ||
      isNaN(maxVal) ||
      width <= 0 ||
      height <= 0 ||
      maxVal <= 0
    ) {
      console.error("Invalid PGM format2.");
      return undefined;
    }

    // 一次性处理像素数据

    const pixelData = new Uint8Array(width * height);
    let pixelIndex = 0;

    // 从第4行开始处理像素数据

    lines.slice(3).forEach((value) => {
      const values = value
        .toString()
        .trim()
        .split(/\s+/)
        .map((v) => parseInt(v, 10));
      for (const val of values) {
        if (pixelIndex >= width * height) {
          break;
        }
        pixelData[pixelIndex++] = val === 0 ? 0 : maxVal;
      }
    });

    if (pixelIndex !== width * height) {
      console.error("Invalid PGM format4.");
      return undefined;
    }

    return { width, height, maxVal, data: pixelData };
  } catch (error) {
    console.error("PGM parsing error:", error);
    return undefined;
  }
}
