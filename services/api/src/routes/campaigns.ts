import { FastifyInstance } from 'fastify';
import { Database } from '../db/client';

export async function campaignsRoutes(fastify: FastifyInstance, db: Database) {
  /**
   * GET /campaigns
   * List all campaigns with optional filtering and sorting
   */
  fastify.get('/campaigns', async (request, reply) => {
    const { category, state, sort = 'created_at', order = 'desc', limit = 20, offset = 0 } = request.query as any;

    let query = `
      SELECT
        c.*,
        cm.total_tasks,
        cm.total_contributions_usd,
        cm.unique_contributors,
        cm.trending_score
      FROM campaigns c
      LEFT JOIN campaign_metrics cm ON cm.campaign_pubkey = c.pubkey
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (category) {
      params.push(category);
      query += ` AND c.category = $${++paramCount}`;
    }

    if (state) {
      params.push(state);
      query += ` AND c.state = $${++paramCount}`;
    }

    // Validate sort column
    const allowedSort = ['created_at', 'trending_score', 'total_contributions_usd'];
    const sortColumn = allowedSort.includes(sort) ? sort : 'created_at';

    // Validate order
    const orderDir = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortColumn === 'created_at' ? 'c.' : 'cm.'}${sortColumn} ${orderDir}`;

    params.push(limit, offset);
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;

    const result = await db.query(query, params);

    return {
      campaigns: result.rows,
      pagination: {
        limit,
        offset,
        total: result.rowCount,
      },
    };
  });

  /**
   * GET /campaigns/:id
   * Get campaign details by ID (campaign_id or pubkey)
   */
  fastify.get('/campaigns/:id', async (request, reply) => {
    const { id } = request.params as any;

    const result = await db.query(
      `SELECT
         c.*,
         cm.total_tasks,
         cm.total_contributions_usd,
         cm.unique_contributors,
         cm.trending_score
       FROM campaigns c
       LEFT JOIN campaign_metrics cm ON cm.campaign_pubkey = c.pubkey
       WHERE c.campaign_id = $1 OR c.pubkey = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Campaign not found' });
    }

    // Get tasks for this campaign
    const tasksResult = await db.query(
      `SELECT
         t.*,
         tm.unique_contributors,
         tm.percent_funded,
         tm.trending_score
       FROM tasks t
       LEFT JOIN task_metrics tm ON tm.task_pubkey = t.pubkey
       WHERE t.campaign_pubkey = $1
       ORDER BY t.created_at DESC`,
      [result.rows[0].pubkey]
    );

    return {
      campaign: result.rows[0],
      tasks: tasksResult.rows,
    };
  });

  /**
   * GET /campaigns/:id/tasks
   * Get all tasks for a campaign
   */
  fastify.get('/campaigns/:id/tasks', async (request, reply) => {
    const { id } = request.params as any;

    // First get campaign pubkey
    const campaignResult = await db.query(
      'SELECT pubkey FROM campaigns WHERE campaign_id = $1 OR pubkey = $1',
      [id]
    );

    if (campaignResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Campaign not found' });
    }

    const tasksResult = await db.query(
      `SELECT
         t.*,
         tm.unique_contributors,
         tm.percent_funded,
         tm.trending_score
       FROM tasks t
       LEFT JOIN task_metrics tm ON tm.task_pubkey = t.pubkey
       WHERE t.campaign_pubkey = $1
       ORDER BY t.created_at DESC`,
      [campaignResult.rows[0].pubkey]
    );

    return {
      tasks: tasksResult.rows,
    };
  });
}
