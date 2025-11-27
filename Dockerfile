# Use Node.js 18
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy entire repository
COPY . .

# Build frontend SPA
RUN cd frontend && npm ci && npm run build

# Set backend as main app
# Backend will serve SPA from ../frontend/dist

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get(`http://localhost:${process.env.PORT || 3001}/api/health`, (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "backend/production-server.js"]
