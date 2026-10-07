import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function source(path: string) {
  return readFileSync(resolve(mobileRoot, path), "utf8");
}

describe("native iOS controls", () => {
  it("uses system header items for sheet Cancel on iOS 26 and a plain fallback otherwise", () => {
    const header = source("components/sheet-header.tsx");
    expect(header).toContain("iosAtLeast(26)");
    expect(header).toContain("unstable_headerLeftItems");
    expect(header).toContain('variant: "plain"');
    expect(header).toContain("unstable_headerRightItems");
    expect(header).toContain('variant: "done"');
    for (const screen of [
      "app/new.tsx",
      "app/new-space.tsx",
      "app/change-password.tsx",
      "app/server.tsx",
    ]) {
      const file = source(screen);
      expect(file).toContain("cancelHeaderOptions");
      expect(file).not.toMatch(/headerLeft:\s*\(\)\s*=>/);
    }
  });

  it("keeps Android segmented pills and uses a SwiftUI picker on iOS", () => {
    expect(source("components/native-segmented-control.tsx")).toContain("SegmentedPills");
    expect(source("components/native-segmented-control.ios.tsx")).toContain(
      'pickerStyle("segmented")',
    );
    expect(source("components/computer-mode-picker.tsx")).toContain("NativeSegmentedControl");
    expect(source("components/computer-mode-picker.tsx")).toContain('t("Team")');
    expect(source("components/computer-mode-picker.tsx")).toContain('t("Private")');
  });
});
