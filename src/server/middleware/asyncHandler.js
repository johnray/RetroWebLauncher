/**
 * RetroWebLauncher - Async Error Handler Middleware
 * Wraps async route handlers to catch errors and pass to error middleware
 */

/**
 * Wrap an async route handler to automatically catch errors
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped handler that catches errors
 *
 * @example
 * // Instead of:
 * router.get('/', async (req, res) => {
 *   try {
 *     const data = await getData();
 *     res.json(data);
 *   } catch (error) {
 *     console.error('Error:', error);
 *     res.status(500).json({ error: error.message });
 *   }
 * });
 *
 * // Use:
 * router.get('/', asyncHandler(async (req, res) => {
 *   const data = await getData();
 *   res.json(data);
 * }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Standard error response middleware
 * Place at the end of middleware chain to handle errors
 */
function errorHandler(err, req, res, next) {
  // Log the error
  console.error(`[API Error] ${req.method} ${req.path}:`, err.message);

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * Not found handler for undefined routes
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`
  });
}

/**
 * Create a custom API error with status code
 */
class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }

  static badRequest(message = 'Bad request') {
    return new ApiError(message, 400);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(message, 401);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(message, 403);
  }

  static notFound(message = 'Not found') {
    return new ApiError(message, 404);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(message, 500);
  }
}

module.exports = {
  asyncHandler,
  errorHandler,
  notFoundHandler,
  ApiError
};
