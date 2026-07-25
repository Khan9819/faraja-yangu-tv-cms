import { useState, useMemo, useEffect } from 'react';
import { Box, IconButton, Typography, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, InputAdornment, Tooltip } from '@mui/material';
import { FaChevronRight, FaChevronDown, FaFolder, FaFolderOpen, FaSearch, FaExpandAlt, FaCompressAlt } from 'react-icons/fa';

interface TreeColumn {
    field: string;
    headerName: string;
    width?: number;
    flex?: number;
    renderCell?: (row: any) => React.ReactNode;
}

interface TreeDataGridProps {
    data: any[];
    columns: TreeColumn[];
    parentField?: string; // Field that indicates parent (null = root)
    parentIdField?: string; // Field that contains parent's ID
    nameField?: string; // Field used for display name
    onRowClick?: (row: any) => void;
    loading?: boolean;
    defaultExpanded?: boolean; // Start with all expanded
}

export default function TreeDataGrid({
    data,
    columns,
    parentField = 'parent',
    parentIdField = 'parent_id',
    nameField = 'name',
    onRowClick,
    loading = false,
    defaultExpanded = false,
}: TreeDataGridProps) {
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [initialized, setInitialized] = useState(false);

    // Build hierarchical structure
    const { treeData, parentMap } = useMemo(() => {
        if (!data.length) return { treeData: [], parentMap: new Map() };

        // Separate parents and children
        const parents = data.filter((item) => 
            item[parentField] === null || item[parentField] === undefined
        );
        const children = data.filter((item) => 
            item[parentField] !== null && item[parentField] !== undefined
        );

        // Build parent map (parentId -> children[])
        const parentMap = new Map<number, any[]>();
        children.forEach((child) => {
            // Find parent by ID or by name match
            const parentItem = parents.find((p) => 
                p.id === child[parentIdField] || p[nameField] === child[parentField]
            );
            if (parentItem) {
                if (!parentMap.has(parentItem.id)) {
                    parentMap.set(parentItem.id, []);
                }
                parentMap.get(parentItem.id)!.push(child);
            }
        });

        // Sort parents and their children
        const sortedParents = [...parents].sort((a, b) => 
            (a[nameField] || '').localeCompare(b[nameField] || '')
        );
        
        parentMap.forEach((children, parentId) => {
            parentMap.set(parentId, children.sort((a, b) => 
                (a[nameField] || '').localeCompare(b[nameField] || '')
            ));
        });

        return { treeData: sortedParents, parentMap };
    }, [data, parentField, parentIdField, nameField]);

    // Initialize expanded state based on defaultExpanded
    useEffect(() => {
        if (!initialized && treeData.length > 0) {
            if (defaultExpanded) {
                const allParentIds = new Set(treeData.map((p) => p.id));
                setExpandedIds(allParentIds);
            }
            setInitialized(true);
        }
    }, [treeData, defaultExpanded, initialized]);

    // Auto-expand when searching
    useEffect(() => {
        if (searchQuery.trim()) {
            // Expand all parents that have matching children
            const parentsToExpand = new Set<number>();
            parentMap.forEach((_, parentId) => {
                parentsToExpand.add(parentId);
            });
            setExpandedIds(parentsToExpand);
        }
    }, [searchQuery, parentMap]);

    // Filter data based on search
    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return { parents: treeData, filteredParentMap: parentMap };

        const query = searchQuery.toLowerCase();
        const matchingParentIds = new Set<number>();
        const filteredParentMap = new Map<number, any[]>();

        // Check children first
        parentMap.forEach((children, parentId) => {
            const matchingChildren = children.filter((child: any) =>
                Object.values(child).some((val) =>
                    String(val).toLowerCase().includes(query)
                )
            );
            if (matchingChildren.length > 0) {
                matchingParentIds.add(parentId);
                filteredParentMap.set(parentId, matchingChildren);
            }
        });

        // Filter parents
        const filteredParents = treeData.filter((parent) => {
            const parentMatches = Object.values(parent).some((val) =>
                String(val).toLowerCase().includes(query)
            );
            if (parentMatches) {
                matchingParentIds.add(parent.id);
                // Include all children if parent matches
                if (parentMap.has(parent.id) && !filteredParentMap.has(parent.id)) {
                    filteredParentMap.set(parent.id, parentMap.get(parent.id)!);
                }
            }
            return matchingParentIds.has(parent.id);
        });

        return { parents: filteredParents, filteredParentMap };
    }, [treeData, parentMap, searchQuery]);

    const toggleExpand = (id: number) => {
        setExpandedIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const expandAll = () => {
        const allParentIds = new Set(treeData.map((p) => p.id));
        setExpandedIds(allParentIds);
    };

    const collapseAll = () => {
        setExpandedIds(new Set());
    };

    const renderRow = (item: any, isChild: boolean = false, _isLast: boolean = false) => {
        const isExpanded = expandedIds.has(item.id);
        const children = filteredData.filteredParentMap.get(item.id) || [];
        const hasChildren = children.length > 0;

        return (
            <TableRow
                key={item.id}
                hover
                onClick={() => onRowClick?.(item)}
                sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    backgroundColor: isChild ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
                    '&:hover': {
                        backgroundColor: isChild ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.04)',
                    },
                }}
            >
                {columns.map((col, colIndex) => (
                    <TableCell
                        key={col.field}
                        sx={{
                            width: col.width,
                            py: 1.5,
                            borderBottom: '1px solid rgba(224, 224, 224, 1)',
                        }}
                    >
                        {colIndex === 0 ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', pl: isChild ? 4 : 0 }}>
                                {!isChild && hasChildren ? (
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleExpand(item.id);
                                        }}
                                        sx={{ mr: 0.5, p: 0.5 }}
                                    >
                                        {isExpanded ? (
                                            <FaChevronDown size={12} color="#666" />
                                        ) : (
                                            <FaChevronRight size={12} color="#666" />
                                        )}
                                    </IconButton>
                                ) : !isChild ? (
                                    <Box sx={{ width: 28 }} />
                                ) : (
                                    <Box sx={{ 
                                        width: 20, 
                                        height: 20, 
                                        borderLeft: '2px solid #ddd', 
                                        borderBottom: '2px solid #ddd',
                                        borderRadius: '0 0 0 4px',
                                        mr: 1,
                                        mt: -1,
                                    }} />
                                )}
                                {!isChild ? (
                                    isExpanded ? (
                                        <FaFolderOpen size={16} color="#FF7A00" style={{ marginRight: 8 }} />
                                    ) : (
                                        <FaFolder size={16} color="#FF7A00" style={{ marginRight: 8 }} />
                                    )
                                ) : null}
                                <Typography
                                    variant="body2"
                                    sx={{ fontWeight: isChild ? 400 : 600 }}
                                >
                                    {col.renderCell ? col.renderCell(item) : item[col.field]}
                                </Typography>
                                {!isChild && hasChildren && (
                                    <Chip
                                        label={children.length}
                                        size="small"
                                        sx={{ ml: 1, height: 20, fontSize: '0.75rem' }}
                                    />
                                )}
                            </Box>
                        ) : col.renderCell ? (
                            col.renderCell(item)
                        ) : (
                            item[col.field]
                        )}
                    </TableCell>
                ))}
            </TableRow>
        );
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <Typography color="text.secondary">Loading...</Typography>
            </Box>
        );
    }

    return (
        <Box>
            {/* Toolbar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, px: 1 }}>
                <TextField
                    size="small"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <FaSearch size={14} color="#999" />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ width: 250 }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Expand All">
                        <IconButton size="small" onClick={expandAll} sx={{ '&:hover': { backgroundColor: 'rgba(255, 122, 0, 0.1)' } }}>
                            <FaExpandAlt size={14} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Collapse All">
                        <IconButton size="small" onClick={collapseAll} sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.1)' } }}>
                            <FaCompressAlt size={14} />
                        </IconButton>
                    </Tooltip>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                    {treeData.length} parent{treeData.length !== 1 ? 's' : ''}, {data.length - treeData.length} child{data.length - treeData.length !== 1 ? 'ren' : ''}
                </Typography>
            </Box>

            {/* Table */}
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
                            {columns.map((col) => (
                                <TableCell
                                    key={col.field}
                                    sx={{
                                        fontWeight: 600,
                                        width: col.width,
                                        py: 1.5,
                                    }}
                                >
                                    {col.headerName}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredData.parents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">
                                        {searchQuery ? 'No matching categories found' : 'No categories found'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.parents.map((parent) => {
                                const children = filteredData.filteredParentMap.get(parent.id) || [];
                                const isExpanded = expandedIds.has(parent.id);

                                return [
                                    renderRow(parent, false),
                                    ...(isExpanded
                                        ? children.map((child: any, idx: number) =>
                                            renderRow(child, true, idx === children.length - 1)
                                        )
                                        : []),
                                ];
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
