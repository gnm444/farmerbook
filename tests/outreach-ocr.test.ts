import { describe, expect, it, vi } from "vitest";
import {
  extractVisibleBusinessTextFromScreenshot,
  sanitizeScreenshot,
} from "@/features/outreach/ocr";
import type {
  ImagesBinding,
  WorkersAiBinding,
} from "@/lib/cloudflare-bindings";
import { allowingAiRuntime } from "./ai-budget-test-helpers";

const onePixelPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

describe("transient screenshot OCR", () => {
  it("rejects declared images whose magic bytes do not match", async () => {
    const images = { input: vi.fn() } as unknown as ImagesBinding;
    await expect(
      sanitizeScreenshot("data:image/png;base64,bm90LWEtcG5n", images),
    ).rejects.toThrow("INVALID_SCREENSHOT");
    expect(images.input).not.toHaveBeenCalled();
  });

  it("re-encodes before OCR and returns only bounded model text", async () => {
    const outputBytes = Uint8Array.from(atob(onePixelPng.split(",")[1]), (value) =>
      value.charCodeAt(0),
    );
    const output = vi.fn(async () => ({
      response: () => new Response(outputBytes, { status: 200 }),
    }));
    const transform = vi.fn(() => ({ output }));
    const images = { input: vi.fn(() => ({ transform })) } as unknown as ImagesBinding;
    const sanitized = await sanitizeScreenshot(onePixelPng, images);
    expect(sanitized).toMatch(/^data:image\/png;base64,/);
    expect(transform).toHaveBeenCalledWith(
      expect.objectContaining({ width: 1600, height: 1600 }),
    );
    const ai = {
      run: vi.fn(async () => ({
        response: "For business enquiries: sales@example.com",
      })),
    } as WorkersAiBinding;
    await expect(
      extractVisibleBusinessTextFromScreenshot(sanitized, allowingAiRuntime(ai)),
    ).resolves.toBe("For business enquiries: sales@example.com");
    expect(ai.run).toHaveBeenCalledWith(
      "@cf/meta/llama-3.2-11b-vision-instruct",
      expect.objectContaining({ image: sanitized, temperature: 0 }),
    );
  });

  it("fails closed when the vision model does not return the expected schema", async () => {
    const ai = { run: vi.fn(async () => ({ result: "guessed" })) } as WorkersAiBinding;
    await expect(
      extractVisibleBusinessTextFromScreenshot(onePixelPng, allowingAiRuntime(ai)),
    ).rejects.toThrow();
  });
});
