import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

export interface Campaign {
  pubkey: string;
  campaign_id: string;
  creator: string;
  title: string;
  description?: string;
  metadata_uri?: string;
  category: string;
  state: string;
  tasks_count: number;
  created_at: string;
  total_tasks?: number;
  total_contributions_usd?: string;
  unique_contributors?: number;
  trending_score?: number;
}

export interface Task {
  pubkey: string;
  task_id: string;
  campaign_pubkey: string;
  creator: string;
  recipient?: string;
  title: string;
  description?: string;
  metadata_uri?: string;
  state: string;
  finalized_budget?: string;
  total_contributed: string;
  total_refunded: string;
  total_paid_out: string;
  deadline?: string;
  created_at: string;
  unique_contributors?: number;
  percent_funded?: number;
  trending_score?: number;
}

export interface Contribution {
  contributor: string;
  amount: string;
  wallet_age_days: number;
  timestamp: string;
}

export interface BudgetVote {
  voter: string;
  proposed_budget: string;
  vote_weight: string;
  voted_at: string;
}

export interface ApprovalVote {
  voter: string;
  approved: boolean;
  vote_weight: string;
  voted_at: string;
}

// Discovery endpoints
export const getDiscoveryTrending = async (limit = 20, offset = 0) => {
  const response = await api.get('/discovery/trending', { params: { limit, offset } });
  return response.data;
};

export const getDiscoveryTop = async (limit = 20, offset = 0) => {
  const response = await api.get('/discovery/top', { params: { limit, offset } });
  return response.data;
};

export const getDiscoveryNew = async (limit = 20, offset = 0) => {
  const response = await api.get('/discovery/new', { params: { limit, offset } });
  return response.data;
};

export const getDiscoveryNearGoal = async (limit = 20, offset = 0) => {
  const response = await api.get('/discovery/near-goal', { params: { limit, offset } });
  return response.data;
};

// Campaign endpoints
export const getCampaigns = async (params?: {
  category?: string;
  state?: string;
  sort?: string;
  order?: string;
  limit?: number;
  offset?: number;
}) => {
  const response = await api.get('/campaigns', { params });
  return response.data;
};

export const getCampaign = async (id: string) => {
  const response = await api.get(`/campaigns/${id}`);
  return response.data;
};

// Task endpoints
export const getTask = async (id: string) => {
  const response = await api.get(`/tasks/${id}`);
  return response.data;
};

export const getTaskLedger = async (id: string) => {
  const response = await api.get(`/tasks/${id}/ledger`);
  return response.data;
};

export const getTaskVotes = async (id: string) => {
  const response = await api.get(`/tasks/${id}/votes`);
  return response.data;
};

// Wallet endpoints
export const getWalletProfile = async (address: string) => {
  const response = await api.get(`/wallets/${address}`);
  return response.data;
};

// Search
export const search = async (query: string, type = 'all', limit = 20, offset = 0) => {
  const response = await api.get('/search', { params: { q: query, type, limit, offset } });
  return response.data;
};

// Stats
export const getGlobalStats = async () => {
  const response = await api.get('/stats/global');
  return response.data;
};

export default api;
