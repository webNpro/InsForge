import { Card, CardContent } from '@/components/radix/Card';
import { Skeleton } from '@/components/radix/Skeleton';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  unit: string;
  description: string;
  isLoading?: boolean;
}

export function StatsCard({
  icon: Icon,
  title,
  value,
  unit,
  description,
  isLoading,
}: StatsCardProps) {
  return (
    <Card className="flex-1 bg-white dark:bg-[#333333] rounded-lg border border-gray-200 dark:border-neutral-700 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] h-[280px]">
      <CardContent className="p-8 h-full flex flex-col justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 h-7">
            <Icon className="w-5 h-5 text-gray-700 dark:text-white" />
            <span className="text-base font-normal text-gray-900 dark:text-white">{title}</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <Skeleton className="h-8 w-16 bg-gray-200 dark:bg-neutral-700" />
            ) : (
              <>
                <span className="text-2xl font-normal text-gray-900 dark:text-white tracking-[-0.144px]">
                  {value}
                </span>
                <span className="text-sm font-normal text-gray-500 dark:text-neutral-400">
                  {unit}
                </span>
              </>
            )}
          </div>

          {isLoading ? (
            <Skeleton className="h-5 w-36 bg-gray-200 dark:bg-neutral-700" />
          ) : (
            <p className="text-base text-gray-500 dark:text-neutral-400">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
