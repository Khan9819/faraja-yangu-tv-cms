import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Switch, Tooltip, Toolbar } from "@mui/material";
import { FaPlus, FaTrash, FaClock, FaImage, FaVideo, FaExternalLinkAlt, FaEdit } from "react-icons/fa";
import { WorkspaceContainer } from "../../../../components/workspace-container";
import { PageHeader } from "../../../../components/page-header";
import DataGridWrapper from "../../../../components/DataTable/DataGridWrapper";
import type { GridColDef, GridRowSelectionModel } from "@mui/x-data-grid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAPI from "../../../../hooks/useAPI";

export default function InterceptorList() {
    const navigate = useNavigate();
    const api = useAPI();
    const queryClient = useQueryClient();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [adToDelete, setAdToDelete] = useState<number | null>(null);
    const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

    const { data: interceptorAdsResponse, isLoading } = useQuery({
        queryKey: ["interceptor-ads"],
        queryFn: () => api.getInterceptorAds(),
    });

    const interceptorAds = interceptorAdsResponse?.data || [];

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.deleteInterceptorAd(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["interceptor-ads"] });
            setDeleteDialogOpen(false);
            setAdToDelete(null);
        },
    });

    const toggleMutation = useMutation({
        mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => 
            api.toggleInterceptorAdStatus(id, is_active),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["interceptor-ads"] });
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: number[]) => {
            await Promise.all(ids.map(id => api.deleteInterceptorAd(id)));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["interceptor-ads"] });
            setRowSelectionModel([]);
            setBulkDeleteDialogOpen(false);
        },
    });

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
                        onClick={() => setBulkDeleteDialogOpen(true)}
                        sx={{ textTransform: 'none' }}
                    >
                        Delete Selected
                    </Button>
                </>
            )}
        </Toolbar>
    );

    const columns: GridColDef[] = [
        {
            field: "media_type",
            headerName: "Type",
            flex: 0.6,
            minWidth: 80,
            filterable: true,
            align: "center",
            headerAlign: "center",
            renderCell: (params) => {
                const isImage = params.value === "image";
                return (
                    <Chip
                        icon={isImage ? <FaImage size={10} /> : <FaVideo size={10} />}
                        label={isImage ? "Image" : "Video"}
                        size="small"
                        sx={{
                            backgroundColor: isImage ? "rgba(76, 175, 80, 0.1)" : "rgba(33, 150, 243, 0.1)",
                            color: isImage ? "#4CAF50" : "#2196F3",
                            "& .MuiChip-icon": { color: "inherit" }
                        }}
                    />
                );
            },
        },
        {
            field: "media_preview",
            headerName: "Preview",
            flex: 1,
            minWidth: 100,
            filterable: false,
            sortable: false,
            align: "center",
            headerAlign: "center",
            renderCell: (params) => {
                const mediaType = params.row.media_type;
                const mediaUrl = params.row.media_file_url || params.row.content_video?.thumbnail_url;
                if (mediaUrl) {
                    return (
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", py: 0.5 }}>
                            <img
                                src={mediaUrl}
                                alt="Preview"
                                style={{ maxHeight: 40, maxWidth: 70, objectFit: "cover", borderRadius: 4 }}
                            />
                        </Box>
                    );
                }
                return (
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                        {mediaType === "image" ? <FaImage size={20} color="#999" /> : <FaVideo size={20} color="#999" />}
                    </Box>
                );
            },
        },
        {
            field: "title",
            headerName: "Title",
            flex: 1.5,
            minWidth: 150,
            filterable: true,
            align: "left",
            headerAlign: "center",
            renderCell: (params) => (
                <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%" }}>
                    <Typography variant="body2" noWrap fontWeight={500}>
                        {params.value || "Untitled"}
                    </Typography>
                    {params.row.description && (
                        <Typography variant="caption" color="text.secondary" noWrap>
                            {params.row.description}
                        </Typography>
                    )}
                </Box>
            ),
        },
        {
            field: "target_video",
            headerName: "Target Video",
            flex: 1.2,
            minWidth: 140,
            filterable: true,
            align: "left",
            headerAlign: "center",
            renderCell: (params) => {
                const video = params.row.video;
                const categories: any[] = params.row.categories || [];
                if (video) {
                    return (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", height: "100%" }}>
                            {video.thumbnail_url && <img src={video.thumbnail_url} alt="" style={{ width: 36, height: 22, objectFit: "cover", borderRadius: 4 }} />}
                            <Typography variant="body2" noWrap>{video.title}</Typography>
                        </Box>
                    );
                }
                if (categories.length > 0) {
                    return (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, width: "100%", height: "100%", flexWrap: "wrap" }}>
                            {categories.map((cat) => (
                                <Chip
                                    key={cat.id}
                                    label={cat.name}
                                    size="small"
                                    sx={{ height: 20, fontSize: "0.7rem", backgroundColor: "rgba(255, 122, 0, 0.1)", color: "#FF7A00" }}
                                />
                            ))}
                        </Box>
                    );
                }
                return <Typography variant="body2" color="text.secondary">All Videos</Typography>;
            },
        },
        {
            field: "is_active",
            headerName: "Status",
            flex: 0.6,
            minWidth: 80,
            filterable: true,
            align: "center",
            headerAlign: "center",
            renderCell: (params) => (
                <Tooltip title={params.value ? "Active - Click to deactivate" : "Inactive - Click to activate"}>
                    <Switch
                        size="small"
                        checked={params.value ?? true}
                        onChange={(e) => {
                            toggleMutation.mutate({ id: params.row.id, is_active: e.target.checked });
                        }}
                        disabled={toggleMutation.isPending}
                        sx={{
                            "& .MuiSwitch-switchBase.Mui-checked": {
                                color: "#4CAF50",
                            },
                            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                backgroundColor: "#4CAF50",
                            },
                        }}
                    />
                </Tooltip>
            ),
        },
        {
            field: "redirect_link",
            headerName: "Link",
            flex: 0.6,
            minWidth: 70,
            filterable: false,
            align: "center",
            headerAlign: "center",
            renderCell: (params) => {
                if (params.value) {
                    return (
                        <IconButton
                            size="small"
                            onClick={() => window.open(params.value, "_blank")}
                            sx={{ color: "#2196F3", "&:hover": { backgroundColor: "rgba(33, 150, 243, 0.1)" } }}
                            title={params.value}
                        >
                            <FaExternalLinkAlt size={12} />
                        </IconButton>
                    );
                }
                return <Typography variant="body2" color="text.secondary">-</Typography>;
            },
        },
        {
            field: "start_time",
            headerName: "Start Time",
            flex: 1,
            minWidth: 120,
            filterable: false,
            align: "center",
            headerAlign: "center",
            renderCell: (params) => (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, width: "100%", height: "100%" }}>
                    <FaClock size={12} color="#666" />
                    <Typography variant="body2">{params.value}</Typography>
                </Box>
            ),
        },
        {
            field: "end_time",
            headerName: "End Time",
            flex: 1,
            minWidth: 120,
            filterable: false,
            align: "center",
            headerAlign: "center",
            renderCell: (params) => (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, width: "100%", height: "100%" }}>
                    <FaClock size={12} color="#666" />
                    <Typography variant="body2">{params.value}</Typography>
                </Box>
            ),
        },
        {
            field: "duration",
            headerName: "Duration",
            flex: 0.8,
            minWidth: 100,
            filterable: false,
            align: "center",
            headerAlign: "center",
            renderCell: (params) => {
                const start = params.row.start_time;
                const end = params.row.end_time;
                if (start && end) {
                    const startParts = start.split(":").map(Number);
                    const endParts = end.split(":").map(Number);
                    const startSeconds = startParts[0] * 3600 + startParts[1] * 60 + startParts[2];
                    const endSeconds = endParts[0] * 3600 + endParts[1] * 60 + endParts[2];
                    const durationSeconds = endSeconds - startSeconds;
                    const mins = Math.floor(durationSeconds / 60);
                    const secs = durationSeconds % 60;
                    return (
                        <Chip
                            label={`${mins}m ${secs}s`}
                            size="small"
                            color="primary"
                            sx={{ backgroundColor: "rgba(255, 122, 0, 0.1)", color: "#FF7A00" }}
                        />
                    );
                }
                return "-";
            },
        },
        {
            field: "created_at",
            headerName: "Created",
            flex: 1,
            minWidth: 140,
            filterable: true,
            align: "center",
            headerAlign: "center",
            valueFormatter: (value: any) => {
                if (!value) return "N/A";
                return new Date(value).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                });
            },
        },
        {
            field: "actions",
            headerName: "Actions",
            flex: 0.8,
            minWidth: 100,
            filterable: false,
            sortable: false,
            align: "center",
            headerAlign: "center",
            renderCell: (params) => (
                <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center", alignItems: "center", width: "100%", height: "100%" }}>
                    <IconButton
                        size="small"
                        onClick={() => navigate(`/advertisement/interceptor/edit/${params.row.id}`)}
                        sx={{
                            "&:hover": {
                                color: "#FF7A00",
                                backgroundColor: "rgba(255, 122, 0, 0.1)",
                            },
                        }}
                    >
                        <FaEdit size={14} />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(params.row.id)}
                        sx={{
                            "&:hover": {
                                color: "#d32f2f",
                                backgroundColor: "rgba(211, 47, 47, 0.1)",
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
        setAdToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (adToDelete) {
            deleteMutation.mutate(adToDelete);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
        setAdToDelete(null);
    };

    return (
        <div>
            <PageHeader
                title="Playback Interceptor"
                subtitle="Manage image, GIF, and video ad slots"
                actions={
                    <Button
                        variant="contained"
                        startIcon={<FaPlus size={12} />}
                        onClick={() => navigate("/advertisement/interceptor/create")}
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
                        New Interceptor Ad
                    </Button>
                }
            />

            <WorkspaceContainer>
                <DataGridWrapper
                    columns={columns}
                    rows={interceptorAds}
                    loading={isLoading}
                    checkboxSelection
                    rowSelectionModel={rowSelectionModel}
                    onRowSelectionModelChange={setRowSelectionModel}
                    toolbar={renderToolbar()}
                />
            </WorkspaceContainer>

            <Dialog
                open={deleteDialogOpen}
                onClose={handleDeleteCancel}
                PaperProps={{ sx: { backgroundColor: "var(--background-color)", border: "1px solid var(--border-color)", borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontSize: "1rem", fontWeight: 600 }}>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        Are you sure you want to delete this interceptor ad? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleDeleteCancel} disabled={deleteMutation.isPending} size="small" sx={{ textTransform: "none" }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                        variant="contained"
                        size="small"
                        disabled={deleteMutation.isPending}
                        sx={{ textTransform: "none" }}
                    >
                        {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={bulkDeleteDialogOpen}
                onClose={() => setBulkDeleteDialogOpen(false)}
                PaperProps={{ sx: { backgroundColor: "var(--background-color)", border: "1px solid var(--border-color)", borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontSize: "1rem", fontWeight: 600 }}>Confirm Bulk Delete</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        Are you sure you want to delete {rowSelectionModel.length} interceptor ad{rowSelectionModel.length !== 1 ? 's' : ''}? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setBulkDeleteDialogOpen(false)} disabled={bulkDeleteMutation.isPending} size="small" sx={{ textTransform: "none" }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            if (rowSelectionModel.length > 0) {
                                bulkDeleteMutation.mutate(rowSelectionModel as number[]);
                            }
                        }}
                        color="error"
                        variant="contained"
                        size="small"
                        disabled={bulkDeleteMutation.isPending}
                        sx={{ textTransform: "none" }}
                    >
                        {bulkDeleteMutation.isPending ? "Deleting..." : "Delete All"}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
