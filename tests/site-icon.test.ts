import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

function pngDimensions(path: string) {
  const file = readFileSync(path);
  expect(Array.from(file.subarray(0, 8), (byte) => byte.toString(16).padStart(2, "0")).join(""))
    .toBe("89504e470d0a1a0a");
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

describe("FarmerBook site icon", () => {
  it("ships the browser and installable-app icon sizes", () => {
    expect(pngDimensions("public/favicon-64.png")).toEqual({ width: 64, height: 64 });
    expect(pngDimensions("public/apple-touch-icon.png")).toEqual({ width: 180, height: 180 });
    expect(pngDimensions("public/icon-192.png")).toEqual({ width: 192, height: 192 });
    expect(pngDimensions("public/icon-512.png")).toEqual({ width: 512, height: 512 });

    const favicon = readFileSync("public/favicon.ico");
    expect(favicon.length).toBeGreaterThan(100);
    expect(Array.from(favicon.subarray(0, 4), (byte) => byte.toString(16).padStart(2, "0")).join(""))
      .toBe("00000100");
  });

  it("advertises both installable-app icons in the web manifest", () => {
    expect(manifest().icons).toEqual([
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ]);
  });
});
