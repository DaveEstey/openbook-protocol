'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { getDiscoveryTrending, getDiscoveryTop, getDiscoveryNew, getDiscoveryNearGoal } from '@/lib/api';
import CampaignCard from '@/components/CampaignCard';
import TaskCard from '@/components/TaskCard';

type Tab = 'trending' | 'top' | 'new' | 'near-goal';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('trending');

  const { data: trendingData, isLoading: trendingLoading } = useSWR(
    activeTab === 'trending' ? 'trending' : null,
    () => getDiscoveryTrending(20, 0)
  );

  const { data: topData, isLoading: topLoading } = useSWR(
    activeTab === 'top' ? 'top' : null,
    () => getDiscoveryTop(20, 0)
  );

  const { data: newData, isLoading: newLoading } = useSWR(
    activeTab === 'new' ? 'new' : null,
    () => getDiscoveryNew(20, 0)
  );

  const { data: nearGoalData, isLoading: nearGoalLoading } = useSWR(
    activeTab === 'near-goal' ? 'near-goal' : null,
    () => getDiscoveryNearGoal(20, 0)
  );

  const tabs: { key: Tab; label: string; description: string }[] = [
    {
      key: 'trending',
      label: 'Trending',
      description: 'Anti-Sybil weighted by USDC contributions',
    },
    {
      key: 'top',
      label: 'Top',
      description: 'Highest total contributions',
    },
    {
      key: 'new',
      label: 'New',
      description: 'Recently published campaigns',
    },
    {
      key: 'near-goal',
      label: 'Near Goal',
      description: 'Tasks close to funding (70-99%)',
    },
  ];

  const isLoading = trendingLoading || topLoading || newLoading || nearGoalLoading;

  const currentData =
    activeTab === 'trending'
      ? trendingData
      : activeTab === 'top'
      ? topData
      : activeTab === 'new'
      ? newData
      : nearGoalData;

  const isTasksView = activeTab === 'near-goal';
  const items = isTasksView ? currentData?.tasks : currentData?.campaigns;

  return (
    <div>
      {/* Hero */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Decentralized Crowdfunding on Solana
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          Transparent. Anti-Sybil. Community-governed. No middlemen.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-primary-50 p-4 rounded-lg">
            <div className="font-bold text-primary-700">🔒 Your Keys, Your Money</div>
            <p className="text-gray-600 mt-1">All funds locked in Solana smart contracts</p>
          </div>
          <div className="bg-primary-50 p-4 rounded-lg">
            <div className="font-bold text-primary-700">🛡️ Anti-Sybil Protection</div>
            <p className="text-gray-600 mt-1">Vote weight = USDC contributed, not wallet count</p>
          </div>
          <div className="bg-primary-50 p-4 rounded-lg">
            <div className="font-bold text-primary-700">👁️ Full Transparency</div>
            <p className="text-gray-600 mt-1">Every contribution, vote, and payout is public</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {tabs.find((t) => t.key === activeTab)?.description}
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items?.map((item: any) =>
            isTasksView ? (
              <TaskCard key={item.pubkey} task={item} />
            ) : (
              <CampaignCard key={item.pubkey} campaign={item} />
            )
          )}
        </div>
      )}

      {!isLoading && (!items || items.length === 0) && (
        <div className="text-center py-12 text-gray-600">
          <p>No {isTasksView ? 'tasks' : 'campaigns'} found.</p>
        </div>
      )}
    </div>
  );
}
