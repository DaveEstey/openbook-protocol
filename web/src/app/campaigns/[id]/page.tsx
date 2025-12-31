'use client';

import { use } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { getCampaign } from '@/lib/api';
import { formatUSDC, formatTimeAgo, formatAddress, getStateBadgeColor } from '@/lib/utils';
import TaskCard from '@/components/TaskCard';

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, isLoading } = useSWR(`campaign-${id}`, () => getCampaign(id));

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Campaign not found</h1>
        <Link href="/" className="text-primary-600 hover:underline mt-4 inline-block">
          Back to discover
        </Link>
      </div>
    );
  }

  const { campaign, tasks } = data;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-gray-600">
        <Link href="/" className="hover:text-primary-600">
          Home
        </Link>
        {' / '}
        <Link href="/campaigns" className="hover:text-primary-600">
          Campaigns
        </Link>
        {' / '}
        <span className="text-gray-900">{campaign.campaign_id}</span>
      </div>

      {/* Campaign Header */}
      <div className="card mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{campaign.title}</h1>
            <span className={`badge ${getStateBadgeColor(campaign.state)}`}>
              {campaign.state}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-6">
          <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
            {campaign.category}
          </span>
          <span>Created {formatTimeAgo(campaign.created_at)}</span>
          <span>
            by <span className="font-mono">{formatAddress(campaign.creator)}</span>
          </span>
        </div>

        {campaign.description && (
          <p className="text-gray-700 mb-6 whitespace-pre-wrap">{campaign.description}</p>
        )}

        {campaign.metadata_uri && (
          <a
            href={campaign.metadata_uri}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline text-sm"
          >
            View metadata →
          </a>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t">
          <div>
            <div className="text-sm text-gray-500">Total Tasks</div>
            <div className="text-2xl font-bold text-gray-900">
              {campaign.total_tasks || campaign.tasks_count || 0}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Total Raised</div>
            <div className="text-2xl font-bold text-gray-900">
              {campaign.total_contributions_usd
                ? formatUSDC(campaign.total_contributions_usd)
                : '$0.00'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Contributors</div>
            <div className="text-2xl font-bold text-gray-900">
              {campaign.unique_contributors || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Tasks ({tasks?.length || 0})
        </h2>
      </div>

      {tasks && tasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task: any) => (
            <TaskCard key={task.pubkey} task={task} />
          ))}
        </div>
      ) : (
        <div className="card text-center py-12 text-gray-600">
          <p>No tasks yet.</p>
        </div>
      )}
    </div>
  );
}
