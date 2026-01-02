const interactionController = require('../controllers/user/interactionController');
const interactionService = require('../services/interactionService');
const resHandler = require('../utils/resHandler');

jest.mock('../services/interactionService');
jest.mock('../utils/logger'); // Mock logger to avoid console clutter

describe('Interaction Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: { id: 'user-uuid' },
            body: {},
            query: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
    });

    // --- Favorites ---

    describe('toggleFavorite', () => {
        it('should toggle favorite successfully', async () => {
            req.body = { type: 'anime', id: 'anime-uuid' };
            interactionService.toggleFavorite.mockResolvedValue({ status: 'added', message: 'Added' });

            await interactionController.toggleFavorite(req, res);

            expect(interactionService.toggleFavorite).toHaveBeenCalledWith('user-uuid', 'anime', 'anime-uuid');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'Added',
            }));
        });

        it('should return 400 if type or id missing', async () => {
            req.body = { type: 'anime' }; // missing id

            await interactionController.toggleFavorite(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should handle service errors', async () => {
            req.body = { type: 'anime', id: 'anime-uuid' };
            interactionService.toggleFavorite.mockRejectedValue(new Error('Service Error'));

            await interactionController.toggleFavorite(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Service Error',
            }));
        });
    });

    describe('getFavorites', () => {
        it('should get favorites successfully', async () => {
            req.query = { type: 'anime', page: '1', limit: '10' };
            const mockResult = { data: [], total: 0 };
            interactionService.getFavorites.mockResolvedValue(mockResult);

            await interactionController.getFavorites(req, res);

            expect(interactionService.getFavorites).toHaveBeenCalledWith('user-uuid', 'anime', 1, 10);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: mockResult,
            }));
        });
    });

    // --- History ---

    describe('addHistory', () => {
        it('should add history successfully', async () => {
            req.body = { type: 'anime', id: 'episode-uuid' };
            interactionService.addHistory.mockResolvedValue({});

            await interactionController.addHistory(req, res);

            expect(interactionService.addHistory).toHaveBeenCalledWith('user-uuid', { type: 'anime', id: 'episode-uuid' });
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return 400 if missing fields', async () => {
            req.body = {};
            await interactionController.addHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getHistory', () => {
        it('should get history successfully', async () => {
            req.query = { page: '1' };
            const mockResult = { data: [] };
            interactionService.getHistory.mockResolvedValue(mockResult);

            await interactionController.getHistory(req, res);

            expect(interactionService.getHistory).toHaveBeenCalledWith('user-uuid', undefined, 1, 20); // Default limit
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    // --- Stats ---

    describe('getUserStats', () => {
        it('should get user stats', async () => {
            const mockStats = { totalFavorites: 5, totalWatchedOrRead: 10 };
            interactionService.getUserStats.mockResolvedValue(mockStats);

            await interactionController.getUserStats(req, res);

            expect(interactionService.getUserStats).toHaveBeenCalledWith('user-uuid');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: mockStats,
            }));
        });
    });

    describe('getAdminPopularStats', () => {
        it('should get popular stats', async () => {
            req.query = { type: 'anime' };
            const mockStats = { mostFavorited: [], mostViewed: [] };
            interactionService.getPopularContent.mockResolvedValue(mockStats);

            await interactionController.getAdminPopularStats(req, res);

            expect(interactionService.getPopularContent).toHaveBeenCalledWith('anime');
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
