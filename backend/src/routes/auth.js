const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { ethers } = require('ethers');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { authLimiter, refreshLimiter } = require('../middleware/rateLimiter');
const { generateDeviceFingerprint } = require('../utils/fingerprint');
const auth = require('../middleware/auth');
const { sendOtpEmail, sendPasswordResetOtpEmail } = require('../utils/email');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

// Admin role resolution helpers
const normalizeList = (value) => {
    if (!value) return [];
    return value.split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
};

const SUPERADMIN_EMAILS = normalizeList(process.env.SUPERADMIN_EMAILS || process.env.SUPERADMIN_EMAIL);
const ADMIN_EMAILS = normalizeList(process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL);
const SUPERADMIN_WALLETS = normalizeList(process.env.SUPERADMIN_WALLETS || process.env.SUPERADMIN_WALLET);
const ADMIN_WALLETS = normalizeList(process.env.ADMIN_WALLETS || process.env.ADMIN_WALLET);

const resolveRoleForIdentity = ({ email, walletAddress }) => {
    const emailLower = email ? email.toLowerCase() : '';
    const walletLower = walletAddress ? walletAddress.toLowerCase() : '';

    if ((emailLower && SUPERADMIN_EMAILS.includes(emailLower)) || (walletLower && SUPERADMIN_WALLETS.includes(walletLower))) {
        return 'superadmin';
    }
    if ((emailLower && ADMIN_EMAILS.includes(emailLower)) || (walletLower && ADMIN_WALLETS.includes(walletLower))) {
        return 'admin';
    }
    return null;
};

const maybeUpgradeRole = async (user, identity) => {
    const desiredRole = resolveRoleForIdentity(identity);
    if (!desiredRole) return false;

    const priority = { player: 0, admin: 1, superadmin: 2 };
    const currentRole = user.role || 'player';

    if (priority[desiredRole] > priority[currentRole]) {
        user.role = desiredRole;
        await user.save();
        return true;
    }
    return false;
};

const PRACTICE_LOGIN_BONUS = Number(process.env.PRACTICE_LOGIN_BONUS || 100);
const PRACTICE_LOGIN_DAYS = Number(process.env.PRACTICE_LOGIN_DAYS || 30);

const applyPracticeLoginState = (user) => {
    let changed = false;
    const now = new Date();
    const bonus = Number.isFinite(PRACTICE_LOGIN_BONUS) ? PRACTICE_LOGIN_BONUS : 100;
    const durationDays = Number.isFinite(PRACTICE_LOGIN_DAYS) ? PRACTICE_LOGIN_DAYS : 30;

    if (!user.practiceExpiry || new Date(user.practiceExpiry) < now) {
        user.practiceExpiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
        changed = true;
    }

    const currentPractice = typeof user.practiceBalance === 'number' ? user.practiceBalance : 0;
    if (currentPractice < bonus) {
        user.practiceBalance = bonus;
        changed = true;
    }

    return changed;
};

// Apply rate limiting to auth endpoints
router.use('/nonce', authLimiter);
router.use('/verify', authLimiter);
router.use('/refresh', refreshLimiter);
router.use('/request-password-reset', authLimiter);
router.use('/reset-password', authLimiter);
router.use('/link-wallet/nonce', authLimiter);

// Generate nonce for wallet signature
router.post('/nonce', async (req, res) => {
    try {
        const { walletAddress, referrerCode } = req.body;

        if (!walletAddress || !ethers.isAddress(walletAddress)) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid wallet address is required'
            });
        }

        const address = walletAddress.toLowerCase();

        let user = await User.findOne({ walletAddress: address });

        if (!user) {
            // Handle referral if code provided
            let referredBy = null;
            if (referrerCode) {
                const referrer = await User.findOne({ referralCode: referrerCode.toUpperCase() });
                if (referrer) {
                    referredBy = referrer._id;
                }
            }

            // Create new user
            const role = resolveRoleForIdentity({ walletAddress: address });
            user = new User({
                walletAddress: address,
                nonce: Math.floor(Math.random() * 1000000).toString(),
                referredBy: referredBy,
                role: role || 'player'
            });
            await user.save();

            // Link to referrer's list if applicable
            if (referredBy) {
                await User.findByIdAndUpdate(referredBy, {
                    $addToSet: { referrals: user._id },
                    $inc: { 'teamStats.totalMembers': 1 }
                });
            }
        } else {
            // Generate new nonce
            const role = resolveRoleForIdentity({ walletAddress: address, email: user.email });
            if (role && role !== user.role) {
                user.role = role;
            }
            user.generateNonce();
            await user.save();
        }

        res.status(200).json({
            status: 'success',
            data: {
                nonce: user.nonce,
                message: `Sign this message to authenticate with TRK: ${user.nonce}`
            }
        });

    } catch (error) {
        console.error('Nonce generation error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to generate nonce'
        });
    }
});

