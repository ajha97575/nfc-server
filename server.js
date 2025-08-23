const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Import database connection
const connectDB = require("./config/database");

// Import controllers
const productController = require("./controllers/productController");
const orderController = require("./controllers/orderController");

// Import Product model for seeding
const Product = require("./models/Product");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Root route - IMPORTANT for Vercel
app.get("/", (req, res) => {
  res.json({
    message: "🚀 Tip Tap Pay Backend API is running!",
    status: "OK",
    endpoints: {
      health: "/api/health",
      products: "/api/products",
      orders: "/api/orders",
    },
    timestamp: new Date().toISOString(),
  });
});

// API Routes

// Product routes
app.get("/api/products", productController.getAllProducts);
app.get("/api/product/:id", productController.getProductById);
app.post("/api/products", productController.addProduct);
app.put("/api/product/:id/stock", productController.updateProductStock);
app.delete("/api/product/:id", productController.deleteProduct);

app.post("/api/product/validate-stock", productController.validateStockForCart);
app.post(
  "/api/products/validate-bulk-stock",
  productController.validateBulkStock
);
app.post("/api/products/deduct-stock", productController.deductStock);
app.post("/api/products/restore-stock", productController.restoreStock);

// Order routes
app.post("/api/orders", orderController.createOrder);
app.get("/api/order/:id", orderController.getOrderById);
app.get("/api/orders", orderController.getAllOrders);
app.put("/api/order/:id/status", orderController.updateOrderStatus);

app.post(
  "/api/orders/with-stock-validation",
  orderController.createOrderWithStockValidation
);
app.put("/api/order/:id/cancel", orderController.cancelOrderAndRestoreStock);

// Simple seed endpoint - runs the seed script
app.post("/api/seed", async (req, res) => {
  try {
    // Clear existing products
    await Product.deleteMany({});

    res.json({
      message:
        "Database cleared successfully. Please run the seed script manually to add products.",
      instruction: "Run: node server/scripts/seed-database.js",
    });
  } catch (error) {
    console.error("Seeding error:", error);
    res.status(500).json({ error: "Failed to clear database" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is running with MongoDB",
    database: "MongoDB",
    timestamp: new Date().toISOString(),
  });
});

// Test database connection endpoint
app.get("/api/db-status", async (req, res) => {
  const mongoose = require("mongoose");
  res.json({
    database: "MongoDB",
    status: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    host: mongoose.connection.host,
    name: mongoose.connection.name,
  });
});

// Get product count by category
app.get("/api/stats", async (req, res) => {
  try {
    const products = await Product.find({});
    const categories = {};

    products.forEach((product) => {
      if (categories[product.category]) {
        categories[product.category]++;
      } else {
        categories[product.category] = 1;
      }
    });

    res.json({
      totalProducts: products.length,
      categories: categories,
      message: "Database statistics",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get stats" });
  }
});

app.use("*", (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: "Route not found",
    message: `The route ${req.originalUrl} does not exist`,
    method: req.method,
    availableRoutes: [
      "GET /",
      "GET /api/health",
      "GET /api/products",
      "GET /api/product/:id",
      "POST /api/orders",
      "POST /api/products/validate-bulk-stock",
      "POST /api/product/validate-stock",
    ],
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error("Server Error:", error);
  res.status(500).json({
    error: "Internal Server Error",
    message: error.message,
  });
});

// Export for Vercel

module.exports = app;

// Start server (for local development)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database: MongoDB`);
    console.log(`API endpoints available at http://localhost:${PORT}/api/`);
  });
}
