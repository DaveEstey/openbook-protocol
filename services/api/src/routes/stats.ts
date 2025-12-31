import { FastifyInstance } from 'fastify';
import { Database } from '../db/client';

export async function statsRoutes(fastify: FastifyInstance, db: Database) {
  /**
   * GET /stats/global
   * Get global platform statistics
   */
  fastify.get('/stats/global', async (request, reply) => {
    // Get total campaigns
    const campaignsResult = await db.query(
      `SELECT
         COUNT(*) as total_campaigns,
         COUNT(*) FILTER (WHERE state = 'Published') as published_campaigns,
         COUNT(*) FILTER (WHERE state = 'Active') as active_campaigns,
         COUNT(*) FILTER (WHERE state = 'Completed') as completed_campaigns
       FROM campaigns`
    );

    // Get total tasks
    const tasksResult = await db.query(
      `SELECT
         COUNT(*) as total_tasks,
         COUNT(*) FILTER (WHERE state = 'FundingOpen') as funding_tasks,
         COUNT(*) FILTER (WHERE state = 'InProgress') as active_tasks,
         COUNT(*) FILTER (WHERE state = 'Completed') as completed_tasks
       FROM tasks`
    );

    // Get total contributions
    const contributionsResult = await db.query(
      `SELECT
         COALESCE(SUM(amount), 0) as total_usdc_contributed,
         COUNT(DISTINCT contributor) as unique_contributors
       FROM contributions`
    );

    // Get total governance tokens distributed
    const governanceResult = await db.query(
      `SELECT
         COALESCE(SUM(amount), 0) as total_tokens_distributed,
         COUNT(DISTINCT recipient) as unique_recipients
       FROM governance_distributions`
    );

    return {
      campaigns: campaignsResult.rows[0],
      tasks: tasksResult.rows[0],
      contributions: {
        total_usdc: contributionsResult.rows[0].total_usdc_contributed,
        unique_contributors: contributionsResult.rows[0].unique_contributors,
      },
      governance: {
        total_tokens_distributed: governanceResult.rows[0].total_tokens_distributed,
        unique_recipients: governanceResult.rows[0].unique_recipients,
      },
    };
  });

  /**
   * GET /stats/categories
   * Get campaign statistics by category
   */
  fastify.get('/stats/categories', async (request, reply) => {
    const result = await db.query(
      `SELECT
         c.category,
         COUNT(*) as campaign_count,
         COUNT(DISTINCT t.pubkey) as task_count,
         COALESCE(SUM(cm.total_contributions_usd), 0) as total_contributions
       FROM campaigns c
       LEFT JOIN tasks t ON t.campaign_pubkey = c.pubkey
       LEFT JOIN campaign_metrics cm ON cm.campaign_pubkey = c.pubkey
       GROUP BY c.category
       ORDER BY total_contributions DESC`
    );

    return {
      categories: result.rows,
    };
  });

  /**
   * GET /health
   * Health check endpoint
   */
  fastify.get('/health', async (request, reply) => {
    try {
      // Check database connection
      await db.query('SELECT 1');

      // Check indexer lag (last processed slot vs current time)
      const indexerResult = await db.query(
        'SELECT last_processed_slot, updated_at FROM indexer_state WHERE id = 1'
      );

      const indexerLag = Date.now() - new Date(indexerResult.rows[0].updated_at).getTime();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        indexer: {
          last_processed_slot: indexerResult.rows[0].last_processed_slot,
          last_update: indexerResult.rows[0].updated_at,
          lag_ms: indexerLag,
        },
      };
    } catch (error) {
      return reply.code(503).send({
        status: 'unhealthy',
        error: 'Database connection failed',
      });
    }
  });
}
