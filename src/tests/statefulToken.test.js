const request = require('supertest');
const { describe, it, expect, beforeAll } = require('bun:test');
const path = require('path');

const appPath = path.join(process.cwd(), 'app.js');
const redisPath = path.join(process.cwd(), 'src/config/RedisUpstash.js');
const prismaPath = path.join(process.cwd(), 'src/config/prisma.js');

const app = require(appPath);
const redis = require(redisPath);
const Prisma = require(prismaPath);

// Helper to wait
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Random email to avoid conflict
const email = `stateful_${Date.now()}@test.com`;
const password = 'Password123'; // Alphanumeric only to satisfy validator
let userId;
let token1;
let refreshToken1;
let token2;

describe('Stateful Access Token Logic', () => {

    beforeAll(async () => {
        // Clean up
        const user = await Prisma.user.findFirst({ where: { email } });
        if (user) {
            await Prisma.user.delete({ where: { id: user.id } });
        }
    });

    it('1. Should register and login to get Token 1', async () => {
        // Register
        const regRes = await request(app).post('/api/v1/auth/register').send({
            name: 'Stateful Tester',
            email,
            password
        });
        
        // Login
        const res = await request(app).post('/api/v1/auth/login').send({
            email,
            password
        });

        expect(res.status).toBe(200);
        expect(res.body.data.accessToken).toBeDefined();
        
        token1 = res.body.data.accessToken;
        refreshToken1 = res.body.data.refreshToken;
        
        // Decode ID for Redis check if needed, but integration test uses the API behavior
    });

    it('2. Token 1 should be valid (stored in Redis)', async () => {
        const res = await request(app)
            .get('/api/v1/auth/me') // Assuming /me or any protected route exists. Let's use /health if protected? No /health is public.
            // Let's use /api/v1/users (admin only?) or similar.
            // Wait, we need a standard user protected route.
            // Let's use /api/v1/auth/logout which is protected? No logout might invalidate.
            // Let's try to access a protected resource. 
            // In routes/index.js -> authRoutes doesn't have /me.
            // userRoute -> /users is protected.
            // Let's try GET /api/v1/users (User list).
            // But wait, user list requires Admin? No, users can generally list or maybe restricted.
            // Let's check roles.js. requireMember?
            // Let's look at `authFeature.test.js` to see what protected route to use.
            // It uses POST /api/v1/auth/logout.
            // Let's try accessing a route that won't change state. 
            // How about POST /api/v1/anime/bookmark? 
            // Better: Let's assume GET /api/v1/users is protected by auth middleware at least.
        
        // Actually, let's use a route we know is protected:
        // /api/v1/users (list users). Auth middleware + requireAdmin usually.
        // Wait, the registered user is standard user (role 1).
        // Standard user might not allow /users.
        // Let's check `userRoute.js`.
        
        // Fallback: We can just use the fact that invalid token returns 401. 
        // If valid, it might return 403 (Not Admin) or 200.
        // Key is: 401 means Token Failed (Auth Middleware). 403 means Role failed (Auth passed).
        // So passing Auth check is enough.
        
        const checkRes = await request(app)
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${token1}`);
            
        // Expect 200 or 403, BUT NOT 401.
        expect(checkRes.status).not.toBe(401); 
    });

    it('3. Refresh Token should issue Token 2 and Invalidate Token 1', async () => {
        await sleep(1000); // Ensure IAT diff
        
        const res = await request(app).post('/api/v1/auth/refresh-token').send({
            refreshToken: refreshToken1
        });
        
        expect(res.status).toBe(200);
        token2 = res.body.data.accessToken;
        expect(token2).not.toBe(token1);
    });

    it('4. Token 2 should be valid', async () => {
        const checkRes = await request(app)
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${token2}`);
        
        expect(checkRes.status).not.toBe(401);
    });

    it('5. Token 1 should be REVOKED (401 Unauthorized)', async () => {
        const checkRes = await request(app)
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${token1}`);
            
        // THIS IS THE CRITICAL TEST
        // Old Logic: would be valid (200/403)
        // New Logic: Must be 401 (Session Expired/Revoked)
        expect(checkRes.status).toBe(401); 
        expect(checkRes.body.message).toContain('Session Expired');
    });

});
