import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

const m = manifest();
const pngSize = (path: string) => {
  const png = readFileSync(path);
  return [png.readUInt32BE(16), png.readUInt32BE(20)]; // IHDR width, height
};

describe("web app manifest", () => {
  it("still installs: standalone, start_url, three base icons", () => {
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/home");
    expect(m.icons).toHaveLength(3);
  });

  it("has three shortcuts that point at real app routes", () => {
    expect(m.shortcuts).toHaveLength(3);
    for (const s of m.shortcuts!) {
      expect(s.name).toBeTruthy();
      expect(typeof s.url).toBe("string");
      expect(s.url).toMatch(/^\/(?!\/)/); // same-origin path, not "//host"
      const path = new URL(s.url, "http://x").pathname;
      expect(existsSync(`app/(app)${path}/page.tsx`), `${s.url} has no page`).toBe(true);
    }
  });

  it("gives each shortcut a 96×96 PNG that exists", () => {
    for (const s of m.shortcuts!) {
      expect(s.icons).toHaveLength(1);
      const icon = s.icons![0];
      expect(icon).toMatchObject({ sizes: "96x96", type: "image/png" });
      expect(pngSize(`public${icon.src}`)).toEqual([96, 96]);
    }
  });

  it("focuses the open window on relaunch", () => {
    expect(m.launch_handler?.client_mode).toBe("focus-existing");
  });

  it("accepts shared images and text by POST", () => {
    expect(m.share_target).toMatchObject({
      action: "/share-target", method: "POST", enctype: "multipart/form-data",
      params: { title: "title", text: "text", url: "url", files: [{ name: "image", accept: ["image/*"] }] },
    });
    expect(existsSync("app/share-target/route.ts")).toBe(true);
  });
});
