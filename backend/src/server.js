const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Ensure we load the backend-specific .env regardless of CWD
const backendEnvPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(backendEnvPath)) {
    require('dotenv').config({ path: backendEnvPath });
} else {
    require('dotenv').config();
}

const connectDB = require('./config/db');
const User = require('./models/User');
const { startObserver } = require('./services/observer');
const { startCronJobs } = require('./services/cron');
const { logger } = require('./utils/logger');
const system = require('./config/system');

// Connect to Database
connectDB();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const gameRoutes = require('./routes/game');
const gameSecureRoutes = require('./routes/gameSecure');
const referralRoutes = require('./routes/referral');
const depositRoutes = require('./routes/deposit');
const incomeRoutes = require('./routes/income');
const cashbackRoutes = require('./routes/cashback');
const roiOnRoiRoutes = require('./routes/roiOnRoi');
const clubRoutes = require('./routes/club');
const luckyDrawRoutes = require('./routes/luckyDraw');
const adminRoutes = require('./routes/admin');
const auditRoutes = require('./routes/audit');
const contentRoutes = require('./routes/content');
const notificationRoutes = require('./routes/notifications');
const economyRoutes = require('./routes/economy');
const gameGovernanceRoutes = require('./routes/gameGovernance');

const app = express();
const server = http.createServer(app);

// Trust proxy for Render/Vercel (needed for rate limiting)
app.set('trust proxy', 1);

const io = socketIo(server, {
    cors: {
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            if (process.env.NODE_ENV !== 'production') return callback(null, true);
            const isAllowed = [
                process.env.FRONTEND_URL,
                'https://trk-project.vercel.app',
                'https://trk-project.onrender.com',
                'https://trk-game.com'
            ].indexOf(origin) !== -1 || (process.env.NODE_ENV !== 'production' && (origin.startsWith('http://localhost') || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')));

            if (isAllowed) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Attach io to app for use in routes/services
app.set('io', io);

// CORS configuration
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'https://trk-project.vercel.app'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV !== 'production') return callback(null, true);

        const isAllowed = [
            process.env.FRONTEND_URL,
            'https://trk-project.vercel.app',
            'https://trk-project.onrender.com',
            'https://trk-game.com'
        ].indexOf(origin) !== -1 || (process.env.NODE_ENV !== 'production' && (origin.startsWith('http://localhost') || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')));

        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-request-id"]
};

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https:", "wss:", "ws:"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    frameguard: {
        action: 'deny'
    }
}));

app.use(cors(corsOptions));

// HTTPS Enforcement Middleware (for Production)
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
});

