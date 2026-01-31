require("dotenv").config()
const { execSync } = require("child_process")

console.log("Starting Medusa database migration...")
console.log("Database URL:", process.env.DATABASE_URL ? "✓ Set" : "✗ Not set")

try {
  // Run migration with a timeout
  execSync("node ../packages/cli/medusa-cli/cli.js db:migrate --skip-links", {
    stdio: "inherit",
    timeout: 300000, // 5 minutes
    cwd: __dirname,
  })
  console.log("\n✓ Migrations completed successfully!")
} catch (error) {
  if (error.killed) {
    console.error("\n✗ Migration timed out after 5 minutes")
  } else {
    console.error("\n✗ Migration failed:", error.message)
  }
  process.exit(1)
}
