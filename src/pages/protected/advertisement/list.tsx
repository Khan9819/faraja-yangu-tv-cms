import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from "@mui/material";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { WorkspaceContainer } from "../../../components/workspace-container";
import { PageHeader } from "../../../components/page-header";
import DataGridWrapper from "../../../components/DataTable/DataGridWrapper";
import type { GridColDef } from "@mui/x-data-grid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAPI from "../../../hooks/useAPI";

export default function AdvertisementList() {
    const navigate = useNavigate();
    const api = useAPI();
    const queryClient = useQueryClient();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [adToDelete, setAdToDelete] = useState<number | null>(null);

    const { data: adsResponse, isLoading } = useQuery({
        queryKey: ["carousel-ads"],
        queryFn: () => api.getCarouselAds(),
    });

    const ads = adsResponse?.data || [];

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.deleteCarouselAd(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["carousel-ads"] });
            setDeleteDialogOpen(false);
            setAdToDelete(null);
        },
    });

    const columns: GridColDef[] = [
        {
            field: "thumbnail_url",
            headerName: "Thumbnail",
            flex: 0.5,
            minWidth: 90,
            filterable: false,
            sortable: false,
            renderCell: (params) =>
                params.value ? (
                    <Box component="img" src={params.value} alt="" sx={{ width: 56, height: 36, objectFit: "cover", borderRadius: 1 }} />
                ) : (
                    <Box sx={{ width: 56, height: 36, borderRadius: 1, backgroundColor: "var(--background-light)" }} />
                ),
        },
        {
            field: "name",
            headerName: "Name",
            flex: 2,
            minWidth: 200,
            filterable: true,
            renderCell: (params) => (
                <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%" }}>
                    <Typography variant="body2" fontWeight={500} noWrap>
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
            field: "ad_render_type",
            headerName: "Placement",
            flex: 1,
            minWidth: 120,
            filterable: true,
            renderCell: (params) => {
                const isGoogle = params.value === "GOOGLE";
                return (
                    <Chip
                        label={isGoogle ? "Google" : "Custom"}
                        size="small"
                        sx={{
                            fontSize: "0.7rem",
                            height: 22,
                            backgroundColor: isGoogle ? "rgba(66,133,244,0.12)" : "rgba(255,122,0,0.12)",
                            color: isGoogle ? "#4285F4" : "#FF7A00",
                        }}
                    />
                );
            },
        },
        {
            field: "redirect_link",
            headerName: "Redirect",
            flex: 1.2,
            minWidth: 140,
            filterable: false,
            sortable: false,
            renderCell: (params) =>
                params.value ? (
                    <Typography variant="caption" sx={{ color: "var(--primary-color)", fontSize: "0.7rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {params.value}
                    </Typography>
                ) : (
                    <Typography variant="caption" sx={{ color: "var(--text-dimmer)", fontSize: "0.7rem" }}>
                        —
                    </Typography>
                ),
        },
        {
            field: "duration",
            headerName: "Duration",
            flex: 0.6,
            minWidth: 90,
            filterable: false,
            valueFormatter: (value: any) => {
                if (!value) return "—";
                const parts = value.split(":").map(Number);
                if (parts.length === 3) {
                    const [h, m, s] = parts;
                    if (h > 0) return `${h}h ${m}m ${s}s`;
                    if (m > 0) return `${m}m ${s}s`;
                    return `${s}s`;
                }
                return value;
            },
        },
        {
            field: "is_published",
            headerName: "Status",
            flex: 0.7,
            minWidth: 100,
            filterable: true,
            renderCell: (params) => (
                <Chip
                    label={params.value ? "Published" : "Draft"}
                    size="small"
                    sx={{
                        fontSize: "0.7rem",
                        height: 22,
                        backgroundColor: params.value ? "rgba(46,125,50,0.12)" : "rgba(100,100,100,0.12)",
                        color: params.value ? "#2e7d32" : "var(--text-dimmer)",
                    }}
                />
            ),
        },
        {
            field: "created_at",
            headerName: "Created",
            flex: 1,
            minWidth: 130,
            filterable: true,
            valueFormatter: (value: any) => {
                if (!value) return "N/A";
                return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
            },
        },
        {
            field: "views_count",
            headerName: "Views",
            flex: 0.6,
            minWidth: 80,
            type: "number",
            valueFormatter: (value: any) => value?.toLocaleString() || "0",
        },
        {
            field: "likes_count",
            headerName: "Likes",
            flex: 0.6,
            minWidth: 70,
            type: "number",
            valueFormatter: (value: any) => value?.toLocaleString() || "0",
        },
        {
            field: "actions",
            headerName: "",
            flex: 0.5,
            minWidth: 80,
            filterable: false,
            sortable: false,
            align: "right",
            headerAlign: "right",
            renderCell: (params) => (
                <Box sx={{ display: "flex", gap: 0.5 }}>
                    <IconButton
                        size="small"
                        onClick={() => navigate(`/advertisement/${params.row.id}/edit`)}
                        sx={{ color: "var(--text-dimmer)", "&:hover": { color: "var(--primary-color)" } }}
                    >
                        <FaEdit size={12} />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(params.row.id)}
                        sx={{ color: "var(--text-dimmer)", "&:hover": { color: "#d32f2f" } }}
                    >
                        <FaTrash size={12} />
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
                title="Carousel"
                subtitle="Manage carousel advertisements"
                actions={
                    <Button
                        variant="contained"
                        startIcon={<FaPlus size={12} />}
                        onClick={() => navigate("/advertisement/create")}
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
                        New Ad
                    </Button>
                }
            />

            <WorkspaceContainer>
                <DataGridWrapper columns={columns} rows={ads} loading={isLoading} checkboxSelection />
            </WorkspaceContainer>

            <Dialog
                open={deleteDialogOpen}
                onClose={handleDeleteCancel}
                PaperProps={{ sx: { backgroundColor: "var(--background-color)", border: "1px solid var(--border-color)", borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontSize: "1rem", fontWeight: 600 }}>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        Are you sure you want to delete this advertisement? This action cannot be undone.
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
        </div>
    );
}