#!/bin/bash

# Build script for staging deployment

echo "Building frontend for staging environment..."
npm run build:stage

echo "Frontend build complete. Files ready in the dist/ directory."

echo "To deploy to Render:"
echo "1. Make sure you've committed and pushed your changes to GitHub"
echo "2. Go to your Render dashboard"
echo "3. Deploy from the branch that contains these changes"

echo "Done!" 