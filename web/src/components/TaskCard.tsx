import Link from 'next/link';
import { Task } from '@/lib/api';
import { formatUSDC, formatTimeAgo, getStateBadgeColor, calculateFundingProgress } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const progress = calculateFundingProgress(
    task.total_contributed,
    task.finalized_budget || '0'
  );

  return (
    <Link href={`/tasks/${task.task_id}`}>
      <div className="card hover:shadow-lg transition-shadow cursor-pointer h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {task.title}
            </h3>
            <span className={`badge ${getStateBadgeColor(task.state)} mt-2`}>
              {task.state}
            </span>
          </div>
        </div>

        {task.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {task.description}
          </p>
        )}

        {task.finalized_budget && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">
                {formatUSDC(task.total_contributed)} raised
              </span>
              <span className="text-gray-600">
                {progress}% of {formatUSDC(task.finalized_budget)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="border-t pt-3 mt-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Contributors</div>
              <div className="font-semibold text-gray-900">
                {task.unique_contributors || 0}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Created</div>
              <div className="font-semibold text-gray-900 text-xs">
                {formatTimeAgo(task.created_at)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
