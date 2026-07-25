import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Box,
    Button,
    TextField,
    Switch,
    FormControlLabel,
    Typography,
    Stack,
    Alert,
    IconButton,
    ToggleButton,
    ToggleButtonGroup,
} from "@mui/material";
import { FaSave, FaSpinner, FaCloudUploadAlt, FaTimes, FaGoogle, FaPaintBrush } from "react-icons/fa";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAPI from "../../../hooks/useAPI";
import { WorkspaceContainer } from "../../../components/workspace-container";
import { PageHeader } from "../../../components/page-header";

type RenderType = "CUSTOM" | "GOOGLE";

interface AdFormData {
    name: string;
    description: string;
    ad_render_type: RenderType;
    ad_unit_id: string;
    redirect_link: string;
    duration: string;
    is_published: boolean;
    thumbnail: File | null;
}

export default function AdvertisementStudio() {
    const navigate = useNavigate();
    const { id } = useParams();
    const api = useAPI();
    const queryClient = useQueryClient();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState<AdFormData>({
        name: "",
        description: "",
        ad_render_type: "CUSTOM",
        ad_unit_id: "",
        redirect_link: "",
        duration: "00:00:30",
        is_published: true,
        thumbnail: null,
    });
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isCustom = formData.ad_render_type === "CUSTOM";

    // Fetch existing ad when editing
    const { data: adResponse, isLoading } = useQuery({
        queryKey: ["carousel-ad", id],
        queryFn: () => api.getCarouselAd(Number(id)),
        enabled: isEdit && !!id,
    });

    useEffect(() => {
        if (adResponse?.data && isEdit) {
            const ad = adResponse.data;
            setFormData({
                name: ad.name || "",
                description: ad.description || "",
                ad_render_type: ad.ad_render_type || "CUSTOM",
                ad_unit_id: ad.ad_unit_id || "",
                redirect_link: ad.redirect_link || "",
                duration: ad.duration || "00:00:30",
                is_published: ad.is_published ?? true,
                thumbnail: null,
            });
            if (ad.thumbnail_url || ad.thumbnail) {
                setThumbnailPreview(ad.thumbnail_url || ad.thumbnail);
            }
        }
    }, [adResponse, id, isEdit]);

    const createMutation = useMutation({
        mutationFn: (data: FormData) => api.createCarouselAd(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["carousel-ads"] });
            navigate("/advertisement/list");
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || err?.message || "Failed to create ad";
            setError(typeof msg === "object" ? JSON.stringify(msg) : msg);
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: FormData) => api.updateCarouselAd(Number(id), data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["carousel-ads"] });
            navigate("/advertisement/list");
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || err?.message || "Failed to update ad";
            setError(typeof msg === "object" ? JSON.stringify(msg) : msg);
        },
    });

    const handleChange = (field: keyof AdFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
        const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleRenderTypeChange = (_: any, value: RenderType | null) => {
        if (value) {
            setFormData((prev) => ({ ...prev, ad_render_type: value }));
        }
    };

    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFormData((prev) => ({ ...prev, thumbnail: file }));
            const reader = new FileReader();
            reader.onloadend = () => setThumbnailPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const removeThumbnail = () => {
        setFormData((prev) => ({ ...prev, thumbnail: null }));
        setThumbnailPreview(null);
    };

    const handleSubmit = () => {
        setError(null);

        if (!formData.name) {
            setError("Name is required.");
            return;
        }

        if (isCustom) {
            if (!isEdit && !formData.thumbnail) {
                setError("A thumbnail image is required for custom placement ads.");
                return;
            }
        } else {
            if (!formData.ad_unit_id) {
                setError("Ad Unit ID is required for Google placement ads.");
                return;
            }
        }

        const data = new FormData();
        data.append("name", formData.name);
        if (formData.description) data.append("description", formData.description);
        data.append("ad_render_type", formData.ad_render_type);
        data.append("duration", formData.duration);
        data.append("is_published", String(formData.is_published));
        if (formData.redirect_link) data.append("redirect_link", formData.redirect_link);

        if (isCustom) {
            if (formData.thumbnail) data.append("thumbnail", formData.thumbnail);
        } else {
            data.append("ad_unit_id", formData.ad_unit_id);
            data.append("ad_format", "banner");
        }

        if (isEdit) {
            updateMutation.mutate(data);
        } else {
            createMutation.mutate(data);
        }
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;

    if (isLoading && isEdit) {
        return (
            <WorkspaceContainer>
                <Typography>Loading advertisement...</Typography>
            </WorkspaceContainer>
        );
    }

    return (
        <div>
            <PageHeader
                title={isEdit ? "Edit Carousel Ad" : "New Carousel Ad"}
                subtitle={isEdit ? "Update advertisement details" : "Create a new carousel advertisement"}
                breadcrumbs={[
                    { label: "Advertisement", path: "/advertisement/list" },
                    { label: "Carousel", path: "/advertisement/list" },
                    { label: isEdit ? "Edit" : "Create" },
                ]}
                actions={
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={isSaving}
                        startIcon={isSaving ? <FaSpinner size={12} /> : <FaSave size={12} />}
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
                        {isSaving ? "Saving..." : "Save"}
                    </Button>
                }
            />

            <Box sx={{ maxWidth: 640 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2, fontSize: "0.8rem" }}>
                        {error}
                    </Alert>
                )}

                <WorkspaceContainer>
                    <Box sx={{ p: 1 }}>
                        <Stack spacing={2.5}>
                            {/* Placement Type Toggle */}
                            <Box>
                                <Typography variant="caption" sx={{ fontWeight: 600, display: "block", mb: 0.75, color: "var(--text-dimmer)" }}>
                                    Placement Type
                                </Typography>
                                <ToggleButtonGroup
                                    value={formData.ad_render_type}
                                    exclusive
                                    onChange={handleRenderTypeChange}
                                    size="small"
                                    sx={{ width: "100%" }}
                                >
                                    <ToggleButton value="CUSTOM" sx={{ flex: 1, textTransform: "none", gap: 1 }}>
                                        <FaPaintBrush size={12} />
                                        Custom Placement
                                    </ToggleButton>
                                    <ToggleButton value="GOOGLE" sx={{ flex: 1, textTransform: "none", gap: 1 }}>
                                        <FaGoogle size={12} />
                                        Google Placement
                                    </ToggleButton>
                                </ToggleButtonGroup>
                            </Box>

                            {/* Thumbnail Upload — only for Custom */}
                            {isCustom && (
                                <Box>
                                    <Typography variant="caption" sx={{ fontWeight: 600, display: "block", mb: 0.75, color: "var(--text-dimmer)" }}>
                                        Thumbnail
                                    </Typography>
                                    {thumbnailPreview ? (
                                        <Box sx={{ position: "relative", display: "inline-block" }}>
                                            <Box
                                                component="img"
                                                src={thumbnailPreview}
                                                alt="Thumbnail"
                                                sx={{ width: "100%", maxWidth: 320, aspectRatio: "16/9", objectFit: "cover", borderRadius: 2, border: "1px solid var(--border-color)" }}
                                            />
                                            <IconButton
                                                size="small"
                                                onClick={removeThumbnail}
                                                sx={{ position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.6)", color: "#fff", width: 24, height: 24, "&:hover": { backgroundColor: "#d32f2f" } }}
                                            >
                                                <FaTimes size={10} />
                                            </IconButton>
                                        </Box>
                                    ) : (
                                        <Box
                                            component="label"
                                            sx={{
                                                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                                width: "100%", maxWidth: 320, aspectRatio: "16/9",
                                                border: "1.5px dashed var(--border-color)", borderRadius: 2,
                                                cursor: "pointer", transition: "all 0.2s ease",
                                                "&:hover": { borderColor: "var(--primary-color)" },
                                            }}
                                        >
                                            <input type="file" hidden accept="image/*" onChange={handleThumbnailChange} />
                                            <FaCloudUploadAlt size={22} color="var(--text-dimmer)" />
                                            <Typography variant="caption" sx={{ mt: 0.5, color: "var(--text-dimmer)", fontSize: "0.7rem" }}>
                                                Drop or click to upload
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            )}

                            <TextField
                                label="Name"
                                value={formData.name}
                                onChange={handleChange("name")}
                                fullWidth
                                size="small"
                                required
                            />
                            <TextField
                                label="Description"
                                value={formData.description}
                                onChange={handleChange("description")}
                                fullWidth
                                multiline
                                minRows={2}
                                size="small"
                            />

                            {/* Google-specific fields */}
                            {!isCustom && (
                                <>
                                    <TextField
                                        label="Ad Unit ID"
                                        value={formData.ad_unit_id}
                                        onChange={handleChange("ad_unit_id")}
                                        fullWidth
                                        size="small"
                                        required
                                        placeholder="e.g. ca-app-pub-xxx/yyy"
                                    />
                                </>
                            )}

                            {isCustom && (
                                <TextField
                                    label="Redirect Link"
                                    value={formData.redirect_link}
                                    onChange={handleChange("redirect_link")}
                                    fullWidth
                                    size="small"
                                    placeholder="https://example.com"
                                />
                            )}
                            <TextField
                                label="Duration (HH:MM:SS)"
                                value={formData.duration}
                                onChange={handleChange("duration")}
                                fullWidth
                                size="small"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.is_published}
                                        onChange={handleChange("is_published") as any}
                                        size="small"
                                    />
                                }
                                label={<Typography variant="body2" sx={{ fontSize: "0.82rem" }}>Published</Typography>}
                            />
                        </Stack>
                    </Box>
                </WorkspaceContainer>
            </Box>
        </div>
    );
}
