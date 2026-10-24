import { describe, expect, it } from "vitest";
import {
  MAX_THEORY_MEDIA_BYTES,
  theoryMediaType,
  validateTheoryMediaUpload,
} from "../backend/src/theory-media-storage";

describe("armazenamento de mídia das provas teóricas", () => {
  it("reconhece formatos seguros e infere a mídia", () => {
    expect(theoryMediaType("image/png")).toEqual({ kind: "image", extension: "png" });
    expect(theoryMediaType("video/mp4; charset=binary")).toEqual({ kind: "video", extension: "mp4" });
  });

  it("recusa formatos ativos ou incompatíveis", () => {
    expect(validateTheoryMediaUpload("image/svg+xml", "1200")).toMatch(/Formato não aceito/);
    expect(validateTheoryMediaUpload("text/html", "1200")).toMatch(/Formato não aceito/);
  });

  it("exige tamanho conhecido, positivo e dentro do limite", () => {
    expect(validateTheoryMediaUpload("image/png", null)).toMatch(/confirmar o tamanho/);
    expect(validateTheoryMediaUpload("image/png", "0")).toMatch(/vazio/);
    expect(validateTheoryMediaUpload("image/png", String(MAX_THEORY_MEDIA_BYTES + 1))).toMatch(/50 MB/);
    expect(validateTheoryMediaUpload("image/png", "2048")).toMatchObject({
      kind: "image",
      extension: "png",
      size: 2048,
    });
  });
});