// Verify signature and authenticate
router.post('/verify', async (req, res) => {
    try {
        const { walletAddress, signature } = req.body;

        if (!walletAddress || !signature) {
            return res.status(400).json({
                status: 'error',
                message: 'Wallet address and signature are required'
            });
        }

        const address = walletAddress.toLowerCase();
        const user = await User.findOne({ walletAddress: address });

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found. Please get a nonce first.'
            });
        }

        // Verify signature
        const message = `Sign this message to authenticate with TRK: ${user.nonce}`;
        const recoveredAddress = ethers.verifyMessage(message, signature);

        if (recoveredAddress.toLowerCase() !== address) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid signature'
            });
        }

        // Upgrade role if configured
        const role = resolveRoleForIdentity({ walletAddress: address, email: user.email });
        if (role && role !== user.role) {
            user.role = role;
        }

        // Generate new nonce for next login
        user.generateNonce();

        // Initialize practice state on login
        user.lastLoginAt = new Date();
        applyPracticeLoginState(user);
        await user.save();

        // Generate short-lived access token (15 minutes)
        const accessToken = jwt.sign(
            {
                id: user._id,
                walletAddress: user.walletAddress,
                iat: Math.floor(Date.now() / 1000)
            },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
        );

        // Generate long-lived refresh token (30 days)
        const refreshTokenValue = crypto.randomBytes(64).toString('hex');
        const deviceFingerprint = generateDeviceFingerprint(req);

        // Store refresh token in database (hashed)
        const refreshTokenDoc = new RefreshToken({
            userId: user._id,
            token: refreshTokenValue, // Will be hashed by pre-save hook
            deviceFingerprint,
            ipAddress: req.ip || req.connection.remoteAddress || '',
            userAgent: req.headers['user-agent'] || '',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });
        await refreshTokenDoc.save();

        // Set refresh token as httpOnly cookie
        res.cookie('refreshToken', refreshTokenValue, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.status(200).json({
            status: 'success',
            data: {
                accessToken,
                user: {
                    id: user._id,
                    walletAddress: user.walletAddress,
                    practiceBalance: user.practiceBalance,
                    realBalances: user.realBalances,
                    referralCode: user.referralCode,
                    clubRank: user.clubRank,
                    role: user.role,
                    isBanned: user.isBanned,
                    isActive: user.isActive,
                    practiceExpiry: user.practiceExpiry,
                    isRegisteredOnChain: user.isRegisteredOnChain
                }
            }
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Authentication failed'
        });
    }
});

// Refresh access token using refresh token
router.post('/refresh', async (req, res) => {
    try {
        const refreshTokenValue = req.cookies.refreshToken;

        if (!refreshTokenValue) {
            return res.status(401).json({
                status: 'error',
                message: 'Refresh token not found. Please log in again.'
            });
        }

        // Hash the token to match database
        const hashedToken = crypto.createHash('sha256').update(refreshTokenValue).digest('hex');

        // Find refresh token in database
        const refreshTokenDoc = await RefreshToken.findOne({
            token: hashedToken,
            isRevoked: false,
            expiresAt: { $gt: new Date() }
        }).populate('userId');

        if (!refreshTokenDoc) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid or expired refresh token. Please log in again.'
            });
        }

        // Verify device fingerprint
        const deviceFingerprint = generateDeviceFingerprint(req);
        if (refreshTokenDoc.deviceFingerprint !== deviceFingerprint) {
            // Revoke this token due to potential security issue
            refreshTokenDoc.isRevoked = true;
            await refreshTokenDoc.save();

            return res.status(401).json({
                status: 'error',
                message: 'Device fingerprint mismatch. Please log in again.'
            });
        }

        const user = refreshTokenDoc.userId;

        // Generate new access token
        const accessToken = jwt.sign(
            {
                id: user._id,
                walletAddress: user.walletAddress,
                iat: Math.floor(Date.now() / 1000)
            },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
        );

        // Optional: Rotate refresh token for added security
        // Revoke old token and create new one
        refreshTokenDoc.isRevoked = true;
        await refreshTokenDoc.save();

        const newRefreshTokenValue = crypto.randomBytes(64).toString('hex');
        const newRefreshTokenDoc = new RefreshToken({
            userId: user._id,
            token: newRefreshTokenValue,
            deviceFingerprint,
            ipAddress: req.ip || req.connection.remoteAddress || '',
            userAgent: req.headers['user-agent'] || '',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
        await newRefreshTokenDoc.save();

        // Set new refresh token cookie
        res.cookie('refreshToken', newRefreshTokenValue, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            status: 'success',
            data: {
                accessToken
            }
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to refresh token'
        });
    }
});

