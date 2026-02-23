# Quick Start - Production Deployment Guide
## TRK Project Real-Time Features

### ✅ Pre-Deployment Verification Complete

All real-time features have been tested and verified. Use this guide for production deployment.

---

## 1. Backend Deployment

### Environment Variables (.env)
```bash
# Server Configuration
PORT=5000
NODE_ENV=production

# Frontend CORS
FRONTEND_URL=https://your-production-domain.com

# Security
JWT_ACCESS_SECRET=<generate-secure-secret>
JWT_REFRESH_SECRET=<generate-secure-secret>

# Database
MONGODB_URI=<production-mongodb-url>

# Blockchain
BSC_RPC_URL=https://bsc-dataseed.binance.org/
GAME_CONTRACT_ADDRESS=0xD03507EE1A28A5CA433D790E5F1a82848316BBd5

# Features
REAL_MONEY_GAMES_ENABLED=true
```

### Start Command
```bash
cd backend
npm install
npm start
```

**Expected Output:**
```
🔌 Attempting to connect to MongoDB...
[INFO] 🚀 Server running on port 5000
[INFO] 📝 Environment: production
[INFO] 🎮 Real Money Games: ENABLED ✅
✅ MongoDB Connected
```

---

## 2. Frontend Deployment

### Environment Variables (.env.local / Vercel Env)
```bash
NEXT_PUBLIC_API_URL=https://trk-backend.onrender.com
NEXT_PUBLIC_SOCKET_URL=https://trk-backend.onrender.com
```

### Vercel Deployment
```bash
vercel --prod
```

---

## 3. Real-Time Features Checklist

### ✅ Live Activity Feed
- **Event:** `live_activity`
- **Components:** TransactionFeed.tsx, CyberneticTerminal.tsx
- **Status:** Production Ready

### ✅ Balance Updates
- **Events:** `balance_update`, `platform:turnover_update`
- **Triggers:** Deposits, withdrawals, income distribution
- **Status:** Production Ready

### ✅ Jackpot System
- **Events:** 
  - `jackpot:ticket_sold`
  - `jackpot:status_update`
  - `jackpot:draw_complete`
  - `jackpot:winner_announced`
  - `jackpot:new_round`
- **Current Round:** Round 2 (10,000 tickets, $70,000 prize pool)
- **Status:** Production Ready

### ✅ Referral Updates
- **Events:** `referral_status_change`, `referral_activity`
- **Features:** Online/offline tracking, instant commission notifications
- **Status:** Production Ready

---

## 4. Monitoring After Launch

### Critical Metrics
- Socket.IO connections count
- Event delivery latency (<100ms expected)
- MongoDB connection stability
- Error logs for failed emissions

### Health Check
```bash
curl https://your-backend-domain.com/api/health
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "TRK Backend API is running with WebSockets",
  "timestamp": "2026-02-17T..."
}
```

---

## 5. Testing in Production

### Socket.IO Connection Test
```javascript
// Run in browser console on your frontend
const socket = io('https://your-backend-domain.com');
socket.on('connect', () => console.log('✅ Connected'));
socket.on('live_activity', (data) => console.log('Event:', data));
```

---

## 6. Scaling (When Needed)

### Redis Adapter for Clustering
```bash
npm install @socket.io/redis-adapter redis
```

```javascript
// In server.js
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

---

## 7. Security Checklist

- [x] CORS configured for production domain only
- [x] JWT authentication with secure secrets
- [x] Balance updates sent to user-specific rooms
- [x] No sensitive data in global broadcasts
- [x] Rate limiting enabled (200 req/15min)
- [x] HTTPS enforcement in production
- [x] Helmet security headers configured

---

## 8. Known Issues: NONE ✅

All tests passed with zero critical issues.

---

## Support

**Test Report:** See `walkthrough.md` for detailed test results  
**Test Script:** `backend/test_realtime_features.js`  

**If issues arise:**
1. Check MongoDB connection
2. Verify environment variables
3. Check CORS settings match frontend URL
4. Review server logs for Socket.IO errors

---

**Deployment Status:** 🚀 **READY FOR PRODUCTION**
