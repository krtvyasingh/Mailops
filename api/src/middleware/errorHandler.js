export const errorHandler = () => {
    return async (c, next) => {
        try {
            await next();
        }
        catch (err) {
            console.error('[Error]', err?.message || 'Unknown', err?.stack || '');
            const isProd = c.env?.ENVIRONMENT === 'production';
            const status = err.status || 500;
            const response = {
                error: {
                    message: status === 500 && isProd ? 'Internal Server Error' : err.message,
                    code: err.code || 'UNKNOWN_ERROR',
                    ...(isProd ? {} : { stack: err.stack })
                }
            };
            return c.json(response, status);
        }
    };
};