// Logout - revoke refresh token
router.post('/logout', auth, async (req, res) => {
    try {
        const refreshTokenValue = req.cookies.refreshToken;

        if (refreshTokenValue) {
            const hashedToken = crypto.createHash('sha256').update(refreshTokenValue).digest('hex');
            await RefreshToken.updateOne(
                { token: hashedToken },
                { isRevoked: true }
            );
        }

        // Clear refresh token cookie
        res.clearCookie('refreshToken');

        res.status(200).json({
            status: 'success',
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to logout'
        });
    }
});

// Logout from all devices - revoke all refresh tokens
router.post('/logout-all', auth, async (req, res) => {
    try {
        await RefreshToken.revokeAllForUser(req.user.id);

        // Clear refresh token cookie
        res.clearCookie('refreshToken');

        res.status(200).json({
            status: 'success',
            message: 'Logged out from all devices successfully'
        });

    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to logout from all devices'
        });
    }
});

// Email Registration
router.post('/register', async (req, res) => {
    try {
        const { email, password, referrerCode } = req.body;

        if (!email || !password) {
            return res.status(400).json({ status: 'error', message: 'Email and password are required' });
        }

        let user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
            return res.status(400).json({ status: 'error', message: 'Email already registered' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Handle referral
        let referredBy = null;
        if (referrerCode) {
            const referrer = await User.findOne({ referralCode: referrerCode.toUpperCase() });
            if (referrer) referredBy = referrer._id;
        }

        const role = resolveRoleForIdentity({ email });
        user = new User({
            email: email.toLowerCase(),
            password,
            emailOtp: otp,
            emailOtpExpires: otpExpires,
            referredBy,
            role: role || 'player'
        });

        const generateReferralCode = (mail) => {
            const prefix = (mail || 'USER').split('@')[0].slice(0, 6).toUpperCase();
            const rand = Math.floor(1000 + Math.random() * 9000); // 4 digits
            return `${prefix}${rand}`;
        };

        // Ensure referralCode uniqueness (retry on collision)
        let saved = false;
        let attempts = 0;
        while (!saved && attempts < 3) {
            try {
                if (!user.referralCode) user.referralCode = generateReferralCode(email);
                await user.save();
                saved = true;
            } catch (err) {
                if (err?.code === 11000 && err?.keyPattern?.referralCode) {
                    user.referralCode = generateReferralCode(email);
                    attempts += 1;
                    continue;
                }
                if (err?.code === 11000 && err?.keyPattern?.email) {
                    return res.status(400).json({ status: 'error', message: 'Email already registered' });
                }
                throw err;
            }
        }

        if (!saved) {
            return res.status(500).json({ status: 'error', message: 'Registration failed. Please try again.' });
        }

        // Send real OTP email
        try {
            await sendOtpEmail(email, otp);
        } catch (emailError) {
            console.error('Failed to send OTP email:', emailError);
            // We still registered the user, but they'll need to resend OTP if they didn't get it
            // For now, we continue but inform in log
        }

        res.status(201).json({
            status: 'success',
            message: 'Registration successful. Please verify your email with the OTP sent.',
            data: { email: user.email }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            status: 'error',
            message: process.env.NODE_ENV === 'development'
                ? `Registration failed: ${error.message || 'Unknown error'}`
                : 'Registration failed'
        });
    }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({
            email: email.toLowerCase(),
            emailOtp: otp,
            emailOtpExpires: { $gt: new Date() }
        }).select('+emailOtp +emailOtpExpires');

        if (!user) {
            return res.status(400).json({ status: 'error', message: 'Invalid or expired OTP' });
        }

        user.isEmailVerified = true;
        user.emailOtp = undefined;
        user.emailOtpExpires = undefined;
        await user.save();

        res.status(200).json({ status: 'success', message: 'Email verified successfully' });
    } catch (error) {
        console.error('OTP Verification error:', error);
        res.status(500).json({ status: 'error', message: 'Verification failed' });
    }
});

// Request password reset OTP
router.post('/request-password-reset', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ status: 'error', message: 'Email is required' });
        }

        const emailLower = email.toLowerCase();
        const user = await User.findOne({ email: emailLower });

        if (user) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            user.passwordResetOtp = otp;
            user.passwordResetOtpExpires = otpExpires;
            await user.save();

            try {
                await sendPasswordResetOtpEmail(emailLower, otp);
            } catch (emailError) {
                console.error('Failed to send password reset OTP email:', emailError);
                return res.status(500).json({ status: 'error', message: 'Failed to send OTP email' });
            }
        }

        return res.status(200).json({
            status: 'success',
            message: 'If an account exists for this email, an OTP has been sent.'
        });
    } catch (error) {
        console.error('Request password reset error:', error);
        return res.status(500).json({ status: 'error', message: 'Failed to request password reset' });
    }
});

