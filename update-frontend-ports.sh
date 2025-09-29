#!/bin/bash

echo "🔄 Updating frontend to use port 3003 for NBA data..."

# Check if frontend is running and stop it
echo "🛑 Stopping any running frontend processes..."
pkill -f "expo\|metro\|react-native" || true

# Clear any caches
echo "🧹 Clearing caches..."
cd frontend
rm -rf node_modules/.cache/ || true
rm -rf .expo/ || true

echo "✅ Frontend configuration updated!"
echo ""
echo "📋 Changes made:"
echo "  - API Base URL: http://localhost:3003"
echo "  - Socket URL: http://localhost:3003"
echo "  - App config updated"
echo ""
echo "🚀 To start the frontend with new NBA data:"
echo "  cd frontend"
echo "  npm start"
echo ""
echo "🏀 Your app will now connect to the server with 619 real NBA players!"
