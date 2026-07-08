/**
 * Automated tests for my-online-store.
 *
 * Run them with:  npm test
 * Jenkins runs the same command in the Jenkinsfile "Test" stage.
 *
 * Vitest basics:
 *   describe(...)  → groups related tests
 *   it(...)        → one concrete check ("it should …")
 *   expect(...)    → assertion: what you think the result should be
 */

import { describe, expect, it } from "vitest";
import {
  addItem,
  cartTotals,
  createCart,
  itemCount,
  setQuantity,
  shippingCents,
  subtotalCents,
  taxCents,
} from "../src/cart.js";
import { formatMoney } from "../src/format.js";
import { getProductById, isInStock } from "../src/products.js";
import { isCheckoutValid, validateCheckout } from "../src/validate.js";

// ---------------------------------------------------------------------------
// Catalog helpers (src/products.js)
// ---------------------------------------------------------------------------
describe("products", () => {
  // Looking up "mug-01" should return the Trail Mug product.
  it("finds a product by id", () => {
    expect(getProductById("mug-01")?.name).toBe("Trail Mug");
  });

  // Bad ids must return undefined — not crash the shop.
  it("returns undefined for unknown ids", () => {
    expect(getProductById("nope")).toBeUndefined();
  });

  // Stock rules: 1 is fine, 999 is not, 0 is invalid quantity.
  it("checks stock correctly", () => {
    expect(isInStock("mug-01", 1)).toBe(true);
    expect(isInStock("mug-01", 999)).toBe(false);
    expect(isInStock("mug-01", 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Money display (src/format.js)
// Prices are stored as integer cents (1800 → $18.00) to avoid float errors.
// ---------------------------------------------------------------------------
describe("formatMoney", () => {
  // Converts cents into a readable USD string.
  it("formats cents as USD", () => {
    expect(formatMoney(1800)).toBe("$18.00");
    expect(formatMoney(599)).toBe("$5.99");
  });

  // NaN / Infinity should throw instead of printing "$NaN".
  it("rejects non-finite input", () => {
    expect(() => formatMoney(NaN)).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// Shopping cart (src/cart.js)
// Covers add/remove, stock limits, tax, shipping, and checkout totals.
// ---------------------------------------------------------------------------
describe("cart", () => {
  // A new cart has no items and a $0.00 subtotal.
  it("starts empty", () => {
    const cart = createCart();
    expect(itemCount(cart)).toBe(0);
    expect(subtotalCents(cart)).toBe(0);
  });

  // Two mugs at $18.00 each → count 2, subtotal 3600 cents ($36.00).
  it("adds items and computes subtotal", () => {
    let cart = createCart();
    cart = addItem(cart, "mug-01", 2);
    expect(itemCount(cart)).toBe(2);
    expect(subtotalCents(cart)).toBe(3600);
  });

  // Adding a product that is not in the catalog must throw.
  it("rejects unknown products", () => {
    expect(() => addItem(createCart(), "missing", 1)).toThrow(/Unknown product/);
  });

  // Day Pack has only 5 in stock — requesting 6 must fail.
  it("rejects overselling stock", () => {
    expect(() => addItem(createCart(), "pack-01", 6)).toThrow(/Not enough stock/);
  });

  // Setting quantity to 0 removes that line from the cart.
  it("removes an item when quantity is set to 0", () => {
    let cart = addItem(createCart(), "sock-01", 2);
    cart = setQuantity(cart, "sock-01", 0);
    expect(cart.items["sock-01"]).toBeUndefined();
  });

  // Tax is 7% of subtotal, rounded to the nearest cent.
  // $10.00 → $0.70 tax; $18.00 → $1.26 tax.
  it("charges 7% tax rounded to the nearest cent", () => {
    expect(taxCents(1000)).toBe(70);
    expect(taxCents(1800)).toBe(126);
  });

  // Orders under $75 pay a flat $5.99 shipping (599 cents).
  it("charges flat shipping under the free threshold", () => {
    expect(shippingCents(5000, 1)).toBe(599);
  });

  // At $75+ shipping becomes free (0 cents).
  it("gives free shipping at or above $75", () => {
    expect(shippingCents(7500, 1)).toBe(0);
    expect(shippingCents(8000, 2)).toBe(0);
  });

  // One mug: $18.00 + $1.26 tax + $5.99 shipping = full order total.
  it("computes a full total with tax and shipping", () => {
    let cart = addItem(createCart(), "mug-01", 1); // $18.00
    const totals = cartTotals(cart);
    expect(totals.subtotal).toBe(1800);
    expect(totals.tax).toBe(126);
    expect(totals.shipping).toBe(599);
    expect(totals.total).toBe(1800 + 126 + 599);
  });

  // Two day packs ($138) qualify for free shipping; total = subtotal + tax only.
  it("computes free shipping on a large cart", () => {
    let cart = addItem(createCart(), "pack-01", 2); // $138.00
    const totals = cartTotals(cart);
    expect(totals.shipping).toBe(0);
    expect(totals.total).toBe(totals.subtotal + totals.tax);
  });
});

// ---------------------------------------------------------------------------
// Checkout form validation (src/validate.js)
// Empty error object {} means the form is valid.
// ---------------------------------------------------------------------------
describe("checkout validation", () => {
  // All fields look good → no errors, isCheckoutValid is true.
  it("accepts a valid checkout form", () => {
    const input = {
      name: "Alex Rivera",
      email: "alex@example.com",
      address: "120 Market Street",
      zip: "94105",
    };
    expect(validateCheckout(input)).toEqual({});
    expect(isCheckoutValid(input)).toBe(true);
  });

  // Bad name / email / address / ZIP each produce a field-specific error message.
  it("flags missing or invalid fields", () => {
    const errors = validateCheckout({
      name: "A",
      email: "not-an-email",
      address: "x",
      zip: "12",
    });
    expect(errors.name).toMatch(/at least 2/);
    expect(errors.email).toMatch(/valid email/);
    expect(errors.address).toMatch(/at least 5/);
    expect(errors.zip).toMatch(/ZIP/);
    expect(isCheckoutValid({})).toBe(false);
  });

  // ZIP+4 format (12345-6789) is also accepted.
  it("accepts ZIP+4", () => {
    expect(
      validateCheckout({
        name: "Sam Lee",
        email: "sam@shop.test",
        address: "9 Pine Ave",
        zip: "10001-1234",
      }),
    ).toEqual({});
  });
});
