const UserService = require('../src/services/userService');

// Mock dependencies
const mockUserRepository = {
    getUsers: jest.fn(),
    getUser: jest.fn(),
    profile: jest.fn(),
    findUser: jest.fn(),
    findUsers: jest.fn(),
    storeUser: jest.fn(),
    updateUser: jest.fn(),
    updateProfile: jest.fn(),
    deleteUser: jest.fn(),
};

const mockBcrypt = {
    hash: jest.fn(),
    compare: jest.fn(),
};

describe('UserService', () => {
    let userService;

    beforeEach(() => {
        userService = new UserService(mockUserRepository, mockBcrypt);
        jest.clearAllMocks();
    });

    it('should get all users', async () => {
        const mockUsers = [{ id: 1, name: 'Test User' }];
        mockUserRepository.getUsers.mockResolvedValue(mockUsers);

        const users = await userService.getUsers();

        expect(mockUserRepository.getUsers).toHaveBeenCalledTimes(1);
        expect(users).toEqual(mockUsers);
    });

    it('should get a single user by id', async () => {
        const mockUser = { id: 1, name: 'Test User' };
        mockUserRepository.getUser.mockResolvedValue(mockUser);

        const user = await userService.getUser(1);

        expect(mockUserRepository.getUser).toHaveBeenCalledWith(1);
        expect(user).toEqual(mockUser);
    });

    it('should throw an error if user not found in getUser', async () => {
        mockUserRepository.getUser.mockResolvedValue(null);
        await expect(userService.getUser(1)).rejects.toThrow('User not found');
    });

    it('should create a new user', async () => {
        const userData = { username: 'test', email: 'test@test.com', password: 'password', role_id: 2 };
        const hashedPassword = 'hashedpassword';
        const createdUser = { id: 1, name: 'test', email: 'test@test.com' };

        mockUserRepository.findUser.mockResolvedValue(null); // No existing user
        mockBcrypt.hash.mockResolvedValue(hashedPassword);
        mockUserRepository.storeUser.mockResolvedValue(createdUser);

        const result = await userService.storeUser(userData);

        expect(mockUserRepository.findUser).toHaveBeenCalledWith({ email: userData.email });
        expect(mockBcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
        expect(mockUserRepository.storeUser).toHaveBeenCalledWith({
            name: userData.username,
            email: userData.email,
            password: hashedPassword,
            roleId: userData.role_id,
        });
        expect(result).toEqual(createdUser);
    });

    it('should throw an error if email is already in use during storeUser', async () => {
        const userData = { username: 'test', email: 'test@test.com', password: 'password', role_id: 2 };
        mockUserRepository.findUser.mockResolvedValue({ id: 1, email: 'test@test.com' });

        await expect(userService.storeUser(userData)).rejects.toThrow('Email already in use');
    });

    it('should delete a user', async () => {
        const userId = 1;
        mockUserRepository.deleteUser.mockResolvedValue('user Successfully Deleted');

        const result = await userService.deleteUser(userId);

        expect(mockUserRepository.deleteUser).toHaveBeenCalledWith(userId);
        expect(result).toBe('user Successfully Deleted');
    });

    it('should throw an error if user not found on delete', async () => {
        const userId = 1;
        mockUserRepository.deleteUser.mockResolvedValue('user Not Found');

        await expect(userService.deleteUser(userId)).rejects.toThrow('User not found');
    });
});
