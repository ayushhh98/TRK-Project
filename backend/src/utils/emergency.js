const EmergencyProtocol = require('../models/EmergencyProtocol');
const { logger } = require('./logger');

/**
 * Check if a specific module is paused by the emergency system
 * @param {String} moduleName - Module name to check
 * @returns {Boolean} - True if paused
 */
const isPaused = async (moduleName) => {
    try {
        const protocol = await EmergencyProtocol.findOne({ moduleName });
        if (!protocol) return false;
        return protocol.status === 'PAUSED';
    } catch (error) {
        logger.error(`Error checking emergency status for ${moduleName}:`, error);
        return false; // Fail safe: assume running? Or should it be fail closed? 
        // For emergency safety, we follow the user's principle: "Emergency is a SAFETY mechanism".
        // However, if the database is down, we have bigger problems.
    }
};

module.exports = { isPaused };
