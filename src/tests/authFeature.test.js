
const request = require('supertest');
const { describe, it, expect, beforeAll, afterAll } = require('bun:test');
const app = require('../../app');
const prisma = require('../config/prisma');

describe('Auth Features Integration Tests', () => {
    let refreshToken = '';
    let accessToken = '';
    const TEST_USER_EMAIL = 'auth_test_user@gmail.com';

    beforeAll(async () => {
         try {
            await prisma.user.deleteMany({ where: { email: TEST_USER_EMAIL } });
         } catch(e) {}
    });

    afterAll(async () => {
        await prisma.user.deleteMany({ where: { email: TEST_USER_EMAIL } });
        await prisma.$disconnect();
    });

    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/v1/auth/register')
            .send({
                name: 'Auth Test User',
                email: TEST_USER_EMAIL,
                password: 'password123'
            });
        
        expect(res.status).toBe(201);
        expect(res.body.data.newUser).toHaveProperty('id');
    });

    it('should login and return access and refresh tokens', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: TEST_USER_EMAIL,
                password: 'password123'
            });

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('accessToken');
        expect(res.body.data).toHaveProperty('refreshToken');
        
        accessToken = res.body.data.accessToken;
        refreshToken = res.body.data.refreshToken;
        
        // Wait 1.5s to ensure new token has different IAT (JWT uses seconds precision)
        await new Promise(resolve => setTimeout(resolve, 1500));
    });

    it('should refresh access token using valid refresh token', async () => {
        const res = await request(app)
            .post('/api/v1/auth/refresh-token')
            .send({ refreshToken });

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('accessToken');
        expect(res.body.data).toHaveProperty('refreshToken');
        expect(res.body.data.accessToken).not.toBe(accessToken); 
        expect(res.body.data.refreshToken).not.toBe(refreshToken); // Should be a new refresh token
        
        // Update tokens for subsequent usage if any
        // Note: we do NOT update the 'refreshToken' variable here yet, 
        // because we want to test REUSE of the OLD 'refreshToken' in the next test.
        
        // This is the NEW token
        const newRefreshToken = res.body.data.refreshToken;
        
        // We keep 'refreshToken' as the OLD one for the next test.
        // We will update it after the reuse test.
        
        // Actually, let's just use a separate variable for clarity
        global.oldRefreshToken = refreshToken; 
        global.newRefreshToken = newRefreshToken;
        
        accessToken = res.body.data.accessToken;
        refreshToken = newRefreshToken; 
    });

    it('should fail when reusing the OLD refresh token (Strict Rotation)', async () => {
        const res = await request(app)
            .post('/api/v1/auth/refresh-token')
            .send({ refreshToken: global.oldRefreshToken }); // Using the rotated-out token
        
        expect(res.status).toBe(403);
    });

    it('should fail to refresh with invalid token', async () => {
        const res = await request(app)
            .post('/api/v1/auth/refresh-token')
            .send({ refreshToken: 'invalid_token_string' });
        
        expect(res.status).toBe(403);
    });

    it('should fail to refresh using an access token (security check)', async () => {
        const res = await request(app)
            .post('/api/v1/auth/refresh-token')
            .send({ refreshToken: accessToken }); // Using access token instead of refresh token
        
        expect(res.status).toBe(403);
    });

    it('should fail to refresh without token', async () => {
        const res = await request(app)
            .post('/api/v1/auth/refresh-token')
            .send({});
        
        expect(res.status).toBe(400);
    });
});
