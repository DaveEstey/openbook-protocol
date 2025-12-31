'use client';

import { use, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { getTask, getTaskLedger, getTaskVotes } from '@/lib/api';
import {
  formatUSDC,
  formatTimeAgo,
  formatAddress,
  getStateBadgeColor,
  calculateFundingProgress,
} from '@/lib/utils';
import ContributeButton from '@/components/ContributeButton';

export default function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<'details' | 'ledger' | 'votes'>('details');

  const { data: taskData, error, isLoading } = useSWR(`task-${id}`, () => getTask(id));
  const { data: ledgerData } = useSWR(
    activeTab === 'ledger' ? `task-ledger-${id}` : null,
    () => getTaskLedger(id)
  );
  const { data: votesData } = useSWR(
    activeTab === 'votes' ? `task-votes-${id}` : null,
    () => getTaskVotes(id)
  );

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !taskData) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Task not found</h1>
        <Link href="/" className="text-primary-600 hover:underline mt-4 inline-block">
          Back to discover
        </Link>
      </div>
    );
  }

  const { task } = taskData;
  const progress = calculateFundingProgress(task.total_contributed, task.finalized_budget || '0');

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-gray-600">
        <Link href="/" className="hover:text-primary-600">
          Home
        </Link>
        {' / '}
        {task.campaign_id && (
          <>
            <Link href={`/campaigns/${task.campaign_id}`} className="hover:text-primary-600">
              {task.campaign_title || task.campaign_id}
            </Link>
            {' / '}
          </>
        )}
        <span className="text-gray-900">{task.task_id}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="card mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{task.title}</h1>

            <div className="flex items-center space-x-3 mb-6">
              <span className={`badge ${getStateBadgeColor(task.state)}`}>{task.state}</span>
              <span className="text-sm text-gray-600">
                Created {formatTimeAgo(task.created_at)}
              </span>
            </div>

            {task.description && (
              <p className="text-gray-700 mb-6 whitespace-pre-wrap">{task.description}</p>
            )}

            {task.recipient && (
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <div className="text-sm text-blue-900 font-medium">Assigned Recipient</div>
                <div className="font-mono text-blue-700">{formatAddress(task.recipient, 8)}</div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="flex border-b border-gray-200">
              {(['details', 'ledger', 'votes'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                    activeTab === tab
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="card">
            {activeTab === 'details' && (
              <div>
                <h3 className="font-semibold text-lg mb-4">Task Details</h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500">Task ID</dt>
                    <dd className="font-mono text-gray-900">{task.task_id}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Creator</dt>
                    <dd className="font-mono text-gray-900">{formatAddress(task.creator, 8)}</dd>
                  </div>
                  {task.deadline && (
                    <div>
                      <dt className="text-gray-500">Deadline</dt>
                      <dd className="text-gray-900">
                        {new Date(Number(task.deadline) * 1000).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {activeTab === 'ledger' && (
              <div>
                <h3 className="font-semibold text-lg mb-4">Transparent Ledger</h3>
                <p className="text-sm text-gray-600 mb-4">
                  All contributions are public and verifiable on-chain.
                </p>
                {ledgerData?.ledger.contributions && ledgerData.ledger.contributions.length > 0 ? (
                  <div className="space-y-2">
                    {ledgerData.ledger.contributions.map((c: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded"
                      >
                        <div className="flex-1">
                          <div className="font-mono text-sm">{formatAddress(c.contributor)}</div>
                          <div className="text-xs text-gray-500">
                            {formatTimeAgo(c.timestamp)} • Wallet age: {c.wallet_age_days} days
                          </div>
                        </div>
                        <div className="font-semibold text-gray-900">{formatUSDC(c.amount)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No contributions yet.</p>
                )}
              </div>
            )}

            {activeTab === 'votes' && (
              <div>
                <h3 className="font-semibold text-lg mb-4">Votes</h3>

                {votesData?.budget_votes && votesData.budget_votes.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Budget Votes</h4>
                    <div className="space-y-2">
                      {votesData.budget_votes.map((v: any, i: number) => (
                        <div key={i} className="flex justify-between p-3 bg-gray-50 rounded text-sm">
                          <span className="font-mono">{formatAddress(v.voter)}</span>
                          <span>
                            {formatUSDC(v.proposed_budget)} (weight: {formatUSDC(v.vote_weight)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {votesData?.approval_votes && votesData.approval_votes.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Approval Votes</h4>
                    <div className="space-y-2">
                      {votesData.approval_votes.map((v: any, i: number) => (
                        <div key={i} className="flex justify-between p-3 bg-gray-50 rounded text-sm">
                          <span className="font-mono">{formatAddress(v.voter)}</span>
                          <span
                            className={v.approved ? 'text-green-600' : 'text-red-600'}
                          >
                            {v.approved ? '✓ Approve' : '✗ Reject'} (weight: {formatUSDC(v.vote_weight)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!votesData?.budget_votes || votesData.budget_votes.length === 0) &&
                  (!votesData?.approval_votes || votesData.approval_votes.length === 0) && (
                    <p className="text-gray-600">No votes yet.</p>
                  )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card sticky top-4">
            <h3 className="font-semibold text-lg mb-4">Funding Progress</h3>

            {task.finalized_budget ? (
              <>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Raised</span>
                    <span className="font-semibold">{formatUSDC(task.total_contributed)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Goal</span>
                    <span className="font-semibold">{formatUSDC(task.finalized_budget)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div
                      className="bg-primary-600 h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="text-center text-sm font-semibold text-gray-900">
                    {progress}% funded
                  </div>
                </div>

                <div className="border-t pt-4 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Contributors</span>
                    <span className="font-semibold">{task.unique_contributors || 0}</span>
                  </div>
                </div>

                {task.state === 'FundingOpen' && <ContributeButton taskId={task.task_id} />}
              </>
            ) : (
              <p className="text-sm text-gray-600">Budget not yet finalized.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
