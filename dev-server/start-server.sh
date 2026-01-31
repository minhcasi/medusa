#!/bin/bash

echo "========================================"
echo "Starting Medusa Dev Server"
echo "========================================"
echo ""
echo "Database: $(node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@'))")"
echo ""
echo "Starting on port 9000..."
echo "Admin will be available at: http://localhost:9000/app"
echo ""

node ../packages/cli/medusa-cli/cli.js develop --port 9000
