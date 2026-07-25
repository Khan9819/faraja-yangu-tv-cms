import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    Alert,
    IconButton,
    LinearProgress,
} from "@mui/material";
import { FaSave, FaArrowLeft, FaCloudUploadAlt, FaTimes, FaImage } from "react-icons/fa";
import { useQuery, useMutation } from "@tanstack/react-query";
import useAPI from "../../../hooks/useAPI";

export default function WebsitePostEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const api = useAPI();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState("");
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [existingCover, setExistingCover] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const { data: postResponse, isLoading: isLoadingPost } = useQuery({
        queryKey: ["website-post", id],
        queryFn: () => api.getWebsitePost(Number(id)),
    });

    useEffect(() => {
        if (postResponse?.data) {
            const post = postResponse.data;
            setTitle(post.title || "");
            setDescription(post.description || "");
            setDate(post.date ? post.date.split("T")[0] : "");
            if (post.cover_image) {
                setExistingCover(post.cover_image);
                setCoverPreview(post.cover_image);
            }
        }
    }, [postResponse]);

    const updateMutation = useMutation({
        mutationFn: (data: FormData) => api.updateWebsitePost(Number(id), data),
        onSuccess: () => navigate("/website-posting"),
    });

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith("image/")) {
            setError("Please select a valid image file (JPG, PNG, WebP)");
            return;
        }
        setCoverFile(file);
        const url = URL.createObjectURL(file);
        setCoverPreview(url);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
        e.target.value = "";
    };

    const handleDrag = (e: React.DragEvent, active: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(active);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    };

    const removeCover = () => {
        setCoverFile(null);
        setCoverPreview(null);
        setExistingCover(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!title.trim()) {
            setError("Heading title is required");
            return;
        }
        if (!description.trim()) {
            setError("Description is required");
            return;
        }
        if (!date) {
            setError("Date is required");
            return;
        }

        try {
            setIsUploading(true);
            setUploadProgress(10);

            const formData = new FormData();
            formData.append("title", title);
            formData.append("description", description);
            formData.append("date", date);
            if (coverFile) {
                formData.append("cover_image", coverFile);
            }

            setUploadProgress(50);
            await updateMutation.mutateAsync(formData);
            setUploadProgress(100);
        } catch (err: any) {
            const msg = err?.response?.data?.errors || err?.response?.data?.message || err?.message;
            setError(typeof msg === "object" ? Object.values(msg).flat().join(", ") : msg || "Failed to update website post");
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoadingPost) return <Typography>Loading...</Typography>;

    return (
        <div>
            <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
                <Button variant="outlined" startIcon={<FaArrowLeft />} onClick={() => navigate("/website-posting")} sx={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                    Back
                </Button>
                <div>
                    <h2 style={{ margin: 0 }}>Edit Website Post</h2>
                    <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)" }}>Update post details</p>
                </div>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

            {isUploading && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>Updating post...</Typography>
                    <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
            )}

            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                <Paper sx={{ flex: 1, minWidth: 300, p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                        <FaImage color="#FF7A00" /> Cover Image
                    </Typography>

                    {coverPreview ? (
                        <Box sx={{ position: "relative" }}>
                            <img src={coverPreview} alt="Cover preview" style={{ width: "100%", borderRadius: 8, maxHeight: 300, objectFit: "contain", backgroundColor: "#f5f5f5" }} />
                            <IconButton size="small" onClick={removeCover} sx={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.6)", color: "#fff", "&:hover": { backgroundColor: "rgba(211, 47, 47, 0.8)" } }}>
                                <FaTimes size={14} />
                            </IconButton>
                        </Box>
                    ) : (
                        <Box
                            onDragEnter={(e: React.DragEvent) => handleDrag(e, true)}
                            onDragLeave={(e: React.DragEvent) => handleDrag(e, false)}
                            onDragOver={(e: React.DragEvent) => handleDrag(e, true)}
                            onDrop={handleDrop}
                            sx={{
                                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200,
                                border: dragActive ? "2px dashed #FF7A00" : "2px dashed var(--border-color)", borderRadius: 2,
                                backgroundColor: dragActive ? "rgba(255, 122, 0, 0.05)" : "transparent",
                                cursor: "pointer", transition: "all 0.2s ease",
                                "&:hover": { borderColor: "#FF7A00", backgroundColor: "rgba(255, 122, 0, 0.05)" },
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input ref={fileInputRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
                            <FaCloudUploadAlt size={40} color={dragActive ? "#FF7A00" : "#999"} />
                            <Typography variant="body2" sx={{ mt: 1 }}>Click to upload new cover image</Typography>
                            <Typography variant="caption" color="text.secondary">JPG, PNG, WebP</Typography>
                        </Box>
                    )}
                    {existingCover && !coverFile && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>Current cover image shown. Upload a new one to replace it.</Typography>
                    )}
                </Paper>

                <Paper sx={{ flex: 1, minWidth: 300, p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Post Details</Typography>

                    <form onSubmit={handleSubmit}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <TextField
                                label="Heading Title"
                                fullWidth
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter post heading title"
                                size="small"
                            />

                            <TextField
                                label="Description"
                                fullWidth
                                required
                                multiline
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter post description"
                                size="small"
                            />

                            <TextField
                                label="Date"
                                type="date"
                                fullWidth
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                size="small"
                            />

                            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 2 }}>
                                <Button variant="outlined" onClick={() => navigate("/website-posting")} disabled={isUploading}>Cancel</Button>
                                <Button type="submit" variant="contained" startIcon={<FaSave />} disabled={isUploading || !title.trim()} sx={{ backgroundColor: "#FF7A00", "&:hover": { backgroundColor: "#E66D00" } }}>
                                    {isUploading ? "Saving..." : "Save Changes"}
                                </Button>
                            </Box>
                        </Box>
                    </form>
                </Paper>
            </Box>
        </div>
    );
}
