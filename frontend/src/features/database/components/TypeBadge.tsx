import { cn } from '@/lib/utils/utils';

interface TypeBadgeProps {
  type: string;
  className?: string;
}

export function TypeBadge({ type, className }: TypeBadgeProps) {
  const getDisplayType = (type: string) => {
    const lowerType = type.toLowerCase();

    if (lowerType.includes('int')) {
      return 'Int';
    }
    if (lowerType.includes('string') || lowerType.includes('text')) {
      return 'String';
    }
    if (lowerType.includes('date') || lowerType.includes('time')) {
      return 'Date';
    }
    if (lowerType.includes('bool')) {
      return 'Boolean';
    }
    if (lowerType.includes('json')) {
      return 'JSON';
    }
    if (lowerType.includes('uuid')) {
      return 'UUID';
    }
    if (lowerType.includes('real') || lowerType.includes('float')) {
      return 'Float';
    }

    return type;
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center px-1.5 py-0.5 rounded-md',
        'bg-white border border-zinc-200',
        className
      )}
    >
      <span className="text-xs font-normal text-zinc-500">{getDisplayType(type)}</span>
    </div>
  );
}
