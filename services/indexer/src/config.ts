import { PublicKey } from '@solana/web3.js';
import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Solana
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  solanaRpcFallbackUrl: process.env.SOLANA_RPC_FALLBACK_URL || null,
  solanaNetwork: process.env.SOLANA_NETWORK || 'devnet',

  // Program IDs
  programIds: {
    campaign: new PublicKey(
      process.env.PROGRAM_ID_CAMPAIGN || 'Camp1111111111111111111111111111111111111111'
    ),
    task: new PublicKey(
      process.env.PROGRAM_ID_TASK || 'Task1111111111111111111111111111111111111111'
    ),
    budget: new PublicKey(
      process.env.PROGRAM_ID_BUDGET || 'Budg1111111111111111111111111111111111111111'
    ),
    escrow: new PublicKey(
      process.env.PROGRAM_ID_ESCROW || 'Escr1111111111111111111111111111111111111111'
    ),
    proof: new PublicKey(
      process.env.PROGRAM_ID_PROOF || 'Prof1111111111111111111111111111111111111111'
    ),
    dispute: new PublicKey(
      process.env.PROGRAM_ID_DISPUTE || 'Disp1111111111111111111111111111111111111111'
    ),
    governance: new PublicKey(
      process.env.PROGRAM_ID_GOVERNANCE || 'Gove1111111111111111111111111111111111111111'
    ),
  },

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgres://openbook:devpassword@localhost:5432/openbook',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Indexer
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS) || 1000,
  batchSize: Number(process.env.BATCH_SIZE) || 100,
  startSlot: Number(process.env.START_SLOT) || 0,

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};