// Reset password with OTP
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ status: 'error', message: 'Email, OTP, and new password are required' });
        }

        const emailLower = email.toLowerCase();
        const user = await User.findOne({
            email: emailLower,
            passwordResetOtp: otp,
            passwordResetOtpExpires: { $gt: new Date() }
        }).select('+passwordResetOtp +passwordResetOtpExpires');

        if (!user) {
            return res.status(400).json({ status: 'error', message: 'Invalid or expired OTP' });
        }

        user.password = newPassword;
        user.passwordResetOtp = undefined;
        user.passwordResetOtpExpires = undefined;
        user.isEmailVerified = true;
        await user.save();

        await RefreshToken.revokeAllForUser(user._id);

        return res.status(200).json({
            status: 'success',
            message: 'Password reset successful. Please log in again.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json({ status: 'error', message: 'Password reset failed' });
    }
});

// Email Login
router.post('/login-email', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
        }

        if (!user.isEmailVerified) {
            return res.status(403).json({ status: 'error', message: 'Please verify your email first' });
        }

        // Upgrade role if configured
        const role = resolveRoleForIdentity({ email: user.email, walletAddress: user.walletAddress });
        if (role && role !== user.role) {
            user.role = role;
        }
        user.lastLoginAt = new Date();
        applyPracticeLoginState(user);
        await user.save();

        // Generate tokens (Reuse existing logic)
        const accessToken = jwt.sign(
            { id: user._id, email: user.email, iat: Math.floor(Date.now() / 1000) },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
        );

        const refreshTokenValue = crypto.randomBytes(64).toString('hex');
        const deviceFingerprint = generateDeviceFingerprint(req);

        const refreshTokenDoc = new RefreshToken({
            userId: user._id,
            token: refreshTokenValue,
            deviceFingerprint,
            ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
            userAgent: req.headers['user-agent'] || '',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
        await refreshTokenDoc.save();

        res.cookie('refreshToken', refreshTokenValue, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            status: 'success',
            data: {
                accessToken,
                user: {
                    id: user._id,
                    email: user.email,
                    walletAddress: user.walletAddress,
                    practiceBalance: user.practiceBalance,
                    realBalances: user.realBalances,
                    referralCode: user.referralCode,
                    isRegisteredOnChain: user.isRegisteredOnChain,
                    role: user.role,
                    isBanned: user.isBanned,
                    isActive: user.isActive
                }
            }
        });
    } catch (error) {
        console.error('Email login error:', error);
        res.status(500).json({ status: 'error', message: 'Login failed' });
    }
});

