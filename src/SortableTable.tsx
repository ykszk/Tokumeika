export type Order = 'asc' | 'desc';

export function descendingComparator<T>(a: T, b: T) {
  if (a === b) return 0;
  return b < a ? -1 : 1;
}

export interface SortableType<T> {
  id: string;
  label: string;
  comparator: (a: T, b: T) => number;
}
