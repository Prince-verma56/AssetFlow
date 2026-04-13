"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CheckCircle2, Clock3, CircleDashed } from "lucide-react";
import type { TableConfig } from "@/config/table.config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function renderStatusBadge(statusRaw: unknown) {
  const status = String(statusRaw ?? "");
  const normalized = status.toLowerCase();

  if (normalized === "sell now" || normalized === "sell_now") {
    return (
      <Badge variant="outline" className="gap-1 border-[var(--success-soft)] bg-[var(--success-soft)] text-[var(--success)]">
        <CheckCircle2 className="size-3" />
        Sell Now
      </Badge>
    );
  }

  if (normalized === "wait") {
    return (
      <Badge variant="outline" className="gap-1 border-[var(--warning-soft)] bg-[var(--warning-soft)] text-[var(--warning)]">
        <Clock3 className="size-3" />
        Wait
      </Badge>
    );
  }

  if (normalized === "negotiate") {
    return (
      <Badge variant="outline" className="gap-1 border-[var(--info-soft)] bg-[var(--info-soft)] text-[var(--info)]">
        <CircleDashed className="size-3" />
        Negotiate
      </Badge>
    );
  }

  if (normalized === "done" || normalized === "paid" || normalized === "completed") {
    return (
      <Badge variant="outline" className="gap-1 border-[var(--success-soft)] bg-[var(--success-soft)] text-[var(--success)]">
        <CheckCircle2 className="size-3" />
        {status}
      </Badge>
    );
  }

  if (normalized === "pending" || normalized === "processing") {
    return (
      <Badge variant="outline" className="gap-1 border-[var(--warning-soft)] bg-[var(--warning-soft)] text-[var(--warning)]">
        <Clock3 className="size-3" />
        {status}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 border-border bg-muted text-muted-foreground">
      <CircleDashed className="size-3" />
      {status}
    </Badge>
  );
}

type DataTableProps<TData extends Record<string, unknown>> = {
  config: TableConfig<TData>;
  data: TData[];
};

export function DataTable<TData extends Record<string, unknown>>({
  config,
  data,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>(
    config.initialSort ? [{ id: config.initialSort.id, desc: config.initialSort.desc ?? false }] : []
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: config.pageSize ?? 5,
  });

  const columns = React.useMemo<ColumnDef<TData>[]>(() => {
    return config.columns.map((column) => ({
      accessorKey: column.key,
      header: ({ column: tableColumn }) => {
        const canSort = column.sortable !== false;
        if (!canSort) return column.header;

        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-0 py-0 font-medium"
            onClick={() => tableColumn.toggleSorting(tableColumn.getIsSorted() === "asc")}
          >
            {column.header}
          </Button>
        );
      },
      enableSorting: column.sortable !== false,
      cell: ({ row }) => {
        const value = row.getValue(column.key);

        if (column.cell) return column.cell(row.original);
        if (column.type === "status") return renderStatusBadge(value);

        return <span>{String(value ?? "-")}</span>;
      },
    }));
  }, [config.columns]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const searchKey = config.searchKey ?? config.columns[0]?.key;

  return (
    <Card className="border-border bg-card text-card-foreground">
      <CardHeader>
        <CardTitle>{config.title}</CardTitle>
        {config.description ? <CardDescription>{config.description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {searchKey ? (
          <Input
            placeholder={config.searchPlaceholder ?? "Search records..."}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn(searchKey)?.setFilterValue(event.target.value)}
            className="max-w-sm"
          />
        ) : null}

        <div className="rounded-lg border border-border/70">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-muted-foreground">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/50">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={cn(cell.column.id === config.statusKey ? "w-[140px]" : "")}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </p>

          <div className="flex items-center gap-2">
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
