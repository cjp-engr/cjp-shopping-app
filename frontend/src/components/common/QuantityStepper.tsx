import { Minus, Plus } from 'lucide-react';

interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  /** Names the number for screen readers; announced when it changes. */
  valueLabel: string;
  disabled?: boolean;
}

const stepButton = 'w-11 h-11 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500';

/** The "- 1 +" quantity control, looking exactly like the one on the product page. */
export function QuantityStepper({ value, min, max, onChange, decreaseLabel, increaseLabel, valueLabel, disabled = false }: Props) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-xl border border-gray-200 dark:border-gray-600">
      <button type="button" className={stepButton} aria-label={decreaseLabel}
        disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <span role="status" aria-label={valueLabel}
        className="min-w-[3rem] select-none bg-gray-50 px-5 py-2 text-center text-base font-semibold dark:bg-gray-700 dark:text-white">
        {value}
      </span>
      <button type="button" className={stepButton} aria-label={increaseLabel}
        disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
