const request = require('supertest');
const express = require('express');
const router = require('../src/routes/users/route');

// Mock the dependencies that are injected in route.js
// This is a bit tricky because the instances are created inside the route file.
// A better approach would be to create the app and inject dependencies there.
// For this test, we will mock the service layer that the controller uses.

// We need to mock the service that is used by the controller, which is instantiated in the router file.
// Let's mock the service directly.
const UserService = require('../src/services/userService');

// Mock the entire UserService class
jest.mock('../src/services/userService', () => {
    // Mock the constructor
    const mUserService = {
        getUsers: jest.fn(),
        // Add other methods if you want to test other endpoints
    };
    // The class constructor will return our mock instance
    return jest.fn(() => mUserService);
});

const app = express();
app.use(express.json());
app.use('/api/v1/users', router);

describe('User Routes', () => {
    let userServiceMock;

    beforeEach(() => {
        // Get the mock instance of the service
        const UserServiceMock = UserService;
        userServiceMock = new UserServiceMock();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/v1/users', () => {
        it('should return 200 OK with a list of users', async () => {
            const mockUsers = [
                { id: 'uuid-1', name: 'User One', email: 'user1@test.com' },
                { id: 'uuid-2', name: 'User Two', email: 'user2@test.com' },
            ];

            // Setup the mock implementation for getUsers
            userServiceMock.getUsers.mockResolvedValue(mockUsers);

            const response = await request(app).get('/api/v1/users');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Users retrieved successfully');
            expect(response.body.data).toEqual(mockUsers);
            expect(userServiceMock.getUsers).toHaveBeenCalledTimes(1);
        });

        it('should return 500 if the service throws an error', async () => {
            const errorMessage = 'Internal Server Error';
            userServiceMock.getUsers.mockRejectedValue(new Error(errorMessage));

            const response = await request(app).get('/api/v1/users');

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(errorMessage);
        });
    });
});
