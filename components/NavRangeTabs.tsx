import type { FundNavRange } from '@/api/types';
import { FUND_NAV_RANGE_OPTIONS } from '@/api/fund';

interface NavRangeTabsProps {
  value: FundNavRange;
  onChange: (range: FundNavRange) => void;
}

export function NavRangeTabs({ value, onChange }: NavRangeTabsProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {FUND_NAV_RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
            value === opt.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
