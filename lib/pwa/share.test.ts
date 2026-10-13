import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

// The share target is handled by the hand-written service worker (no build step), so load
// the real file into a sandbox and exercise its fetch handler.
type FetchEvent = { request: Request; respondWith(r: Promise<Response>): void };
type Saved = { title: string; text: string; url: string; image: File | null };

function worker() {
  let onFetch: (e: FetchEvent) => void = () => {};
  const saved: Saved[] = [];
  // Just enough IndexedDB for saveShare(): open → transaction → clear/add → complete.
  const indexedDB = {
    open() {
      const tx: { oncomplete?: () => void; objectStore: () => { clear(): void; add(v: Saved): void } } = {
        objectStore: () => ({ clear: () => { saved.length = 0; }, add: (v) => { saved.push(v); queueMicrotask(() => tx.oncomplete?.()); } }),
      };
      const open: { onsuccess?: () => void; result: object } = { result: { transaction: () => tx, close() {} } };
      queueMicrotask(() => open.onsuccess?.());
      return open;
    },
  };
  const sandbox = vm.createContext({
    self: { location: { origin: "https://app.test" }, addEventListener: (type: string, fn: (e: FetchEvent) => void) => { if (type === "fetch") onFetch = fn; } },
    indexedDB, URL, Request, Date, Promise, String,
    // Service workers resolve relative redirects against their own URL; Node's Response does not.
    Response: { redirect: (path: string, status: number) => Response.redirect(new URL(path, "https://app.test"), status) },
  });
  vm.runInContext(readFileSync("public/sw.js", "utf8"), sandbox);

  /** Dispatch a fetch event; resolves to the worker's response, or undefined when it doesn't answer. */
  const dispatch = (request: Request) => {
    let response: Promise<Response> | undefined;
    onFetch({ request, respondWith: (r) => { response = r; } });
    return response;
  };
  const share = async (fields: Record<string, string | File>) => {
    const body = new FormData();
    for (const [k, v] of Object.entries(fields)) body.append(k, v);
    const response = await dispatch(new Request("https://app.test/share-target", { method: "POST", body }));
    return new URL(response!.headers.get("location")!).search;
  };
  return { share, dispatch, saved, limit: vm.runInContext("SHARE_MAX_BYTES", sandbox) as number };
}

const image = (bytes: number, type = "image/jpeg") => new File([new Uint8Array(bytes)], "photo.jpg", { type });

describe("share target (service worker)", () => {
  it("rejects an image over the 5 MB limit and stores nothing", async () => {
    const w = worker();
    expect(w.limit).toBe(5 * 1024 * 1024);
    expect(await w.share({ image: image(w.limit + 1), text: "Protein bar" })).toBe("?shared=too-large");
    expect(w.saved).toHaveLength(0);
  });

  it("accepts an image at the limit, with its text", async () => {
    const w = worker();
    expect(await w.share({ image: image(w.limit), title: "Label", text: "200 kcal" })).toBe("?shared=1");
    expect(w.saved).toHaveLength(1);
    expect(w.saved[0]).toMatchObject({ title: "Label", text: "200 kcal" });
    expect(w.saved[0].image?.size).toBe(w.limit);
  });

  it("accepts text on its own", async () => {
    const w = worker();
    expect(await w.share({ text: "2 eggs and toast" })).toBe("?shared=1");
    expect(w.saved[0]).toMatchObject({ text: "2 eggs and toast", image: null });
  });

  it("rejects files that aren't images, and empty shares", async () => {
    const w = worker();
    expect(await w.share({ image: image(10, "application/pdf") })).toBe("?shared=not-image");
    expect(await w.share({ title: "  " })).toBe("?shared=empty");
    expect(w.saved).toHaveLength(0);
  });

  it("leaves every other POST alone", () => {
    const w = worker();
    for (const url of ["https://app.test/api/ai", "https://app.test/nutrition", "https://elsewhere.test/share-target"]) {
      expect(w.dispatch(new Request(url, { method: "POST", body: "x" }))).toBeUndefined();
    }
  });
});
