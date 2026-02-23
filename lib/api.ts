// API Configuration
const normalizeBase = (value: string) => value.replace(/\/+$/, '');
const localhostPattern = /(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)/i;
let localhostEnvWarned = false;

const resolveApiOrigin = () => {
    const envBase = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (envBase) {
        const normalized = normalizeBase(envBase.replace(/\/api\/?$/, ''));
        if (typeof window !== 'undefined') {
            const browserHost = window.location.hostname;
            const isBrowserLocal = localhostPattern.test(browserHost);
            if (!isBrowserLocal && localhostPattern.test(normalized)) {
                if (!localhostEnvWarned) {
                    console.warn('NEXT_PUBLIC_API_URL points to localhost on a non-local host; falling back to window origin.');
                    localhostEnvWarned = true;
                }
            } else {
                return normalized;
            }
        } else {
            return normalized;
        }
    }
    if (typeof window !== 'undefined') {
        return normalizeBase(window.location.origin);
    }
    if (process.env.NODE_ENV === 'production') {
        return 'https://trk-project.onrender.com';
    }
    return 'https://trk-project.onrender.com';
};

export const getApiBase = () => resolveApiOrigin();

export const getApiUrl = () => {
    // Force localhost for development stability
    if (process.env.NODE_ENV !== 'production') {
        return 'https://trk-project.onrender.com/api';
    }
    const origin = resolveApiOrigin();
    if (!origin) return '/api';
    return `${origin}/api`;
};

const API_BASE_URL = getApiUrl();
const forceMock = false; // Permanently disabled

// Token storage keys
const TOKEN_KEY = 'trk_token';
const USER_KEY = 'trk_user';

// Get stored token
export const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
};

// Set token
export const setToken = (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
    window.dispatchEvent(new Event('trk_auth_change'));
};

// Remove token
export const removeToken = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event('trk_auth_change'));
};

// Get stored user
export const getStoredUser = () => {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
};

// Set user
export const setStoredUser = (user: object): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
};

// Normalize and persist auth payloads across auth flows
const persistAuthFromResponse = async (response: any): Promise<void> => {
    if (typeof window === 'undefined') return;
    if (!response) return;

    const data = response.data || response;
    const token =
        data?.accessToken ||
        data?.token ||
        response?.accessToken ||
        response?.token ||
        data?.access_token;

    const user = data?.user || response?.user;

    if (token) {
        setToken(token);
    }
    if (user) {
        setStoredUser(user);
    }

    // If token exists but user payload is missing, try to fetch profile once
    if (token && !user) {
        try {
            const me = await apiRequest('/users/me');
            if (me?.data?.user) {
                setStoredUser(me.data.user);
            }
        } catch (e) {
            // Best-effort only
            console.warn('Auth persist fallback failed:', e);
        }
    }
};

// Check if authenticated
export const isAuthenticated = (): boolean => {
    return !!getToken();
};

// Refresh lock to prevent multiple simultaneous refresh requests
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

// Add subscriber to refresh queue
const subscribeTokenRefresh = (cb: (token: string) => void) => {
    refreshSubscribers.push(cb);
};

// Notify all subscribers with new token
const onRefreshed = (token: string) => {
    refreshSubscribers.forEach(cb => cb(token));
    refreshSubscribers = [];
};

// Refresh access token using refresh token cookie
const refreshAccessToken = async (): Promise<string | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include', // Include httpOnly cookies
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Token refresh failed');
        }

        const data = await response.json();

        if (data.status === 'success' && data.data?.accessToken) {
            setToken(data.data.accessToken);
            return data.data.accessToken;
        }

        return null;
    } catch (error) {
        console.error('Token refresh error:', error);
        removeToken();
        return null;
    }
};

