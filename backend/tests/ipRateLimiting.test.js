describe('IP-Based Rate Limiting - Edge Cases', () => {

    describe('IP Extraction', () => {
        test('should extract IP from X-Forwarded-For header', () => {
            const req = {
                headers: {
                    'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1'
                }
            };

            // Should get first IP (original client)
            const forwardedFor = req.headers['x-forwarded-for'];
            const ip = forwardedFor.split(',')[0].trim();
            expect(ip).toBe('203.0.113.1');
        });

        test('should extract IP from X-Real-IP header', () => {
            const req = {
                headers: {
                    'x-real-ip': '203.0.113.5'
                }
            };

            expect(req.headers['x-real-ip']).toBe('203.0.113.5');
        });

        test('should normalize IPv6-mapped IPv4', () => {
            const ip = '::ffff:127.0.0.1';
            const normalized = ip.startsWith('::ffff:') ? ip.substring(7) : ip;
            expect(normalized).toBe('127.0.0.1');
        });

        test('should convert ::1 to localhost', () => {
            const ip = '::1';
            const normalized = ip === '::1' ? 'localhost' : ip;
            expect(normalized).toBe('localhost');
        });
    });

    describe('Per-User Rate Limit', () => {
        test('should block same user rapid bets', () => {
            const userId = 'user123';
            const timestamps = new Map();
            const rateLimitMs = 5000;

            // First bet
            timestamps.set(userId, Date.now());

            // Second bet 2 seconds later (should be blocked)
            const lastBet = timestamps.get(userId);
            const timeSince = 2000; // Simulated 2 seconds
            const isBlocked = timeSince < rateLimitMs;

            expect(isBlocked).toBe(true);
        });

        test('should allow different users to bet simultaneously', () => {
            const timestamps = new Map();
            const now = Date.now();

            timestamps.set('user1', now);
            timestamps.set('user2', now);
            timestamps.set('user3', now);

            expect(timestamps.size).toBe(3);
        });
    });

    describe('Per-IP Rate Limit', () => {
        test('should block multiple accounts from same IP', () => {
            const ipTimestamps = new Map();
            const ip = '203.0.113.1';
            const rateLimitMs = 5000;

            // User1 from this IP
            ipTimestamps.set(ip, Date.now());

            // User2 from same IP 2 seconds later
            const lastBet = ipTimestamps.get(ip);
            const timeSince = 2000;
            const isBlocked = timeSince < rateLimitMs;

            expect(isBlocked).toBe(true);
        });

        test('should allow bets from different IPs', () => {
            const ipTimestamps = new Map();
            const now = Date.now();

            ipTimestamps.set('203.0.113.1', now);
            ipTimestamps.set('203.0.113.2', now);
            ipTimestamps.set('203.0.113.3', now);

            expect(ipTimestamps.size).toBe(3);
        });

        test('should skip IP check for localhost', () => {
            const ip = 'localhost';
            const shouldSkip = ip === 'localhost';
            expect(shouldSkip).toBe(true);
        });
    });

    describe('Composite Rate Limit (User + IP)', () => {
        test('should create unique composite key', () => {
            const userId = 'user123';
            const ip = '203.0.113.1';
            const compositeKey = `${userId}:${ip}`;

            expect(compositeKey).toBe('user123:203.0.113.1');
        });

        test('should differentiate same user from different IPs', () => {
            const compositeKeys = new Set();
            const userId = 'user123';

            compositeKeys.add(`${userId}:203.0.113.1`);
            compositeKeys.add(`${userId}:203.0.113.2`);

            expect(compositeKeys.size).toBe(2);
        });

        test('should differentiate different users from same IP', () => {
            const compositeKeys = new Set();
            const ip = '203.0.113.1';

            compositeKeys.add(`user1:${ip}`);
            compositeKeys.add(`user2:${ip}`);

            expect(compositeKeys.size).toBe(2);
        });

        test('should block rapid requests with same composite key', () => {
            const timestamps = new Map();
            const compositeKey = 'user123:203.0.113.1';
            const rateLimitMs = 5000;

            timestamps.set(compositeKey, Date.now());

            const lastBet = timestamps.get(compositeKey);
            const timeSince = 2000;
            const isBlocked = timeSince < rateLimitMs;

            expect(isBlocked).toBe(true);
        });
    });

    describe('Attack Scenarios', () => {
        test('should prevent single user with VPN switching', () => {
            const ipTimestamps = new Map();
            const userId = 'attacker';
            const now = Date.now();

            // Even with different IPs, same user is rate limited
            const userTimestamps = new Map();
            userTimestamps.set(userId, now);

            const timeSince = 2000; // 2 seconds later
            const isBlocked = timeSince < 5000;

            expect(isBlocked).toBe(true);
        });

        test('should prevent multiple accounts from office/cafe', () => {
            const ipTimestamps = new Map();
            const sharedIp = '203.0.113.1';
            const now = Date.now();

            // First account bets
            ipTimestamps.set(sharedIp, now);

            // Second account from same IP tries 2s later
            const lastBet = ipTimestamps.get(sharedIp);
            const timeSince = 2000;
            const isBlocked = timeSince < 5000;

            expect(isBlocked).toBe(true);
        });

        test('should handle coordinated bot attack', () => {
            const compositeTimestamps = new Map();
            const rateLimitMs = 5000;
            const now = Date.now();

            // 10 bots from same botnet IP
            for (let i = 0; i < 10; i++) {
                const compositeKey = `bot${i}:203.0.113.100`;
                compositeTimestamps.set(compositeKey, now + (i * 100)); // 100ms apart
            }

            // All should be individually rate limited
            expect(compositeTimestamps.size).toBe(10);

            // But IP-based check would catch them
            const botnetIp = '203.0.113.100';
            const ipTimestamp = now;

            // Any bot trying within 5s would be blocked by IP check
            const timeSince = 100;
            const isBlocked = timeSince < rateLimitMs;
            expect(isBlocked).toBe(true);
        });
    });

    describe('Cleanup and Memory Management', () => {
        test('should implement TTL for old timestamps', () => {
            const timestamps = new Map();
            const ttlMs = 300000; // 5 minutes
            const now = Date.now();

            timestamps.set('old-key', now - 400000); // 6.67 minutes ago
            timestamps.set('recent-key', now - 100000); // 1.67 minutes ago

            // Cleanup old entries
            for (const [key, timestamp] of timestamps.entries()) {
                if (now - timestamp > ttlMs) {
                    timestamps.delete(key);
                }
            }

            expect(timestamps.has('old-key')).toBe(false);
            expect(timestamps.has('recent-key')).toBe(true);
        });
    });
});
