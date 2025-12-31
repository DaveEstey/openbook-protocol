import { FastifyInstance } from 'fastify';
import { Database } from '../db/client';

export async function discoveryRoutes(fastify: FastifyInstance, db: Database) {
  /**
   * GET /discovery/trending
   * Get trending campaigns (anti-Sybil weighted)
   */
  fastify.get('/discovery/trending', async (request, reply) => {
    const { limit = 20, offset = 0 } = request.query as any;

    const result = await db.query(
      `SELECT
         c.*,
         cm.total_tasks,
         cm.total_contributions_usd,
         cm.unique_contributors,
         cm.weighted_contributor_count,
         cm.trending_score
       FROM campaigns c
       INNER JOIN campaign_metrics cm ON cm.campaign_pubkey = c.pubkey
       WHERE c.state IN ('Published', 'Active')
       ORDER BY cm.trending_score DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      campaigns: result.rows,
      algorithm: 'trending_score = (total_usdc_contributed * 0.7) + (weighted_contributor_count * 0.3)',
      pagination: {
        limit,
        offset,
      },
    };
  });

  /**
   * GET /discovery/top
   * Get top campaigns by total contributions
   */
  fastify.get('/discovery/top', async (request, reply) => {
    const { limit = 20, offset = 0 } = request.query as any;

    const result = await db.query(
      `SELECT
         c.*,
         cm.total_tasks,
         cm.total_contributions_usd,
         cm.unique_contributors,
         cm.trending_score
       FROM campaigns c
       INNER JOIN campaign_metrics cm ON cm.campaign_pubkey = c.pubkey
       WHERE c.state IN ('Published', 'Active', 'Completed')
       ORDER BY cm.total_contributions_usd DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      campaigns: result.rows,
      pagination: {
        limit,
        offset,
      },
    };
  });

  /**
   * GET /discovery/new
   * Get recently published campaigns
   */
  fastify.get('/discovery/new', async (request, reply) => {
    const { limit = 20, offset = 0 } = request.query as any;

    const result = await db.query(
      `SELECT
         c.*,
         cm.total_tasks,
         cm.total_contributions_usd,
         cm.unique_contributors,
         cm.trending_score
       FROM campaigns c
       LEFT JOIN campaign_metrics cm ON cm.campaign_pubkey = c.pubkey
       WHERE c.state IN ('Published', 'Active')
       ORDER BY c.published_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      campaigns: result.rows,
      pagination: {
        limit,
        offset,
      },
    };
  });

  /**
   * GET /discovery/near-goal
   * Get tasks that are close to their funding goal
   */
  fastify.get('/discovery/near-goal', async (request, reply) => {
    const { limit = 20, offset = 0 } = request.query as any;

    const result = await db.query(
      `SELECT
         t.*,
         tm.unique_contributors,
         tm.percent_funded,
         tm.trending_score,
         c.campaign_id,
         c.title as campaign_title
       FROM tasks t
       INNER JOIN task_metrics tm ON tm.task_pubkey = t.pubkey
       INNER JOIN campaigns c ON c.pubkey = t.campaign_pubkey
       WHERE t.state = 'FundingOpen'
         AND tm.percent_funded >= 70
         AND tm.percent_funded < 100
       ORDER BY tm.percent_funded DESC, tm.trending_score DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      tasks: result.rows,
      pagination: {
        limit,
        offset,
      },
    };
  });

  /**
   * GET /discovery/tasks/trending
   * Get trending tasks (anti-Sybil weighted)
   */
  fastify.get('/discovery/tasks/trending', async (request, reply) => {
    const { limit = 20, offset = 0 } = request.query as any;

    const result = await db.query(
      `SELECT
         t.*,
         tm.unique_contributors,
         tm.percent_funded,
         tm.weighted_contributor_count,
         tm.trending_score,
         c.campaign_id,
         c.title as campaign_title
       FROM tasks t
       INNER JOIN task_metrics tm ON tm.task_pubkey = t.pubkey
       INNER JOIN campaigns c ON c.pubkey = t.campaign_pubkey
       WHERE t.state IN ('FundingOpen', 'Funded', 'InProgress')
       ORDER BY tm.trending_score DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      tasks: result.rows,
      algorithm: 'trending_score = (total_usdc_contributed * 0.7) + (weighted_contributor_count * 0.3)',
      pagination: {
        limit,
        offset,
      },
    };
  });

  /**
   * GET /search
   * Full-text search across campaigns and tasks
   */
  fastify.get('/search', async (request, reply) => {
    const { q, type = 'all', limit = 20, offset = 0 } = request.query as any;

    if (!q) {
      return reply.code(400).send({ error: 'Missing query parameter: q' });
    }

    const results: any = {
      query: q,
    };

    if (type === 'all' || type === 'campaigns') {
      const campaignsResult = await db.query(
        `SELECT
           c.*,
           cm.total_tasks,
           cm.total_contributions_usd,
           cm.unique_contributors,
           cm.trending_score,
           ts_rank(to_tsvector('english', c.title || ' ' || COALESCE(c.description, '')), plainto_tsquery('english', $1)) as rank
         FROM campaigns c
         LEFT JOIN campaign_metrics cm ON cm.campaign_pubkey = c.pubkey
         WHERE to_tsvector('english', c.title || ' ' || COALESCE(c.description, '')) @@ plainto_tsquery('english', $1)
         ORDER BY rank DESC
         LIMIT $2 OFFSET $3`,
        [q, limit, offset]
      );
      results.campaigns = campaignsResult.rows;
    }

    if (type === 'all' || type === 'tasks') {
      const tasksResult = await db.query(
        `SELECT
           t.*,
           tm.unique_contributors,
           tm.percent_funded,
           tm.trending_score,
           c.campaign_id,
           c.title as campaign_title,
           ts_rank(to_tsvector('english', t.title || ' ' || COALESCE(t.description, '')), plainto_tsquery('english', $1)) as rank
         FROM tasks t
         LEFT JOIN task_metrics tm ON tm.task_pubkey = t.pubkey
         LEFT JOIN campaigns c ON c.pubkey = t.campaign_pubkey
         WHERE to_tsvector('english', t.title || ' ' || COALESCE(t.description, '')) @@ plainto_tsquery('english', $1)
         ORDER BY rank DESC
         LIMIT $2 OFFSET $3`,
        [q, limit, offset]
      );
      results.tasks = tasksResult.rows;
    }

    return results;
  });
}
