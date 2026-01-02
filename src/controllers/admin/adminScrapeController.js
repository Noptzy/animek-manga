const scrapingService = require('../../services/scrapingService');
const oploverzService = require('../../services/oploverzService'); // Assuming this exists for Anime
const resHandler = require('../../utils/resHandler');
const logger = require('../../utils/logger');

const redis = require('../../config/RedisUpstash');

const oploverzHealer = require('../../workers/oploverzHealer'); // Import the Healer

exports.triggerMangaScrape = async (req, res) => {
    try {
        const LOCK_KEY = 'admin:scrape:manga:cooldown';
        const isLocked = await redis.get(LOCK_KEY);

        if (isLocked) {
            return res.status(429).json(resHandler.error('Too Many Requests', { 
                message: 'Scraping is already in progress or in cooldown. Please wait 1 minute.' 
            }, 429).toJSON());
        }

        logger.info('Manual trigger for MANGA scrape received from Admin.');
        
        // Use existing service logic (fire and forget or wait depending on preference)
        // Since it's an admin manual trigger, 'Accepted' (202) is good.
        scrapingService.runScraping(); 
        
        // Set cooldown for 60 seconds
        await redis.set(LOCK_KEY, '1', { ex: 60 });

        return res.status(202).json(resHandler.success('Accepted', { message: 'Manga scraping process initiated.' }).toJSON());
    } catch (error) {
        logger.error(`Manual Manga Scrape error: ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to trigger manga scrape').toJSON());
    }
};

exports.triggerAnimeScrape = async (req, res) => {
    try {
        logger.info('Manual trigger for ANIME scrape received from Admin.');
        
        // Check finding the right service for Anime. 
        // Based on previous chats, 'oploverzService' handles anime.
        // We need to see if there is a 'scrapeAll' or similar. 
        // If not, we might need to expose it.
        // Currently, Anime uses "Lazy Healing" and does not have a dedicated background scraping worker like Manga.
        // Returning 501 to indicate this feature is not available yet for Anime.
        return res.status(501).json(resHandler.error('Not Implemented', { 
            message: 'Anime scraping is currently Lazy-Load only (triggered by user visits). Background mass-scraping is not yet implemented.' 
        }).toJSON());

    } catch (error) {
        logger.error(`Manual Anime Scrape error: ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to trigger anime scrape').toJSON());
    }
};

exports.triggerMassHeal = async (req, res) => {
    try {
        logger.info('[ADMIN] Triggering Mass Anime Heal...');
        const result = await oploverzHealer.healAllAnime();
        
        if (result.message === 'Process already running') {
            return res.status(409).json(resHandler.error('Conflict', result).toJSON());
        }

        return res.status(202).json(resHandler.success('Accepted', result).toJSON());
    } catch (error) {
        logger.error(`Mass Heal Error: ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to start mass healing').toJSON());
    }
};
