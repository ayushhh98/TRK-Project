/**
 * Provably Fair Game Utilities
 * Client-side verification of game fairness
 */

/**
 * SHA-256 hash function using Web Crypto API
 */
export async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Calculate provably fair result from seeds
 * NOTE: This is a simplified client-side version for demonstration
 * The actual calculation must match the server-side implementation
 */
export function calculateProvablyFairResult(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    variant: string,
    range?: number
): number {
    // Combine entropy sources
    const combined = `${serverSeed}:${clientSeed}:${nonce}`;

    // Create a hash value
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    hash = Math.abs(hash);

    // Generate result based on variant
    switch (variant) {
        case 'dice':
            return (hash % 8) + 1; // 1-8

        case 'spin':
            return (hash % 8) + 1; // 1-8

        case 'matrix':
            return (hash % 10000) / 100; // 0-99.99

        case 'crash':
            const crashValue = hash % 900;
            return 1.0 + (crashValue / 100); // 1.00-10.00

        default:
            return hash % (range || 100);
    }
}

/**
 * Verify that a game result is provably fair
 */
export async function verifyGameFairness(
    serverSeed: string,
    serverSeedHash: string,
    clientSeed: string,
    nonce: number,
    gameVariant: string,
    actualResult: number | string
): Promise<{
    isValid: boolean;
    recalculatedResult: number;
    message: string;
}> {
    try {
        // Step 1: Verify server seed wasn't tampered
        const calculatedHash = await sha256(serverSeed);

        if (calculatedHash !== serverSeedHash) {
            return {
                isValid: false,
                recalculatedResult: 0,
                message: 'Server seed hash mismatch! The server seed was changed after the bet.'
            };
        }

        // Step 2: Recalculate result
        const recalculatedResult = calculateProvablyFairResult(
            serverSeed,
            clientSeed,
            nonce,
            gameVariant
        );

        // Step 3: Compare results
        const actualNum = typeof actualResult === 'string'
            ? parseFloat(actualResult)
            : actualResult;

        const tolerance = gameVariant === 'crash' || gameVariant === 'matrix' ? 0.1 : 0;
        const isMatch = Math.abs(recalculatedResult - actualNum) <= tolerance;

        return {
            isValid: isMatch,
            recalculatedResult,
            message: isMatch
                ? '✅ Game result is provably fair!'
                : `❌ Result mismatch! Expected ${recalculatedResult}, got ${actualNum}`
        };

    } catch (error) {
        return {
            isValid: false,
            recalculatedResult: 0,
            message: 'Verification failed: ' + (error as Error).message
        };
    }
}

/**
 * Generate a random client seed
 */
export function generateClientSeed(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
