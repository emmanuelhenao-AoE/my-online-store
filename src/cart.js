import { getProductById, isInStock } from "./products.js";

const TAX_RATE = 0.27;
const FREE_SHIPPING_THRESHOLD_CENTS = 7500;
const FLAT_SHIPPING_CENTS = 599;

/**
 * Create an empty cart.
 * @returns {{ items: Record<string, number> }}
 */
export function createCart() {
  return { items: {} };
}

/**
 * Add a product to the cart, respecting stock.
 * @param {{ items: Record<string, number> }} cart
 * @param {string} productId
 * @param {number} quantity
 */
export function addItem(cart, productId, quantity = 1) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be a positive integer");
  }

  const product = getProductById(productId);
  if (!product) {
    throw new Error(`Unknown product: ${productId}`);
  }

  const nextQty = (cart.items[productId] ?? 0) + quantity;
  if (!isInStock(productId, nextQty)) {
    throw new Error(`Not enough stock for ${product.name}`);
  }

  return {
    items: {
      ...cart.items,
      [productId]: nextQty,
    },
  };
}

/**
 * Update quantity for an existing line. Quantity 0 removes the line.
 * @param {{ items: Record<string, number> }} cart
 * @param {string} productId
 * @param {number} quantity
 */
export function setQuantity(cart, productId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("Quantity must be a non-negative integer");
  }

  if (quantity === 0) {
    const { [productId]: _removed, ...rest } = cart.items;
    return { items: rest };
  }

  if (!isInStock(productId, quantity)) {
    const product = getProductById(productId);
    throw new Error(`Not enough stock for ${product?.name ?? productId}`);
  }

  return {
    items: {
      ...cart.items,
      [productId]: quantity,
    },
  };
}

/**
 * Count total units in the cart.
 * @param {{ items: Record<string, number> }} cart
 */
export function itemCount(cart) {
  return Object.values(cart.items).reduce((sum, qty) => sum + qty, 0);
}

/**
 * Subtotal in cents before tax and shipping.
 * @param {{ items: Record<string, number> }} cart
 */
export function subtotalCents(cart) {
  return Object.entries(cart.items).reduce((sum, [productId, qty]) => {
    const product = getProductById(productId);
    if (!product) {
      throw new Error(`Unknown product in cart: ${productId}`);
    }
    return sum + product.priceCents * qty;
  }, 0);
}

/**
 * Tax in cents (rounded to nearest cent).
 * @param {number} subtotal
 */
export function taxCents(subtotal) {
  return Math.round(subtotal * TAX_RATE);
}

/**
 * Shipping in cents. Free above threshold when cart has items.
 * @param {number} subtotal
 * @param {number} count
 */
export function shippingCents(subtotal, count) {
  if (count === 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_CENTS;
}

/**
 * Full checkout totals.
 * @param {{ items: Record<string, number> }} cart
 */
export function cartTotals(cart) {
  const count = itemCount(cart);
  const subtotal = subtotalCents(cart);
  const tax = taxCents(subtotal);
  const shipping = shippingCents(subtotal, count);
  const total = subtotal + tax + shipping;

  return { count, subtotal, tax, shipping, total };
}
