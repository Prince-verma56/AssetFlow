import type { ReactNode } from "react";

export type TableColumnConfig<T> = {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  type?: "text" | "number" | "date" | "status";
  cell?: (row: T) => ReactNode;
};

export type TableConfig<T> = {
  title: string;
  description?: string;
  columns: TableColumnConfig<T>[];
  pageSize?: number;
  searchKey?: keyof T & string;
  searchPlaceholder?: string;
  statusKey?: keyof T & string;
  initialSort?: {
    id: keyof T & string;
    desc?: boolean;
  };
};