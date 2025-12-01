// Enhanced error handling middleware for API routes
const handleApiErrors = (err, req, res, next) => {
  // Log the error for debugging
  console.error('🚨 API Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    timestamp: new Date().toISOString()
  });

  // Determine if this is an API route
  const isApiRoute = req.path.startsWith('/api/');
  
  if (isApiRoute) {
    // Always return JSON for API routes
    const statusCode = err.statusCode || err.status || 500;
    
    // Garantir que sempre temos uma mensagem de erro válida
    const errorMessage = err.message || 'Internal server error';
    
    const errorResponse = {
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      timestamp: new Date().toISOString(),
      path: req.path,
      statusCode: statusCode
    };

    // Garantir que a resposta seja JSON válido
    try {
      return res.status(statusCode).json(errorResponse);
    } catch (jsonError) {
      console.error('🚨 Erro ao enviar resposta JSON:', jsonError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao processar resposta do servidor',
        timestamp: new Date().toISOString()
      });
    }
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
        details: 'Request body must be a valid JSON object',
        timestamp: new Date().toISOString()
      });
    }

    const missingFields = requiredFields.filter(field => !(field in req.body));
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: `Missing fields: ${missingFields.join(', ')}`,
        timestamp: new Date().toISOString()
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
      details: 'Unable to connect to required service',
      timestamp: new Date().toISOString()
    });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }

  next(err);
};

// Middleware para garantir que todas as respostas sejam JSON válidas
const ensureJsonResponse = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    try {
      // Verificar se os dados são válidos
      if (data === null || data === undefined) {
        console.warn('⚠️ Tentativa de enviar dados nulos/undefined como JSON');
        data = { success: false, error: 'Dados não disponíveis', timestamp: new Date().toISOString() };
      }
      
      // Garantir estrutura básica para respostas de API
      if (req.path.startsWith('/api/') && typeof data === 'object' && !Array.isArray(data)) {
        if (!Object.hasOwn(data, 'success')) {
          data.success = true;
        }
        if (!Object.hasOwn(data, 'timestamp')) {
          data.timestamp = new Date().toISOString();
        }
      }
      
      return originalJson.call(this, data);
    } catch (error) {
      console.error('🚨 Erro ao processar resposta JSON:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao processar resposta do servidor',
        timestamp: new Date().toISOString()
      });
    }
  };
  
  next();
};

// Middleware para logging de requisições
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`📊 ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    
    // Log de erros
    if (res.statusCode >= 400) {
      console.error(`❌ Erro na requisição: ${req.method} ${req.path} - Status: ${res.statusCode}`);
    }
  });
  
  next();
};

// Middleware para validar JSON nas requisições
const validateJsonBody = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return next();
  }
  
  if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
    let data = '';
    
    req.on('data', chunk => {
      data += chunk;
    });
    
    req.on('end', () => {
      if (data) {
        try {
          req.body = JSON.parse(data);
        } catch (error) {
          console.error('🚨 JSON inválido na requisição:', error);
          return res.status(400).json({
            success: false,
            error: 'JSON inválido na requisição',
            details: 'O corpo da requisição deve conter JSON válido',
            timestamp: new Date().toISOString()
          });
        }
      }
      next();
    });
  } else {
    next();
  }
};

export {
  handleApiErrors,
  asyncHandler,
  validateRequestBody,
  handleCorsErrors,
  ensureJsonResponse,
  requestLogger,
  validateJsonBody
};
