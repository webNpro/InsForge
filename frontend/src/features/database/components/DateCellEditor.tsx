import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/radix/Button';
import { cn } from '@/lib/utils/utils';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/radix/Popover';

interface DateCellEditorProps {
  value: string | null;
  type?: 'date' | 'datetime';
  nullable: boolean;
  onValueChange: (newValue: string) => void;
  onCancel: () => void;
}

type PickerMode = 'day' | 'month' | 'year';

interface TimeColumnProps {
  label: string;
  value: number;
  range: number;
  onChange: (value: number) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Reusable time column component
function TimeColumn({ label, value, range, onChange, scrollRef }: TimeColumnProps) {
  return (
    <div className="flex-1">
      <div className="text-xs text-muted-foreground mb-1 text-center">{label}</div>
      <div
        ref={scrollRef}
        className="h-60 overflow-y-auto border border-border-gray rounded p-1 scrollbar-thin"
      >
        {Array.from({ length: range }, (_, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={cn(
              'w-full px-1 py-1 text-sm rounded hover:bg-gray-100 text-center',
              value === i && 'bg-primary text-primary-foreground hover:bg-primary'
            )}
          >
            {i.toString().padStart(2, '0')}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DateCellEditor({
  value,
  type = 'datetime',
  nullable,
  onValueChange,
  onCancel,
}: DateCellEditorProps) {
  const [open, setOpen] = useState(true);
  const [pickerMode, setPickerMode] = useState<PickerMode>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (value && value !== 'null') {
      return new Date(value);
    }
    return new Date();
  });

  const [selectedHour, setSelectedHour] = useState(() => {
    if (value && value !== 'null' && type === 'datetime') {
      return new Date(value).getHours();
    }
    return new Date().getHours();
  });

  const [selectedMinute, setSelectedMinute] = useState(() => {
    if (value && value !== 'null' && type === 'datetime') {
      return new Date(value).getMinutes();
    }
    return new Date().getMinutes();
  });

  const [displayMonth, setDisplayMonth] = useState(selectedDate.getMonth());
  const [displayYear, setDisplayYear] = useState(selectedDate.getFullYear());

  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(true);
  }, []);

  useEffect(() => {
    // Auto-scroll to selected time values when popover opens
    if (open && type === 'datetime') {
      setTimeout(() => {
        if (hourScrollRef.current) {
          const hourButton = hourScrollRef.current.querySelector(
            `button:nth-child(${selectedHour + 1})`
          );
          if (hourButton) {
            hourButton.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }
        if (minuteScrollRef.current) {
          const minuteButton = minuteScrollRef.current.querySelector(
            `button:nth-child(${selectedMinute + 1})`
          );
          if (minuteButton) {
            minuteButton.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }
      }, 100);
    }
  }, [open, selectedHour, selectedMinute, type]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onCancel();
    }
    setOpen(isOpen);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(displayYear, displayMonth, day);
    setSelectedDate(newDate);

    if (type === 'date') {
      onValueChange(format(newDate, 'yyyy-MM-dd'));
      setOpen(false);
    }
  };

  const handleMonthClick = (month: number) => {
    setDisplayMonth(month);
    setPickerMode('day');
  };

  const handleYearClick = (year: number) => {
    setDisplayYear(year);
    setPickerMode('month');
  };

  const handlePrevMonth = () => {
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear(displayYear - 1);
    } else {
      setDisplayMonth(displayMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear(displayYear + 1);
    } else {
      setDisplayMonth(displayMonth + 1);
    }
  };

  const handlePrevYear = () => {
    setDisplayYear(displayYear - 1);
  };

  const handleNextYear = () => {
    setDisplayYear(displayYear + 1);
  };

  const handlePrevDecade = () => {
    setDisplayYear(displayYear - 10);
  };

  const handleNextDecade = () => {
    setDisplayYear(displayYear + 10);
  };

  const handleSave = () => {
    if (type === 'datetime') {
      const dateTime = new Date(selectedDate);
      dateTime.setHours(selectedHour, selectedMinute, 0, 0);
      // Format as local ISO string to avoid timezone conversion
      const year = dateTime.getFullYear();
      const month = String(dateTime.getMonth() + 1).padStart(2, '0');
      const day = String(dateTime.getDate()).padStart(2, '0');
      const hours = String(selectedHour).padStart(2, '0');
      const minutes = String(selectedMinute).padStart(2, '0');
      const localISOString = `${year}-${month}-${day}T${hours}:${minutes}:00`;
      onValueChange(localISOString);
    } else {
      onValueChange(format(selectedDate, 'yyyy-MM-dd'));
    }
    setOpen(false);
  };

  const handleClear = () => {
    if (nullable) {
      onValueChange('null');
      setOpen(false);
    }
  };

  const formatDisplayValue = () => {
    if (!value || value === 'null') {
      return 'Select date...';
    }

    const d = new Date(value);
    if (type === 'datetime') {
      return format(d, 'MMM dd, yyyy HH:mm');
    }
    return format(d, 'MMM dd, yyyy');
  };

  const renderDayPicker = () => {
    const daysInMonth = getDaysInMonth(displayYear, displayMonth);
    const firstDay = getFirstDayOfMonth(displayYear, displayMonth);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === displayMonth &&
        selectedDate.getFullYear() === displayYear;
      const isToday =
        new Date().getDate() === day &&
        new Date().getMonth() === displayMonth &&
        new Date().getFullYear() === displayYear;

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          className={cn(
            'h-8 w-8 text-sm rounded hover:bg-gray-100',
            isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
            isToday && !isSelected && 'font-bold'
          )}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const renderMonthPicker = () => {
    return MONTHS.map((month, index) => {
      const isSelected = selectedDate.getMonth() === index;
      return (
        <button
          key={month}
          onClick={() => handleMonthClick(index)}
          className={cn(
            'h-12 w-20 text-sm rounded hover:bg-gray-100',
            isSelected && 'bg-primary text-primary-foreground hover:bg-primary'
          )}
        >
          {month}
        </button>
      );
    });
  };

  const renderYearPicker = () => {
    const startYear = Math.floor(displayYear / 10) * 10;
    const years = [];

    for (let i = 0; i < 12; i++) {
      const year = startYear + i;
      const isSelected = selectedDate.getFullYear() === year;
      years.push(
        <button
          key={year}
          onClick={() => handleYearClick(year)}
          className={cn(
            'h-12 w-20 text-sm rounded hover:bg-gray-100',
            isSelected && 'bg-primary text-primary-foreground hover:bg-primary'
          )}
        >
          {year}
        </button>
      );
    }

    return years;
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-left font-normal h-full border-0 p-0 hover:bg-transparent',
            (!value || value === 'null') && 'text-muted-foreground'
          )}
          style={{ fontSize: '14px' }}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {formatDisplayValue()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom">
        <div className={cn('flex', type === 'datetime' && '')}>
          <div className="p-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={
                  pickerMode === 'day'
                    ? handlePrevMonth
                    : pickerMode === 'month'
                      ? handlePrevYear
                      : handlePrevDecade
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <button
                className="text-sm font-medium px-2 py-1 rounded hover:bg-gray-100"
                onClick={() => {
                  if (pickerMode === 'day') {
                    setPickerMode('month');
                  } else if (pickerMode === 'month') {
                    setPickerMode('year');
                  }
                }}
              >
                {pickerMode === 'day' && `${MONTHS[displayMonth]} ${displayYear}`}
                {pickerMode === 'month' && displayYear}
                {pickerMode === 'year' &&
                  `${Math.floor(displayYear / 10) * 10}-${Math.floor(displayYear / 10) * 10 + 9}`}
              </button>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={
                  pickerMode === 'day'
                    ? handleNextMonth
                    : pickerMode === 'month'
                      ? handleNextYear
                      : handleNextDecade
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar Grid - Fixed dimensions */}
            <div className="w-70 h-60">
              {pickerMode === 'day' && (
                <>
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {WEEKDAYS.map((day) => (
                      <div
                        key={day}
                        className="h-8 w-8 text-xs text-muted-foreground flex items-center justify-center"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Days */}
                  <div className="grid grid-cols-7 gap-1">{renderDayPicker()}</div>
                </>
              )}

              {pickerMode === 'month' && (
                <div className="grid grid-cols-3 gap-2 pt-4">{renderMonthPicker()}</div>
              )}

              {pickerMode === 'year' && (
                <div className="grid grid-cols-3 gap-2 pt-4">{renderYearPicker()}</div>
              )}
            </div>
          </div>

          {type === 'datetime' && (
            <div className="border-l border-border-gray bg-muted/30 w-35">
              <div className="p-3">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Time</span>
                </div>

                <div className="flex gap-2">
                  <TimeColumn
                    label="Hour"
                    value={selectedHour}
                    range={24}
                    onChange={setSelectedHour}
                    scrollRef={hourScrollRef}
                  />
                  <TimeColumn
                    label="Min"
                    value={selectedMinute}
                    range={60}
                    onChange={setSelectedMinute}
                    scrollRef={minuteScrollRef}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 p-3 border-t border-border-gray">
          {nullable && (
            <Button variant="outline" size="sm" onClick={handleClear} className="flex-1">
              Null
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onCancel();
              setOpen(false);
            }}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="flex-1">
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