// API request helper with JWT and automatic token refresh
export const apiRequest = async (
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
): Promise<any> => {
    // Check if we should use mock data (Only via explicit ENV flag)
    const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

    if (useMock) {
        console.log(`[Mock API] Intercepting request to: ${endpoint}`);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Return mock data based on endpoint
        if (endpoint.includes('/auth/request-password-reset')) {
            return {
                status: 'success',
                message: 'If an account exists for this email, an OTP has been sent.'
            };
        }

        if (endpoint.includes('/auth/reset-password')) {
            return {
                status: 'success',
                message: 'Password reset successful. Please log in again.'
            };
        }

        if (endpoint.includes('/content/posters')) {
            return {
                status: 'success',
                data: [
                    {
                        _id: 'mock-poster-1',
                        type: 'promo',
                        title: 'Become The Protocol Owner',
                        description: 'Unlock governance rights, revenue sharing, and elite tier withdrawal limits.',
                        link: '/dashboard',
                        imageUrl: '',
                        isActive: true
                    },
                    {
                        _id: 'mock-poster-2',
                        type: 'launch',
                        title: 'Lucky Draw Jackpot',
                        description: 'Enter the next draw and secure a share of the protocol prize pool.',
                        link: '/dashboard/lucky-draw',
                        imageUrl: '',
                        stats: [
                            { label: 'Prize Pool', value: '$25,000' },
                            { label: 'Tickets', value: 'Unlimited' },
                            { label: 'Draw', value: 'Daily' }
                        ],
                        isActive: true
                    }
                ]
            };
        }





        if (endpoint.includes('/game/history')) {
            return {
                status: 'success',
                data: {
                    games: [],
                    pagination: {
                        page: 1,
                        total: 0,
                        limit: 20
                    }
                }
            };
        }

        if (endpoint.includes('/notifications/read-all')) {
            return {
                status: 'success',
                data: {
                    unreadCount: 0
                }
            };
        }

        if (endpoint.includes('/notifications/') && endpoint.includes('/read')) {
            return {
                status: 'success',
                data: {
                    unreadCount: 0
                }
            };
        }

        if (endpoint.includes('/notifications')) {
            return {
                status: 'success',
                data: {
                    notifications: [],
                    unreadCount: 0
                }
            };
        }

        if (endpoint.includes('/auth/nonce')) {
            return {
                status: 'success',
                data: {
                    nonce: '123456',
                    message: 'Sign this message to authenticate with TRK: 123456'
                }
            };
        }

        if (endpoint.includes('/auth/link-wallet/nonce')) {
            return {
                status: 'success',
                data: {
                    nonce: '123456',
                    message: 'Link this wallet to my TRK account: 123456'
                }
            };
        }

        if (endpoint.includes('/auth/link-wallet')) {
            let walletAddress = '0x71C9...3A9F';
            if (options?.body) {
                try {
                    const body = JSON.parse(options.body as string);
                    if (body?.walletAddress) walletAddress = body.walletAddress;
                } catch (err) {
                    // ignore parsing errors for mock data
                }
            }
            return {
                status: 'success',
                message: 'Wallet linked successfully',
                data: { walletAddress }
            };
        }

        if (endpoint.includes('/auth/mock-login') || endpoint.includes('/auth/verify')) {
            return {
                status: 'success',
                data: {
                    accessToken: process.env.NEXT_PUBLIC_TEST_TOKEN || 'mock_jwt_token_' + Math.random().toString(36).slice(2),
                    user: {
                        id: 'mock-user-123',
                        walletAddress: '0x71C9...3A9F',
                        practiceBalance: 1000,
                        realBalances: {
                            cash: 1250.50,
                            game: 50.00,
                            cashback: 12.40,
                            lucky: 5.00,
                            directLevel: 45.00,
                            winners: 22.50,
                            roiOnRoi: 452.20
                        },
                        referralCode: 'TRK999',
                        clubRank: 'Rank 2',
                        activation: {
                            tier: 'tier2',
                            totalDeposited: 150,
                            canWithdrawDirectLevel: true,
                            canWithdrawWinners: true,
                            canTransferPractice: true,
                            canWithdrawAll: true,
                            cashbackActive: true,
                            allStreamsUnlocked: true
                        }
                    }
                }
            };
        }

        if (endpoint.includes('/users/me')) {
            return {
                status: 'success',
                data: {
                    user: {
                        id: 'mock-user-123',
                        walletAddress: '0x71C9...3A9F',
                        practiceBalance: 1000,
                        realBalances: {
                            cash: 1250.50,
                            game: 50.00,
                            cashback: 12.40,
                            lucky: 5.00,
                            directLevel: 45.00,
                            winners: 22.50,
                            roiOnRoi: 452.20
                        },
                        referralCode: 'TRK999',
                        clubRank: 'Rank 2',
                        activation: {
                            tier: 'tier2',
                            totalDeposited: 150,
                            canWithdrawDirectLevel: true,
                            canWithdrawWinners: true,
                            canTransferPractice: true,
                            canWithdrawAll: true,
                            cashbackActive: true,
                            allStreamsUnlocked: true
                        }
                    }
                }
            };
        }

        if (endpoint.includes('/roi-on-roi/dashboard')) {
            return {
                status: 'success',
                data: {
                    overview: {
                        todayEarnings: 12.45,
                        totalEarnings: 452.20,
                        teamCashbackToday: 68.40,
                        poolForDistribution: 34.20,
                        poolAllocation: "50%",
                        unlockedLevels: 8
                    },
                    teamStats: {
                        totalTeamMembers: 42,
                        activeMembers: 22
                    }
                }
            };
        }

        if (endpoint.includes('/roi-on-roi/analytics')) {
            return {
                status: 'success',
                data: {
                    performanceData: [
                        { day: 'Mon', value: 12.5 },
                        { day: 'Tue', value: 15.2 },
                        { day: 'Wed', value: 14.8 },
                        { day: 'Thu', value: 18.5 },
                        { day: 'Fri', value: 22.1 },
                        { day: 'Sat', value: 25.4 },
                        { day: 'Sun', value: 21.8 },
                    ],
                    weeklyTotal: 130.3,
                    growthRate: '+12.5%'
                }
            };
        }

        if (endpoint.includes('/rewards/balance')) {
            return {
                status: 'success',
                data: {
                    rewardPoints: 2500,
                    credits: 1000,
                    pointsPerUSDT: 100,
                    conversionRate: '100 points = 1 USDT',
                    estimatedValue: '25.00',
                    minimumRedemption: 500,
                    dailyLimit: 10000,
                    processingWindowHours: [24, 48]
                }
            };
        }

        if (endpoint.includes('/rewards/request-otp')) {
            return {
                status: 'success',
                data: { expiresInMinutes: 10 }
            };
        }

        if (endpoint.includes('/rewards/redeem')) {
            return {
                status: 'success',
                data: {
                    pointsRedeemed: 500,
                    promotionalReward: '5 USDT',
                    remainingPoints: 2000,
                    status: 'pending',
                    note: 'This is a promotional reward, not a withdrawal. Processing may take 24-48 hours.'
                }
            };
        }

        if (endpoint.includes('/packages/purchase')) {
            return {
                status: 'success',
                data: {
                    package: 'starter',
                    creditsReceived: 1100,
                    rewardPointsReceived: 50,
                    newBalance: {
                        credits: 2100,
                        rewardPoints: 2550
                    },
                    membershipLevel: 'starter'
                }
            };
        }

        if (endpoint.includes('/packages/history')) {
            return {
                status: 'success',
                data: {
                    purchases: [],
                    currentMembership: 'starter',
                    totalSpent: 10
                }
            };
        }

        if (endpoint.includes('/packages')) {
            return {
                status: 'success',
                data: {
                    packages: {
                        starter: {
                            price: 10,
                            credits: 1000,
                            bonus: 100,
                            rewardPoints: 50,
                            description: 'Starter Membership Package - Entertainment Credits',
                            benefits: [
                                '1000 entertainment credits',
                                '100 bonus credits',
                                '50 reward points',
                                'Access to all games'
                            ]
                        },
                        premium: {
                            price: 50,
                            credits: 6000,
                            bonus: 1000,
                            rewardPoints: 500,
                            description: 'Premium Membership Package - Enhanced Entertainment',
                            benefits: [
                                '6000 entertainment credits',
                                '1000 bonus credits',
                                '500 reward points',
                                'VIP support',
                                'Exclusive promotions'
                            ]
                        },
                        vip: {
                            price: 100,
                            credits: 15000,
                            bonus: 3000,
                            rewardPoints: 1500,
                            description: 'VIP Membership Package - Ultimate Entertainment',
                            benefits: [
                                '15000 entertainment credits',
                                '3000 bonus credits',
                                '1500 reward points',
                                'Priority VIP support',
                                'Exclusive VIP promotions',
                                'Early access to new games'
                            ]
                        }
                    },
                    disclaimer: 'Entertainment packages only. Virtual credits have no inherent monetary value. This is NOT a gambling platform.'
                }
            };
        }

        if (endpoint.includes('/free-credits/status')) {
            return {
                status: 'success',
                data: {
                    canClaim: true,
                    dailyAmount: 100,
                    lastClaimed: null,
                    nextClaimTime: null,
                    remainingCooldownMs: 0,
                    totalClaimed: 300,
                    currentCredits: 1000
                }
            };
        }

        if (endpoint.includes('/free-credits/claim')) {
            return {
                status: 'success',
                data: {
                    creditsAwarded: 100,
                    newBalance: 1100,
                    nextClaimAvailable: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                }
            };
        }

        if (endpoint.includes('/admin/analytics')) {
            return {
                status: 'success',
                data: {
                    totalUsers: 1245,
                    totalGames: 8921,
                    bannedUsers: 3,
                    totalWagered: 182345,
                    totalPayout: 165210,
                    houseEdge: 17135,
                    recentActivity: []
                }
            };
        }

        if (endpoint.includes('/admin/system/status')) {
            return {
                status: 'success',
                data: {
                    database: 'connected',
                    uptime: 123456,
                    nodeEnv: 'development',
                    realMoneyEnabled: true,
                    version: '2.0.0'
                }
            };
        }

        if (endpoint.includes('/admin/users')) {
            return {
                status: 'success',
                data: {
                    users: [
                        {
                            _id: 'mock-user-1',
                            email: 'admin@trk.dev',
                            walletAddress: '0xABCD...1234',
                            role: 'admin',
                            isBanned: false,
                            isActive: true,
                            credits: 5000,
                            rewardPoints: 2500
                        },
                        {
                            _id: 'mock-user-2',
                            email: 'player@trk.dev',
                            walletAddress: '0xEFGH...5678',
                            role: 'player',
                            isBanned: false,
                            isActive: true,
                            credits: 1200,
                            rewardPoints: 350
                        }
                    ],
                    totalPages: 1,
                    currentPage: 1,
                    total: 2
                }
            };
        }

        if (endpoint.includes('/admin/posters')) {
            const method = (options?.method || 'GET').toUpperCase();
            if (method === 'POST') {
                const body = options?.body ? JSON.parse(options.body as string) : {};
                return {
                    status: 'success',
                    data: {
                        _id: 'mock-poster-' + Math.random().toString(36).slice(2),
                        type: body.type || 'promo',
                        title: body.title || 'New Poster',
                        description: body.description || 'Poster created in mock mode.',
                        link: body.link || '/dashboard',
                        imageUrl: body.imageUrl || '',
                        stats: body.stats || [],
                        isActive: body.isActive ?? true
                    }
                };
            }

            return {
                status: 'success',
                data: [
                    {
                        _id: 'mock-poster-1',
                        type: 'promo',
                        title: 'Become The Protocol Owner',
                        description: 'Unlock governance rights, revenue sharing, and elite tier withdrawal limits.',
                        link: '/dashboard',
                        imageUrl: '',
                        isActive: true
                    },
                    {
                        _id: 'mock-poster-2',
                        type: 'launch',
                        title: 'Lucky Draw Jackpot',
                        description: 'Enter the next draw and secure a share of the protocol prize pool.',
                        link: '/dashboard/lucky-draw',
                        imageUrl: '',
                        stats: [
                            { label: 'Prize Pool', value: '$25,000' },
                            { label: 'Tickets', value: 'Unlimited' },
                            { label: 'Draw', value: 'Daily' }
                        ],
                        isActive: true
                    }
                ]
            };
        }

        if (endpoint.includes('/admin/contract/transactions')) {
            return {
                status: 'success',
                pagination: {
                    page: 1,
                    offset: 100,
                    hasMore: false
                },
                data: [
                    {
                        hash: '0x7a9d2c1b5e8f4c6d9a2b3f1e0d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c',
                        method: 'Token Transfer',
                        status: 'Confirmed',
                        amount: '150.00',
                        symbol: 'USDT',
                        time: '4m ago'
                    },
                    {
                        hash: '0x1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
                        method: 'PlaceBet',
                        status: 'Confirmed',
                        amount: '25.00',
                        symbol: 'USDT',
                        time: '19m ago'
                    },
                    {
                        hash: '0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
                        method: 'WinClaimed',
                        status: 'Confirmed',
                        amount: '320.00',
                        symbol: 'USDT',
                        time: '1h ago'
                    },
                    {
                        hash: '0x2b1a0f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f',
                        method: 'Token Transfer',
                        status: 'Failed',
                        amount: '50.00',
                        symbol: 'USDT',
                        time: '3h ago'
                    }
                ]
            };
        }

        // Default mock success response
        return { status: 'success', data: {} };
    }

    const token = getToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include', // Include cookies for refresh token
        });

        const contentType = response.headers.get('content-type') || '';
        let data: any = null;

        if (contentType.includes('application/json')) {
            data = await response.json();
        } else if (response.status === 204) {
            data = {};
        } else {
            const text = await response.text();
            const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 200);
            throw new Error(`Non-JSON response from API (${response.status}). Check NEXT_PUBLIC_API_URL. ${snippet ? `Response: ${snippet}` : ''}`.trim());
        }

        if (!response.ok) {
            // Handle token expiration with automatic refresh
            if (response.status === 401 && !isRetry && !endpoint.includes('/auth')) {
                // If already refreshing, queue this request
                if (isRefreshing) {
                    return new Promise((resolve) => {
                        subscribeTokenRefresh((newToken: string) => {
                            // Retry with new token
                            apiRequest(endpoint, options, true).then(resolve);
                        });
                    });
                }

                // Start refresh process
                isRefreshing = true;

                try {
                    const newToken = await refreshAccessToken();

                    if (newToken) {
                        isRefreshing = false;
                        onRefreshed(newToken);

                        // Retry original request with new token
                        return apiRequest(endpoint, options, true);
                    } else {
                        // Refresh failed, redirect to login
                        isRefreshing = false;
                        removeToken();
                        if (typeof window !== 'undefined') {
                            window.location.href = '/auth';
                        }
                        throw new Error('Session expired. Please log in again.');
                    }
                } catch (refreshError) {
                    isRefreshing = false;
                    removeToken();
                    throw refreshError;
                }
            }

            if (response.status === 401 && !endpoint.includes('/auth')) {
                removeToken();
            }
            const apiError: any = new Error(data.message || 'API request failed');
            apiError.status = response.status;
            apiError.data = data;
            throw apiError;
        }

        return data;
    } catch (error: any) {
        if (error?.name === 'TypeError' && /fetch/i.test(error?.message || '')) {
            const hint = `API unreachable. Check NEXT_PUBLIC_API_URL (${API_BASE_URL}) and make sure the backend is running.`;
            console.error(`API Error (${endpoint}):`, error, hint);
            throw new Error(hint);
        }
        const msg = error?.message || '';
        const isReferralRequiredNonceError =
            endpoint.includes('/auth/nonce')
            && error?.status === 400
            && (
                error?.data?.requiresReferral
                || msg.includes('Referral code is required')
                || msg.includes('referral code to join')
            );

        // Suppress expected validation noise from console error logs
        if (error?.status === 404 || error?.message?.includes('404') || isReferralRequiredNonceError) {
            // Debug level only
            // console.debug(`API Check (${endpoint}): Not Found`);
        } else {
            console.error(`API Error (${endpoint}):`, error);
        }
        throw error;
    }
};

