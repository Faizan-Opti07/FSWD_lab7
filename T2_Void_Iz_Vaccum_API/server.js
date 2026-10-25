const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "data", "db.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}
function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}
function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}
function validText(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function notFound(res, message = "Resource not found") {
  return res.status(404).json({ error: message });
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Void Iz Vaccum API", persistence: "JSON file" });
});

// PRODUCTS: list, get one, create, update, delete
app.get("/api/products", (req, res) => {
  const db = readDB();
  let products = db.products;
  if (req.query.category) {
    products = products.filter(p => p.category.toLowerCase() === String(req.query.category).toLowerCase());
  }
  if (req.query.search) {
    const q = String(req.query.search).toLowerCase();
    products = products.filter(p => `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(q));
  }
  res.json({ count: products.length, data: products });
});

app.get("/api/products/:id", (req, res) => {
  const product = readDB().products.find(p => p.id === Number(req.params.id));
  if (!product) return notFound(res, "Product not found");
  res.json({ data: product });
});

app.post("/api/products", (req, res) => {
  const { name, description = "", price, category = "General", stock = 0 } = req.body;
  if (!validText(name) || !Number.isFinite(Number(price)) || Number(price) < 0 ||
      !Number.isInteger(Number(stock)) || Number(stock) < 0) {
    return res.status(400).json({ error: "Provide name, non-negative price, and non-negative integer stock." });
  }
  const db = readDB();
  const product = { id: nextId(db.products), name: name.trim(), description: String(description),
    price: Number(price), category: String(category), stock: Number(stock) };
  db.products.push(product);
  writeDB(db);
  res.status(201).json({ message: "Product created", data: product });
});

app.put("/api/products/:id", (req, res) => {
  const db = readDB();
  const product = db.products.find(p => p.id === Number(req.params.id));
  if (!product) return notFound(res, "Product not found");
  const { name, description, price, category, stock } = req.body;
  if (name !== undefined && !validText(name)) return res.status(400).json({ error: "Name cannot be empty." });
  if (price !== undefined && (!Number.isFinite(Number(price)) || Number(price) < 0)) return res.status(400).json({ error: "Price must be non-negative." });
  if (stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) return res.status(400).json({ error: "Stock must be a non-negative integer." });
  if (name !== undefined) product.name = name.trim();
  if (description !== undefined) product.description = String(description);
  if (price !== undefined) product.price = Number(price);
  if (category !== undefined) product.category = String(category);
  if (stock !== undefined) product.stock = Number(stock);
  writeDB(db);
  res.json({ message: "Product updated", data: product });
});

app.delete("/api/products/:id", (req, res) => {
  const db = readDB();
  const index = db.products.findIndex(p => p.id === Number(req.params.id));
  if (index === -1) return notFound(res, "Product not found");
  const [deleted] = db.products.splice(index, 1);
  writeDB(db);
  res.json({ message: "Product deleted", data: deleted });
});

// CART: one simple shared demo cart
app.get("/api/cart", (req, res) => {
  const db = readDB();
  const items = db.cart.map(item => {
    const product = db.products.find(p => p.id === item.productId);
    return product ? { ...item, product, lineTotal: Number((product.price * item.quantity).toFixed(2)) } : null;
  }).filter(Boolean);
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  res.json({ data: items, itemCount: items.reduce((sum, item) => sum + item.quantity, 0), total: Number(total.toFixed(2)) });
});

app.post("/api/cart", (req, res) => {
  const productId = Number(req.body.productId);
  const quantity = Number(req.body.quantity ?? 1);
  if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: "productId and positive integer quantity are required." });
  }
  const db = readDB();
  const product = db.products.find(p => p.id === productId);
  if (!product) return notFound(res, "Product not found");
  const existing = db.cart.find(item => item.productId === productId);
  const requested = (existing ? existing.quantity : 0) + quantity;
  if (requested > product.stock) return res.status(400).json({ error: "Requested quantity exceeds available stock." });
  if (existing) existing.quantity = requested;
  else db.cart.push({ productId, quantity });
  writeDB(db);
  res.status(201).json({ message: "Item added to cart", data: db.cart });
});

app.patch("/api/cart/:productId", (req, res) => {
  const productId = Number(req.params.productId);
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: "Quantity must be a positive integer. Use DELETE to remove an item." });
  const db = readDB();
  const item = db.cart.find(i => i.productId === productId);
  if (!item) return notFound(res, "Cart item not found");
  const product = db.products.find(p => p.id === productId);
  if (!product || quantity > product.stock) return res.status(400).json({ error: "Quantity exceeds available stock." });
  item.quantity = quantity;
  writeDB(db);
  res.json({ message: "Cart quantity updated", data: db.cart });
});

app.delete("/api/cart/:productId", (req, res) => {
  const db = readDB();
  const before = db.cart.length;
  db.cart = db.cart.filter(i => i.productId !== Number(req.params.productId));
  if (db.cart.length === before) return notFound(res, "Cart item not found");
  writeDB(db);
  res.json({ message: "Item removed from cart" });
});

// CHECKOUT / ORDERS: creates a persistent order and reduces stock
app.post("/api/orders", (req, res) => {
  const { customerName, email, address } = req.body;
  if (![customerName, email, address].every(validText) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Valid customerName, email, and address are required." });
  }
  const db = readDB();
  if (!db.cart.length) return res.status(400).json({ error: "Cart is empty." });
  const orderItems = [];
  let total = 0;
  for (const item of db.cart) {
    const product = db.products.find(p => p.id === item.productId);
    if (!product || item.quantity > product.stock) return res.status(400).json({ error: `Insufficient stock for ${product ? product.name : "a product"}.` });
    const lineTotal = Number((product.price * item.quantity).toFixed(2));
    total += lineTotal;
    orderItems.push({ productId: product.id, name: product.name, price: product.price, quantity: item.quantity, lineTotal });
  }
  orderItems.forEach(item => {
    const product = db.products.find(p => p.id === item.productId);
    product.stock -= item.quantity;
  });
  const order = { id: nextId(db.orders), customerName: customerName.trim(), email: email.trim(),
    address: address.trim(), items: orderItems, total: Number(total.toFixed(2)),
    status: "placed", createdAt: new Date().toISOString() };
  db.orders.push(order);
  db.cart = [];
  writeDB(db);
  res.status(201).json({ message: "Order placed", data: order });
});

app.get("/api/orders", (req, res) => {
  const db = readDB();
  res.json({ count: db.orders.length, data: db.orders });
});

app.get("/api/orders/:id", (req, res) => {
  const order = readDB().orders.find(o => o.id === Number(req.params.id));
  if (!order) return notFound(res, "Order not found");
  res.json({ data: order });
});

// REVIEWS: list and create
app.get("/api/reviews", (req, res) => {
  const reviews = readDB().reviews;
  res.json({ count: reviews.length, data: reviews });
});

app.post("/api/reviews", (req, res) => {
  const { customer, rating, comment } = req.body;
  if (!validText(customer) || !validText(comment) || !Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
    return res.status(400).json({ error: "customer, comment, and rating from 1 to 5 are required." });
  }
  const db = readDB();
  const review = { id: nextId(db.reviews), customer: customer.trim(), rating: Number(rating), comment: comment.trim(), createdAt: new Date().toISOString() };
  db.reviews.push(review);
  writeDB(db);
  res.status(201).json({ message: "Review created", data: review });
});

app.use("/api", (req, res) => res.status(404).json({ error: "API endpoint not found" }));
app.listen(PORT, () => console.log(`Void Iz Vaccum API running at http://localhost:${PORT}`));
