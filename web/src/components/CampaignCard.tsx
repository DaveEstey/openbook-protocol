import Link from 'next/link';
import { Campaign } from '@/lib/api';
import { formatUSDC, formatTimeAgo, getStateBadgeColor } from '@/lib/utils';

interface CampaignCardProps {
  campaign: Campaign;
}

export default function CampaignCard({ campaign }: CampaignCardProps) {
  return (
    <Link href={`/campaigns/${campaign.campaign_id}`}>
      <div className="card hover:shadow-lg transition-shadow cursor-pointer h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {campaign.title}
            </h3>
            <span className={`badge ${getStateBadgeColor(campaign.state)} mt-2`}>
              {campaign.state}
            </span>
          </div>
        </div>

        {campaign.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {campaign.description}
          </p>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
            {campaign.category}
          </span>
          <span>{formatTimeAgo(campaign.created_at)}</span>
        </div>

        <div className="border-t pt-3 mt-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Tasks</div>
              <div className="font-semibold text-gray-900">
                {campaign.total_tasks || campaign.tasks_count || 0}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Raised</div>
              <div className="font-semibold text-gray-900">
                {campaign.total_contributions_usd
                  ? formatUSDC(campaign.total_contributions_usd)
                  : '$0.00'}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Contributors</div>
              <div className="font-semibold text-gray-900">
                {campaign.unique_contributors || 0}
              </div>
            </div>
            {campaign.trending_score !== undefined && (
              <div>
                <div className="text-gray-500">Trending</div>
                <div className="font-semibold text-gray-900">
                  {campaign.trending_score.toFixed(0)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