// Auth API
export const authAPI = {
    // Register with email
    register: async (email: string, password: string, referrerCode?: string) => {
        return apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, referrerCode }),
        });
    },

    // Verify Email OTP
    verifyOtp: async (email: string, otp: string) => {
        return apiRequest('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ email, otp }),
        });
    },

    // Request password reset OTP
    requestPasswordReset: async (email: string) => {
        return apiRequest('/auth/request-password-reset', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    },

    // Reset password with OTP
    resetPassword: async (email: string, otp: string, newPassword: string) => {
        return apiRequest('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ email, otp, newPassword }),
        });
    },

    // Login with email
    loginEmail: async (email: string, password: string) => {
        const response = await apiRequest('/auth/login-email', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        await persistAuthFromResponse(response);

        return response;
    },

    // Login with Google
    loginGoogle: async (token: string) => {
        const response = await apiRequest('/auth/google', {
            method: 'POST',
            body: JSON.stringify({ token }),
        });

        await persistAuthFromResponse(response);

        return response;
    },

    // Link wallet to account
    linkWallet: async (walletAddress: string, signature: string) => {
        return apiRequest('/auth/link-wallet', {
            method: 'POST',
            body: JSON.stringify({ walletAddress, signature }),
        });
    },

    // Get nonce for linking wallet (email -> wallet)
    getLinkWalletNonce: async () => {
        return apiRequest('/auth/link-wallet/nonce', {
            method: 'POST'
        });
    },

    // Get nonce for wallet signature
    getNonce: async (walletAddress: string, referrerCode?: string) => {
        return apiRequest('/auth/nonce', {
            method: 'POST',
            body: JSON.stringify({
                walletAddress,
                // Backend expects `referralCode` for nonce creation; keep `referrerCode` for compatibility.
                referralCode: referrerCode,
                referrerCode
            }),
        });
    },

    // Verify wallet signature
    verify: async (walletAddress: string, signature: string) => {
        const response = await apiRequest('/auth/verify', {
            method: 'POST',
            body: JSON.stringify({ walletAddress, signature }),
        });

        await persistAuthFromResponse(response);

        return response;
    },

    // Mock login (for development)
    mockLogin: async (walletAddress?: string) => {
        const response = await apiRequest('/auth/mock-login', {
            method: 'POST',
            body: JSON.stringify({ walletAddress }),
        });

        await persistAuthFromResponse(response);

        return response;
    },

    // Logout
    logout: async () => {
        try {
            // Call backend logout endpoint to revoke refresh token
            await apiRequest('/auth/logout', {
                method: 'POST',
            });
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            removeToken();
        }
    },

    // Logout from all devices
    logoutAll: async () => {
        try {
            await apiRequest('/auth/logout-all', {
                method: 'POST',
            });
        } catch (error) {
            console.error('Logout all API error:', error);
        } finally {
            removeToken();
        }
    },
};

