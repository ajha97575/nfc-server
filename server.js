const express = require("express")
const cors = require("cors")
const path = require("path")
require("dotenv").config()

// Import database connection
const connectDB = require("./config/database")

// Import controllers
const productController = require("./controllers/productController")
const orderController = require("./controllers/orderController")
const authController = require("./controllers/authController")

// Import middleware
const { authenticateAdmin } = require("./middleware/authMiddleware")

const paymentRoutes = require("./routes/payment")

// Import Product model for seeding
const Product = require("./models/Product")

const app = express()
const PORT = process.env.PORT || 5000

// Connect to MongoDB
connectDB()

// Middleware
app.use(cors())
app.use(express.json())

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// Root route - IMPORTANT for Vercel
app.get("/", (req, res) => {
  res.json({
    message: "🚀 Tip Tap Pay Backend API is running!",
    status: "OK",
    endpoints: {
      health: "/api/health",
      products: "/api/products",
      orders: "/api/orders",
      auth: "/api/auth",
      payment: "/api/payment", // Added payment endpoint
    },
    timestamp: new Date().toISOString(),
  })
})

// Authentication routes (public)
app.post("/api/auth/login", authController.loginAdmin)
app.post("/api/auth/verify", authController.verifyToken)
app.post("/api/auth/create-admin", authController.createAdmin)
app.post("/api/auth/logout", authController.logoutAdmin)

app.use("/api/payment", paymentRoutes)

// Product routes - PUBLIC routes for viewing products
app.get("/api/products", productController.getAllProducts) // Removed authenticateAdmin - now public
app.get("/api/product/:id", productController.getProductById) // Removed authenticateAdmin - now public

// Product routes - ADMIN ONLY routes for managing products
app.post("/api/products", authenticateAdmin, productController.addProduct)
app.put("/api/product/:id/stock", authenticateAdmin, productController.updateProductStock)
app.delete("/api/product/:id", authenticateAdmin, productController.deleteProduct)

app.post("/api/product/validate-stock", productController.validateStockForCart)
app.post("/api/products/validate-bulk-stock", productController.validateBulkStock)
app.post("/api/products/deduct-stock", productController.deductStock)
app.post("/api/products/restore-stock", productController.restoreStock)

// Order routes (protected for admin operations)
app.post("/api/orders", orderController.createOrder)
app.get("/api/order/:id", authenticateAdmin, orderController.getOrderById)
app.get("/api/orders", authenticateAdmin, orderController.getAllOrders)
app.put("/api/order/:id/status", authenticateAdmin, orderController.updateOrderStatus)

app.post("/api/orders/with-stock-validation", orderController.createOrderWithStockValidation)
app.put("/api/order/:id/cancel", authenticateAdmin, orderController.cancelOrderAndRestoreStock)

// Simple seed endpoint - runs the seed script (protected)
app.post("/api/seed", authenticateAdmin, async (req, res) => {
  try {
    // Clear existing products
    await Product.deleteMany({})

    res.json({
      message: "Database cleared successfully. Please run the seed script manually to add products.",
      instruction: "Run: node server/scripts/seed-database.js",
    })
  } catch (error) {
    console.error("Seeding error:", error)
    res.status(500).json({ error: "Failed to clear database" })
  }
})

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is running with MongoDB",
    database: "MongoDB",
    timestamp: new Date().toISOString(),
  })
})

// Test database connection endpoint
app.get("/api/db-status", async (req, res) => {
  const mongoose = require("mongoose")
  res.json({
    database: "MongoDB",
    status: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    host: mongoose.connection.host,
    name: mongoose.connection.name,
  })
})

// Get product count by category (protected)
app.get("/api/stats", authenticateAdmin, async (req, res) => {
  try {
    const products = await Product.find({})
    const categories = {}

    products.forEach((product) => {
      if (categories[product.category]) {
        categories[product.category]++
      } else {
        categories[product.category] = 1
      }
    })

    res.json({
      totalProducts: products.length,
      categories: categories,
      message: "Database statistics",
    })
  } catch (error) {
    res.status(500).json({ error: "Failed to get stats" })
  }
})

app.use("*", (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`)
  res.status(404).json({
    error: "Route not found",
    message: `The route ${req.originalUrl} does not exist`,
    method: req.method,
    availableRoutes: [
      "GET /",
      "GET /api/health",
      "POST /api/auth/login",
      "GET /api/products",
      "GET /api/product/:id",
      "POST /api/orders",
      "POST /api/products/validate-bulk-stock",
      "POST /api/product/validate-stock",
      "POST /api/payment", // Added payment endpoint
    ],
  })
})

// Error handler
app.use((error, req, res, next) => {
  console.error("Server Error:", error)
  res.status(500).json({
    error: "Internal Server Error",
    message: error.message,
  })
})

// Export for Vercel
module.exports = app

// Start server (for local development)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    console.log(`Database: MongoDB`)
    console.log(`API endpoints available at http://localhost:${PORT}/api/`)
  })
}
