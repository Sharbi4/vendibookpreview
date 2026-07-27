import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveTierFromSub } from "./toolAccess.ts";

const cases: Array<[string | null | undefined, string]> = [
  [null, "free"],
  [undefined, "free"],
  ["", "free"],
  ["garbage", "free"],
  ["starter", "starter"],
  ["pro", "pro"],
  ["premium", "premium"],
  ["host_starter", "starter"],
  ["host_growth", "pro"],
  ["host_operator", "premium"],
  ["seller_plus", "starter"],
  // Legacy alias regression
  ["host_pro", "pro"],
  ["host-pro", "pro"],
  ["HOST_PRO", "pro"],
  ["host_growth_annual", "pro"],
  ["host_operator_monthly", "premium"],
  ["host_pro_annual", "pro"],
];

for (const [raw, expected] of cases) {
  Deno.test(`resolveTierFromSub(${JSON.stringify(raw)}) === ${expected}`, () => {
    assertEquals(resolveTierFromSub(raw), expected as never);
  });
}
