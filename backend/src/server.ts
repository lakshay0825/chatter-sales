import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import dotenv from 'dotenv';
import { join } from 'path';
import { prisma } from './config/database';

// Load environment variables
dotenv.config();

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
});

// Register plugins
async function buildServer() {
  // CORS
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
  });

  // Multipart for file uploads (increase limits for video uploads in E-Learning)
  await fastify.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50 MB
    },
  });

  // Static file serving for uploads
  await fastify.register(staticFiles, {
    root: join(process.cwd(), 'public'),
    prefix: '/',
  });

  // Swagger/OpenAPI Documentation
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Chatter Sales Management API',
        description: 'API documentation for OnlyFans Agency Sales & Shift Management System',
        version: '1.0.0',
      },
      servers: [
        {
          url: process.env.API_BASE_URL || 'http://localhost:3000',
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header: string) => header,
  });

  // Health check route
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  const { authRoutes } = await import('./routes/auth.routes');
  const { saleRoutes } = await import('./routes/sale.routes');
  const { userRoutes } = await import('./routes/user.routes');
  const { shiftRoutes } = await import('./routes/shift.routes');
  const { creatorRoutes } = await import('./routes/creator.routes');
  const { dashboardRoutes } = await import('./routes/dashboard.routes');
  const { exportRoutes } = await import('./routes/export.routes');
  const { analyticsRoutes } = await import('./routes/analytics.routes');
  const { goalRoutes } = await import('./routes/goal.routes');
  const guidelineRoutes = (await import('./routes/guideline.routes')).default;
  const { lessonRoutes } = await import('./routes/lesson.routes');
  
  // Import error handler
  const { errorHandler } = await import('./utils/errors');

  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(saleRoutes, { prefix: '/api/sales' });
  await fastify.register(userRoutes, { prefix: '/api/users' });
  await fastify.register(shiftRoutes, { prefix: '/api/shifts' });
  await fastify.register(creatorRoutes, { prefix: '/api/creators' });
  await fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await fastify.register(exportRoutes, { prefix: '/api/export' });
  await fastify.register(analyticsRoutes, { prefix: '/api/analytics' });
  await fastify.register(goalRoutes, { prefix: '/api/goals' });
  await fastify.register(guidelineRoutes, { prefix: '/api' });
  await fastify.register(lessonRoutes, { prefix: '/api/lessons' });
  
  const { monthlyFinancialRoutes } = await import('./routes/monthlyFinancial.routes');
  await fastify.register(monthlyFinancialRoutes, { prefix: '/api/monthly-financials' });

  // Register error handler
  fastify.setErrorHandler(errorHandler);

  return fastify;
}

// Start server
async function start() {
  try {
    const server = await buildServer();
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    console.log(`🚀 Server listening on http://${host}:${port}`);
    console.log(`📚 API Documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  await fastify.close();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  await fastify.close();
});

start();

