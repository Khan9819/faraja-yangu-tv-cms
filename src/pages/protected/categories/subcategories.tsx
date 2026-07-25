import { useState } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaPlus, FaFolderOpen } from 'react-icons/fa';
import useAPI from '../../../hooks/useAPI';
import { PageHeader } from '../../../components/page-header';
import { ContentCard, ContentCardGrid, ContentCardSkeleton } from '../../../components/content-card';

export default function SubcategoriesList() {
    const { id } = useParams();
    const navigate = useNavigate();
    const api = useAPI();
    const queryClient = useQueryClient();
    const categoryId = Number(id);
    const [openDialog, setOpenDialog] = useState(false);
    const [formData, setFormData] = useState({ name: '', slug: '', description: '' });

    // Fetch parent category info
    const { data: categoryResponse } = useQuery({
        queryKey: ['category', categoryId],
        queryFn: () => api.getCategoryContent(categoryId),
        enabled: !!categoryId,
    });

    const category = categoryResponse?.data || categoryResponse || {};

    // Fetch subcategories
    const { data: subcategoriesResponse, isLoading } = useQuery({
        queryKey: ['subcategories', categoryId],
        queryFn: () => api.getSubCategories(categoryId),
        enabled: !!categoryId,
    });

    const subcategories = subcategoriesResponse?.data || [];

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: FormData) => api.createCategory(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subcategories', categoryId] });
            handleCloseDialog();
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (subId: number) => api.deleteCategory(subId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subcategories', categoryId] });
        },
    });

    const handleDelete = (subId: number) => {
        if (window.confirm('Are you sure you want to delete this subcategory?')) {
            deleteMutation.mutate(subId);
        }
    };

    const handleCardClick = (subId: number) => {
        navigate(`/content/categories/${subId}/videos`);
    };

    const handleOpenDialog = () => {
        setFormData({ name: '', slug: '', description: '' });
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setFormData({ name: '', slug: '', description: '' });
    };

    const handleSave = () => {
        const data = new FormData();
        data.append('name', formData.name);
        data.append('slug', formData.slug);
        data.append('description', formData.description || '');
        data.append('parent', String(categoryId));
        createMutation.mutate(data);
    };

    return (
        <div>
            <PageHeader
                title={category?.name || 'Subcategories'}
                subtitle={`Subcategories in ${category?.name || 'this category'}`}
                breadcrumbs={[
                    { label: 'Content', path: '/content/categories' },
                    { label: 'Categories', path: '/content/categories' },
                    { label: category?.name || '...' },
                ]}
                actions={
                    <Button
                        variant="contained"
                        startIcon={<FaPlus size={12} />}
                        onClick={handleOpenDialog}
                        size="small"
                        sx={{
                            backgroundColor: "var(--primary-color)",
                            textTransform: "none",
                            fontWeight: 500,
                            fontSize: "0.8rem",
                            borderRadius: 2,
                            px: 2,
                            "&:hover": { backgroundColor: "#E66D00" },
                        }}
                    >
                        New Subcategory
                    </Button>
                }
            />

            {isLoading ? (
                <ContentCardGrid>
                    <ContentCardSkeleton count={6} />
                </ContentCardGrid>
            ) : subcategories.length === 0 ? (
                <Box className="empty-state" sx={{ py: 8 }}>
                    <FaFolderOpen size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                    <Typography variant="body2" sx={{ color: "var(--text-dimmer)" }}>
                        No subcategories yet.
                    </Typography>
                </Box>
            ) : (
                <ContentCardGrid>
                    {subcategories.map((sub: any) => (
                        <ContentCard
                            key={sub.id}
                            thumbnail={sub.thumbnail}
                            cover={sub.cover}
                            title={sub.name}
                            subtitle={sub.description}
                            meta={sub.video_count != null ? `${sub.video_count} videos` : undefined}
                            onClick={() => handleCardClick(sub.id)}
                            onDelete={() => handleDelete(sub.id)}
                        />
                    ))}
                </ContentCardGrid>
            )}

            {/* Create Subcategory Dialog */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        backgroundColor: "var(--background-color)",
                        border: "1px solid var(--border-color)",
                        borderRadius: 3,
                    },
                }}
            >
                <DialogTitle sx={{ fontSize: "1rem", fontWeight: 600, pb: 0 }}>
                    New Subcategory
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
                        <TextField
                            label="Subcategory Name"
                            fullWidth
                            required
                            value={formData.name}
                            onChange={(e) => {
                                const name = e.target.value;
                                const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
                                setFormData({ ...formData, name, slug });
                            }}
                            size="small"
                        />
                        <TextField
                            label="Description"
                            fullWidth
                            multiline
                            rows={2}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            size="small"
                        />
                        <TextField
                            label="Slug"
                            fullWidth
                            required
                            value={formData.slug}
                            onChange={(e) => {
                                const slug = e.target.value.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
                                setFormData({ ...formData, slug });
                            }}
                            helperText="Auto-generated from name"
                            size="small"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleCloseDialog} size="small" sx={{ textTransform: "none" }}>Cancel</Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        size="small"
                        disabled={createMutation.isPending}
                        sx={{ backgroundColor: "var(--primary-color)", textTransform: "none", "&:hover": { backgroundColor: "#E66D00" } }}
                    >
                        {createMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
