const UserRepository = require('../src/repositories/userRepository');
const prisma = require('../src/config/prisma');

jest.mock('../src/config/prisma.js');

describe('UserRepository', () => {
    let userRepository;

    beforeEach(() => {
        userRepository = new UserRepository(prisma);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should get users', async () => {
        const mockUsers = [{ id: 1, name: 'Test User' }];
        prisma.user.findMany.mockResolvedValue(mockUsers);

        const users = await userRepository.getUsers();

        expect(prisma.user.findMany).toHaveBeenCalledWith({
            where: {
                roleId: {
                    not: 1,
                },
            },
            select: {
                id: true,
                email: true,
                name: true,
                photoUrl: true,
                roleId: true,
                isActive: true,
                metadata: true,
            },
        });
        expect(users).toEqual(mockUsers);
    });

    it('should get a single user by id', async () => {
        const mockUser = { id: 1, name: 'Test User' };
        prisma.user.findUnique.mockResolvedValue(mockUser);

        const user = await userRepository.getUser(1);

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { id: 1 },
            select: expect.any(Object), // a more specific object could be here
        });
        expect(user).toEqual(mockUser);
    });

     it('should return null if no id is provided to getUser', async () => {
        const user = await userRepository.getUser(null);
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
        expect(user).toBeNull();
    });

    it('should create a user', async () => {
        const newUser = { name: 'New User', email: 'new@test.com' };
        const createdUser = { id: 2, ...newUser };
        // Mock create and the subsequent getUser call
        prisma.user.create.mockResolvedValue(createdUser);
        prisma.user.findUnique.mockResolvedValue(createdUser); // Mock the getUser call inside storeUser

        const result = await userRepository.storeUser(newUser);

        expect(prisma.user.create).toHaveBeenCalledWith({ data: newUser });
        expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: createdUser.id }, select: expect.any(Object) });
        expect(result).toEqual(createdUser);
    });

    it('should update a user', async () => {
        const userId = 1;
        const updateData = { name: 'Updated User' };
        const updatedUser = { id: userId, ...updateData, password: 'hashedpassword' };
        const { password, ...userWithoutPassword } = updatedUser;

        prisma.user.update.mockResolvedValue(updatedUser);

        const result = await userRepository.updateUser(userId, updateData);

        expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: userId }, data: updateData });
        expect(result).toEqual(userWithoutPassword);
    });

    it('should delete a user', async () => {
        const userId = 1;
        prisma.user.delete.mockResolvedValue({});

        const result = await userRepository.deleteUser(userId);

        expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: userId } });
        expect(result).toBe('user Successfully Deleted');
    });
});
