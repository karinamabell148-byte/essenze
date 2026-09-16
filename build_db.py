import sqlite3, json, os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "casa_aurora.sqlite")
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

conn = sqlite3.connect(DB_PATH)
conn.execute("PRAGMA foreign_keys = ON;")
cur = conn.cursor()

# ---------- Esquema ----------
cur.executescript("""
CREATE TABLE categories (
    id    TEXT PRIMARY KEY,          -- ex: 'ENTRADAS'
    label TEXT NOT NULL              -- ex: 'Entradas'
);

CREATE TABLE products (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    price       REAL NOT NULL CHECK (price >= 0),
    category_id TEXT NOT NULL REFERENCES categories(id),
    badge       TEXT,
    image       TEXT
);

CREATE TABLE orders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number    TEXT NOT NULL UNIQUE,
    customer_name   TEXT NOT NULL,
    table_number    TEXT NOT NULL,
    subtotal        REAL NOT NULL,
    tip_included    INTEGER NOT NULL DEFAULT 0,   -- 0/1
    tip_amount      REAL NOT NULL DEFAULT 0,
    total           REAL NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE order_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,      -- snapshot do nome (histórico não muda se o produto mudar depois)
    unit_price  REAL NOT NULL,       -- snapshot do preço no momento do pedido
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    line_total  REAL NOT NULL
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
""")

# ---------- Categorias (mesmas do script.js) ----------
categories = [
    ("ENTRADAS", "Entradas"),
    ("PRATO PRINCIPAL", "Prato Principal"),
    ("SOBREMESAS", "Sobremesas"),
    ("BEBIDAS", "Bebidas"),
    ("CARTA DE VINHOS", "Carta de Vinhos"),
]
cur.executemany("INSERT INTO categories (id, label) VALUES (?, ?)", categories)

# ---------- Produtos ----------
with open("/home/claude/products.json", encoding="utf-8") as f:
    products = json.load(f)

valid_categories = {c[0] for c in categories}
for p in products:
    if p["category"] not in valid_categories:
        raise ValueError(f"Categoria desconhecida: {p['category']} (produto {p['id']})")

cur.executemany(
    """INSERT INTO products (id, name, description, price, category_id, badge, image)
       VALUES (:id, :name, :description, :price, :category, :badge, :image)""",
    products,
)

conn.commit()

# ---------- Conferência ----------
cur.execute("SELECT category_id, COUNT(*) FROM products GROUP BY category_id")
print("Produtos por categoria:", cur.fetchall())
cur.execute("SELECT COUNT(*) FROM products")
print("Total de produtos:", cur.fetchone()[0])

conn.close()
print("Banco criado em:", DB_PATH)
