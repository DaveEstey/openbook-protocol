import { formatDistanceToNow } from 'date-fns';

/**
 * Format USDC amount (6 decimals) to human-readable string
 */
export function formatUSDC(amount: string | number): string {
  const num = typeof amount === 'string' ? BigInt(amount) : BigInt(amount);
  const dollars = Number(num) / 1_000_000;
  return dollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format wallet address to short form
 */
export function formatAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format timestamp to relative time
 */
export function formatTimeAgo(timestamp: string): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

/**
 * Get state badge color
 */
export function getStateBadgeColor(state: string): string {
  const stateColors: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-800',
    Published: 'bg-blue-100 text-blue-800',
    Active: 'bg-green-100 text-green-800',
    Completed: 'bg-purple-100 text-purple-800',
    Archived: 'bg-gray-100 text-gray-500',
    VotingBudget: 'bg-yellow-100 text-yellow-800',
    BudgetFinalized: 'bg-blue-100 text-blue-800',
    FundingOpen: 'bg-green-100 text-green-800',
    Funded: 'bg-green-100 text-green-800',
    InProgress: 'bg-blue-100 text-blue-800',
    SubmittedForReview: 'bg-yellow-100 text-yellow-800',
    Approved: 'bg-green-100 text-green-800',
    PaidOut: 'bg-purple-100 text-purple-800',
    Rejected: 'bg-red-100 text-red-800',
    Refunding: 'bg-orange-100 text-orange-800',
    Refunded: 'bg-gray-100 text-gray-800',
    Disputed: 'bg-red-100 text-red-800',
  };
  return stateColors[state] || 'bg-gray-100 text-gray-800';
}

/**
 * Calculate funding progress percentage
 */
export function calculateFundingProgress(contributed: string, budget: string): number {
  if (!budget || budget === '0') return 0;
  const contributedNum = BigInt(contributed);
  const budgetNum = BigInt(budget);
  return Math.min(Number((contributedNum * 100n) / budgetNum), 100);
}