// User API
export const userAPI = {
    // Get current user
    getMe: async () => {
        return apiRequest('/users/me');
    },

    // Get user stats
    getStats: async () => {
        return apiRequest('/users/stats');
    },

    // Update user profile
    updateProfile: async (data: any) => {
        return apiRequest('/users/me', {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },
};

// Game API
export const gameAPI = {
    // Get next nonce for commit-reveal
    getNextNonce: async () => {
        return apiRequest('/game/bet/nonce');
    },

    // COMMIT PHASE: Commit to a bet (provably fair)
    commitBet: async (betData: {
        gameType: 'practice' | 'real';
        gameVariant: string;
        betAmount: number;
        pickedNumber: number | number[];
    }, clientSeed?: string, nonce?: number) => {
        // Generate request ID for anti-replay
        const requestId = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).substr(2);

        // Generate client seed if not provided
        let finalClientSeed = clientSeed;
        if (!finalClientSeed && typeof crypto !== 'undefined') {
            const array = new Uint8Array(16);
            crypto.getRandomValues(array);
            finalClientSeed = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        }

        // Get nonce if not provided
        let finalNonce = nonce;
        if (!finalNonce) {
            const nonceResponse = await gameAPI.getNextNonce();
            finalNonce = nonceResponse.data.nextNonce;
        }

        return apiRequest('/game/bet/commit', {
            method: 'POST',
            headers: {
                'X-Request-ID': requestId
            },
            body: JSON.stringify({
                betData,
                clientSeed: finalClientSeed,
                nonce: finalNonce,
                requestId,
                timestamp: Date.now()
            }),
        });
    },

    // REVEAL PHASE: Reveal bet and get result
    revealBet: async (commitmentId: string) => {
        return apiRequest('/game/bet/reveal', {
            method: 'POST',
            body: JSON.stringify({ commitmentId }),
        });
    },

    // Verify game fairness
    verifyGame: async (gameId: string) => {
        return apiRequest('/game/bet/verify', {
            method: 'POST',
            body: JSON.stringify({ gameId }),
        });
    },

    // Legacy: Simple bet (practice only, deprecated)
    placeBet: async (gameType: 'practice' | 'real', betAmount: number, pickedNumber: number) => {
        return apiRequest('/game/bet', {
            method: 'POST',
            body: JSON.stringify({ gameType, betAmount, pickedNumber }),
        });
    },

    // Get game history
    getHistory: async (gameType?: string, limit = 20, page = 1) => {
        const params = new URLSearchParams();
        if (gameType) params.append('gameType', gameType);
        params.append('limit', limit.toString());
        params.append('page', page.toString());

        return apiRequest(`/game/history?${params.toString()}`);
    },

    // Get live games feed
    getLive: async () => {
        return apiRequest('/game/live');
    },

    // Get Lucky Draw Status
    getLuckyDrawStatus: async () => {
        return apiRequest('/lucky-draw/status');
    },

    // Buy Lucky Draw Tickets
    buyLuckyDrawTickets: async (quantity: number) => {
        return apiRequest('/lucky-draw/buy-ticket', {
            method: 'POST',
            body: JSON.stringify({ quantity })
        });
    },

    // Get User Tickets
    getMyTickets: async () => {
        return apiRequest('/lucky-draw/my-tickets');
    },

    // Record on-chain game (for backend sync)
    recordOnchain: async (payload: { txHash: string; amount: number; prediction: string; gameType: string; roundId: string }) => {
        return apiRequest('/game/record-onchain', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }
};

// Referral API
export const referralAPI = {
    // Get referral stats
    getStats: async () => {
        return apiRequest('/referral/stats');
    },

    // Claim referral earnings to main wallet
    claimEarnings: async () => {
        return apiRequest('/referral/claim', {
            method: 'POST',
        });
    },

    // Apply referral code
    applyCode: async (referralCode: string) => {
        return apiRequest('/referral/apply', {
            method: 'POST',
            body: JSON.stringify({ referralCode }),
        });
    },

    // Get commissions
    getCommissions: async () => {
        return apiRequest('/referral/commissions');
    },

    // Resolve referral code to wallet address
    resolve: async (referralCode: string) => {
        const code = encodeURIComponent(referralCode);
        return apiRequest(`/referral/resolve/${code}`);
    }
};

// Deposit/Activation API
export const depositAPI = {
    // Get activation status
    getStatus: async () => {
        return apiRequest('/deposit/status');
    },

    // Make a deposit
    deposit: async (amount: number, txHash?: string) => {
        return apiRequest('/deposit/deposit', {
            method: 'POST',
            body: JSON.stringify({ amount, txHash }),
        });
    },

    // Transfer practice balance to real (Tier 2 only)
    transferPractice: async (amount: number) => {
        return apiRequest('/deposit/transfer-practice', {
            method: 'POST',
            body: JSON.stringify({ amount }),
        });
    },

    // Withdraw funds
    withdraw: async (walletType: string, amount: number, toAddress?: string, onChainTx?: string) => {
        return apiRequest('/deposit/withdraw', {
            method: 'POST',
            body: JSON.stringify({ walletType, amount, toAddress, onChainTx }),
        });
    },

    // Manual top-up to Lucky Draw Wallet
    luckyTopup: async (fromWallet: string, amount: number) => {
        return apiRequest('/deposit/lucky-topup', {
            method: 'POST',
            body: JSON.stringify({ fromWallet, amount }),
        });
    },
};

// Rewards API (Sweepstakes Model)
export const rewardsAPI = {
    // Get reward balance and conversion
    getBalance: async () => {
        return apiRequest('/rewards/balance');
    },

    // Request OTP for redemption
    requestOtp: async () => {
        return apiRequest('/rewards/request-otp', {
            method: 'POST'
        });
    },

    // Redeem reward points
    redeem: async (rewardPoints: number, otp: string) => {
        return apiRequest('/rewards/redeem', {
            method: 'POST',
            body: JSON.stringify({ rewardPoints, otp })
        });
    },

    // Redemption history
    getHistory: async () => {
        return apiRequest('/rewards/history');
    }
};

// Packages API (Membership)
export const packagesAPI = {
    getPackages: async () => {
        return apiRequest('/packages');
    },
    purchase: async (packageType: string, txHash: string) => {
        return apiRequest('/packages/purchase', {
            method: 'POST',
            body: JSON.stringify({ packageType, txHash })
        });
    },
    getHistory: async () => {
        return apiRequest('/packages/history');
    }
};

// Free Credits API (No Purchase Necessary)
export const freeCreditsAPI = {
    status: async () => {
        return apiRequest('/free-credits/status');
    },
    claim: async () => {
        return apiRequest('/free-credits/claim', {
            method: 'POST'
        });
    }
};

// Notifications API
export const notificationsAPI = {
    getAll: async (category?: string) => {
        const params = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : '';
        return apiRequest(`/notifications${params}`);
    },
    markRead: async (id: string) => {
        return apiRequest(`/notifications/${id}/read`, {
            method: 'PATCH'
        });
    },
    markAllRead: async () => {
        return apiRequest('/notifications/read-all', {
            method: 'PATCH'
        });
    }
};

// Club (Ecosystem Rank) API
export const clubAPI = {
    getStatus: async () => {
        return apiRequest('/club/status');
    },
    getStructure: async () => {
        return apiRequest('/club/structure');
    }
};

// Admin API (RBAC protected)
export const adminAPI = {
    getAnalytics: async () => {
        return apiRequest('/admin/analytics');
    },
    getAnalyticsHistory: async (days: number = 7) => {
        return apiRequest(`/admin/analytics/history?days=${days}`);
    },
    getSystemStatus: async () => {
        return apiRequest('/admin/system/status');
    },
    getUsers: async (params?: { page?: number; limit?: number; role?: string; search?: string }) => {
        const qs = new URLSearchParams();
        if (params?.page) qs.append('page', params.page.toString());
        if (params?.limit) qs.append('limit', params.limit.toString());
        if (params?.role) qs.append('role', params.role);
        if (params?.search) qs.append('search', params.search);
        return apiRequest(`/admin/users?${qs.toString()}`);
    },
    banUser: async (id: string, reason?: string) => {
        return apiRequest(`/admin/users/${id}/ban`, {
            method: 'PATCH',
            body: JSON.stringify({ reason })
        });
    },
    unbanUser: async (id: string) => {
        return apiRequest(`/admin/users/${id}/unban`, {
            method: 'PATCH'
        });
    },
    updateRole: async (id: string, role: 'player' | 'admin' | 'superadmin') => {
        return apiRequest(`/admin/users/${id}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role })
        });
    },
    getGames: async (params?: { page?: number; limit?: number; gameType?: string }) => {
        const qs = new URLSearchParams();
        if (params?.page) qs.append('page', params.page.toString());
        if (params?.limit) qs.append('limit', params.limit.toString());
        if (params?.gameType) qs.append('gameType', params.gameType);
        return apiRequest(`/admin/games?${qs.toString()}`);
    },
    getWallets: async () => {
        return apiRequest('/admin/wallets');
    },
    addWallet: async (payload: { name: string; address: string; type?: string }) => {
        return apiRequest('/admin/wallets', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },
    deleteWallet: async (id: string) => {
        return apiRequest(`/admin/wallets/${id}`, {
            method: 'DELETE'
        });
    },
    getContractTransactions: async (params?: { page?: number; offset?: number; sort?: 'asc' | 'desc'; mode?: 'tokentx' | 'txlist' }) => {
        const qs = new URLSearchParams();
        if (params?.page) qs.append('page', params.page.toString());
        if (params?.offset) qs.append('offset', params.offset.toString());
        if (params?.sort) qs.append('sort', params.sort);
        if (params?.mode) qs.append('mode', params.mode);
        const suffix = qs.toString() ? `?${qs.toString()}` : '';
        return apiRequest(`/admin/contract/transactions${suffix}`);
    },
    getJackpotStatus: async () => {
        return apiRequest('/lucky-draw/status');
    },
    updateJackpotParams: async (params: { newPrice?: number; newLimit?: number }) => {
        return apiRequest('/lucky-draw/admin/update-params', {
            method: 'POST',
            body: JSON.stringify(params)
        });
    },
    toggleJackpotPause: async () => {
        return apiRequest('/lucky-draw/admin/toggle-pause', {
            method: 'POST'
        });
    },
    withdrawJackpotSurplus: async () => {
        return apiRequest('/lucky-draw/admin/withdraw-surplus', {
            method: 'POST'
        });
    },
    getDBStats: async (options?: RequestInit) => {
        return apiRequest('/admin/db/stats', options);
    },
    getPosters: async () => {
        return apiRequest('/admin/posters');
    },
    createPoster: async (data: any) => {
        return apiRequest('/admin/posters', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    updatePoster: async (id: string, data: any) => {
        return apiRequest(`/admin/posters/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
};

// ROI on ROI API
export const roiOnRoiAPI = {
    // Get dashboard stats
    getDashboard: async () => {
        return apiRequest('/roi-on-roi/dashboard');
    },

    // Get yield analytics
    getAnalytics: async () => {
        return apiRequest('/roi-on-roi/analytics');
    },

    // Update rates (Admin only)
    updateRates: async (rates: number[]) => {
        return apiRequest('/roi-on-roi/admin/update-rates', {
            method: 'POST',
            body: JSON.stringify({ rates }),
        });
    },

    // Update allocation (Admin only)
    updateAllocation: async (allocation: number) => {
        return apiRequest('/roi-on-roi/admin/update-allocation', {
            method: 'POST',
            body: JSON.stringify({ allocation }),
        });
    },
};

// Content API (Public)
export const contentAPI = {
    getPosters: async () => {
        return apiRequest('/content/posters');
    }
};

export default {
    auth: authAPI,
    user: userAPI,
    game: gameAPI,
    referral: referralAPI,
    deposit: depositAPI,
    rewards: rewardsAPI,
    packages: packagesAPI,
    freeCredits: freeCreditsAPI,
    notifications: notificationsAPI,
    club: clubAPI,
    admin: adminAPI,
    roiOnRoi: roiOnRoiAPI,
    content: contentAPI
};
