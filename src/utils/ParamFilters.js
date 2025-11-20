const ALLOWED_SORTS = {
  newest: { createdAt: 'desc' },
  terbaru: { createdAt: 'desc' },        
  oldest: { createdAt: 'asc' },
  terlama: { createdAt: 'asc' },        
  updated_newest: { updatedAt: 'desc' },
  updated_oldest: { updatedAt: 'asc' },

  title_asc: { title: 'asc' },
  title_desc: { title: 'desc' },
  abcd: { title: 'asc' },               
  zyxw: { title: 'desc' },             
};

const ALLOWED_FIELDS = ['title', 'createdAt', 'updatedAt', 'author', 'status'];

function buildOrder(sort, order) {
  if (!sort) return { updatedAt: 'desc' }; 

  const s = String(sort).toLowerCase();

  if (ALLOWED_SORTS[s]) return ALLOWED_SORTS[s];

  if (ALLOWED_FIELDS.includes(s)) {
    const ord = (String(order || 'asc').toLowerCase() === 'desc') ? 'desc' : 'asc';
    return { [s]: ord };
  }

  return { updatedAt: 'desc' };
}

module.exports = { buildOrder };
