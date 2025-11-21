const { buildOrderBy, buildWhereClause, buildOrder } = require('../utils/ParamFilters');
const mangaService = require('../services/mangaService');
const mangaRepository = require('../repositories/mangaRepository');

// Mock mangaRepository
jest.mock('../repositories/mangaRepository');

describe('Search Functionality', () => {
    describe('ParamFilters', () => {
        test('buildOrderBy should return correct sort options', () => {
            expect(buildOrderBy('newest')).toEqual({ updatedAt: 'desc' });
            expect(buildOrderBy('oldest')).toEqual({ createdAt: 'asc' });
            expect(buildOrderBy('asc')).toEqual({ createdAt: 'asc' });
            expect(buildOrderBy('desc')).toEqual({ createdAt: 'desc' });
            expect(buildOrderBy('title_asc')).toEqual({ title: 'asc' });
            expect(buildOrderBy('unknown')).toEqual({ updatedAt: 'desc' }); // default
        });

        test('buildOrder should return correct order object', () => {
            expect(buildOrder('title', 'asc')).toEqual({ title: 'asc' });
            expect(buildOrder('title', 'desc')).toEqual({ title: 'desc' });
            expect(buildOrder('title')).toEqual({ title: 'asc' }); // default asc
            expect(buildOrder(null)).toEqual({ updatedAt: 'desc' });
        });

        test('buildWhereClause should return correct where clause', () => {
            const params = {
                s: 'Naruto',
                author: 'Kishimoto',
                status: 'Ongoing'
            };
            const where = buildWhereClause({
                q: params.s,
                status: params.status,
                author: params.author
            });

            expect(where).toEqual({
                AND: [
                    {
                        OR: [
                            { title: { contains: 'Naruto', mode: 'insensitive' } },
                            { altTitle: { contains: 'Naruto', mode: 'insensitive' } }
                        ]
                    },
                    { status: { equals: 'Ongoing', mode: 'insensitive' } },
                    { author: { contains: 'Kishimoto', mode: 'insensitive' } }
                ]
            });
        });
    });

    describe('MangaService', () => {
        test('searchMangas should call repository with correct parameters', async () => {
            const queryParams = {
                s: 'One Piece',
                sort: 'oldest',
                author: 'Oda',
                page: '2',
                limit: '10'
            };

            mangaRepository.search.mockResolvedValue({
                mangas: [],
                total: 0,
                page: 2,
                limit: 10,
                totalPages: 0
            });

            await mangaService.searchMangas(queryParams);

            expect(mangaRepository.search).toHaveBeenCalledWith({
                where: expect.objectContaining({
                    AND: expect.arrayContaining([
                        expect.objectContaining({
                            OR: [
                                { title: { contains: 'One Piece', mode: 'insensitive' } },
                                { altTitle: { contains: 'One Piece', mode: 'insensitive' } }
                            ]
                        }),
                        { author: { contains: 'Oda', mode: 'insensitive' } }
                    ])
                }),
                orderBy: { createdAt: 'asc' },
                page: 2,
                limit: 10
            });
        });
    });

    describe('MangaService On-Demand Scraping', () => {
        const komikIndoScrap = require('../scrap/manga/komikIndoScrap');
        jest.mock('../scrap/manga/komikIndoScrap');

        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('searchMangas should fallback to scraper if DB is empty', async () => {
            const queryParams = { s: 'New Manga' };
            
            // First search returns empty
            mangaRepository.search
                .mockResolvedValueOnce({ total: 0, mangas: [] })
                .mockResolvedValueOnce({ total: 1, mangas: [{ title: 'New Manga' }] }); // Second search returns result

            komikIndoScrap.getKomikIndoSearch.mockResolvedValue({
                data: [{ title: 'New Manga', slug: 'new-manga' }]
            });

            await mangaService.searchMangas(queryParams);

            expect(komikIndoScrap.getKomikIndoSearch).toHaveBeenCalledWith('New Manga');
            expect(mangaRepository.upsertManga).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Manga' }));
            expect(mangaRepository.search).toHaveBeenCalledTimes(2);
        });

        test('getMangaDetailBySlug should lazy scrape if chapters are missing', async () => {
            const slug = 'lazy-manga';
            
            // First find returns manga without chapters
            mangaRepository.findMangaBySlug
                .mockResolvedValueOnce({ slug, chapters: [] })
                .mockResolvedValueOnce({ slug, chapters: [{ title: 'Chapter 1' }] });

            komikIndoScrap.getKomikIndoDetail.mockResolvedValue({
                slug,
                title: 'Lazy Manga',
                chapters: [{ title: 'Chapter 1' }]
            });

            await mangaService.getMangaDetailBySlug(slug);

            expect(komikIndoScrap.getKomikIndoDetail).toHaveBeenCalledWith(slug);
            expect(mangaRepository.upsertManga).toHaveBeenCalled();
            expect(mangaRepository.findMangaBySlug).toHaveBeenCalledTimes(2);
        });
    });
});
