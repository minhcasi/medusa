const express = require("express")
const app = express()
const PORT = 8080

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Medusa API Server</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    h1 { color: #1a1a1a; }
    .endpoint { background: #f5f5f5; padding: 20px; margin: 15px 0; border-radius: 8px; }
    .method { display: inline-block; background: #4CAF50; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
    code { background: #e8e8e8; padding: 3px 8px; border-radius: 4px; font-family: monospace; }
    a { color: #2196F3; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>🛍️ Medusa Commerce Platform - Dev Server</h1>
  <p>Welcome to your local Medusa development instance!</p>
  
  <h2>API Endpoints</h2>
  
  <div class="endpoint">
    <span class="method">GET</span> <code>/health</code>
    <p>Server health check - <a href="http://localhost:9000/health" target="_blank">Test it</a></p>
  </div>
  
  <div class="endpoint">
    <span class="method">GET</span> <code>/admin/*</code>
    <p>Admin API - Manage your store<br>
    Example: <a href="http://localhost:9000/admin/products" target="_blank">/admin/products</a> (requires auth)</p>
  </div>
  
  <div class="endpoint">
    <span class="method">GET</span> <code>/store/*</code>
    <p>Store API - Customer-facing endpoints<br>
    Example: <a href="http://localhost:9000/store/products" target="_blank">/store/products</a> (requires publishable key)</p>
  </div>
  
  <h2>Resources</h2>
  <ul>
    <li><a href="https://docs.medusajs.com/learn" target="_blank">Documentation</a></li>
    <li><a href="https://docs.medusajs.com/api/admin" target="_blank">Admin API Reference</a></li>
    <li><a href="https://docs.medusajs.com/api/store" target="_blank">Store API Reference</a></li>
  </ul>
  
  <p style="color: #666; font-size: 14px;">
    Running from <code>/Users/minh/Documents/GitHub/medusa</code><br>
    Backend server: <code>http://localhost:9000</code>
  </p>
</body>
</html>
  `)
})

app.listen(PORT, () => {
  console.log(`\n✅ Landing page server running at http://localhost:${PORT}`)
  console.log(`📡 Medusa API server should be at http://localhost:9000\n`)
})
