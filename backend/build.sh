#!/bin/bash

# Build script for backend staging deployment

echo "Building backend for staging environment..."
NODE_ENV=stage npm run build

echo "Backend build complete. Files ready in the dist/ directory."

echo "To deploy to Render:"
echo "1. Make sure you've committed and pushed your changes to GitHub"
echo "2. Go to your Render dashboard"
echo "3. Deploy from the branch that contains these changes"
echo "4. Ensure the environment variables are set in Render dashboard"

echo "Done!" 