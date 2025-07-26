export function notFoundHandler(req, res, _) {
    const error = {
        success: false,
        error: {
            message: `Route ${req.originalUrl} not found`,
            statusCode: 404,
            timestamp: new Date().toISOString()
        }
    };
    res.status(404).json(error);
}
//# sourceMappingURL=notFoundHandler.js.map