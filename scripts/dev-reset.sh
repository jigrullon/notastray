#!/bin/bash

echo "🔄 Resetting Next.js development environment..."

# Stop any running Next.js processes
echo "Stopping Next.js processes..."
pkill -f "next dev" || true

# Clean Next.js cache
echo "Cleaning .next directory..."
rm -rf .next

# Clean node modules cache
echo "Cleaning node_modules cache..."
rm -rf node_modules/.cache

# Clean npm cache (optional)
echo "Cleaning npm cache..."
npm cache clean --force

echo "✅ Reset complete! You can now run 'npm run dev' again."
echo ""
echo "💡 Tips to avoid chunk loading errors:"
echo "   - Use 'npm run dev' (with Turbo) for better performance"
echo "   - If errors persist, try 'npm run dev:legacy'"
echo "   - Restart the dev server if you see chunk errors"