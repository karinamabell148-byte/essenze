const path = require("path");
const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve o front-end estático (index.html, style.css, script.js, products.js)
app.use(express.static(__dirname));

/* ---------- GET /api/products ---------- */
/* Devolve o cardápio direto do banco (fonte única de verdade). */
app.get("/api/products", (req, res) => {
  const products = db
    .prepare(
      `SELECT id, name, description, price, category_id AS category, badge, image
       FROM products
       ORDER BY category_id, id`
    )
    .all();
  res.json(products);
});

/* ---------- POST /api/orders ---------- */
/* Recebe o pedido finalizado no front e grava em orders + order_items. */
app.post("/api/orders", (req, res) => {
  const { orderNumber, customerName, tableNumber, includeTip, items } = req.body || {};

  if (!orderNumber || typeof orderNumber !== "string") {
    return res.status(400).json({ error: "orderNumber é obrigatório." });
  }
  if (!customerName || !customerName.trim()) {
    return res.status(400).json({ error: "customerName é obrigatório." });
  }
  if (!tableNumber || !String(tableNumber).trim()) {
    return res.status(400).json({ error: "tableNumber é obrigatório." });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "O pedido precisa ter ao menos um item." });
  }

  // Busca os produtos citados no pedido — nunca confia no preço vindo do cliente.
  const ids = items.map((it) => Number(it.productId));
  if (ids.some((id) => !Number.isInteger(id))) {
    return res.status(400).json({ error: "productId inválido em algum item." });
  }

  const placeholders = ids.map(() => "?").join(",");
  const dbProducts = db
    .prepare(`SELECT id, name, price FROM products WHERE id IN (${placeholders})`)
    .all(...ids);
  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  const lines = [];
  for (const it of items) {
    const pid = Number(it.productId);
    const qty = Number(it.quantity);
    const product = productMap.get(pid);
    if (!product) {
      return res.status(400).json({ error: `Produto ${pid} não existe.` });
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: `Quantidade inválida para o produto ${pid}.` });
    }
    lines.push({
      product_id: product.id,
      product_name: product.name,
      unit_price: product.price,
      quantity: qty,
      line_total: Math.round(product.price * qty * 100) / 100,
    });
  }

  const subtotal = Math.round(lines.reduce((acc, l) => acc + l.line_total, 0) * 100) / 100;
  const tipIncluded = Boolean(includeTip);
  const tipAmount = tipIncluded ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
  const total = Math.round((subtotal + tipAmount) * 100) / 100;

  const insertOrder = db.prepare(
    `INSERT INTO orders (order_number, customer_name, table_number, subtotal, tip_included, tip_amount, total)
     VALUES (@order_number, @customer_name, @table_number, @subtotal, @tip_included, @tip_amount, @total)`
  );
  const insertItem = db.prepare(
    `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
     VALUES (@order_id, @product_id, @product_name, @unit_price, @quantity, @line_total)`
  );

  const createOrder = db.transaction(() => {
    const info = insertOrder.run({
      order_number: orderNumber,
      customer_name: customerName.trim(),
      table_number: String(tableNumber).trim(),
      subtotal,
      tip_included: tipIncluded ? 1 : 0,
      tip_amount: tipAmount,
      total,
    });
    const orderId = info.lastInsertRowid;
    for (const line of lines) {
      insertItem.run({ order_id: orderId, ...line });
    }
    return orderId;
  });

  try {
    const orderId = createOrder();
    res.status(201).json({
      id: orderId,
      orderNumber,
      subtotal,
      tipAmount,
      total,
    });
  } catch (err) {
    if (String(err.message).includes("UNIQUE constraint failed")) {
      return res.status(409).json({ error: "Esse número de pedido já existe." });
    }
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar o pedido." });
  }
});

/* ---------- GET /api/orders ---------- */
/* Lista pedidos salvos — útil para conferência/administração. */
app.get("/api/orders", (req, res) => {
  const orders = db
    .prepare(`SELECT * FROM orders ORDER BY id DESC LIMIT 100`)
    .all();
  const itemsStmt = db.prepare(`SELECT * FROM order_items WHERE order_id = ?`);
  const withItems = orders.map((o) => ({ ...o, items: itemsStmt.all(o.id) }));
  res.json(withItems);
});

app.listen(PORT, () => {
  console.log(`Casa Aurora rodando em http://localhost:${PORT}`);
});
