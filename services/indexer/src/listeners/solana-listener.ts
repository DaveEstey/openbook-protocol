import { Connection, PublicKey, TransactionResponse } from '@solana/web3.js';
import { BorshCoder, EventParser, Idl } from '@coral-xyz/anchor';
import pino from 'pino';
import { IndexedEvent } from '../types/events';

const logger = pino({ name: 'solana-listener' });

interface ProgramConfig {
  programId: PublicKey;
  idl: Idl;
}

export class SolanaListener {
  private connection: Connection;
  private fallbackConnection: Connection | null = null;
  private programConfigs: Map<string, ProgramConfig>;
  private lastProcessedSlot: number = 0;
  private isRunning: boolean = false;

  constructor(
    rpcUrl: string,
    fallbackRpcUrl: string | null,
    programConfigs: Map<string, ProgramConfig>,
    startSlot: number = 0
  ) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    if (fallbackRpcUrl) {
      this.fallbackConnection = new Connection(fallbackRpcUrl, 'confirmed');
    }
    this.programConfigs = programConfigs;
    this.lastProcessedSlot = startSlot;

    logger.info({ rpcUrl, startSlot }, 'Solana listener initialized');
  }

  /**
   * Start listening for events
   */
  async start(onEvent: (event: IndexedEvent) => Promise<void>): Promise<void> {
    this.isRunning = true;
    logger.info('Starting event listener');

    while (this.isRunning) {
      try {
        await this.pollForEvents(onEvent);
        await this.sleep(Number(process.env.POLL_INTERVAL_MS) || 1000);
      } catch (error) {
        logger.error({ error }, 'Error in event listener loop');
        await this.sleep(5000); // Back off on error
      }
    }
  }

  /**
   * Stop the listener
   */
  stop(): void {
    this.isRunning = false;
    logger.info('Stopping event listener');
  }

  /**
   * Poll for new events since last processed slot
   */
  private async pollForEvents(onEvent: (event: IndexedEvent) => Promise<void>): Promise<void> {
    const currentSlot = await this.getCurrentSlot();

    if (currentSlot <= this.lastProcessedSlot) {
      return; // No new blocks
    }

    const startSlot = this.lastProcessedSlot + 1;
    const endSlot = Math.min(startSlot + (Number(process.env.BATCH_SIZE) || 100), currentSlot);

    logger.debug({ startSlot, endSlot }, 'Processing slot range');

    // Get signatures for each program in this slot range
    for (const [programName, config] of this.programConfigs.entries()) {
      let retries = 0;
      const maxRetries = 3;

      while (retries <= maxRetries) {
        try {
          const signatures = await this.getSignaturesForProgram(
            config.programId,
            startSlot,
            endSlot
          );

          logger.debug(
            { programName, signatures: signatures.length },
            'Found signatures'
          );

          // Process each transaction
          for (const sig of signatures) {
            try {
              const events = await this.parseEventsFromTransaction(
                sig.signature,
                config.programId.toBase58(),
                config.idl
              );

              for (const event of events) {
                await onEvent(event);
              }
            } catch (error) {
              logger.error({ signature: sig.signature, error }, 'Failed to process transaction');
              // Continue processing other transactions
            }
          }

          break; // Success, exit retry loop
        } catch (error: any) {
          retries++;
          const isRetryable = error.message?.includes('429') ||
                            error.message?.includes('timeout') ||
                            error.message?.includes('ECONNRESET');

          if (retries <= maxRetries && isRetryable) {
            const backoffMs = Math.pow(2, retries) * 1000; // Exponential backoff
            logger.warn(
              { programName, retries, backoffMs, error: error.message },
              'Retrying after error'
            );
            await this.sleep(backoffMs);
          } else {
            logger.error({ programName, error, retries }, 'Failed to get signatures after retries');
            break; // Give up on this program for this batch
          }
        }
      }
    }

    this.lastProcessedSlot = endSlot;
  }

  /**
   * Get current slot from RPC with retry logic
   */
  private async getCurrentSlot(): Promise<number> {
    let retries = 0;
    const maxRetries = 3;

    while (retries <= maxRetries) {
      try {
        return await this.connection.getSlot('confirmed');
      } catch (error: any) {
        logger.error({ error, retries }, 'Failed to get current slot from primary RPC');

        if (this.fallbackConnection && retries === 0) {
          logger.info('Trying fallback RPC');
          try {
            return await this.fallbackConnection.getSlot('confirmed');
          } catch (fallbackError) {
            logger.error({ error: fallbackError }, 'Fallback RPC also failed');
          }
        }

        retries++;
        if (retries <= maxRetries) {
          const backoffMs = Math.pow(2, retries) * 1000;
          logger.warn({ retries, backoffMs }, 'Retrying getCurrentSlot');
          await this.sleep(backoffMs);
        } else {
          throw new Error('Failed to get current slot after all retries');
        }
      }
    }

    throw new Error('Unexpected: exited retry loop without success or error');
  }

  /**
   * Get transaction signatures for a program in a slot range
   */
  private async getSignaturesForProgram(
    programId: PublicKey,
    startSlot: number,
    endSlot: number
  ): Promise<Array<{ signature: string; slot: number }>> {
    const signatures = await this.connection.getSignaturesForAddress(programId, {
      minContextSlot: startSlot,
    });

    // Filter by slot range
    return signatures
      .filter((sig) => sig.slot >= startSlot && sig.slot <= endSlot)
      .map((sig) => ({
        signature: sig.signature,
        slot: sig.slot,
      }));
  }

  /**
   * Parse events from a transaction using Anchor IDL
   */
  private async parseEventsFromTransaction(
    signature: string,
    programId: string,
    idl: Idl
  ): Promise<IndexedEvent[]> {
    const tx = await this.getTransaction(signature);

    if (!tx || !tx.meta || tx.meta.err) {
      return []; // Skip failed transactions
    }

    const events: IndexedEvent[] = [];

    // Parse logs using Anchor event parser
    const eventParser = new EventParser(new PublicKey(programId), new BorshCoder(idl));

    if (tx.meta.logMessages) {
      for (const log of tx.meta.logMessages) {
        try {
          const parsedEvent = eventParser.parseLogs(log);
          for (const event of parsedEvent) {
            events.push({
              signature,
              slot: tx.slot,
              blockTime: tx.blockTime || 0,
              programId,
              eventType: event.name,
              eventData: event.data,
            });
          }
        } catch (error) {
          // Not all logs are events, skip parsing errors
        }
      }
    }

    return events;
  }

  /**
   * Get transaction with retry
   */
  private async getTransaction(signature: string): Promise<TransactionResponse | null> {
    try {
      return await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
    } catch (error) {
      logger.error({ signature, error }, 'Failed to get transaction from primary RPC');

      if (this.fallbackConnection) {
        logger.info({ signature }, 'Trying fallback RPC for transaction');
        return await this.fallbackConnection.getTransaction(signature, {
          maxSupportedTransactionVersion: 0,
        });
      }

      throw error;
    }
  }

  /**
   * Update last processed slot (for resuming after restart)
   */
  setLastProcessedSlot(slot: number): void {
    this.lastProcessedSlot = slot;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
