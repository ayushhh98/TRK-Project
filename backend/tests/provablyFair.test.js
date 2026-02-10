const {
    generateServerSeed,
    hashSeed,
    generateClientSeed,
    generateResult,
    verifyResult,
    calculateOutcome
} = require('../src/utils/provablyFair');

describe('Provably Fair RNG - Edge Cases', () => {

    describe('generateServerSeed', () => {
        test('should generate 64-character hex string', () => {
            const seed = generateServerSeed();
            expect(seed).toHaveLength(64);
            expect(seed).toMatch(/^[0-9a-f]{64}$/);
        });

        test('should generate unique seeds', () => {
            const seeds = new Set();
            for (let i = 0; i < 100; i++) {
                seeds.add(generateServerSeed());
            }
            expect(seeds.size).toBe(100);
        });
    });

    describe('hashSeed', () => {
        test('should produce consistent SHA-256 hash', () => {
            const seed = 'test-seed-123';
            const hash1 = hashSeed(seed);
            const hash2 = hashSeed(seed);
            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(64);
        });

        test('should produce different hashes for different seeds', () => {
            const hash1 = hashSeed('seed1');
            const hash2 = hashSeed('seed2');
            expect(hash1).not.toBe(hash2);
        });

        test('should handle empty string', () => {
            const hash = hashSeed('');
            expect(hash).toHaveLength(64);
            expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
        });
    });

    describe('generateResult - Dice Variant', () => {
        test('should always return number between 1-8', () => {
            const serverSeed = generateServerSeed();
            const clientSeed = generateClientSeed();

            for (let nonce = 0; nonce < 1000; nonce++) {
                const result = generateResult(serverSeed, clientSeed, nonce, 'dice');
                expect(result).toBeGreaterThanOrEqual(1);
                expect(result).toBeLessThanOrEqual(8);
                expect(Number.isInteger(result)).toBe(true);
            }
        });

        test('should be deterministic (same inputs = same output)', () => {
            const serverSeed = 'a'.repeat(64);
            const clientSeed = 'b'.repeat(32);
            const nonce = 5;

            const result1 = generateResult(serverSeed, clientSeed, nonce, 'dice');
            const result2 = generateResult(serverSeed, clientSeed, nonce, 'dice');

            expect(result1).toBe(result2);
        });

        test('should change result when nonce changes', () => {
            const serverSeed = generateServerSeed();
            const clientSeed = generateClientSeed();

            const results = new Set();
            for (let nonce = 0; nonce < 20; nonce++) {
                results.add(generateResult(serverSeed, clientSeed, nonce, 'dice'));
            }

            // Should have at least 5 different results in 20 tries
            expect(results.size).toBeGreaterThanOrEqual(5);
        });

        test('should handle nonce = 0', () => {
            const result = generateResult('a'.repeat(64), 'b'.repeat(32), 0, 'dice');
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(8);
        });

        test('should handle very large nonce', () => {
            const result = generateResult('a'.repeat(64), 'b'.repeat(32), 999999, 'dice');
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(8);
        });
    });

    describe('generateResult - Matrix Variant', () => {
        test('should return number between 0-99.99', () => {
            const serverSeed = generateServerSeed();
            const clientSeed = generateClientSeed();

            for (let nonce = 0; nonce < 100; nonce++) {
                const result = generateResult(serverSeed, clientSeed, nonce, 'matrix');
                expect(result).toBeGreaterThanOrEqual(0);
                expect(result).toBeLessThan(100);
            }
        });

        test('should handle boundary values', () => {
            // Test that results can be close to 0 and close to 100
            const results = [];
            for (let i = 0; i < 10000; i++) {
                const result = generateResult(
                    generateServerSeed(),
                    generateClientSeed(),
                    i,
                    'matrix'
                );
                results.push(result);
            }

            const hasLow = results.some(r => r < 1);
            const hasHigh = results.some(r => r > 99);
            expect(hasLow || hasHigh).toBe(true);
        });
    });

    describe('generateResult - Crash Variant', () => {
        test('should return multiplier between 1.00-10.00', () => {
            const serverSeed = generateServerSeed();
            const clientSeed = generateClientSeed();

            for (let nonce = 0; nonce < 100; nonce++) {
                const result = generateResult(serverSeed, clientSeed, nonce, 'crash');
                expect(result).toBeGreaterThanOrEqual(1.0);
                expect(result).toBeLessThanOrEqual(10.0);
            }
        });
    });

    describe('verifyResult', () => {
        test('should verify valid result', () => {
            const serverSeed = generateServerSeed();
            const serverSeedHash = hashSeed(serverSeed);
            const clientSeed = generateClientSeed();
            const nonce = 1;

            const result = generateResult(serverSeed, clientSeed, nonce, 'dice');

            const verification = verifyResult(
                serverSeed,
                serverSeedHash,
                clientSeed,
                nonce,
                'dice',
                result
            );

            expect(verification.valid).toBe(true);
            expect(verification.calculatedResult).toBe(result);
        });

        test('should detect tampered server seed', () => {
            const serverSeed = generateServerSeed();
            const serverSeedHash = hashSeed(serverSeed);
            const tamperedSeed = serverSeed.replace(/a/g, 'b');

            const verification = verifyResult(
                tamperedSeed,
                serverSeedHash,
                'clientseed',
                1,
                'dice',
                5
            );

            expect(verification.valid).toBe(false);
            expect(verification.reason).toContain('hash mismatch');
        });

        test('should detect wrong result', () => {
            const serverSeed = generateServerSeed();
            const serverSeedHash = hashSeed(serverSeed);
            const clientSeed = generateClientSeed();
            const nonce = 1;

            const actualResult = generateResult(serverSeed, clientSeed, nonce, 'dice');
            const fakeResult = actualResult === 8 ? 1 : actualResult + 1;

            const verification = verifyResult(
                serverSeed,
                serverSeedHash,
                clientSeed,
                nonce,
                'dice',
                fakeResult
            );

            expect(verification.valid).toBe(false);
        });
    });

    describe('calculateOutcome - Dice', () => {
        test('should calculate win correctly', () => {
            const outcome = calculateOutcome('dice', 5, 5, 10);

            expect(outcome.isWin).toBe(true);
            expect(outcome.multiplier).toBe(8);
            expect(outcome.payout).toBe(80);
        });

        test('should calculate loss correctly', () => {
            const outcome = calculateOutcome('dice', 5, 7, 10);

            expect(outcome.isWin).toBe(false);
            expect(outcome.multiplier).toBe(0);
            expect(outcome.payout).toBe(0);
        });

        test('should handle minimum bet (0.5 USDT)', () => {
            const outcome = calculateOutcome('dice', 3, 3, 0.5);

            expect(outcome.isWin).toBe(true);
            expect(outcome.payout).toBe(4);
        });

        test('should handle maximum bet', () => {
            const outcome = calculateOutcome('dice', 1, 1, 1000);

            expect(outcome.isWin).toBe(true);
            expect(outcome.payout).toBe(8000);
        });

        test('should handle all possible numbers (1-8)', () => {
            for (let num = 1; num <= 8; num++) {
                const outcome = calculateOutcome('dice', num, num, 10);
                expect(outcome.isWin).toBe(true);
                expect(outcome.multiplier).toBe(8);
            }
        });
    });

    describe('calculateOutcome - Matrix', () => {
        test('should calculate win at 50% risk', () => {
            const outcome = calculateOutcome('matrix', 50, 25, 10); // 25 < 50 = win

            expect(outcome.isWin).toBe(true);
            expect(outcome.payout).toBeGreaterThan(10);
        });

        test('should calculate loss at 50% risk', () => {
            const outcome = calculateOutcome('matrix', 50, 75, 10); // 75 >= 50 = loss

            expect(outcome.isWin).toBe(false);
            expect(outcome.payout).toBe(0);
        });

        test('should handle minimum risk (1%)', () => {
            const outcome = calculateOutcome('matrix', 1, 0.5, 10);

            expect(outcome.isWin).toBe(true);
            // Very high multiplier for 99% win chance
            expect(outcome.multiplier).toBeGreaterThan(1);
        });

        test('should handle maximum risk (95%)', () => {
            const outcome = calculateOutcome('matrix', 95, 2, 10);

            expect(outcome.isWin).toBe(true);
            // Very high multiplier for 5% win chance
            expect(outcome.multiplier).toBeGreaterThan(10);
        });

        test('should handle boundary case (exactly at threshold)', () => {
            const outcome = calculateOutcome('matrix', 50, 50, 10);

            expect(outcome.isWin).toBe(false); // >= not <
        });
    });

    describe('Fairness Distribution Test', () => {
        test('dice results should be evenly distributed', () => {
            const distribution = new Array(8).fill(0);
            const iterations = 8000;
            const serverSeed = generateServerSeed();
            const clientSeed = generateClientSeed();

            for (let nonce = 0; nonce < iterations; nonce++) {
                const result = generateResult(serverSeed, clientSeed, nonce, 'dice');
                distribution[result - 1]++;
            }

            // Each number should appear roughly 1000 times (±30%)
            distribution.forEach(count => {
                expect(count).toBeGreaterThan(700);
                expect(count).toBeLessThan(1300);
            });
        });
    });
});
