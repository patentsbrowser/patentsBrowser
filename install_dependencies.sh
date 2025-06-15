#!/bin/bash

echo "🚀 Installing required dependencies for trial system..."

# Navigate to backend directory
cd backend

# Install node-cron for scheduling
echo "📦 Installing node-cron..."
npm install node-cron
npm install --save-dev @types/node-cron

echo "✅ Dependencies installed successfully!"

# Navigate back to root
cd ..

echo "🎉 All dependencies installed!"
echo ""
echo "📋 Installed packages:"
echo "  - node-cron: For scheduling trial expiry checks"
echo "  - @types/node-cron: TypeScript types for node-cron"
echo ""
echo "🔧 Next steps:"
echo "  1. Import plans JSON to database"
echo "  2. Start backend server"
echo "  3. Test trial system"
