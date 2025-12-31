import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import * as dotenv from 'dotenv';
import pino from 'pino';

import { Database } from './db/client';
import { campaignsRoutes } from './routes/campaigns';
import { tasksRoutes } from './routes/tasks';
import { discoveryRoutes } from './routes/discovery';
import { walletsRoutes } from './routes/wallets';
import { statsRoutes } from './routes/stats';

dotenv.config();

const logger = pino({
  name: 'api',
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

const PORT = Number(process.env.API_PORT) || 3001;
const HOST = process.env.API_HOST || '0.0.0.0';

async function start() {
  const fastify = Fastify({
    logger,
  });

  // Database connection
  const db = new Database(process.env.DATABASE_URL || 'postgres://openbook:devpassword@localhost:5432/openbook');

  // CORS
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_ANONYMOUS) || 60,
    timeWindow: '1 minute',
    cache: 10000,
  });

  // Register routes
  await fastify.register(async (instance) => {
    await campaignsRoutes(instance, db);
    await tasksRoutes(instance, db);
    await discoveryRoutes(instance, db);
    await walletsRoutes(instance, db);
    await statsRoutes(instance, db);
  });

  // Root endpoint
  fastify.get('/', async (request, reply) => {
    return {
      name: 'OpenBook Protocol API',
      version: '0.1.0',
      author: 'Yetse',
      description: 'Read-first API for OpenBook Protocol. All monetary actions occur on-chain.',
      endpoints: {
        campaigns: {
          'GET /campaigns': 'List all campaigns',
          'GET /campaigns/:id': 'Get campaign details',
          'GET /campaigns/:id/tasks': 'Get campaign tasks',
        },
        tasks: {
          'GET /tasks/:id': 'Get task details',
          'GET /tasks/:id/ledger': 'Get task ledger (transparent)',
          'GET /tasks/:id/votes': 'Get budget/approval votes',
          'GET /tasks/:id/proof': 'Get proof submission',
          'GET /tasks/:id/dispute': 'Get dispute info',
        },
        discovery: {
          'GET /discovery/trending': 'Trending campaigns (anti-Sybil)',
          'GET /discovery/top': 'Top campaigns by contributions',
          'GET /discovery/new': 'Recently published campaigns',
          'GET /discovery/near-goal': 'Tasks near funding goal',
          'GET /discovery/tasks/trending': 'Trending tasks',
          'GET /search?q=query': 'Full-text search',
        },
        wallets: {
          'GET /wallets/:address': 'Wallet profile',
          'GET /wallets/:address/contributions': 'Wallet contributions',
        },
        stats: {
          'GET /stats/global': 'Global statistics',
          'GET /stats/categories': 'Category statistics',
          'GET /health': 'Health check',
        },
      },
      anti_sybil_measures: [
        'Vote weight = USDC contribution amount (not per-wallet)',
        'Trending score weights USDC 70%, contributor diversity 30%',
        'Wallet age weighting: <7 days = 10%, <30 days = 50%, <180 days = 80%, 180+ = 100%',
      ],
    };
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    await fastify.close();
    await db.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start server
  try {
    await fastify.listen({ port: PORT, host: HOST });
    logger.info(`OpenBook API listening on ${HOST}:${PORT}`);
  } catch (err) {
    logger.fatal(err);
    process.exit(1);
  }
}

start();
