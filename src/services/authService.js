const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const { signAccessToken, signRefreshToken, minimalPayload, verifyToken } = require('../utils/jwt');

class AuthService {
    async register({ name, email, password }) {
        if (!name || !email || !password) {
            throw new Error('Name, email, and password are required');
        }

        const existing = await userRepository.findUser({ email });
        if (existing) {
            const err = new Error('Email already in use');
            err.code = 'EMAIL_IN_USE';
            throw err;
        }

        const hashed = await bcrypt.hash(password, 10);
        const created = await userRepository.storeUser({ name, email, password: hashed });

        const minimal = { id: created.id, name: created.name, email: created.email };
        return { user: minimal, message: 'Register success, please login' };
    }

    async login({ email, password }) {
        if (!email || !password) {
            throw new Error('Email and password are required');
        }
        const user = await userRepository.findUser({ email });
        if (!user || !user.password) {
            const err = new Error('Invalid credentials');
            err.code = 'INVALID_CREDENTIALS';
            throw err;
        }
        if (user.isActive === false) {
            const err = new Error('Account inactive');
            err.code = 'ACCOUNT_INACTIVE';
            throw err;
        }
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            const err = new Error('Invalid credentials');
            err.code = 'INVALID_CREDENTIALS';
            throw err;
        }

        const accessToken = signAccessToken(user);

        return { accessToken };
    }

    async logout(userId) {
        const existing = await userRepository.profile(userId);
        const meta = Object.assign({}, (existing && existing.metadata) || {}, {
            lastLogoutAt: new Date().toISOString(),
        });
        await userRepository.updateUser(userId, { metadata: meta });
        return { success: true };
    }
}

module.exports = new AuthService();