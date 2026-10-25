# Void Iz Vaccum — E-commerce REST API

A coursework project using **Node.js + Express** with persistent JSON-file storage. The storefront is served from `public/index.html`. There is no frontend JavaScript; the API endpoints are tested using a browser, curl, Postman, or Thunder Client.

## Requirements
- Node.js 18 or newer
- npm
- Internet for installing Express and loading Bootstrap/remote images

## Run the project
Open a terminal in this folder and run:

```bash
npm install
npm start
```

Open `http://localhost:3000` for the storefront and `http://localhost:3000/api/health` to check the API.

Data is saved to `data/db.json`, so products, cart items, orders, and reviews remain after restarting the server. Back up this file before resetting demo data.

## API endpoints

Base URL: `http://localhost:3000`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check API status |
| GET | `/api/products` | List products |
| GET | `/api/products?category=Outerwear` | Filter by category |
| GET | `/api/products?search=tee` | Search products |
| GET | `/api/products/:id` | Get one product |
| POST | `/api/products` | Add a product |
| PUT | `/api/products/:id` | Update a product |
| DELETE | `/api/products/:id` | Delete a product |
| GET | `/api/cart` | View cart and total |
| POST | `/api/cart` | Add product to cart |
| PATCH | `/api/cart/:productId` | Change item quantity |
| DELETE | `/api/cart/:productId` | Remove item from cart |
| POST | `/api/orders` | Checkout and create order |
| GET | `/api/orders` | List orders |
| GET | `/api/orders/:id` | Get one order |
| GET | `/api/reviews` | List reviews |
| POST | `/api/reviews` | Add a review |

## Example requests

### Add product
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"VOID Hoodie","description":"Oversized hoodie","price":65,"category":"Hoodies","stock":8}'
```

### Add product ID 1 to cart
```bash
curl -X POST http://localhost:3000/api/cart \
  -H "Content-Type: application/json" \
  -d '{"productId":1,"quantity":2}'
```

### View cart
```bash
curl http://localhost:3000/api/cart
```

### Place an order
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Demo Customer","email":"demo@example.com","address":"Attock, Pakistan"}'
```

### Add a review
```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "Content-Type: application/json" \
  -d '{"customer":"Demo Customer","rating":5,"comment":"Great quality and fit."}'
```

## Notes for lab demonstration
- This is a simple educational API. The cart is shared between requests (not user-specific).
- The JSON file is persistent local storage, not a production database.
- There is no authentication/payment integration. Do not use real customer or payment information.
- Product, cart, order and review APIs return JSON.
