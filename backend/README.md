# Imperfect Form Backend

This directory contains the backend services for the Imperfect Form application, specifically for Farcaster integration.

## Services

1. **Express HTTP Server** (`server.js`):
   - Handles HTTP requests for Farcaster integration
   - Endpoints:
     - `/api/store-signer`: Stores signer data from Farcaster authentication
     - `/api/confirm-cast`: Shares content on Farcaster

2. **Socket.IO Server** (`socketServer.js`):
   - Handles real-time communication for Farcaster integration
   - Events:
     - `store-signer`: Stores signer data
     - `confirm-cast`: Shares content on Farcaster

## Deployment

### Environment Variables

Create a `.env` file with the following variables:

```
NEYNAR_CLIENT_ID=your-neynar-client-id
NEYNAR_API_KEY=your-neynar-api-key
PORT=3000
SOCKET_PORT=4000
```

### Deployment Options

#### Option 1: Deploy to Render.com (Recommended)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the service:
   - Build Command: `npm install`
   - Start Command: `node server.js & node socketServer.js`
4. Add environment variables in the Render dashboard
5. Deploy

#### Option 2: Deploy to Heroku

1. Create a new Heroku app
2. Connect your GitHub repository
3. Add a Procfile with the following content:
   ```
   web: node server.js & node socketServer.js
   ```
4. Add environment variables in the Heroku dashboard
5. Deploy

#### Option 3: Deploy to a VPS

1. SSH into your VPS
2. Clone your repository
3. Install dependencies: `npm install`
4. Set up environment variables
5. Use PM2 to manage the processes:
   ```
   pm2 start server.js
   pm2 start socketServer.js
   ```

## Updating the Frontend

After deploying the backend, update the frontend environment variables:

1. In the Next.js app, update `.env` with:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   NEXT_PUBLIC_SOCKET_URL=https://your-backend-url.com
   ```

2. Deploy the Next.js app to Vercel
