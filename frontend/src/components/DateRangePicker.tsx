import { useState, useRef, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onChange: (startDate?: string, endDate?: string) => void;
  placeholder?: string;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  placeholder = 'Select date range',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localStartDate, setLocalStartDate] = useState(startDate || '');
  const [localEndDate, setLocalEndDate] = useState(endDate || '');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalStartDate(startDate || '');
    setLocalEndDate(endDate || '');
  }, [startDate, endDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleStartDateChange = (value: string) => {
    setLocalStartDate(value);
    if (value && localEndDate && value > localEndDate) {
      // If start date is after end date, clear end date
      setLocalEndDate('');
      onChange(value, undefined);
    } else {
      onChange(value || undefined, localEndDate || undefined);
    }
  };

  const handleEndDateChange = (value: string) => {
    setLocalEndDate(value);
    if (value && localStartDate && value < localStartDate) {
      // If end date is before start date, clear start date
      setLocalStartDate('');
      onChange(undefined, value);
    } else {
      onChange(localStartDate || undefined, value || undefined);
    }
  };

  const handleClear = () => {
    setLocalStartDate('');
    setLocalEndDate('');
    onChange(undefined, undefined);
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = parseISO(dateStr);
      if (isValid(date)) {
        return format(date, 'MMM dd, yyyy');
      }
    } catch {
      return dateStr;
    }
    return dateStr;
  };

  const displayText =
    localStartDate && localEndDate
      ? `${formatDisplayDate(localStartDate)} - ${formatDisplayDate(localEndDate)}`
      : localStartDate
      ? `From ${formatDisplayDate(localStartDate)}`
      : localEndDate
      ? `Until ${formatDisplayDate(localEndDate)}`
      : placeholder;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input pl-10 pr-10 w-full text-left flex items-center justify-between cursor-pointer hover:border-primary-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className={localStartDate || localEndDate ? 'text-gray-900' : 'text-gray-500'}>
            {displayText}
          </span>
        </div>
        {(localStartDate || localEndDate) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 sm:right-auto sm:left-[-95%] mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 w-full sm:w-auto sm:min-w-[500px] max-w-[calc(100vw-2rem)]">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900">Select Date Range</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={localStartDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  max={localEndDate || undefined}
                  className="input text-sm w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={localEndDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  min={localStartDate || undefined}
                  className="input text-sm w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClear}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn btn-primary text-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

