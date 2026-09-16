const CATEGORIES = [
  { id: "TODOS", label: "Todos" },
  { id: "ENTRADAS", label: "Entradas" },
  { id: "PRATO PRINCIPAL", label: "Pratos principais" },
  { id: "SOBREMESAS", label: "Sobremesas" },
  { id: "BEBIDAS", label: "Bebidas" },
  { id: "CARTA DE VINHOS", label: "Carta de vinhos" },
];

/* ---------- Ícones (SVG inline, sem emojis) ---------- */
const ICONS = {
  sparkles:
    '<svg class="icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/></svg>',
  check:
    '<svg class="icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  plus:
    '<svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  minus:
    '<svg class="icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>',
  trash:
    '<svg class="icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
};

const CART_STORAGE_KEY = "casa_aurora_cart_v1";
const CUSTOMER_STORAGE_KEY = "casa_aurora_customer_v1";

/* ---------- Estado da aplicação ---------- */
const state = {
  selectedCategory: "TODOS",
  searchTerm: "",
  cart: loadCart(),         // [{ productId, quantity }]
  customerName: "",
  tableNumber: "",
  notes: "",
  includeTip: false,
};

(function restoreCustomer() {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOMER_STORAGE_KEY) || "{}");
    state.customerName = saved.customerName || "";
    state.tableNumber = saved.tableNumber || "";
  } catch (e) { /* ignore */ }
})();

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function persistCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart));
}

function persistCustomer() {
  localStorage.setItem(
    CUSTOMER_STORAGE_KEY,
    JSON.stringify({ customerName: state.customerName, tableNumber: state.tableNumber })
  );
}

/* ---------- Helpers ---------- */
function formatBRL(value) {
  return "R$ " + value.toFixed(2).replace(".", ",");
}

function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id);
}

function cartLines() {
  return state.cart
    .map((item) => ({ ...item, product: getProduct(item.productId) }))
    .filter((line) => line.product);
}

function cartTotals() {
  const subtotal = cartLines().reduce((acc, line) => acc + line.product.price * line.quantity, 0);
  const tipAmount = state.includeTip ? subtotal * 0.1 : 0;
  const total = subtotal + tipAmount;
  const itemsCount = state.cart.reduce((acc, item) => acc + item.quantity, 0);
  return { subtotal, tipAmount, total, itemsCount };
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 2200);
}

/* ---------- Carrinho: ações ---------- */
function addToCart(productId) {
  const existing = state.cart.find((i) => i.productId === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ productId, quantity: 1 });
  }
  persistCart();
  const product = getProduct(productId);
  showToast(`"${product.name}" adicionado ao pedido!`);
  renderAll();
}

function updateQuantity(productId, quantity) {
  if (quantity <= 0) {
    removeFromCart(productId);
    return;
  }
  const item = state.cart.find((i) => i.productId === productId);
  if (item) item.quantity = quantity;
  persistCart();
  renderAll();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter((i) => i.productId !== productId);
  persistCart();
  renderAll();
}

function clearCart() {
  state.cart = [];
  state.notes = "";
  document.getElementById("order-notes").value = "";
  persistCart();
  renderAll();
}

/* ---------- Renderização: cardápio completo ---------- */
function filteredProducts() {
  const term = state.searchTerm.trim().toLowerCase();
  return PRODUCTS.filter((p) => {
    const matchesCategory = state.selectedCategory === "TODOS" || p.category === state.selectedCategory;
    const matchesSearch =
      !term || p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });
}

