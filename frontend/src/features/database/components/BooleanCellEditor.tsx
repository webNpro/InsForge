import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/radix/Select';

interface BooleanCellEditorProps {
  value: boolean | null;
  nullable: boolean;
  onValueChange: (newValue: string) => void;
  onCancel: () => void;
}

export function BooleanCellEditor({
  value,
  nullable,
  onValueChange,
  onCancel,
}: BooleanCellEditorProps) {
  const [open, setOpen] = useState(true);

  // Convert boolean to string for Select component
  const stringValue = value === null ? 'null' : String(value);

  useEffect(() => {
    // Auto-open the select when component mounts
    setOpen(true);
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onCancel();
    }
    setOpen(isOpen);
  };

  return (
    <Select
      value={stringValue}
      onValueChange={onValueChange}
      open={open}
      onOpenChange={handleOpenChange}
    >
      <SelectTrigger
        className="w-full h-full border-0 focus:ring-0 focus:ring-offset-0 p-0 bg-transparent"
        style={{
          fontSize: '14px',
        }}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start" className="min-w-25">
        <SelectItem value="true">true</SelectItem>
        <SelectItem value="false">false</SelectItem>
        {nullable && <SelectItem value="null">null</SelectItem>}
      </SelectContent>
    </Select>
  );
}
