const { buildOrder } = require('./src/utils/ParamFilters');
const mangaService = require('./src/services/mangaService');

console.log('Checking buildOrder...');
if (typeof buildOrder === 'function') {
    console.log('SUCCESS: buildOrder is a function.');
} else {
    console.error('ERROR: buildOrder is ' + typeof buildOrder);
}

console.log('Checking mangaService initialization...');
try {
    // Just accessing the service to ensure imports didn't crash
    console.log('mangaService loaded successfully.');
} catch (e) {
    console.error('ERROR loading mangaService:', e);
}
