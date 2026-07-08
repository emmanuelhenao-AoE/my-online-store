import {
  addItem,
  cartTotals,
  createCart,
  setQuantity,
} from "./src/cart.js";
import { formatMoney } from "./src/format.js";
import { PRODUCTS } from "./src/products.js";
import { validateCheckout } from "./src/validate.js";

let cart = createCart();

const productGrid = document.getElementById("product-grid");
const cartCount = document.getElementById("cart-count");
const cartLines = document.getElementById("cart-lines");
const cartSummary = document.getElementById("cart-summary");
const checkoutForm = document.getElementById("checkout-form");
const checkoutMessage = document.getElementById("checkout-message");

function renderProducts() {
  productGrid.innerHTML = PRODUCTS.map(
    (product, index) => `
      <article class="card" style="animation-delay: ${index * 60}ms">
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <p class="price">${formatMoney(product.priceCents)}</p>
        <p class="stock">${product.stock} in stock</p>
        <button class="button" type="button" data-add="${product.id}">
          Add to cart
        </button>
      </article>
    `,
  ).join("");
}

function renderCart() {
  const totals = cartTotals(cart);
  cartCount.textContent = String(totals.count);

  const entries = Object.entries(cart.items);
  if (entries.length === 0) {
    cartLines.innerHTML =
      '<p class="muted">Cart is empty. Add something from the shop.</p>';
    cartSummary.classList.add("hidden");
    return;
  }

  cartLines.innerHTML = entries
    .map(([productId, qty]) => {
      const product = PRODUCTS.find((p) => p.id === productId);
      return `
        <div class="cart-line">
          <div>
            <strong>${product.name}</strong>
            <div class="muted">${formatMoney(product.priceCents)} each</div>
          </div>
          <input
            type="number"
            min="0"
            max="${product.stock}"
            value="${qty}"
            data-qty="${productId}"
            aria-label="Quantity for ${product.name}"
          />
          <div>${formatMoney(product.priceCents * qty)}</div>
        </div>
      `;
    })
    .join("");

  cartSummary.classList.remove("hidden");
  document.getElementById("sum-subtotal").textContent = formatMoney(
    totals.subtotal,
  );
  document.getElementById("sum-tax").textContent = formatMoney(totals.tax);
  document.getElementById("sum-shipping").textContent = formatMoney(
    totals.shipping,
  );
  document.getElementById("sum-total").textContent = formatMoney(totals.total);
}

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (!button) return;

  try {
    cart = addItem(cart, button.dataset.add, 1);
    checkoutMessage.textContent = "";
    checkoutMessage.className = "checkout-message";
    renderCart();
  } catch (error) {
    checkoutMessage.textContent = error.message;
    checkoutMessage.className = "checkout-message err";
  }
});

cartLines.addEventListener("change", (event) => {
  const input = event.target.closest("[data-qty]");
  if (!input) return;

  try {
    cart = setQuantity(cart, input.dataset.qty, Number(input.value));
    renderCart();
  } catch (error) {
    checkoutMessage.textContent = error.message;
    checkoutMessage.className = "checkout-message err";
    renderCart();
  }
});

checkoutForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(checkoutForm);
  const input = Object.fromEntries(formData.entries());
  const errors = validateCheckout(input);

  for (const el of checkoutForm.querySelectorAll("[data-error-for]")) {
    el.textContent = errors[el.dataset.errorFor] ?? "";
  }

  if (Object.keys(errors).length > 0) {
    checkoutMessage.textContent = "Fix the highlighted fields.";
    checkoutMessage.className = "checkout-message err";
    return;
  }

  if (cartTotals(cart).count === 0) {
    checkoutMessage.textContent = "Add at least one item before checkout.";
    checkoutMessage.className = "checkout-message err";
    return;
  }

  const total = formatMoney(cartTotals(cart).total);
  checkoutMessage.textContent = `Order placed for ${total}. (Demo only — nothing was charged.)`;
  checkoutMessage.className = "checkout-message ok";
  cart = createCart();
  checkoutForm.reset();
  renderCart();
});

renderProducts();
renderCart();
