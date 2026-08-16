import { useState, useEffect } from 'react';

const BREAKPOINTS = {
  sm: '(min-width: 640px)',
  lg: '(min-width: 1024px)',
} as const;

export const PAGE_SIZE_BY_COLUMNS: Record<number, number> = {
  1: 8,
  2: 10,
  3: 9,
};

function getColumns(): number {
  if (typeof window === 'undefined') return 1;
  if (window.matchMedia(BREAKPOINTS.lg).matches) return 3;
  if (window.matchMedia(BREAKPOINTS.sm).matches) return 2;
  return 1;
}

export function useGridColumns(): number {
  const [columns, setColumns] = useState(getColumns);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const update = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setColumns(getColumns()), 300);
    };

    const lgQuery = window.matchMedia(BREAKPOINTS.lg);
    const smQuery = window.matchMedia(BREAKPOINTS.sm);

    lgQuery.addEventListener('change', update);
    smQuery.addEventListener('change', update);

    return () => {
      clearTimeout(timer);
      lgQuery.removeEventListener('change', update);
      smQuery.removeEventListener('change', update);
    };
  }, []);

  return columns;
}
