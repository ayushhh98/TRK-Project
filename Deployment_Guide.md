# TRK Project Deployment Guide

To successfully deploy the TRK High-Fidelity Gaming Ecosystem, follow these configuration steps for your Frontend (Vercel) and Backend.

## 1. Frontend Configuration (Vercel)

1. Log in to [Vercel](https://vercel.com) and select your **TRK-Project**.
2. Navigate to the **Settings** tab at the top.
3. Select **Environment Variables** from the left-hand menu.
4. Add the following key-value pairs:

| Variable | Description | Recommended Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | The URL of your hosted backend. | `https://trk-backend.onrender.com/api` |
| `NEXT_PUBLIC_USE_MOCK` | Disable mock data for production. | `false` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Your WalletConnect Project ID. | `08d2e2afd590bbda2cea0158427bbc39` |

5. **CRITICAL**: After adding these, you must trigger a **Redeploy** (Deployments -> Latest Deployment -> Redeploy) for the changes to take effect.

## 2. Backend Configuration

Ensure your `.env` file on the server (or hosting provider) includes:

| Variable | Description | Value |
| :--- | :--- | :--- |
| `FRONTEND_URL` | Your production frontend URL. | `https://trk-project.vercel.app` |
| `NODE_ENV` | Set to production. | `production` |
| `JWT_SECRET` | Secure string for token signing. | `(Generate a random string)` |
| `MONGODB_URI` | Your MongoDB connection string. | `(Your Mongo Atlas URI)` |

## 3. CORS Troubleshooting

The backend is now configured with **Flexible CORS**:
- It will automatically allow requests from `https://trk-project.vercel.app`.
- It will allow all Vercel Preview deployments (ending in `.vercel.app`).
- If you use a custom domain, add it to `allowedOrigins` in `backend/src/server.js`.

## 4. Launch Sequence

1. **Deploy Backend**: Ensure it's reachable and the database is connected.
2. **Deploy Frontend**: Connect to the same Git repository.
## 5. Troubleshooting "Uplink Failed"

If you see an "Uplink Failed" error when logging in:
- **Check the Toast Message**: I've updated the code to show the *exact* reason in the pop-up (e.g., "User not found" or "API request failed").
- **Trailing Spaces**: Ensure there are no spaces after your URL in the Vercel dashboard. I've added code to automatically trim them, but it's best to be precise.
- **Backend Logs**: Check your Render or hosting provider logs for any `500` errors or database connection failures.
