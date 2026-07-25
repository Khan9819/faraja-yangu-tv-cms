import React from 'react';

// Default getRowId function - memoized to prevent infinite loops
const defaultGetRowId = <T extends { [key: string]: any }>(row: T) => row.id;
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Checkbox,
    TableSortLabel,
    Box
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';

export type Order = 'asc' | 'desc';

export interface ColumnGroup {
    name: string;
    color?: string;
}

export interface Column<T> {
    id: keyof T;
    label: string;
    numeric?: boolean;
    width?: string;
    flex?: number;
    align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
    format?: (value: any) => React.ReactNode;
    sortable?: boolean;
    renderCell?: (row: T) => React.ReactNode;
    sortValue?: (row: T) => number | string | Date;
    group?: ColumnGroup;
}

export interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    defaultSort?: keyof T;
    defaultOrder?: Order;
    selectable?: boolean;
    defaultShowSelection?: boolean;
    toolbar?: React.ReactNode;
    rowActions?: (row: T) => React.ReactNode;
    onRowClick?: (row: T) => void;
    getRowId?: (row: T) => string | number;
    onSelectionChange?: (selectedRows: T[]) => void;
}

function DataTable<T extends { [key: string]: any }>({
    columns,
    data,
    defaultSort,
    defaultOrder = 'asc',
    selectable = false,
    defaultShowSelection = false,
    toolbar,
    rowActions,
    onRowClick,
    getRowId = defaultGetRowId,
    onSelectionChange
}: DataTableProps<T>) {
    const [order, setOrder] = React.useState<Order>(defaultOrder);
    const [orderBy, setOrderBy] = React.useState<keyof T | undefined>(defaultSort);
    const [selected, setSelected] = React.useState<(string | number)[]>([]);
    const [showSelection, setShowSelection] = React.useState(selectable && defaultShowSelection);

    // Reset selection when selection is disabled
    React.useEffect(() => {
        if (!selectable || !showSelection) {
            setSelected([]);
        }
    }, [selectable, showSelection]);

    // Calculate selected rows
    const selectedRows = React.useMemo(() => {
        if (!selectable || !showSelection) return [];
        return data.filter(row => selected.includes(getRowId(row)));
    }, [data, selected, getRowId, selectable, showSelection]);

    // Use ref to store the latest callback to avoid infinite loops
    const onSelectionChangeRef = React.useRef(onSelectionChange);
    onSelectionChangeRef.current = onSelectionChange;

    // Notify parent of selection changes
    React.useEffect(() => {
        if (onSelectionChangeRef.current) {
            onSelectionChangeRef.current(selectedRows);
        }
    }, [selectedRows]);
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);

    const handleRequestSort = (property: keyof T) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const getSortValue = (row: T, column: Column<T>) => {
        if (column.sortValue) {
            return column.sortValue(row);
        }
        return row[column.id];
    };

    const handleSelectAllClick = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectable || !showSelection) return;
        
        if (event.target.checked) {
            const newSelected = data.map(n => getRowId(n));
            setSelected(newSelected);
            return;
        }
        setSelected([]);
    }, [selectable, showSelection, data, getRowId]);

    const handleClick = React.useCallback((id: string | number) => {
        if (!selectable || !showSelection) return;
        const selectedIndex = selected.indexOf(id);
        let newSelected: (string | number)[] = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1),
            );
        }

        setSelected(newSelected);
    }, [selected, selectable, showSelection]);

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(0);
    };

    const isSelected = (id: string | number) => selected.indexOf(id) !== -1;

    const sortedData = React.useMemo(() => {
        if (!orderBy) return data;
        
        const column = columns.find(col => col.id === orderBy);
        if (!column) return data;

        return [...data].sort((a, b) => {
            const aValue = getSortValue(a, column);
            const bValue = getSortValue(b, column);
            
            if (order === 'desc') {
                return (bValue < aValue ? -1 : bValue > aValue ? 1 : 0);
            }
            return (aValue < bValue ? -1 : aValue > bValue ? 1 : 0);
        });
    }, [data, order, orderBy, columns]);

    const paginatedData = sortedData.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage,
    );

    return (
        <div style={{ width: '100%', backgroundColor: 'var(--bg-tertiary)', borderRadius: 2 }}>
            {selectable && (
                <Box sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, borderBottom: 1, borderColor: 'divider' }}>
                    <Checkbox
                        size="small"
                        checked={showSelection}
                        onChange={(e) => setShowSelection(e.target.checked)}
                    />
                    <span style={{ fontSize: '0.875rem' }}>Show selection</span>
                </Box>
            )}
            {toolbar}
            <TableContainer>
                <Table
                    sx={{ minWidth: 750 }}
                    aria-labelledby="tableTitle"
                    size="medium"
                >
                    <TableHead>
                        <TableRow>
                            {selectable && showSelection && (
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        color="primary"
                                        indeterminate={selected.length > 0 && selected.length < data.length}
                                        checked={data.length > 0 && selected.length === data.length}
                                        onChange={handleSelectAllClick}
                                        inputProps={{
                                            'aria-label': 'select all',
                                        }}
                                    />
                                </TableCell>
                            )}
                            {columns.map((column) => (
                                <TableCell
                                    key={column.id as string}
                                    align={column.align || 'left'}
                                    style={{
                                        width: column.width,
                                        flex: column.flex,
                                        backgroundColor: column.group?.color,
                                        borderLeft: column.group ? `1px solid ${column.group.color}` : 'none',
                                        borderRight: column.group ? `1px solid ${column.group.color}` : 'none',
                                    }}
                                    sortDirection={orderBy === column.id ? order : false}
                                >
                                    {column.sortable !== false ? (
                                        <TableSortLabel
                                            active={orderBy === column.id}
                                            direction={orderBy === column.id ? order : 'asc'}
                                            onClick={() => handleRequestSort(column.id)}
                                        >
                                            {column.label}
                                            {orderBy === column.id ? (
                                                <Box component="span" sx={visuallyHidden}>
                                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                </Box>
                                            ) : null}
                                        </TableSortLabel>
                                    ) : (
                                        column.label
                                    )}
                                </TableCell>
                            ))}
                            {rowActions && <TableCell align="right">Actions</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedData.map((row) => {
                            const id = getRowId(row);
                            const isItemSelected = isSelected(id);

                            return (
                                <TableRow
                                    hover
                                    onClick={(_: React.MouseEvent) => {
                                        if (selectable && showSelection) {
                                            handleClick(id);
                                        }
                                        if (onRowClick) {
                                            onRowClick(row);
                                        }
                                    }}
                                    role="checkbox"
                                    aria-checked={isItemSelected}
                                    tabIndex={-1}
                                    key={id}
                                    selected={isItemSelected}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    {selectable && showSelection && (
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                color="primary"
                                                checked={isItemSelected}
                                            />
                                        </TableCell>
                                    )}
                                    {columns.map((column) => (
                                        <TableCell
                                            key={String(column.id)}
                                            align={column.align || (column.numeric ? 'right' : 'left')}
                                            style={{
                                                backgroundColor: column.group?.color ? `${column.group.color}15` : 'inherit',
                                                borderLeft: column.group ? `1px solid ${column.group.color}22` : 'none',
                                                borderRight: column.group ? `1px solid ${column.group.color}22` : 'none',
                                            }}
                                        >
                                            {column.renderCell
                                                ? column.renderCell(row)
                                                : column.format
                                                    ? column.format(row[column.id])
                                                    : row[column.id]}
                                        </TableCell>
                                    ))}
                                    {rowActions && (
                                        <TableCell align="right">
                                            {rowActions(row)}
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={data.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
        </div>
    );
}

export default DataTable;
