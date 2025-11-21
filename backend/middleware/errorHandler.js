// Error handling middleware for API routes
const handleApiErrors = (err, req, res, next) => {
  // Log the error for debugging
  console.error('API Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Determine if this is an API route
  const isApiRoute = req.path.startsWith('/api/');
  
  if (isApiRoute) {
    // Always return JSON for API routes
    const statusCode = err.statusCode || err.status || 500;
    const errorResponse = {
      success: false,
      error: err.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      timestamp: new Date().toISOString(),
      path: req.path
    };

    return res.status(statusCode).json(errorResponse);
  }

  // For non-API routes, let the default error handler handle it
  next(err);
};

// Async error wrapper to catch promise rejections
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validate request body middleware
const validateRequestBody = (requiredFields) => {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: 'Request body must be a valid JSON object'
      });
    }

    const missingFields = requiredFields.filter(field => !(field in req.body));
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: `Missing fields: ${missingFields.join(', ')}`
      });
    }

    next();
  };
};

// CORS error handler
const handleCorsErrors = (err, req, res, next) => {
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({
      success: false,
      error: 'Service unavailable',
      details: 'Unable to connect to required service'
    });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.message
    });
  }

  next(err);
};

export {
  handleApiErrors,
  asyncHandler,
  validateRequestBody,
  handleCorsErrors
};