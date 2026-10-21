import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME_SETTINGS,
  validateThemeSettings,
} from "../backend/src/settings";
import { THEME_PRESETS } from "../lib/theme";

describe("validateThemeSettings", () => {
  it("accepts the accessible default palette", () => {
    expect(validateThemeSettings(DEFAULT_THEME_SETTINGS)).toEqual(
      DEFAULT_THEME_SETTINGS,
    );
  });

  it("keeps every frontend preset within the backend contrast rules", () => {
    for (const preset of THEME_PRESETS) {
      expect(validateThemeSettings(preset.colors), preset.name).toEqual(
        preset.colors,
      );
    }
  });

  it("rejects invalid hexadecimal colors", () => {
    expect(
      validateThemeSettings({
        ...DEFAULT_THEME_SETTINGS,
        darkAccent: "red",
      }),
    ).toMatch(/hexadecimal/);
  });

  it("rejects a light background in dark mode", () => {
    expect(
      validateThemeSettings({
        ...DEFAULT_THEME_SETTINGS,
        darkBackground: "#ffffff",
      }),
    ).toMatch(/realmente escuro/);
  });

  it("rejects accents without enough contrast", () => {
    expect(
      validateThemeSettings({
        ...DEFAULT_THEME_SETTINGS,
        darkAccent: "#220f0f",
      }),
    ).toMatch(/mais contraste/);
  });
});