// Google OAuth Login/Registration
router.post('/google', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ status: 'error', message: 'Google token is required' });
        }

        // Verify Google ID Token
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        // Find or create user
        let user = await User.findOne({
            $or: [
                { googleId: googleId },
                { email: email.toLowerCase() }
            ]
        });

        if (!user) {
            // New user from Google
            const role = resolveRoleForIdentity({ email });
            user = new User({
                email: email.toLowerCase(),
                googleId: googleId,
                name: name,
                picture: picture,
                isEmailVerified: true, // Google emails are already verified
                role: role || 'player'
            });
            await user.save();
        } else {
            // Existing user - link Google ID if not already set
            let updated = false;
            if (!user.googleId) {
                user.googleId = googleId;
                updated = true;
            }
            if (!user.isEmailVerified) {
                user.isEmailVerified = true;
                updated = true;
            }
            const role = resolveRoleForIdentity({ email: user.email, walletAddress: user.walletAddress });
            if (role && role !== user.role) {
                user.role = role;
                updated = true;
            }
            if (updated) await user.save();
        }

        user.lastLoginAt = new Date();
        applyPracticeLoginState(user);
        await user.save();

        // Generate tokens (Reuse existing logic)
        const accessToken = jwt.sign(
            { id: user._id, email: user.email, iat: Math.floor(Date.now() / 1000) },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
        );

        const refreshTokenValue = crypto.randomBytes(64).toString('hex');
        const deviceFingerprint = generateDeviceFingerprint(req);

        const refreshTokenDoc = new RefreshToken({
            userId: user._id,
            token: refreshTokenValue,
            deviceFingerprint,
            ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
            userAgent: req.headers['user-agent'] || '',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
        await refreshTokenDoc.save();

        res.cookie('refreshToken', refreshTokenValue, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            status: 'success',
            data: {
                accessToken,
                user: {
                    id: user._id,
                    email: user.email,
                    walletAddress: user.walletAddress,
                    practiceBalance: user.practiceBalance,
                    realBalances: user.realBalances,
                    referralCode: user.referralCode,
                    isRegisteredOnChain: user.isRegisteredOnChain,
                    role: user.role,
                    isBanned: user.isBanned,
                    isActive: user.isActive
                }
            }
        });

    } catch (error) {
        console.error('Google Auth error:', error);
        res.status(401).json({ status: 'error', message: 'Google authentication failed' });
    }
});

// Link Wallet to verified account
router.post('/link-wallet/nonce', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        if (user.walletAddress) {
            return res.status(400).json({ status: 'error', message: 'Wallet already linked' });
        }

        user.generateNonce();
        await user.save();

        return res.status(200).json({
            status: 'success',
            data: {
                nonce: user.nonce,
                message: `Link this wallet to my TRK account: ${user.nonce}`
            }
        });
    } catch (error) {
        console.error('Link wallet nonce error:', error);
        return res.status(500).json({ status: 'error', message: 'Failed to generate link nonce' });
    }
});

router.post('/link-wallet', auth, async (req, res) => {
    try {
        const { walletAddress, signature } = req.body;
        const userId = req.user.id;

        if (!walletAddress || !signature) {
            return res.status(400).json({ status: 'error', message: 'Wallet address and signature required' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

        // Verify signature to prove ownership
        const address = walletAddress.toLowerCase();
        if (!user.nonce) {
            user.generateNonce();
            await user.save();
            return res.status(400).json({
                status: 'error',
                message: 'Link nonce missing. Please request a new link nonce and try again.'
            });
        }
        const message = `Link this wallet to my TRK account: ${user.nonce}`;
        const recoveredAddress = ethers.verifyMessage(message, signature);

        if (recoveredAddress.toLowerCase() !== address) {
            return res.status(401).json({ status: 'error', message: 'Invalid wallet signature' });
        }

        // Check if wallet already linked to another account
        const existingWalletUser = await User.findOne({ walletAddress: address });
        if (existingWalletUser && existingWalletUser._id.toString() !== userId.toString()) {
            return res.status(400).json({ status: 'error', message: 'Wallet already linked to another account' });
        }

        user.walletAddress = address;
        const role = resolveRoleForIdentity({ email: user.email, walletAddress: address });
        if (role && role !== user.role) {
            user.role = role;
        }
        user.generateNonce();
        await user.save();

        res.status(200).json({
            status: 'success',
            message: 'Wallet linked successfully',
            data: { walletAddress: user.walletAddress }
        });
    } catch (error) {
        console.error('Wallet linking error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to link wallet' });
    }
});

module.exports = router;
