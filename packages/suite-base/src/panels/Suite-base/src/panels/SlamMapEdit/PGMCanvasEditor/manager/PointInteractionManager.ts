const { origin, resolution } = this.#mapConfig;
const safeOrigin0 = Array.isArray(origin) && typeof origin[0] === 'number' ? origin[0] : 0;
const safeOrigin1 = Array.isArray(origin) && typeof origin[1] === 'number' ? origin[1] : 0;
const safeHeight = typeof this.#pgmData.height === 'number' ? this.#pgmData.height : 1;
const worldX = safeOrigin0 + (pixelX + 0.5) * resolution;
const worldY = safeOrigin1 + (safeHeight - pixelY - 0.5) * resolution;
return { worldX, worldY };
