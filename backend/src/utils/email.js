const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Send OTP email to user
 * @param {string} to - User email address
 * @param {string} otp - One-time password
 */
const sendOtpEmail = async (to, otp) => {
    const mailOptions = {
        from: `"TRK Protocol" <${process.env.EMAIL_FROM}>`,
        to,
        subject: 'Verify Your TRK Account',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="text-align: center; color: #facc15;">TRK PROTOCOL</h2>
                <p>Hello,</p>
                <p>Verify your TRK account by using the OTP code below. This code is valid for 10 minutes.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #fff; background: #22c55e; padding: 10px 20px; border-radius: 5px;">${otp}</span>
                </div>
                <p>If you did not request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #666; text-align: center;">&copy; 2026 TRK Blockchain Real Cash Game Ecosystem</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] OTP sent to ${to}`);
        return true;
    } catch (error) {
        console.error('[EMAIL] Error sending OTP:', error);
        // Fallback to console for development if needed, but in production this should fail safely
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[AUTH-FALLBACK] OTP for ${to}: ${otp}`);
        }
        throw error;
    }
};

/**
 * Send password reset OTP email to user
 * @param {string} to - User email address
 * @param {string} otp - One-time password
 */
const sendPasswordResetOtpEmail = async (to, otp) => {
    const mailOptions = {
        from: `"TRK Protocol" <${process.env.EMAIL_FROM}>`,
        to,
        subject: 'Reset Your TRK Password',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="text-align: center; color: #facc15;">TRK PROTOCOL</h2>
                <p>Hello,</p>
                <p>Use the OTP code below to reset your TRK account password. This code is valid for 10 minutes.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #fff; background: #22c55e; padding: 10px 20px; border-radius: 5px;">${otp}</span>
                </div>
                <p>If you did not request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #666; text-align: center;">&copy; 2026 TRK Blockchain Real Cash Game Ecosystem</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Password reset OTP sent to ${to}`);
        return true;
    } catch (error) {
        console.error('[EMAIL] Error sending password reset OTP:', error);
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[AUTH-FALLBACK] Password reset OTP for ${to}: ${otp}`);
        }
        throw error;
    }
};

/**
 * Send redemption OTP email to user
 * @param {string} to - User email address
 * @param {string} otp - One-time password
 */
const sendRedemptionOtpEmail = async (to, otp) => {
    const mailOptions = {
        from: `"TRK Protocol" <${process.env.EMAIL_FROM}>`,
        to,
        subject: 'Confirm Your Reward Redemption',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="text-align: center; color: #facc15;">TRK PROTOCOL</h2>
                <p>Hello,</p>
                <p>Use the OTP below to confirm your reward redemption request. This code is valid for 10 minutes.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #fff; background: #22c55e; padding: 10px 20px; border-radius: 5px;">${otp}</span>
                </div>
                <p>If you did not request this redemption, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #666; text-align: center;">&copy; 2026 TRK Blockchain Real Cash Game Ecosystem</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Redemption OTP sent to ${to}`);
        return true;
    } catch (error) {
        console.error('[EMAIL] Error sending redemption OTP:', error);
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[REWARD-FALLBACK] OTP for ${to}: ${otp}`);
        }
        throw error;
    }
};

module.exports = {
    sendOtpEmail,
    sendPasswordResetOtpEmail,
    sendRedemptionOtpEmail
};
