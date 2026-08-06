import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DataGridWrapper from '../../../components/DataTable/DataGridWrapper';
import type { GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import { Box, Button, Chip, Avatar, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Typography, CircularProgress, Toolbar, InputBase } from '@mui/material';
import { FaPlus, FaEdit, FaTrash, FaEye, FaSearch } from 'react-icons/fa';
import { WorkspaceContainer } from '../../../components/workspace-container';
import { PageHeader } from '../../../components/page-header';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useAPI from '../../../hooks/useAPI';
import useVideoProgress from '../../../hooks/useVideoProgress';

export default function VideosList() {
    const navigate = useNavigate();
    const api = useAPI();
    const queryClient = useQueryClient();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [videoToDelete, setVideoToDelete] = useState<number | null>(null);
    const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch videos from API
    const { data: videosResponse, isLoading } = useQuery({
        queryKey: ['videos'],
        queryFn: () => api.getVideos(),
    });

    const videos = videosResponse?.data || [];

    const filteredVideos = useMemo(() => {
        if (!searchQuery.trim()) return videos;
        const q = searchQuery.toLowerCase();
        return videos.filter((v: any) =>
            (v.title && v.title.toLowerCase().includes(q)) ||
            (v.description && v.description.toLowerCase().includes(q)) ||
            (v.category_name && v.category_name.toLowerCase().includes(q)) ||
            (v.tags && v.tags.toLowerCase().includes(q)) ||
            (v.madrasa_name && v.madrasa_name.toLowerCase().includes(q))
        );
    }, [videos, searchQuery]);

    // Get IDs of videos that are pending / processing / assembling
    // ('assembling' matters: chunked & URL uploads set this status right after
    //  assembly is queued — without it, progress never connects until refresh)
    const processingVideoIds = useMemo(() => {
        return videos
            .filter((v: any) =>
                v.processing_status === 'pending' ||
                v.processing_status === 'processing' ||
                v.processing_status === 'assembling')
            .map((v: any) => v.id);
    }, [videos]);

    // Connect to WebSocket for processing videos (max 5 connections, max 3 retries per video)
    const { progressMap, activeConnections, resetRetries, disconnectFromVideo } = useVideoProgress(
        processingVideoIds,
        () => {
            // Refetch videos when a video completes processing
            resetRetries();
            queryClient.invalidateQueries({ queryKey: ['videos'] });
        }
    );

    // Delete mutation (single)
    const deleteMutation = useMutation({
        mutationFn: (id: number) => {
            disconnectFromVideo(id);
            return api.deleteVideo(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['videos'] });
            setDeleteDialogOpen(false);
            setVideoToDelete(null);
        },
    });

    // Bulk delete mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: number[]) => {
            ids.forEach(id => disconnectFromVideo(id));
            await Promise.all(ids.map(id => api.deleteVideo(id)));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['videos'] });
            setRowSelectionModel([]);
            setBulkDeleteDialogOpen(false);
        },
    });

    const columns: GridColDef[] = [
        {
            field: 'thumbnail',
            headerName: 'Thumbnail',
            flex: 0.5,
            minWidth: 100,
            filterable: false,
            sortable: false,
            renderCell: (params) => (
                <Avatar
                    src={params.value}
                    variant="rounded"
                    sx={{ width: 60, height: 40 }}
                />
            ),
        },
        {
            field: 'title',
            headerName: 'Title',
            flex: 2,
            minWidth: 200,
            filterable: true,
            renderCell: (params) => {
                const videoId = params.row.id;
                const progress = progressMap[videoId];
                const isProcessing = params.row.processing_status === 'pending' || params.row.processing_status === 'processing' || params.row.processing_status === 'assembling';
                const hasActiveConnection = activeConnections.includes(videoId);

                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.3 }}>
                            {params.value}
                        </Typography>
                        {isProcessing && (
                            <Typography
                                variant="caption"
                                sx={{
                                    color: hasActiveConnection ? '#FF7A00' : '#999',
                                    lineHeight: 1.2,
                                    mt: 0.25,
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {progress?.message || (hasActiveConnection ? 'Connecting...' : 'Waiting for slot...')}
                            </Typography>
                        )}
                    </Box>
                );
            },
        },
        {
            field: 'category_name',
            headerName: 'Category',
            flex: 1,
            minWidth: 120,
            filterable: true,
            renderCell: (params) => {
                return (
                    <Chip
                        label={params.value}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                    />
                );
            },
        },
        {
            field: 'processing_status',
            headerName: 'Processing',
            flex: 1.5,
            minWidth: 220,
            filterable: true,
            renderCell: (params) => {
                const status = params.value;
                const videoId = params.row.id;
                const progress = progressMap[videoId];
                const hasActiveConnection = activeConnections.includes(videoId);
                const isProcessing = status === 'pending' || status === 'processing';

                // Show per-variant progress chips for actively processing videos
                if (isProcessing && hasActiveConnection && progress) {
                    const variants = progress.variants;
                    
                    // If we have per-variant progress, show individual chips
                    if (variants && Object.keys(variants).length > 0) {
                        return (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, height: '100%', flexWrap: 'wrap', py: 0.5 }}>
                                {Object.entries(variants).map(([key, variant]) => {
                                    const variantStatus = variant.status;
                                    const variantProgress = variant.progress || 0;
                                    
                                    // Determine chip color based on variant status
                                    let chipColor: 'success' | 'primary' | 'default' | 'error' = 'default';
                                    if (variantStatus === 'completed') chipColor = 'success';
                                    else if (variantStatus === 'processing') chipColor = 'primary';
                                    else if (variantStatus === 'failed') chipColor = 'error';
                                    
                                    return (
                                        <Chip
                                            key={key}
                                            label={variant.name}
                                            variant="outlined"
                                            size="small"
                                            color={chipColor}
                                            icon={
                                                variantStatus === 'processing' ? (
                                                    <CircularProgress
                                                        variant="determinate"
                                                        value={variantProgress}
                                                        size={14}
                                                        thickness={4}
                                                        sx={{ color: '#FF7A00' }}
                                                    />
                                                ) : variantStatus === 'pending' ? (
                                                    <CircularProgress
                                                        size={14}
                                                        thickness={4}
                                                        sx={{ color: '#999' }}
                                                    />
                                                ) : undefined
                                            }
                                            sx={{ 
                                                fontSize: '0.7rem',
                                                height: 22,
                                                '& .MuiChip-label': { px: 0.75 }
                                            }}
                                        />
                                    );
                                })}
                            </Box>
                        );
                    }
                    
                    // Fallback to single chip if no variants data
                    return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%' }}>
                            <Chip label={progress.stage || 'starting'} variant="outlined" size='small' color="primary" icon={
                                <CircularProgress
                                    variant={!progress.stage ? "indeterminate" : "determinate"}
                                    value={progress.progress || 0}
                                    size={16.3}
                                    thickness={4}
                                    sx={{ color: '#FF7A00' }}
                                />
                            } />
                        </Box>
                    );
                }

                // Show indeterminate spinner for pending videos without active connection
                if (isProcessing && !hasActiveConnection) {
                    return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%' }}>
                            <Chip label="Queued" variant="outlined" size='small' color="primary" icon={
                                <CircularProgress size={16.3} thickness={4} sx={{ color: '#999', }} />
                            } />
                        </Box>
                    );
                }

                // Default chip for completed/failed status
                let color: 'success' | 'warning' | 'error' | 'info' = 'info';
                if (status === 'completed') color = 'success';
                else if (status === 'failed') color = 'error';
                else color = 'info';

                return (
                    <Chip
                        label={status || 'pending'}
                        color={color}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                    />
                );
            },
        },
        {
            field: 'duration',
            headerName: 'Duration',
            flex: 0.7,
            minWidth: 100,
            filterable: false,
            valueFormatter: (value: any) => value?.slice(0, 8) || '0',
        },
        {
            field: 'views_count',
            headerName: 'Views',
            flex: 0.8,
            minWidth: 100,
            type: 'number',
            filterable: true,
            valueFormatter: (value: any) => value?.toLocaleString() || '0',
        },
        {
            field: 'likes_count',
            headerName: 'Likes',
            flex: 0.7,
            minWidth: 90,
            type: 'number',
            filterable: true,
            valueFormatter: (value: any) => value?.toLocaleString() || '0',
        },
        {
            field: 'is_published',
            headerName: 'Published',
            flex: 0.8,
            minWidth: 110,
            filterable: true,
            renderCell: (params) => (
                <Chip
                    label={params.value ? 'Published' : 'Draft'}
                    color={params.value ? 'success' : 'default'}
                    size="small"
                />
            ),
        },
        {
            field: 'created_at',
            headerName: 'Upload Date',
            flex: 1,
            minWidth: 140,
            filterable: true,
            valueFormatter: (value: any) => {
                if (!value) return 'N/A';
                return new Date(value).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                });
            },
        },
        {
            field: 'actions',
            headerName: 'Actions',
            flex: 0.6,
            minWidth: 120,
            filterable: false,
            sortable: false,
            align: 'right',
            headerAlign: 'right',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <IconButton
                        size="small"
                        onClick={() => navigate(`/content/videos/${params.row.id}/view`)}
                        title="Preview"
                        sx={{
                            '&:hover': {
                                color: '#2196f3',
                                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                            },
                        }}
                    >
                        <FaEye size={14} />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => navigate(`/content/videos/${params.row.id}/edit`)}
                        title="Edit"
                        sx={{
                            '&:hover': {
                                color: '#FF7A00',
                                backgroundColor: 'rgba(255, 122, 0, 0.1)',
                            },
                        }}
                    >
                        <FaEdit size={14} />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(params.row.id)}
                        title="Delete"
                        sx={{
                            '&:hover': {
                                color: '#d32f2f',
                                backgroundColor: 'rgba(211, 47, 47, 0.1)',
                            },
                        }}
                    >
                        <FaTrash size={14} />
                    </IconButton>
                </Box>
            ),
        },
    ];

    const handleDeleteClick = (id: number) => {
        setVideoToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (videoToDelete) {
            deleteMutation.mutate(videoToDelete);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
        setVideoToDelete(null);
    };

    const handleBulkDelete = () => {
        setBulkDeleteDialogOpen(true);
    };

    const handleBulkDeleteConfirm = () => {
        if (rowSelectionModel.length > 0) {
            bulkDeleteMutation.mutate(rowSelectionModel as number[]);
        }
    };

    const renderToolbar = () => (
        <Toolbar sx={{ gap: 1, minHeight: 'auto !important', py: 1 }}>
            {rowSelectionModel.length > 0 && (
                <>
                    <Typography variant="body2" sx={{ mr: 1 }}>
                        {rowSelectionModel.length} selected
                    </Typography>
                    <Button
                        variant="contained"
                        color="error"
                        size="small"
                        startIcon={<FaTrash size={12} />}
                        onClick={handleBulkDelete}
                        sx={{ textTransform: 'none' }}
                    >
                        Delete Selected
                    </Button>
                </>
            )}
        </Toolbar>
    );

    return (
        <div>
            <PageHeader
                title="Videos"
                subtitle="Manage your video content"
                actions={
                    <Button
                        variant="contained"
                        startIcon={<FaPlus size={12} />}
                        onClick={() => navigate('/content/videos/create')}
                        size="small"
                        sx={{
                            backgroundColor: 'var(--primary-color)',
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '0.8rem',
                            borderRadius: 2,
                            px: 2,
                            '&:hover': { backgroundColor: '#E66D00' },
                        }}
                    >
                        New Video
                    </Button>
                }
            />

            <Box
                sx={{
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    backgroundColor: 'var(--background-dimmer)',
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    border: '1px solid var(--border-color)',
                }}
            >
                <FaSearch size={14} style={{ color: 'var(--text-dimmer)', flexShrink: 0 }} />
                <InputBase
                    placeholder="Search by title, madrasa, category, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{
                        flex: 1,
                        fontSize: '0.85rem',
                        color: 'var(--text-color)',
                        '& input::placeholder': { color: 'var(--text-dimmer)', opacity: 1 },
                    }}
                />
                {searchQuery && (
                    <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', flexShrink: 0 }}>
                        {filteredVideos.length} {filteredVideos.length === 1 ? 'result' : 'results'}
                    </Typography>
                )}
            </Box>

            <WorkspaceContainer>
                <DataGridWrapper
                    columns={columns}
                    rows={filteredVideos}
                    loading={isLoading}
                    checkboxSelection
                    rowSelectionModel={rowSelectionModel}
                    onRowSelectionModelChange={setRowSelectionModel}
                    toolbar={renderToolbar()}
                />
            </WorkspaceContainer>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this video? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel} disabled={deleteMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                        variant="contained"
                        disabled={deleteMutation.isPending}
                    >
                        {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Bulk Delete Confirmation Dialog */}
            <Dialog open={bulkDeleteDialogOpen} onClose={() => setBulkDeleteDialogOpen(false)}>
                <DialogTitle>Confirm Bulk Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete {rowSelectionModel.length} videos? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBulkDeleteDialogOpen(false)} disabled={bulkDeleteMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleBulkDeleteConfirm}
                        color="error"
                        variant="contained"
                        disabled={bulkDeleteMutation.isPending}
                    >
                        {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete All'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
