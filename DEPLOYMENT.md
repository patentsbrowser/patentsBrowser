# Deploying PatentsBrowser on Render

This guide explains how to deploy PatentsBrowser as a full-stack application on Render.com where the backend Express server serves the frontend React application.

## Prerequisites

1. A Render.com account
2. GitHub repository with your code organized with frontend and backend directories at the root level

## Project Structure

```
/project-root
  /frontend  ← React + Vite
  /backend   ← Express + MongoDB
  render.yaml
```

## Deployment Steps

### Using Blueprint (Recommended)

1. **Prepare your repository**
   - Ensure your repo has the updated `render.yaml` file at the root level
   - Make sure all environment variables are properly configured in your .env files

2. **Deploy using Blueprint**
   - Log in to your Render dashboard
   - Click "New" and select "Blueprint"
   - Connect your GitHub repository
   - Render will detect the `render.yaml` file and configure your full-stack services

3. **Configure Environment Variables**
   - For backend services, you need to manually add the following environment variables on Render:
     - `EMAIL_USER` (for email notifications)
     - `EMAIL_APP_PASSWORD` (app password for email account)
   - All other variables are either generated automatically or pulled from the database connections

4. **Verify Deployments**
   - Check that all services are deployed successfully
   - Test both staging and production environments

### How It Works

When you deploy with this configuration:

1. Render clones your repository
2. It first builds the frontend:
   - Runs `npm install` in the frontend directory
   - Runs `npm run build` to generate the static assets in `/frontend/dist`
3. Then it builds the backend:
   - Runs `npm install` in the backend directory
   - Runs `npm run build:backend` to compile TypeScript
4. It starts the server with the appropriate environment:
   - The Express server serves both the API endpoints and the static frontend assets
   - Frontend routing is handled by serving the index.html for client-side routes

### Manual Deployment (Alternative)

If you prefer to deploy manually:

1. Create new Web Service on Render
2. Select your repository
3. Configure the service:
   - **Name**: patentsbrowser-stage or patentsbrowser-prod
   - **Environment**: Node
   - **Build Command**: `cd frontend && npm install && npm run build && cd ../backend && npm install && npm run build:backend`
   - **Start Command**: For staging: `cd backend && NODE_ENV=stage node -r dotenv/config server.js dotenv_config_path=.env.stage`
   - **Start Command**: For production: `cd backend && NODE_ENV=production node -r dotenv/config server.js dotenv_config_path=.env.production`
4. Add all required environment variables

## Custom Domains

To use custom domains:

1. Go to your service's settings in Render
2. Navigate to the "Custom Domain" section
3. Add your domain and follow Render's instructions to configure DNS

For staging: `stage.patentsbrowser.com`
For production: `patentsbrowser.com` and `www.patentsbrowser.com`

## Troubleshooting

- If you encounter build errors, check the build logs on Render
- For runtime errors, check the logs section of your service
- Verify that all environment variables are correctly set
- Make sure your database connections are working properly
- If you update environment variables, you may need to manually redeploy the service

## Running Locally

To run the full-stack application locally, you need to:

1. Build the frontend:
   ```
   cd frontend
   npm install
   npm run build
   ```

2. Run the backend which will serve the frontend:
   ```
   cd backend
   npm install
   npm run build:backend
   npm start
   ```

Or, for development mode, you can:
1. Run the frontend dev server:
   ```
   cd frontend
   npm install
   npm run dev
   ```

2. Run the backend dev server separately:
   ```
   cd backend
   npm install
   npm run dev
   ```

## Environment-Specific Builds

To run the application locally in different environments:

- Staging: `cd backend && npm run deploy:stage`
- Production: `cd backend && npm run deploy:prod`

## Updating Your Deployment

When you push changes to your repository, Render will automatically redeploy your services. For manual redeployment:

1. Go to the service dashboard
2. Click the "Manual Deploy" button
3. Select "Clear cache and deploy"

## Switching Between Environments

To run the application locally in different environments:

- Staging: `cd backend && npm run deploy:stage`
- Production: `cd backend && npm run deploy:prod` 