function productCardHTML(p) {
  const cartItem = state.cart.find((i) => i.productId === p.id);
  const badgeHTML = p.badge
    ? `<span class="badge-primary">${ICONS.sparkles} ${p.badge}</span>`
    : `<span class="badge-secondary">${p.category}</span>`;
  const qtyHTML = cartItem
    ? `<span class="qty-indicator">${ICONS.check} ${cartItem.quantity}x</span>`
    : "";
  return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-img-wrap">
        <img src="${p.image}" alt="${escapeHTML(p.name)}" loading="lazy" />
        <div class="badge-top">${badgeHTML}</div>
        ${qtyHTML}
      </div>
      <div>
        <h3>${escapeHTML(p.name)}</h3>
        <p class="desc">${escapeHTML(p.description)}</p>
      </div>
      <div class="product-footer">
        <div>
          <span class="price-label">Preço</span>
          <span class="price-value">${formatBRL(p.price)}</span>
        </div>
        <button class="add-btn" data-add="${p.id}" type="button">${ICONS.plus} Adicionar ao pedido</button>
      </div>
    </div>`;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderMenu() {
  const list = filteredProducts();
  const grid = document.getElementById("menu-grid");
  const empty = document.getElementById("empty-state");
  const count = document.getElementById("results-count");

  count.textContent = `${list.length} ${list.length === 1 ? "produto encontrado" : "produtos encontrados"}`;

  if (list.length === 0) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  grid.innerHTML = list.map(productCardHTML).join("");
}

function renderCategoryFilters() {
  const wrap = document.getElementById("category-filters");
  wrap.innerHTML = CATEGORIES.map(
    (c) =>
      `<button data-cat="${c.id}" class="${c.id === state.selectedCategory ? "active" : ""}" type="button">${c.label}</button>`
  ).join("");
}

/* ---------- Renderização: destaques (mais pedidos) ---------- */
function renderBestsellers() {
  const wrap = document.getElementById("bestsellers-grid");
  const items = PRODUCTS.slice(0, 4);
  wrap.innerHTML = items
    .map(
      (p) => `
      <div class="bestseller-card" data-id="${p.id}">
        <div class="bestseller-img-wrap">
          <img src="${p.image}" alt="${escapeHTML(p.name)}" loading="lazy" />
          <span class="mini-badge">${p.badge ? escapeHTML(p.badge) : "Casa Aurora"}</span>
        </div>
        <h3>${escapeHTML(p.name)}</h3>
        <p>${escapeHTML(p.description)}</p>
        <div class="bestseller-price-row">
          <span>${formatBRL(p.price)}</span>
          <span>Adicionar no pedido</span>
        </div>
      </div>`
    )
    .join("");

  wrap.querySelectorAll(".bestseller-card").forEach((card) => {
    card.addEventListener("click", () => addToCart(Number(card.dataset.id)));
  });
}

/* ---------- Renderização: imagens decorativas (hero / prova / craft / cta) ---------- */
function renderDecorativeImages() {
  const images = PRODUCTS.map((p) => p.image).filter(Boolean);

  const heroWrap = document.getElementById("hero-images");
  heroWrap.innerHTML = images
    .slice(0, 3)
    .map((src) => `<div class="hero-image"><img src="${src}" alt="Especialidade Casa Aurora" loading="lazy" /></div>`)
    .join("");

  const aboutImg = document.getElementById("about-image");
  if (images[3]) aboutImg.style.backgroundImage = `url('${images[3]}')`;

  const craftWrap = document.getElementById("craft-images");
  craftWrap.innerHTML = images
    .slice(4, 6)
    .map((src) => `<div class="craft-img"><img src="${src}" alt="Ingredientes e preparo artesanal" loading="lazy" /></div>`)
    .join("");

  const ctaImgWrap = document.getElementById("cta-image");
  if (images[6]) {
    const img = document.createElement("img");
    img.src = images[6];
    img.alt = "Seleção Casa Aurora";
    ctaImgWrap.prepend(img);
  }
}

/* ---------- Renderização: carrinho / drawer ---------- */
function cartItemRowHTML(line) {
  const { product, quantity } = line;
  const itemTotal = product.price * quantity;
  return `
    <div class="cart-item" data-id="${product.id}">
      <div class="cart-item-top">
        <div class="cart-item-info">
          <img src="${product.image}" alt="${escapeHTML(product.name)}" />
          <div>
            <h4>${escapeHTML(product.name)}</h4>
            <div class="cat">${product.category}</div>
            <div class="unit">Unitário: ${formatBRL(product.price)}</div>
          </div>
        </div>
        <div class="cart-item-price">${formatBRL(itemTotal)}</div>
      </div>
      <div class="cart-item-controls">
        <div class="qty-group">
          <button type="button" data-decrease="${product.id}" aria-label="Diminuir quantidade">${ICONS.minus}</button>
          <span>${quantity}</span>
          <button type="button" data-increase="${product.id}" aria-label="Aumentar quantidade">${ICONS.plus}</button>
        </div>
        <button type="button" class="remove-btn" data-remove="${product.id}">${ICONS.trash} Remover</button>
      </div>
    </div>`;
}

function renderCart() {
  const lines = cartLines();
  const { subtotal, tipAmount, total, itemsCount } = cartTotals();

  // contador do header
  const cartCount = document.getElementById("cart-count");
  cartCount.textContent = itemsCount;
  cartCount.classList.toggle("hidden", itemsCount === 0);

  // subtítulo do drawer
  const subtitle = document.getElementById("drawer-subtitle");
  subtitle.textContent =
    lines.length === 0
      ? "Nenhum item selecionado"
      : `${lines.length} ${lines.length === 1 ? "item diferente" : "itens diferentes"}`;

  // vazio vs. cheio
  const emptyCart = document.getElementById("empty-cart");
  const itemsWrap = document.getElementById("cart-items-wrap");
  const footer = document.getElementById("drawer-footer");
  const hasItems = lines.length > 0;
  emptyCart.classList.toggle("hidden", hasItems);
  itemsWrap.classList.toggle("hidden", !hasItems);
  footer.classList.toggle("hidden", !hasItems);

  if (!hasItems) return;

  document.getElementById("cart-items").innerHTML = lines.map(cartItemRowHTML).join("");

  // dados do cliente (mantém o que o usuário já digitou)
  document.getElementById("customer-name").value = state.customerName;
  document.getElementById("table-number").value = state.tableNumber;
  document.getElementById("order-notes").value = state.notes;
  document.getElementById("tip-toggle").checked = state.includeTip;

  document.getElementById("tip-desc").textContent = state.includeTip
    ? `Adicionando ${formatBRL(tipAmount)} de serviço`
    : "Marque se deseja apoiar a equipe de salão";

  document.getElementById("summary-subtotal").textContent = formatBRL(subtotal);
  document.getElementById("summary-tip-label").textContent = `Taxa de serviço (10% ${
    state.includeTip ? "ativa" : "não inclusa"
  })`;
  document.getElementById("summary-tip").textContent = formatBRL(tipAmount);
  document.getElementById("summary-total").textContent = formatBRL(total);
}

function renderAll() {
  renderMenu();
  renderCategoryFilters();
  renderBestsellers();
  renderCart();
}

/* ---------- Drawer aberto/fechado ---------- */
function openCart() {
  document.getElementById("cart-drawer").classList.remove("hidden");
  document.getElementById("backdrop").classList.remove("hidden");
}
function closeCart() {
  document.getElementById("cart-drawer").classList.add("hidden");
  document.getElementById("backdrop").classList.add("hidden");
}

/* ---------- Finalização do pedido ---------- */
function generateOrderNumber() {
  const now = new Date();
  const stamp = now.getTime().toString().slice(-6);
  return `CA-${stamp}`;
}

async function handleCheckout() {
  const lines = cartLines();
  if (lines.length === 0) {
    showToast("Adicione pelo menos um item ao pedido antes de finalizar.");
    return;
  }
  if (!state.customerName.trim()) {
    showToast("Por favor, preencha o nome do cliente.");
    document.getElementById("customer-name").focus();
    return;
  }
  if (!state.tableNumber.trim()) {
    showToast("Por favor, informe o número da mesa.");
    document.getElementById("table-number").focus();
    return;
  }

  const { subtotal, tipAmount, total } = cartTotals();
  const orderNumber = generateOrderNumber();

  const checkoutBtn = document.getElementById("checkout-btn");
  checkoutBtn.disabled = true;
  const originalBtnText = checkoutBtn.textContent;
  checkoutBtn.textContent = "Enviando pedido...";

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber,
        customerName: state.customerName,
        tableNumber: state.tableNumber,
        includeTip: state.includeTip,
        items: lines.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
        })),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Falha ao salvar o pedido no servidor.");
    }
  } catch (err) {
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = originalBtnText;
    showToast(`Não foi possível enviar o pedido: ${err.message}`);
    return; // não fecha o carrinho nem limpa nada — cliente pode tentar de novo
  }

  checkoutBtn.disabled = false;
  checkoutBtn.textContent = originalBtnText;

  document.getElementById("confirm-number").textContent = orderNumber;
  document.getElementById("confirm-customer-name").textContent = state.customerName;
  document.getElementById("confirm-table-number").textContent = `Mesa ${state.tableNumber}`;

  document.getElementById("confirm-items").innerHTML = lines
    .map(
      (line) => `
      <div class="confirm-item-row">
        <div>
          <span class="name">${line.quantity}x ${escapeHTML(line.product.name)}</span>
          <span class="unit">${formatBRL(line.product.price)} unid.</span>
        </div>
        <span class="total">${formatBRL(line.product.price * line.quantity)}</span>
      </div>`
    )
    .join("");

  document.getElementById("confirm-subtotal").textContent = formatBRL(subtotal);
  document.getElementById("confirm-tip-label").textContent = `Taxa do garçom (10%): ${
    state.includeTip ? "(Inclusa)" : "(Não selecionada)"
  }`;
  document.getElementById("confirm-tip").textContent = formatBRL(tipAmount);
  document.getElementById("confirm-total").textContent = formatBRL(total);

  closeCart();
  document.getElementById("confirm-backdrop").classList.remove("hidden");
  document.getElementById("confirm-modal").classList.remove("hidden");

  clearCart();
  showToast("Pedido finalizado e salvo com sucesso!");
}

function closeConfirmModal() {
  document.getElementById("confirm-backdrop").classList.add("hidden");
  document.getElementById("confirm-modal").classList.add("hidden");
}

/* ---------- Event listeners ---------- */
document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  renderDecorativeImages();

  // header cart
  document.getElementById("cart-toggle").addEventListener("click", openCart);
  document.getElementById("close-cart").addEventListener("click", closeCart);
  document.getElementById("backdrop").addEventListener("click", closeCart);

  // scroll para o cardápio
  const scrollToMenu = () => document.getElementById("cardapio").scrollIntoView({ behavior: "smooth" });
  document.getElementById("scroll-to-menu").addEventListener("click", scrollToMenu);
  document.getElementById("cta-scroll-to-menu").addEventListener("click", scrollToMenu);
  document.getElementById("see-full-menu").addEventListener("click", () => {
    state.selectedCategory = "TODOS";
    renderAll();
    scrollToMenu();
  });

  // busca
  const searchInput = document.getElementById("search-input");
  const clearSearchBtn = document.getElementById("clear-search");
  searchInput.addEventListener("input", (e) => {
    state.searchTerm = e.target.value;
    clearSearchBtn.classList.toggle("hidden", !state.searchTerm);
    renderMenu();
  });
  clearSearchBtn.addEventListener("click", () => {
    state.searchTerm = "";
    searchInput.value = "";
    clearSearchBtn.classList.add("hidden");
    renderMenu();
  });

  // filtro por categoria (delegação de evento)
  document.getElementById("category-filters").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cat]");
    if (!btn) return;
    state.selectedCategory = btn.dataset.cat;
    renderCategoryFilters();
    renderMenu();
  });

  // adicionar produto ao pedido (delegação de evento na grade do cardápio)
  document.getElementById("menu-grid").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    addToCart(Number(btn.dataset.add));
  });

  // controles do carrinho (delegação de evento)
  document.getElementById("cart-items").addEventListener("click", (e) => {
    const inc = e.target.closest("[data-increase]");
    const dec = e.target.closest("[data-decrease]");
    const rem = e.target.closest("[data-remove]");
    if (inc) {
      const item = state.cart.find((i) => i.productId === Number(inc.dataset.increase));
      updateQuantity(item.productId, item.quantity + 1);
    } else if (dec) {
      const item = state.cart.find((i) => i.productId === Number(dec.dataset.decrease));
      updateQuantity(item.productId, item.quantity - 1);
    } else if (rem) {
      removeFromCart(Number(rem.dataset.remove));
    }
  });

  document.getElementById("clear-cart").addEventListener("click", clearCart);

  // dados do cliente
  document.getElementById("customer-name").addEventListener("input", (e) => {
    state.customerName = e.target.value;
    persistCustomer();
  });
  document.getElementById("table-number").addEventListener("input", (e) => {
    state.tableNumber = e.target.value;
    persistCustomer();
  });
  document.getElementById("order-notes").addEventListener("input", (e) => {
    state.notes = e.target.value;
  });

  // 10% do garçom
  document.getElementById("tip-toggle").addEventListener("change", (e) => {
    state.includeTip = e.target.checked;
    renderCart();
  });

  // finalizar pedido
  document.getElementById("checkout-btn").addEventListener("click", handleCheckout);
  document.getElementById("new-order-btn").addEventListener("click", closeConfirmModal);
  document.getElementById("confirm-backdrop").addEventListener("click", closeConfirmModal);
});