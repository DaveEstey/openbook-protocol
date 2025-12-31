import { FastifyInstance } from 'fastify';
import { Database } from '../db/client';

export async function walletsRoutes(fastify: FastifyInstance, db: Database) {
  /**
   * GET /wallets/:address
   * Get wallet profile and statistics
   */
  fastify.get('/wallets/:address', async (request, reply) => {
    const { address } = request.params as any;

    // Get wallet metadata
    const walletResult = await db.query(
      `SELECT
         wallet_address,
         first_seen_at,
         age_days,
         total_contributed,
         total_campaigns_created,
         total_tasks_created
       FROM wallet_metadata
       WHERE wallet_address = $1`,
      [address]
    );

    if (walletResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Wallet not found' });
    }

    // Get contributions
    const contributionsResult = await db.query(
      `SELECT
         c.task_pubkey,
         c.amount,
         c.contributed_at,
         t.task_id,
         t.title as task_title,
         t.state as task_state,
         camp.campaign_id,
         camp.title as campaign_title
       FROM contributions c
       INNER JOIN tasks t ON t.pubkey = c.task_pubkey
       INNER JOIN campaigns camp ON camp.pubkey = t.campaign_pubkey
       WHERE c.contributor = $1
       ORDER BY c.contributed_at DESC`,
      [address]
    );

    // Get created campaigns
    const campaignsResult = await db.query(
      `SELECT
         c.*,
         cm.total_tasks,
         cm.total_contributions_usd
       FROM campaigns c
       LEFT JOIN campaign_metrics cm ON cm.campaign_pubkey = c.pubkey
       WHERE c.creator = $1
       ORDER BY c.created_at DESC`,
      [address]
    );

    // Get created tasks
    const tasksResult = await db.query(
      `SELECT
         t.*,
         tm.percent_funded
       FROM tasks t
       LEFT JOIN task_metrics tm ON tm.task_pubkey = t.pubkey
       WHERE t.creator = $1
       ORDER BY t.created_at DESC`,
      [address]
    );

    // Get governance token balance (if distributed)
    const governanceResult = await db.query(
      `SELECT
         SUM(amount) as total_tokens
       FROM governance_distributions
       WHERE recipient = $1`,
      [address]
    );

    return {
      wallet: walletResult.rows[0],
      governance_tokens: governanceResult.rows[0]?.total_tokens || '0',
      contributions: contributionsResult.rows,
      campaigns_created: campaignsResult.rows,
      tasks_created: tasksResult.rows,
    };
  });

  /**
   * GET /wallets/:address/contributions
   * Get all contributions by a wallet
   */
  fastify.get('/wallets/:address/contributions', async (request, reply) => {
    const { address } = request.params as any;
    const { limit = 50, offset = 0 } = request.query as any;

    const result = await db.query(
      `SELECT
         c.task_pubkey,
         c.amount,
         c.contributed_at,
         t.task_id,
         t.title as task_title,
         t.state as task_state,
         camp.campaign_id,
         camp.title as campaign_title
       FROM contributions c
       INNER JOIN tasks t ON t.pubkey = c.task_pubkey
       INNER JOIN campaigns camp ON camp.pubkey = t.campaign_pubkey
       WHERE c.contributor = $1
       ORDER BY c.contributed_at DESC
       LIMIT $2 OFFSET $3`,
      [address, limit, offset]
    );

    return {
      contributions: result.rows,
      pagination: {
        limit,
        offset,
      },
    };
  });
}