// Rate limiting (production only)
if (process.env.NODE_ENV === 'production') {
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 200, // Increased for general API to avoid blocking genuine users
        message: {
            status: 'error',
            message: 'Too many requests from this IP, please try again after 15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false
    });
    app.use('/api', limiter);
}

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parser for refresh tokens
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/game', gameSecureRoutes); // Secure commit-reveal routes
app.use('/api/game/legacy', gameRoutes); // Legacy routes (practice only)
app.use('/api/referral', referralRoutes);
app.use('/api/deposit', depositRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/cashback', cashbackRoutes);
app.use('/api/roi-on-roi', roiOnRoiRoutes);
app.use('/api/club', clubRoutes);
app.use('/api/lucky-draw', luckyDrawRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/notifications', notificationRoutes);

// Initialize jackpot service with Socket.IO
luckyDrawRoutes.initializeService(io);
adminRoutes.initializeService(io);
gameGovernanceRoutes.initializeService(io);

app.use('/api/admin', adminRoutes); // Admin routes (protected by RBAC)
app.use('/api/admin/jackpot', luckyDrawRoutes);
app.use('/api/admin/economics', economyRoutes);
app.use('/api/admin/games/protocol', gameGovernanceRoutes);
app.use('/api/admin/emergency', require('./routes/emergency')); // Emergency controls
app.use('/api/audit', auditRoutes); // Audit log routes (admin only)

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'TRK Backend API is running with WebSockets',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Cannot find ${req.originalUrl} on this server`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    try {
        const fs = require('fs');
        fs.appendFileSync('error.log', `[${new Date().toISOString()}] ${req.method} ${req.url} - ${err.message}\n${err.stack}\n\n`);
    } catch (e) { }

    res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Internal server error'
    });
});

// Socket.io connection logic with Optional Authentication
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];

        // Allow anonymous connection if no token
        if (!token || token === 'null' || token === 'undefined') {
            socket.user = null;
            return next();
        }

        // Verify token if present
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'dev-secret');
        const user = await User.findById(decoded.id).select('_id walletAddress role lastLoginAt');

        if (!user) {
            // Invalid user, but allow connection as guest
            socket.user = null;
            return next();
        }

        // Verify session validity
        if (user.lastLoginAt && (decoded.iat * 1000) < (user.lastLoginAt.getTime() - 5000)) {
            // Session revoked, treats as guest
            socket.user = null;
            return next();
        }

        socket.user = {
            id: user._id,
            walletAddress: user.walletAddress,
            role: user.role,
            referredBy: user.referredBy // Add referredBy for status notifications
        };

        // Join user-specific rooms (support legacy emit targets)
        const userIdRoom = user._id.toString();
        socket.join(`user:${userIdRoom}`);
        socket.join(userIdRoom);
        if (user.walletAddress) {
            socket.join(user.walletAddress.toLowerCase());
        }

        // Track Online Status
        if (!global.onlineUsers) global.onlineUsers = new Map();
        const userIds = global.onlineUsers.get(userIdRoom) || new Set();
        userIds.add(socket.id);
        global.onlineUsers.set(userIdRoom, userIds);

        // If this is the user's first socket, notify referrer
        if (userIds.size === 1 && user.referredBy) {
            io.to(user.referredBy.toString()).emit('referral_status_change', {
                userId: userIdRoom,
                status: 'online'
            });
        }

        next();
    } catch (err) {
        // Token expired or invalid - allow as guest safely
        socket.user = null;
        // Suppress repeating auth warnings in production to avoid log spam
        if (process.env.NODE_ENV !== 'production' && !err.message.includes('expired')) {
            console.warn('Socket Auth Warning:', err.message);
        }
        next();
    }
});

// Add disconnect handler to clean up online tracking
io.on('connection', (socket) => {
    logger.debug(`Authenticated: ${socket.user ? socket.user.walletAddress : 'Guest'} (${socket.id})`);

    socket.on('disconnect', () => {
        logger.debug('Client disconnected:', socket.id);

        if (socket.user && global.onlineUsers) {
            const userIdRoom = socket.user.id.toString();
            const userIds = global.onlineUsers.get(userIdRoom);
            if (userIds) {
                userIds.delete(socket.id);
                if (userIds.size === 0) {
                    global.onlineUsers.delete(userIdRoom);
                    // Notify referrer that user went offline
                    if (socket.user.referredBy) {
                        io.to(socket.user.referredBy.toString()).emit('referral_status_change', {
                            userId: userIdRoom,
                            status: 'offline'
                        });
                    }
                }
            }
        }
    });
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        mongoose.connection.close(false, () => {
            logger.info('MongoDB connection closed');
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        mongoose.connection.close(false, () => {
            logger.info('MongoDB connection closed');
            process.exit(0);
        });
    });
});

const PORT = process.env.PORT || 5000;

// Start server with error handling
const startServer = (port) => {
    try {
        const activeServer = server.listen(port, () => {
            logger.info(`🚀 Server running on port ${port}`);
            logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
            logger.info(`🎮 Real Money Games: ${process.env.REAL_MONEY_GAMES_ENABLED === 'true' ? 'ENABLED ✅' : 'DISABLED 🔒'}`);

            // Initialize system config
            system.init(io).catch(err => logger.error('Failed to init system config:', err));

            // Start Cron Jobs for Round Resolution, Maintenance, etc.
            startCronJobs(io);
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                logger.error(`❌ Port ${port} is already in use. Please close the other process or use "npm run clean-start".`);
                process.exit(1);
            } else {
                logger.error('❌ Server error:', err);
                process.exit(1);
            }
        });
        return activeServer;
    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer(PORT); // Call startServer with the initial PORT

module.exports = { app, server, io };
