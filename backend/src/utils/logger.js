/**
 * Production-Safe Logger
 * Conditionally logs based on NODE_ENV
 * In production: Only errors and warnings
 * In development: All log levels
 */

const LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
};

const isProduction = process.env.NODE_ENV === 'production';

class Logger {
    constructor(context = 'App') {
        this.context = context;
    }

    _log(level, ...args) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${this.context}] [${level.toUpperCase()}]`;

        switch (level) {
            case LOG_LEVELS.ERROR:
                // Always log errors, even in production
                console.error(prefix, ...args);
                break;

            case LOG_LEVELS.WARN:
                // Always log warnings, even in production
                console.warn(prefix, ...args);
                break;

            case LOG_LEVELS.INFO:
                // Log info only in non-production
                if (!isProduction) {
                    console.info(prefix, ...args);
                }
                break;

            case LOG_LEVELS.DEBUG:
                // Log debug only in development
                if (process.env.NODE_ENV === 'development') {
                    console.log(prefix, ...args);
                }
                break;
        }
    }

    error(...args) {
        this._log(LOG_LEVELS.ERROR, ...args);
    }

    warn(...args) {
        this._log(LOG_LEVELS.WARN, ...args);
    }

    info(...args) {
        this._log(LOG_LEVELS.INFO, ...args);
    }

    debug(...args) {
        this._log(LOG_LEVELS.DEBUG, ...args);
    }

    // Keep console.log behavior for backwards compatibility
    log(...args) {
        this.info(...args);
    }
}

// Create default logger instance
const logger = new Logger('TRK');

// Create context-specific loggers
const createLogger = (context) => new Logger(context);

module.exports = {
    logger,
    createLogger,
    LOG_LEVELS
};
