import { FastifyInstance } from 'fastify';
import { Database } from '../db/client';

export async function tasksRoutes(fastify: FastifyInstance, db: Database) {
  /**
   * GET /tasks/:id
   * Get task details by ID (task_id or pubkey)
   */
  fastify.get('/tasks/:id', async (request, reply) => {
    const { id } = request.params as any;

    const result = await db.query(
      `SELECT
         t.*,
         tm.unique_contributors,
         tm.percent_funded,
         tm.trending_score,
         c.campaign_id,
         c.title as campaign_title
       FROM tasks t
       LEFT JOIN task_metrics tm ON tm.task_pubkey = t.pubkey
       LEFT JOIN campaigns c ON c.pubkey = t.campaign_pubkey
       WHERE t.task_id = $1 OR t.pubkey = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Task not found' });
    }

    return {
      task: result.rows[0],
    };
  });

  /**
   * GET /tasks/:id/ledger
   * Get transparent ledger for a task (all contributions, refunds, payouts)
   */
  fastify.get('/tasks/:id/ledger', async (request, reply) => {
    const { id } = request.params as any;

    // Get task
    const taskResult = await db.query(
      'SELECT pubkey, task_id, finalized_budget FROM tasks WHERE task_id = $1 OR pubkey = $1',
      [id]
    );

    if (taskResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Task not found' });
    }

    const taskPubkey = taskResult.rows[0].pubkey;

    // Get all contributions
    const contributionsResult = await db.query(
      `SELECT
         contributor,
         amount,
         wallet_age_days,
         contributed_at
       FROM contributions
       WHERE task_pubkey = $1
       ORDER BY contributed_at DESC`,
      [taskPubkey]
    );

    // Calculate totals
    const totalContributed = contributionsResult.rows.reduce(
      (sum, c) => sum + BigInt(c.amount),
      0n
    );

    return {
      task_id: taskResult.rows[0].task_id,
      finalized_budget: taskResult.rows[0].finalized_budget,
      total_contributed: totalContributed.toString(),
      unique_contributors: contributionsResult.rows.length,
      ledger: {
        contributions: contributionsResult.rows.map((c) => ({
          contributor: c.contributor,
          amount: c.amount,
          wallet_age_days: c.wallet_age_days,
          timestamp: c.contributed_at,
        })),
      },
    };
  });

  /**
   * GET /tasks/:id/votes
   * Get budget votes for a task
   */
  fastify.get('/tasks/:id/votes', async (request, reply) => {
    const { id } = request.params as any;

    // Get task
    const taskResult = await db.query(
      'SELECT pubkey, task_id, state FROM tasks WHERE task_id = $1 OR pubkey = $1',
      [id]
    );

    if (taskResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Task not found' });
    }

    const taskPubkey = taskResult.rows[0].pubkey;

    // Get budget votes
    const budgetVotesResult = await db.query(
      `SELECT
         voter,
         proposed_budget,
         vote_weight,
         voted_at
       FROM budget_votes
       WHERE task_pubkey = $1
       ORDER BY voted_at DESC`,
      [taskPubkey]
    );

    // Get approval votes
    const approvalVotesResult = await db.query(
      `SELECT
         voter,
         approved,
         vote_weight,
         voted_at
       FROM approval_votes
       WHERE task_pubkey = $1
       ORDER BY voted_at DESC`,
      [taskPubkey]
    );

    return {
      task_id: taskResult.rows[0].task_id,
      state: taskResult.rows[0].state,
      budget_votes: budgetVotesResult.rows,
      approval_votes: approvalVotesResult.rows,
    };
  });

  /**
   * GET /tasks/:id/proof
   * Get proof submission for a task
   */
  fastify.get('/tasks/:id/proof', async (request, reply) => {
    const { id } = request.params as any;

    // Get task
    const taskResult = await db.query(
      'SELECT pubkey FROM tasks WHERE task_id = $1 OR pubkey = $1',
      [id]
    );

    if (taskResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Task not found' });
    }

    const proofResult = await db.query(
      `SELECT
         pubkey,
         recipient,
         proof_hash,
         proof_uri,
         submitted_at
       FROM proofs
       WHERE task_pubkey = $1`,
      [taskResult.rows[0].pubkey]
    );

    if (proofResult.rows.length === 0) {
      return reply.code(404).send({ error: 'No proof submitted' });
    }

    return {
      proof: proofResult.rows[0],
    };
  });

  /**
   * GET /tasks/:id/dispute
   * Get dispute information for a task
   */
  fastify.get('/tasks/:id/dispute', async (request, reply) => {
    const { id } = request.params as any;

    // Get task
    const taskResult = await db.query(
      'SELECT pubkey FROM tasks WHERE task_id = $1 OR pubkey = $1',
      [id]
    );

    if (taskResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Task not found' });
    }

    const disputeResult = await db.query(
      `SELECT
         pubkey,
         initiator,
         reason,
         evidence_uri,
         status,
         resolution,
         payout_percent,
         created_at,
         resolved_at
       FROM disputes
       WHERE task_pubkey = $1`,
      [taskResult.rows[0].pubkey]
    );

    if (disputeResult.rows.length === 0) {
      return reply.code(404).send({ error: 'No dispute found' });
    }

    return {
      dispute: disputeResult.rows[0],
    };
  });
}
