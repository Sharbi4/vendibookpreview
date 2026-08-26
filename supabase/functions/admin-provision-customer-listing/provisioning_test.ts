import { assertEquals, assertThrows } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { buildConciergeListing } from "./provisioning.ts";

Deno.test("maps only explicit customer listing fields", () => {
  const listing = buildConciergeListing({
    mode: "rent",
    category: "food_trailer",
    title: "Turnkey trailer for lease",
    description: "Customer-provided description.",
    price_monthly: 1000,
    city: "Spring Hill",
    state: "TN",
    postal_code: "37174",
    image_urls: ["https://example.com/photo.webp"],
  });

  assertEquals(listing.mode, "rent");
  assertEquals(listing.price_monthly, 1000);
  assertEquals(listing.price_daily, null);
  assertEquals(listing.city, "Spring Hill");
  assertEquals("length_inches" in listing, false);
  assertEquals("amenities" in listing, false);
  assertEquals("included_items" in listing, false);
});

Deno.test("rejects rental pricing on a sale listing", () => {
  assertThrows(() => buildConciergeListing({
    mode: "sale",
    category: "food_truck",
    title: "Food truck for sale",
    description: "Customer-provided description.",
    price_monthly: 1000,
    image_urls: [],
  }));
});

Deno.test("rejects unknown categories and non-HTTPS photos", () => {
  assertThrows(() => buildConciergeListing({
    mode: "rent",
    category: "equipment",
    title: "Rental",
    description: "Customer-provided description.",
    image_urls: [],
  }));
  assertThrows(() => buildConciergeListing({
    mode: "rent",
    category: "food_trailer",
    title: "Rental",
    description: "Customer-provided description.",
    image_urls: ["http://example.com/photo.jpg"],
  }));
});