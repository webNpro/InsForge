import { Search, X } from 'lucide-react';
import { Input } from '@/components/radix/Input';
import { Button } from '@/components/radix/Button';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
}: SearchInputProps) {
  return (
    <div className={`relative bg-white ${className || ''}`}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-9 h-10"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange('')}
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
