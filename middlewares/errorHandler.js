// middlewares/errorHandler.js (ESM)

export const notFound = (req, res, next) => {
    if (res.headersSent) return next();
    res.status(404).json({ message: 'Not found' });
};

export const errorHandler = (err, req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error(err);
    const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
    res.status(status).json({
        message: err.message || 'Server error',
    });
};

export default { notFound, errorHandler };