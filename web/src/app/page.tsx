'use client';

import { useState } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { getDiscoveryTrending, getDiscoveryTop, getDiscoveryNew, getDiscoveryNearGoal } from '@/lib/api';
import CampaignCard from '@/components/CampaignCard';
import TaskCard from '@/components/TaskCard';
import SkeletonCard from '@/components/SkeletonCard';

type Tab = 'trending' | 'top' | 'new' | 'near-goal';

const PAGE_SIZE = 12;

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('trending');

  // Helper to get key for infinite scroll
  const getKey = (tab: Tab) => (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.campaigns && !previousPageData.tasks) return null;
    return `${tab}-${pageIndex}`;
  };

  // Infinite scroll for each tab
  const {
    data: trendingPages,
    size: trendingSize,
    setSize: setTrendingSize,
    isLoading: trendingLoading,
    isValidating: trendingValidating,
  } = useSWRInfinite(
    activeTab === 'trending' ? getKey('trending') : () => null,
    (key) => {
      const pageIndex = parseInt(key.split('-')[1]);
      return getDiscoveryTrending(PAGE_SIZE, pageIndex * PAGE_SIZE);
    },
    { revalidateFirstPage: false }
  );

  const {
    data: topPages,
    size: topSize,
    setSize: setTopSize,
    isLoading: topLoading,
    isValidating: topValidating,
  } = useSWRInfinite(
    activeTab === 'top' ? getKey('top') : () => null,
    (key) => {
      const pageIndex = parseInt(key.split('-')[1]);
      return getDiscoveryTop(PAGE_SIZE, pageIndex * PAGE_SIZE);
    },
    { revalidateFirstPage: false }
  );

  const {
    data: newPages,
    size: newSize,
    setSize: setNewSize,
    isLoading: newLoading,
    isValidating: newValidating,
  } = useSWRInfinite(
    activeTab === 'new' ? getKey('new') : () => null,
    (key) => {
      const pageIndex = parseInt(key.split('-')[1]);
      return getDiscoveryNew(PAGE_SIZE, pageIndex * PAGE_SIZE);
    },
    { revalidateFirstPage: false }
  );

  const {
    data: nearGoalPages,
    size: nearGoalSize,
    setSize: setNearGoalSize,
    isLoading: nearGoalLoading,
    isValidating: nearGoalValidating,
  } = useSWRInfinite(
    activeTab === 'near-goal' ? getKey('near-goal') : () => null,
    (key) => {
      const pageIndex = parseInt(key.split('-')[1]);
      return getDiscoveryNearGoal(PAGE_SIZE, pageIndex * PAGE_SIZE);
    },
    { revalidateFirstPage: false }
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

  // Get current tab data and pagination controls
  const currentPages =
    activeTab === 'trending'
      ? trendingPages
      : activeTab === 'top'
      ? topPages
      : activeTab === 'new'
      ? newPages
      : nearGoalPages;

  const currentSize =
    activeTab === 'trending'
      ? trendingSize
      : activeTab === 'top'
      ? topSize
      : activeTab === 'new'
      ? newSize
      : nearGoalSize;

  const setCurrentSize =
    activeTab === 'trending'
      ? setTrendingSize
      : activeTab === 'top'
      ? setTopSize
      : activeTab === 'new'
      ? setNewSize
      : setNearGoalSize;

  const isLoading =
    (activeTab === 'trending' && trendingLoading) ||
    (activeTab === 'top' && topLoading) ||
    (activeTab === 'new' && newLoading) ||
    (activeTab === 'near-goal' && nearGoalLoading);

  const isLoadingMore =
    (activeTab === 'trending' && trendingValidating) ||
    (activeTab === 'top' && topValidating) ||
    (activeTab === 'new' && newValidating) ||
    (activeTab === 'near-goal' && nearGoalValidating);

  const isTasksView = activeTab === 'near-goal';

  // Flatten paginated data
  const items = currentPages
    ? currentPages.flatMap((page) => (isTasksView ? page.tasks || [] : page.campaigns || []))
    : [];

  // Check if there are more items to load
  const lastPage = currentPages?.[currentPages.length - 1];
  const hasMore = lastPage && (isTasksView ? lastPage.tasks?.length : lastPage.campaigns?.length) === PAGE_SIZE;

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items?.map((item: any) =>
              isTasksView ? (
                <TaskCard key={item.pubkey} task={item} />
              ) : (
                <CampaignCard key={item.pubkey} campaign={item} />
              )
            )}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setCurrentSize(currentSize + 1)}
                disabled={isLoadingMore}
                className="btn btn-secondary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                    Loading...
                  </span>
                ) : (
                  `Load More ${isTasksView ? 'Tasks' : 'Campaigns'}`
                )}
              </button>
            </div>
          )}

          {/* Showing count */}
          {items && items.length > 0 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Showing {items.length} {isTasksView ? 'tasks' : 'campaigns'}
              {!hasMore && ' (all results)'}
            </div>
          )}
        </>
      )}

      {!isLoading && (!items || items.length === 0) && (
        <div className="text-center py-12 text-gray-600">
          <p>No {isTasksView ? 'tasks' : 'campaigns'} found.</p>
        </div>
      )}
    </div>
  );
}
