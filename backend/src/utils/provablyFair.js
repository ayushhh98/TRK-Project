const crypto = require('crypto');

/**
 * Provably Fair RNG System
 * Uses commit-reveal pattern with server seed + client seed + nonce
 */

// Generate cryptographically secure server seed
function generateServerSeed() {
    return crypto.randomBytes(32).toString('hex');
}

// Hash a seed with SHA-256
function hashSeed(seed) {
    return crypto.createHash('sha256').update(seed).digest('hex');
}

// Generate client seed (if not provided by user)
function generateClientSeed() {
    return crypto.randomBytes(16).toString('hex');
}

// Generate deterministic result from seeds
function generateResult(serverSeed, clientSeed, nonce, variant = 'dice', range = 8) {
    // Combine all entropy sources
    const combined = `${serverSeed}:${clientSeed}:${nonce}`;
    const hash = crypto.createHash('sha256').update(combined).digest('hex');

    // Convert hash to number
    // Use BigInt to preserve lower bits for modulus operations
    const hashInt = BigInt(`0x${hash.substring(0, 16)}`);

    // Generate result based on variant
    switch (variant) {
        case 'dice':
            // 1-8 for dice
            return Number(hashInt % 8n) + 1;

        case 'spin':
            // 1-8 for neon spin segments
            return Number(hashInt % 8n) + 1;

        case 'matrix':
            // 0-99.99 for matrix percentage
            return Number(hashInt % 10000n) / 100;

        case 'crash':
            // 1.00x - 10.00x for crash multiplier
            const crashValue = Number(hashInt % 900n);
            return 1.0 + (crashValue / 100);

        default:
            // Generic 0-99
            return Number(hashInt % 100n);
    }
}

// Verify that a result was generated fairly
function verifyResult(serverSeed, serverSeedHash, clientSeed, nonce, variant, expectedResult) {
    // 1. Verify server seed wasn't tampered
    if (hashSeed(serverSeed) !== serverSeedHash) {
        return {
            valid: false,
            reason: 'Server seed hash mismatch'
        };
    }

    // 2. Regenerate result
    const calculatedResult = generateResult(serverSeed, clientSeed, nonce, variant);

    // 3. Compare results (with floating point tolerance for crash)
    const tolerance = variant === 'crash' ? 0.01 : 0;
    const isMatch = Math.abs(calculatedResult - expectedResult) <= tolerance;

    return {
        valid: isMatch,
        expectedResult,
        calculatedResult,
        reason: isMatch ? 'Result is provably fair' : 'Result mismatch'
    };
}

// Calculate win/loss based on variant and result
function calculateOutcome(variant, pickedNumber, luckyNumber, betAmount) {
    let isWin = false;
    let multiplier = 0;
    let payout = 0;

    switch (variant) {
        case 'dice':
            isWin = pickedNumber === luckyNumber;
            multiplier = isWin ? 8 : 0;
            break;

        case 'spin':
            // Map segment to multiplier
            const spinMultipliers = [0, 2, 0, 5, 0, 10, 0, 2];
            const segmentIndex = luckyNumber - 1;

            if (Array.isArray(pickedNumber)) {
                // Probability Matrix mode
                isWin = pickedNumber.includes(luckyNumber);
                multiplier = isWin ? spinMultipliers[segmentIndex] : 0;
            } else {
                isWin = pickedNumber === luckyNumber;
                multiplier = spinMultipliers[segmentIndex];
            }
            break;

        case 'matrix':
            // luckyNumber is roll (0-99.99)
            // pickedNumber is risk level (1-95)
            const winChance = 100 - pickedNumber;
            isWin = luckyNumber < winChance;
            multiplier = isWin ? (100 / winChance) : 0;
            break;

        case 'crash':
            // luckyNumber is crash point (1.00-10.00)
            // pickedNumber is target multiplier
            isWin = luckyNumber >= pickedNumber;
            multiplier = isWin ? pickedNumber : 0;
            break;
    }

    payout = betAmount * multiplier;

    return {
        isWin,
        multiplier: parseFloat(multiplier.toFixed(2)),
        payout: parseFloat(payout.toFixed(2)),
        luckyNumber
    };
}

// Create commitment hash for bet data
function createBetDataHash(betData) {
    const dataString = JSON.stringify({
        gameType: betData.gameType,
        gameVariant: betData.gameVariant,
        betAmount: betData.betAmount,
        pickedNumber: betData.pickedNumber
    });
    return crypto.createHash('sha256').update(dataString).digest('hex');
}

module.exports = {
    generateServerSeed,
    hashSeed,
    generateClientSeed,
    generateResult,
    verifyResult,
    calculateOutcome,
    createBetDataHash
};
