import { Box, Typography, Chip, IconButton } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FaEye, FaEdit } from 'react-icons/fa';
import type { GridColDef } from '@mui/x-data-grid';
import useAPI from '../../../hooks/useAPI';
import { PageHeader } from '../../../components/page-header';
import DataGridWrapper from '../../../components/DataTable/DataGridWrapper';
import { WorkspaceContainer } from '../../../components/workspace-container';

export default function CategoryVideos() {
    const { id } = useParams();
    const navigate = useNavigate();
    const api = useAPI();
    const categoryId = Number(id);

    // Fetch category info
    const { data: categoryResponse } = useQuery({
        queryKey: ['category', categoryId],
        queryFn: () => api.getCategoryContent(categoryId),
        enabled: !!categoryId,
    });

    const category = categoryResponse?.data || categoryResponse || {};

    // Fetch videos for this category
    const { data: videosResponse, isLoading } = useQuery({
        queryKey: ['videos', 'category', categoryId],
        queryFn: () => api.getVideos({ category: categoryId }),
        enabled: !!categoryId,
    });

    const videos = videosResponse?.data || [];

    const columns: GridColDef[] = [
        {
            field: 'thumbnail',
            headerName: 'Thumbnail',
            flex: 0.5,
            minWidth: 90,
            filterable: false,
            sortable: false,
            renderCell: (params) =>
                params.value ? (
                    <Box
                        component="img"
                        src={params.value}
                        alt={params.row.title}
                        sx={{ width: 56, height: 36, objectFit: 'cover', borderRadius: 1 }}
                    />
                ) : (
                    <Box sx={{ width: 56, height: 36, borderRadius: 1, backgroundColor: 'var(--background-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', fontSize: '0.6rem' }}>N/A</Typography>
                    </Box>
                ),
        },
        {
            field: 'title',
            headerName: 'Title',
            flex: 2,
            minWidth: 200,
            filterable: true,
        },
        {
            field: 'status',
            headerName: 'Status',
            flex: 0.8,
            minWidth: 110,
            filterable: true,
            renderCell: (params) => (
                <Chip
                    label={params.value || 'Draft'}
                    size="small"
                    sx={{
                        fontSize: '0.7rem',
                        height: 22,
                        backgroundColor: params.value === 'published' ? 'rgba(46,125,50,0.12)' : 'rgba(255,122,0,0.12)',
                        color: params.value === 'published' ? '#2e7d32' : 'var(--primary-color)',
                    }}
                />
            ),
        },
        {
            field: 'views_count',
            headerName: 'Views',
            flex: 0.6,
            minWidth: 80,
            type: 'number',
            valueFormatter: (value: any) => value?.toLocaleString() || '0',
        },
        {
            field: 'created_at',
            headerName: 'Created',
            flex: 1,
            minWidth: 130,
            filterable: true,
            valueFormatter: (value: any) => {
                if (!value) return '';
                return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            },
        },
        {
            field: 'actions',
            headerName: '',
            flex: 0.5,
            minWidth: 80,
            filterable: false,
            sortable: false,
            align: 'right',
            headerAlign: 'right',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                        size="small"
                        onClick={() => navigate(`/content/videos/${params.row.id}/view`)}
                        sx={{ color: 'var(--text-dimmer)', '&:hover': { color: 'var(--primary-color)' } }}
                    >
                        <FaEye size={13} />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => navigate(`/content/videos/${params.row.id}/edit`)}
                        sx={{ color: 'var(--text-dimmer)', '&:hover': { color: 'var(--primary-color)' } }}
                    >
                        <FaEdit size={13} />
                    </IconButton>
                </Box>
            ),
        },
    ];

    // Determine breadcrumb based on whether this category has a parent
    const breadcrumbs: { label: string; path?: string }[] = [
        { label: 'Content', path: '/content/categories' },
        { label: 'Categories', path: '/content/categories' },
    ];
    if (category?.parent) {
        breadcrumbs.push({ label: category.parent_name || 'Parent', path: `/content/categories/${category.parent}/subcategories` });
    }
    breadcrumbs.push({ label: category?.name || '...' });

    return (
        <div>
            <PageHeader
                title={`${category?.name || 'Category'} — Videos`}
                subtitle={`Videos in ${category?.name || 'this category'}`}
                breadcrumbs={breadcrumbs}
            />

            <WorkspaceContainer>
                {videos.length === 0 && !isLoading ? (
                    <Box className="empty-state" sx={{ py: 6 }}>
                        <Typography variant="body2" sx={{ color: "var(--text-dimmer)" }}>
                            No videos in this category yet.
                        </Typography>
                    </Box>
                ) : (
                    <DataGridWrapper columns={columns} rows={videos} loading={isLoading} checkboxSelection />
                )}
            </WorkspaceContainer>
        </div>
    );
}
