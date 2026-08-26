import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const video = join(process.cwd(), "public/farm-visits/organic-farm-visit.mp4");
const poster = join(process.cwd(), "public/farm-visits/organic-farm-visit-poster.webp");
const ascii = (bytes: Uint8Array) => String.fromCharCode(...bytes);

describe("Farm Visit media", () => {
  it("ships a bounded fast-start-compatible MP4 with portrait H.264/AAC streams", () => {
    const bytes = readFileSync(video);
    expect(ascii(bytes.subarray(4, 8))).toBe("ftyp");
    expect(statSync(video).size).toBeLessThan(18_000_000);
    expect(bytes.indexOf(Buffer.from("moov"))).toBeLessThan(bytes.indexOf(Buffer.from("mdat")));
    const probe = JSON.parse(execFileSync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration:stream=codec_name,codec_type,width,height",
      "-of", "json",
      video,
    ], { encoding: "utf8" }));
    expect(Number(probe.format.duration)).toBeGreaterThan(89);
    expect(Number(probe.format.duration)).toBeLessThan(91);
    expect(probe.streams).toEqual(expect.arrayContaining([
      expect.objectContaining({ codec_name: "h264", codec_type: "video", width: 478, height: 850 }),
      expect.objectContaining({ codec_name: "aac", codec_type: "audio" }),
    ]));
  });

  it("ships a matching WebP poster", () => {
    const bytes = readFileSync(poster);
    expect(ascii(bytes.subarray(0, 4))).toBe("RIFF");
    expect(ascii(bytes.subarray(8, 12))).toBe("WEBP");
    expect(statSync(poster).size).toBeLessThan(200_000);
  });
});
