import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { APPROVE_LOADER_URL, APPROVE_SANDBOX, buildApproveSrcDoc } from "./approveFrame";

describe("APPROVE isolation boundary", () => {
  it("sandbox never grants same-origin, top navigation, downloads or popups", () => {
    const tokens = APPROVE_SANDBOX.split(/\s+/).sort();
    expect(tokens).toEqual(["allow-forms", "allow-scripts"]);
  });

  it("srcDoc loads the exact vendor loader once and carries no app data", () => {
    const doc = buildApproveSrcDoc();
    expect(doc).toContain(JSON.stringify(APPROVE_LOADER_URL));
    expect(APPROVE_LOADER_URL).toBe(
      "https://plugin.approvepayments.com/plugin/4.0/loader/ZWuUVF07aZI0sE48tFFhb1cTMHOVaQq0CyLHFQA0",
    );
    expect(doc).not.toMatch(/supabase|access_token|listing|parent\.|top\.|postMessage|localStorage\./i);
    expect(doc).toContain("data-approve-loader");
  });

  it("loader is never installed globally on the Vendibook origin", () => {
    expect(readFileSync("index.html", "utf8")).not.toContain("approvepayments.com");
    expect(readFileSync("src/App.tsx", "utf8")).not.toContain("approvepayments.com");
    expect(readFileSync("src/main.tsx", "utf8")).not.toContain("approvepayments.com");
  });
});
