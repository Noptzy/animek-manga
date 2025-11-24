const SORT_MAPPING = {
    newest: { updatedAt: 'desc' },
    oldest: { createdAt: 'asc' },
    asc: { createdAt: 'asc' },
    desc: { createdAt: 'desc' },
    updated: { updatedAt: 'desc' },
    updated_oldest: { updatedAt: 'asc' },

    'a-z': { title: 'asc' },
    'z-a': { title: 'desc' },
    title_asc: { title: 'asc' },
    title_desc: { title: 'desc' },
};

const buildOrderBy = (sortQuery) => {
    const key = (sortQuery || 'updated').toLowerCase();
    return SORT_MAPPING[key] || { updatedAt: 'desc' };
};

const buildWhereClause = (params) => {
    const { q, status, author, illustrator } = params;
    const where = { AND: [] };

    if (q) {
        where.AND.push({
            OR: [{ title: { contains: q, mode: 'insensitive' } }, { altTitle: { contains: q, mode: 'insensitive' } }],
        });
    }

    if (status) {
        where.AND.push({
            status: { equals: status, mode: 'insensitive' },
        });
    }

    if (author) {
        where.AND.push({
            author: { contains: author, mode: 'insensitive' },
        });
    }

    if (illustrator) {
        where.AND.push({
            illustrator: { contains: illustrator, mode: 'insensitive' },
        });
    }

    if (params.genre) {
        const genres = Array.isArray(params.genre) ? params.genre : [params.genre];
        if (genres.length > 0) {
            where.AND.push({
                genres: {
                    some: {
                        genre: {
                            slug: { in: genres },
                        },
                    },
                },
            });
        }
    }

    return where.AND.length > 0 ? where : {};
};

const buildOrder = (sort, order) => {
    if (!sort) return { updatedAt: 'desc' };
    
    const direction = (order || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

    return { [sort]: direction };
};

module.exports = { buildOrderBy, buildWhereClause, buildOrder };
