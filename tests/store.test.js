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

describe("products", () => {
  it("finds a product by id", () => {
    expect(getProductById("mug-01")?.name).toBe("Trail Mug");
  });

  it("returns undefined for unknown ids", () => {
    expect(getProductById("nope")).toBeUndefined();
  });

  it("checks stock correctly", () => {
    expect(isInStock("mug-01", 1)).toBe(true);
    expect(isInStock("mug-01", 999)).toBe(false);
    expect(isInStock("mug-01", 0)).toBe(false);
  });
});

describe("formatMoney", () => {
  it("formats cents as USD", () => {
    expect(formatMoney(1800)).toBe("$18.00");
    expect(formatMoney(599)).toBe("$5.99");
  });

  it("rejects non-finite input", () => {
    expect(() => formatMoney(NaN)).toThrow(TypeError);
  });
});

describe("cart", () => {
  it("starts empty", () => {
    const cart = createCart();
    expect(itemCount(cart)).toBe(0);
    expect(subtotalCents(cart)).toBe(0);
  });

  it("adds items and computes subtotal", () => {
    let cart = createCart();
    cart = addItem(cart, "mug-01", 2);
    expect(itemCount(cart)).toBe(2);
    expect(subtotalCents(cart)).toBe(3600);
  });

  it("rejects unknown products", () => {
    expect(() => addItem(createCart(), "missing", 1)).toThrow(/Unknown product/);
  });

  it("rejects overselling stock", () => {
    expect(() => addItem(createCart(), "pack-01", 6)).toThrow(/Not enough stock/);
  });

  it("removes an item when quantity is set to 0", () => {
    let cart = addItem(createCart(), "sock-01", 2);
    cart = setQuantity(cart, "sock-01", 0);
    expect(cart.items["sock-01"]).toBeUndefined();
  });

  it("charges 7% tax rounded to the nearest cent", () => {
    expect(taxCents(1000)).toBe(70);
    expect(taxCents(1800)).toBe(126);
  });

  it("charges flat shipping under the free threshold", () => {
    expect(shippingCents(5000, 1)).toBe(599);
  });

  it("gives free shipping at or above $75", () => {
    expect(shippingCents(7500, 1)).toBe(0);
    expect(shippingCents(8000, 2)).toBe(0);
  });

  it("computes a full total with tax and shipping", () => {
    let cart = addItem(createCart(), "mug-01", 1); // $18.00
    const totals = cartTotals(cart);
    expect(totals.subtotal).toBe(1800);
    expect(totals.tax).toBe(126);
    expect(totals.shipping).toBe(599);
    expect(totals.total).toBe(1800 + 126 + 599);
  });

  it("computes free shipping on a large cart", () => {
    let cart = addItem(createCart(), "pack-01", 2); // $138.00
    const totals = cartTotals(cart);
    expect(totals.shipping).toBe(0);
    expect(totals.total).toBe(totals.subtotal + totals.tax);
  });
});

describe("checkout validation", () => {
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
