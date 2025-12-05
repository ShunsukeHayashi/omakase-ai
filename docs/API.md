# Omakase AI API Documentation

## Base URL

```
http://localhost:3000
```

## Authentication

Currently no authentication required for API endpoints.

---

## Health Check

### GET /api/health

Check server status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-05T08:30:00.000Z"
}
```

---

## Products API

### GET /api/products

Get all products.

**Response:**
```json
{
  "success": true,
  "count": 3,
  "products": [
    {
      "id": "uuid",
      "name": "Product Name",
      "description": "Description",
      "price": 2500,
      "imageUrl": "https://...",
      "productUrl": "https://...",
      "isActive": true,
      "stockQuantity": 10,
      "lowStockThreshold": 5
    }
  ]
}
```

### GET /api/products/:id

Get single product by ID.

### POST /api/products

Create new product.

**Request Body:**
```json
{
  "name": "Product Name",
  "description": "Description",
  "price": 2500,
  "imageUrl": "https://...",
  "productUrl": "https://...",
  "isActive": true,
  "stockQuantity": 10,
  "lowStockThreshold": 5
}
```

### PUT /api/products/:id

Update product.

### DELETE /api/products/:id

Delete product.

### POST /api/products/bulk

Bulk create products.

**Request Body:**
```json
{
  "products": [
    { "name": "...", "description": "...", "price": 1000 }
  ]
}
```

### GET /api/products/search/:query

Search products by name or description.

---

## Stock Management API

### GET /api/products/:id/stock

Get stock status for a product.

**Response:**
```json
{
  "success": true,
  "inStock": true,
  "quantity": 10,
  "isLowStock": false,
  "message": "In stock (10 units)"
}
```

### PUT /api/products/:id/stock

Update stock quantity.

**Request Body:**
```json
{
  "quantity": 20
}
```

### POST /api/products/:id/stock/decrement

Decrease stock (for purchases).

**Request Body:**
```json
{
  "amount": 1
}
```

### POST /api/products/:id/stock/increment

Increase stock (for restocking).

**Request Body:**
```json
{
  "amount": 10
}
```

### GET /api/products/inventory/low-stock

Get products with low stock.

### GET /api/products/inventory/out-of-stock

Get out-of-stock products.

---

## Agents API

### GET /api/agents

Get all available agent configurations.

**Response:**
```json
{
  "success": true,
  "agents": [
    {
      "id": "shopping-guide",
      "name": "Shopping Guide",
      "description": "...",
      "defaultConfig": { ... }
    }
  ]
}
```

### GET /api/agents/:type

Get specific agent configuration.

---

## Knowledge Base API

### GET /api/knowledge/faqs

Get all FAQ items.

### POST /api/knowledge/faqs

Add FAQ item.

**Request Body:**
```json
{
  "question": "How do I...?",
  "answer": "You can...",
  "category": "General"
}
```

### GET /api/knowledge/search?q=query

Search FAQs.

### GET /api/knowledge/store-info

Get store information.

---

## WebSocket Voice API

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/voice');
```

### Messages

#### Start Voice Session

```json
{
  "type": "start_voice",
  "config": {
    "name": "Agent Name",
    "personality": "Friendly...",
    "language": "Japanese",
    "voice": "Yuumi (Japanese Female)",
    "voiceOn": true,
    "speechSpeed": 1.0,
    "startMessage": "Welcome...",
    "endMessage": "Thank you..."
  }
}
```

#### Audio Data

```json
{
  "type": "audio_data",
  "audio": "base64-encoded-audio"
}
```

#### Stop Voice

```json
{
  "type": "stop_voice"
}
```

---

## Voice Tools (Function Calling)

Available tools for voice agents:

| Tool | Description |
|------|-------------|
| `search_products` | Search products by keyword |
| `get_product_details` | Get product details by ID |
| `add_to_cart` | Add product to cart |
| `get_cart` | Get current cart contents |
| `remove_from_cart` | Remove item from cart |
| `update_cart_quantity` | Update item quantity |
| `check_stock` | Check product stock status |
| `clear_cart` | Empty the cart |
| `place_order` | Place order from cart |
| `get_order_status` | Check order status |
| `search_faq` | Search FAQ database |
| `get_store_info` | Get store information |
| `get_recommendations` | Get product recommendations |

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Server Error
