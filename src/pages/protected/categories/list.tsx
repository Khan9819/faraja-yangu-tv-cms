import { useState, useRef, useCallback } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Typography } from '@mui/material';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { FaPlus, FaCloudUploadAlt, FaImage, FaTimes } from 'react-icons/fa';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import useAPI from '../../../hooks/useAPI';
import { PageHeader } from '../../../components/page-header';
import { ContentCard, ContentCardGrid, ContentCardSkeleton } from '../../../components/content-card';

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function renameFileWithUUID(file: File): File {
    const extension = file.name.split('.').pop() || 'jpg';
    const newFileName = `${generateUUID()}.${extension}`;
    return new File([file], newFileName, { type: file.type });
}

export default function CategoriesList() {
    const api = useAPI();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [openDialog, setOpenDialog] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', slug: '', description: '', parent: null as any, thumbnail: '', cover: '' });
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    
    // Cover cropping states
    const [coverCropDialogOpen, setCoverCropDialogOpen] = useState(false);
    const [coverImageSrc, setCoverImageSrc] = useState<string | null>(null);
    const [coverCrop, setCoverCrop] = useState<Crop>();
    const coverImgRef = useRef<HTMLImageElement>(null);
    
    // Thumbnail cropping states
    const [thumbnailCropDialogOpen, setThumbnailCropDialogOpen] = useState(false);
    const [thumbnailImageSrc, setThumbnailImageSrc] = useState<string | null>(null);
    const [thumbnailCrop, setThumbnailCrop] = useState<Crop>();
    const thumbnailImgRef = useRef<HTMLImageElement>(null);
    
    // Drag states
    const [coverDragActive, setCoverDragActive] = useState(false);
    const [thumbnailDragActive, setThumbnailDragActive] = useState(false);

    // Fetch parent categories only
    const { data: parentCategoriesResponse, isLoading } = useQuery({
        queryKey: ['categories', 'parent'],
        queryFn: () => api.getCategories('parent'),
    });

    const parentCategories = parentCategoriesResponse?.data || [];

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.deleteCategory(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
    });

    // Create/Update mutation
    const saveMutation = useMutation({
        mutationFn: (data: any) => {
            if (editingCategory) {
                return api.updateCategory(editingCategory.id, data);
            }
            return api.createCategory(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            handleCloseDialog();
        },
    });

    const handleEdit = (id: number) => {
        const category = parentCategories.find((cat: any) => cat.id === id);
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                slug: category.slug,
                description: category.description || '',
                parent: null,
                thumbnail: category.thumbnail || '',
                cover: category.cover || '',
            });
            setOpenDialog(true);
        }
    };

    const handleDelete = (id: number) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleCardClick = (id: number) => {
        navigate(`/content/categories/${id}/subcategories`);
    };

    const handleOpenDialog = () => {
        setEditingCategory(null);
        setFormData({ name: '', slug: '', description: '', parent: null, thumbnail: '', cover: '' });
        setThumbnailFile(null);
        setCoverFile(null);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingCategory(null);
        setFormData({ name: '', slug: '', description: '', parent: null, thumbnail: '', cover: '' });
        setThumbnailFile(null);
        setCoverFile(null);
    };

    const handleSave = () => {
        const data = new FormData();
        data.append('name', formData.name);
        data.append('slug', formData.slug);
        data.append('description', formData.description || '');
        if (formData.parent) {
            data.append('parent', String(formData.parent));
        }

        if (thumbnailFile) {
            const renamedThumbnail = renameFileWithUUID(thumbnailFile);
            data.append('thumbnail', renamedThumbnail);
        }
        
        if (coverFile) {
            const renamedCover = renameFileWithUUID(coverFile);
            data.append('cover', renamedCover);
        }

        saveMutation.mutate(data as any);
    };

    // Thumbnail image handlers with cropping
    const handleThumbnailSelect = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            setThumbnailImageSrc(reader.result as string);
            setThumbnailCropDialogOpen(true);
        };
        reader.readAsDataURL(file);
    };

    const handleThumbnailFileChange = (event: any) => {
        const file = event.target.files?.[0];
        if (!file) return;
        handleThumbnailSelect(file);
        event.target.value = '';
    };

    const onThumbnailImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        const crop = centerCrop(
            makeAspectCrop(
                { unit: '%', width: 90 },
                1, // 1:1 aspect ratio
                width,
                height
            ),
            width,
            height
        );
        setThumbnailCrop(crop);
    }, []);

    const getThumbnailCroppedImg = useCallback(async (): Promise<File | null> => {
        if (!thumbnailImgRef.current || !thumbnailCrop) return null;

        const image = thumbnailImgRef.current;
        const canvas = document.createElement('canvas');

        const outputSize = 400; // 400x400 output
        canvas.width = outputSize;
        canvas.height = outputSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const cropX = (thumbnailCrop.x / 100) * image.naturalWidth;
        const cropY = (thumbnailCrop.y / 100) * image.naturalHeight;
        const cropWidth = (thumbnailCrop.width / 100) * image.naturalWidth;
        const cropHeight = (thumbnailCrop.height / 100) * image.naturalHeight;

        ctx.drawImage(
            image,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            outputSize,
            outputSize
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
                    resolve(file);
                } else {
                    resolve(null);
                }
            }, 'image/jpeg', 0.9);
        });
    }, [thumbnailCrop]);

    const handleThumbnailCropComplete = async () => {
        const croppedFile = await getThumbnailCroppedImg();
        if (croppedFile) {
            setThumbnailFile(croppedFile);
            const previewUrl = URL.createObjectURL(croppedFile);
            setFormData((prev) => ({ ...prev, thumbnail: previewUrl }));
        }
        setThumbnailCropDialogOpen(false);
        setThumbnailImageSrc(null);
    };

    const handleThumbnailCropCancel = () => {
        setThumbnailCropDialogOpen(false);
        setThumbnailImageSrc(null);
    };

    // Cover image handlers with cropping
    const handleCoverSelectFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            setCoverImageSrc(reader.result as string);
            setCoverCropDialogOpen(true);
        };
        reader.readAsDataURL(file);
    };

    const handleCoverFileChange = (event: any) => {
        const file = event.target.files?.[0];
        if (!file) return;
        handleCoverSelectFile(file);
        event.target.value = '';
    };

    // Drag and drop handlers
    const handleDrag = (e: React.DragEvent, type: 'cover' | 'thumbnail', active: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        if (type === 'cover') {
            setCoverDragActive(active);
        } else {
            setThumbnailDragActive(active);
        }
    };

    const handleDrop = (e: React.DragEvent, type: 'cover' | 'thumbnail') => {
        e.preventDefault();
        e.stopPropagation();
        setCoverDragActive(false);
        setThumbnailDragActive(false);
        
        const file = e.dataTransfer.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        
        if (type === 'cover') {
            handleCoverSelectFile(file);
        } else {
            handleThumbnailSelect(file);
        }
    };

    const removeCover = () => {
        setCoverFile(null);
        setFormData((prev) => ({ ...prev, cover: '' }));
    };

    const removeThumbnail = () => {
        setThumbnailFile(null);
        setFormData((prev) => ({ ...prev, thumbnail: '' }));
    };

    const onCoverImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        // 320:100 aspect ratio = 3.2
        const crop = centerCrop(
            makeAspectCrop(
                { unit: '%', width: 90 },
                320 / 100,
                width,
                height
            ),
            width,
            height
        );
        setCoverCrop(crop);
    }, []);

    const getCroppedImg = useCallback(async (): Promise<File | null> => {
        if (!coverImgRef.current || !coverCrop) return null;

        const image = coverImgRef.current;
        const canvas = document.createElement('canvas');

        // Output dimensions (maintain aspect ratio 320:100)
        const outputWidth = 640;
        const outputHeight = 200;

        canvas.width = outputWidth;
        canvas.height = outputHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const cropX = (coverCrop.x / 100) * image.naturalWidth;
        const cropY = (coverCrop.y / 100) * image.naturalHeight;
        const cropWidth = (coverCrop.width / 100) * image.naturalWidth;
        const cropHeight = (coverCrop.height / 100) * image.naturalHeight;

        ctx.drawImage(
            image,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            outputWidth,
            outputHeight
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], 'cover.jpg', { type: 'image/jpeg' });
                    resolve(file);
                } else {
                    resolve(null);
                }
            }, 'image/jpeg', 0.9);
        });
    }, [coverCrop]);

    const handleCoverCropComplete = async () => {
        const croppedFile = await getCroppedImg();
        if (croppedFile) {
            setCoverFile(croppedFile);
            const previewUrl = URL.createObjectURL(croppedFile);
            setFormData((prev) => ({ ...prev, cover: previewUrl }));
        }
        setCoverCropDialogOpen(false);
        setCoverImageSrc(null);
    };

    const handleCoverCropCancel = () => {
        setCoverCropDialogOpen(false);
        setCoverImageSrc(null);
    };

    return (
        <div>
            <PageHeader
                title="Categories"
                subtitle="Manage video categories and subcategories"
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
                        New Category
                    </Button>
                }
            />

            {isLoading ? (
                <ContentCardGrid>
                    <ContentCardSkeleton count={8} />
                </ContentCardGrid>
            ) : parentCategories.length === 0 ? (
                <Box className="empty-state" sx={{ py: 8 }}>
                    <FaImage size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                    <Typography variant="body2" sx={{ color: "var(--text-dimmer)" }}>
                        No categories yet. Create your first category to get started.
                    </Typography>
                </Box>
            ) : (
                <ContentCardGrid>
                    {parentCategories.map((cat: any) => (
                        <ContentCard
                            key={cat.id}
                            thumbnail={cat.thumbnail}
                            cover={cat.cover}
                            title={cat.name}
                            subtitle={cat.description}
                            meta={cat.children_count != null ? `${cat.children_count} subcategories` : undefined}
                            onClick={() => handleCardClick(cat.id)}
                            onEdit={() => handleEdit(cat.id)}
                            onDelete={() => handleDelete(cat.id)}
                        />
                    ))}
                </ContentCardGrid>
            )}

            {/* Create/Edit Dialog */}
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
                    {editingCategory ? 'Edit Category' : 'New Category'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
                        {/* Cover Image Upload */}
                        <Box>
                            <Typography variant="caption" sx={{ mb: 0.75, fontWeight: 600, display: "block", color: "var(--text-dimmer)" }}>
                                Cover Image
                                <Typography component="span" variant="caption" sx={{ ml: 0.5, color: "var(--text-dimmer)", opacity: 0.6 }}>
                                    3.2:1
                                </Typography>
                            </Typography>
                            {formData.cover ? (
                                <Box sx={{ position: 'relative', display: 'inline-block', width: "100%" }}>
                                    <Box
                                        component="img"
                                        src={formData.cover}
                                        alt="Cover preview"
                                        sx={{ width: '100%', aspectRatio: '320/100', objectFit: 'cover', borderRadius: 2, border: '1px solid var(--border-color)' }}
                                    />
                                    <IconButton
                                        size="small"
                                        onClick={removeCover}
                                        sx={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', width: 24, height: 24, '&:hover': { backgroundColor: '#d32f2f' } }}
                                    >
                                        <FaTimes size={10} />
                                    </IconButton>
                                </Box>
                            ) : (
                                <Box
                                    component="label"
                                    onDragEnter={(e: React.DragEvent) => handleDrag(e, 'cover', true)}
                                    onDragLeave={(e: React.DragEvent) => handleDrag(e, 'cover', false)}
                                    onDragOver={(e: React.DragEvent) => handleDrag(e, 'cover', true)}
                                    onDrop={(e: React.DragEvent) => handleDrop(e, 'cover')}
                                    sx={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        width: '100%', aspectRatio: '320/100',
                                        border: coverDragActive ? '1.5px dashed var(--primary-color)' : '1.5px dashed var(--border-color)',
                                        borderRadius: 2, cursor: 'pointer', transition: 'all 0.2s ease',
                                        '&:hover': { borderColor: 'var(--primary-color)' },
                                    }}
                                >
                                    <input type="file" hidden accept="image/*" onChange={handleCoverFileChange} />
                                    <FaCloudUploadAlt size={22} color="var(--text-dimmer)" />
                                    <Typography variant="caption" sx={{ mt: 0.5, color: 'var(--text-dimmer)', fontSize: "0.7rem" }}>
                                        Drop or click to upload
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        {/* Thumbnail + Fields Row */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ flexShrink: 0 }}>
                                <Typography variant="caption" sx={{ mb: 0.75, fontWeight: 600, display: "block", color: "var(--text-dimmer)" }}>
                                    Thumbnail <span style={{ opacity: 0.6 }}>1:1</span>
                                </Typography>
                                {formData.thumbnail ? (
                                    <Box sx={{ position: 'relative', display: 'inline-block' }}>
                                        <Box component="img" src={formData.thumbnail} alt="Thumbnail" sx={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 2, border: '1px solid var(--border-color)' }} />
                                        <IconButton size="small" onClick={removeThumbnail} sx={{ position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', width: 20, height: 20, '&:hover': { backgroundColor: '#d32f2f' } }}>
                                            <FaTimes size={8} />
                                        </IconButton>
                                    </Box>
                                ) : (
                                    <Box
                                        component="label"
                                        onDragEnter={(e: React.DragEvent) => handleDrag(e, 'thumbnail', true)}
                                        onDragLeave={(e: React.DragEvent) => handleDrag(e, 'thumbnail', false)}
                                        onDragOver={(e: React.DragEvent) => handleDrag(e, 'thumbnail', true)}
                                        onDrop={(e: React.DragEvent) => handleDrop(e, 'thumbnail')}
                                        sx={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            width: 100, height: 100,
                                            border: thumbnailDragActive ? '1.5px dashed var(--primary-color)' : '1.5px dashed var(--border-color)',
                                            borderRadius: 2, cursor: 'pointer', transition: 'all 0.2s ease',
                                            '&:hover': { borderColor: 'var(--primary-color)' },
                                        }}
                                    >
                                        <input type="file" hidden accept="image/*" onChange={handleThumbnailFileChange} />
                                        <FaImage size={18} color="var(--text-dimmer)" />
                                    </Box>
                                )}
                            </Box>

                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField
                                    label="Category Name"
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
                                <TextField label="Description" fullWidth multiline rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} size="small" />
                            </Box>
                        </Box>

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
                        disabled={saveMutation.isPending}
                        sx={{ backgroundColor: "var(--primary-color)", textTransform: "none", "&:hover": { backgroundColor: "#E66D00" } }}
                    >
                        {saveMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Cover Crop Dialog */}
            <Dialog open={coverCropDialogOpen} onClose={handleCoverCropCancel} maxWidth="md" fullWidth PaperProps={{ sx: { backgroundColor: "var(--background-color)", border: "1px solid var(--border-color)" } }}>
                <DialogTitle sx={{ fontSize: "1rem", fontWeight: 600 }}>Crop Cover Image</DialogTitle>
                <DialogContent>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>Adjust the crop area to fit the 3.2:1 ratio</Typography>
                    {coverImageSrc && (
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <ReactCrop crop={coverCrop} onChange={(_, p) => setCoverCrop(p)} aspect={3.2} minHeight={50}>
                                <img ref={coverImgRef} src={coverImageSrc} alt="Crop" onLoad={onCoverImageLoad} style={{ maxWidth: '100%', maxHeight: '60vh' }} />
                            </ReactCrop>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleCoverCropCancel} size="small" sx={{ textTransform: "none" }}>Cancel</Button>
                    <Button onClick={handleCoverCropComplete} variant="contained" size="small" sx={{ backgroundColor: "var(--primary-color)", textTransform: "none", "&:hover": { backgroundColor: "#E66D00" } }}>Apply</Button>
                </DialogActions>
            </Dialog>

            {/* Thumbnail Crop Dialog */}
            <Dialog open={thumbnailCropDialogOpen} onClose={handleThumbnailCropCancel} maxWidth="md" fullWidth PaperProps={{ sx: { backgroundColor: "var(--background-color)", border: "1px solid var(--border-color)" } }}>
                <DialogTitle sx={{ fontSize: "1rem", fontWeight: 600 }}>Crop Thumbnail</DialogTitle>
                <DialogContent>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>Adjust the crop area to fit the 1:1 ratio</Typography>
                    {thumbnailImageSrc && (
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <ReactCrop crop={thumbnailCrop} onChange={(_, p) => setThumbnailCrop(p)} aspect={1} minHeight={50}>
                                <img ref={thumbnailImgRef} src={thumbnailImageSrc} alt="Crop" onLoad={onThumbnailImageLoad} style={{ maxWidth: '100%', maxHeight: '60vh' }} />
                            </ReactCrop>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleThumbnailCropCancel} size="small" sx={{ textTransform: "none" }}>Cancel</Button>
                    <Button onClick={handleThumbnailCropComplete} variant="contained" size="small" sx={{ backgroundColor: "var(--primary-color)", textTransform: "none", "&:hover": { backgroundColor: "#E66D00" } }}>Apply</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
