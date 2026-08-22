import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Box,
    Button,
    TextField,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    Alert,
    IconButton,
    LinearProgress,
    Divider,
    ToggleButton,
    ToggleButtonGroup,
    Skeleton,
} from "@mui/material";
import { FaSave, FaArrowLeft, FaClock, FaCloudUploadAlt, FaVideo, FaTimes, FaList, FaImage, FaLink } from "react-icons/fa";
import { useQuery, useMutation } from "@tanstack/react-query";
import useAPI from "../../../../hooks/useAPI";

type MediaType = "image" | "video";

export default function InterceptorEdit() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const api = useAPI();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [mediaType, setMediaType] = useState<MediaType>("image");
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        selectedVideo: "",
        targetVideo: "",
        start_time: "00:00:00",
        end_time: "00:00:30",
        redirect_link: "",
        display_duration: 5,
    });
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [existingMediaUrl, setExistingMediaUrl] = useState<string | null>(null);
    const [videoDuration, setVideoDuration] = useState<number>(0);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [hasMediaChanged, setHasMediaChanged] = useState(false);
    const uploadedChunksRef = useRef<Set<number>>(new Set());
    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

    // Fetch existing ad data
    const { data: adResponse, isLoading: isLoadingAd } = useQuery({
        queryKey: ["interceptor-ad", id],
        queryFn: () => api.getInterceptorAd(Number(id)),
        enabled: !!id,
    });

    const { data: videosResponse } = useQuery({
        queryKey: ["videos"],
        queryFn: () => api.getVideos(),
    });
    const videos = videosResponse?.data || [];

    const { data: categoriesResponse } = useQuery({
        queryKey: ["main-categories"],
        queryFn: () => api.getCategories('parent'),
        refetchInterval: 30000,
    });
    const mainCategories = categoriesResponse?.data || [];

    // Populate form with existing data
    useEffect(() => {
        if (adResponse?.data || adResponse) {
            const ad = adResponse?.data || adResponse;
            setMediaType(ad.media_type || "video");
            setFormData({
                title: ad.title || "",
                description: ad.description || "",
                selectedVideo: ad.content_video?.id?.toString() || ad.content_video?.toString() || "",
                targetVideo: "",
                start_time: "00:00:00",
                end_time: ad.end_time || "00:00:30",
                redirect_link: ad.redirect_link || "",
                display_duration: ad.display_duration || 5,
            });
            // Set existing media preview
            if (ad.media_type === "image" && ad.media_file_url) {
                setExistingMediaUrl(ad.media_file_url);
                setMediaPreview(ad.media_file_url);
            } else if (ad.media_type === "video" && ad.content_video?.thumbnail_url) {
                setExistingMediaUrl(ad.content_video.thumbnail_url);
            }
            if (ad.categories && Array.isArray(ad.categories)) {
                setSelectedCategories(ad.categories.map((c: any) => c.id));
            }
        }
    }, [adResponse]);

    const updateMutation = useMutation({
        mutationFn: (data: FormData) => api.updateInterceptorAd(Number(id), data),
        onSuccess: () => navigate("/advertisement/interceptor"),
        onError: (err: any) => {
            const message = err?.response?.data?.message;
            setError(typeof message === "object" ? Object.values(message).flat().join(", ") : message || "Failed to update");
        },
    });

    const getAcceptedFileTypes = () => {
        if (mediaType === "image") return "image/jpeg,image/png,image/gif,image/webp";
        return "video/mp4,video/webm,video/quicktime";
    };

    const isGif = (file: File) => file.type === "image/gif";

    const handleMediaSelect = (file: File) => {
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        if (mediaType === "image" && !isImage) {
            setError("Please select a valid image file (JPG, PNG, GIF, WebP)");
            return;
        }
        if (mediaType === "video" && !isVideo) {
            setError("Please select a valid video file (MP4, WebM, MOV)");
            return;
        }

        setMediaFile(file);
        setHasMediaChanged(true);
        setFormData(prev => ({ ...prev, selectedVideo: "" }));
        const url = URL.createObjectURL(file);
        setMediaPreview(url);

        if (isVideo) {
            const video = document.createElement("video");
            video.preload = "metadata";
            video.onloadedmetadata = () => {
                const duration = video.duration;
                setVideoDuration(duration);
                setFormData(prev => ({
                    ...prev,
                    start_time: "00:00:00",
                    end_time: secondsToTimeString(duration)
                }));
                URL.revokeObjectURL(video.src);
            };
            video.src = url;
        } else {
            setVideoDuration(0);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleMediaSelect(file);
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
        if (file) handleMediaSelect(file);
    };

    const removeMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        setVideoDuration(0);
        setHasMediaChanged(true);
    };

    const handleMediaTypeChange = (_: React.MouseEvent<HTMLElement>, newType: MediaType | null) => {
        if (newType && newType !== mediaType) {
            setMediaType(newType);
            removeMedia();
            setFormData(prev => ({ ...prev, selectedVideo: "" }));
            setExistingMediaUrl(null);
        }
    };

    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return hrs > 0 ? `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}` : `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const secondsToTimeString = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const parseTimeToSeconds = (time: string) => {
        const parts = time.split(":").map(Number);
        return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : 0;
    };

    const uploadVideoChunked = async (file: File, videoId: number) => {
        setIsUploading(true);
        const chunkSize = 10 * 1024 * 1024; // 10MB chunks (was 5MB — faster uploads)
        const totalChunks = Math.ceil(file.size / chunkSize);
        const fileName = file.name;
        const maxRetries = 5; // Was 3 — more resilient for slow networks

        const uploadChunkWithRetry = async (chunkIndex: number, retryCount = 0): Promise<void> => {
            const start = chunkIndex * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);

            const chunkUploadUrlResponse = await api.getChunkUploadUrl(videoId, chunkIndex, totalChunks);
            const chunkUploadUrl = chunkUploadUrlResponse.data?.upload_url;
            const requiredHeaders = chunkUploadUrlResponse.data?.required_headers || { 'Content-Type': 'application/octet-stream' };

            if (!chunkUploadUrl) {
                throw new Error(`Failed to get upload URL for chunk ${chunkIndex}`);
            }

            try {
                await api.directUploadVideoChunk(chunkUploadUrl, chunk, requiredHeaders);
                uploadedChunksRef.current.add(chunkIndex);
            } catch (error: any) {
                const status = error?.response?.status;
                if ((status === 504 || status === 502 || status === 403 || status === 408 || status === 429 || status === 500 || !status) && retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
                    return uploadChunkWithRetry(chunkIndex, retryCount + 1);
                }
                throw error;
            }
        };

        try {
            let chunksToUpload: number[] = [];
            try {
                const statusResponse = await api.getUploadStatus(videoId, totalChunks);
                const uploadStatus = statusResponse.data;
                if (uploadStatus?.is_complete) {
                    chunksToUpload = [];
                } else if (uploadStatus?.missing_chunks?.length > 0) {
                    chunksToUpload = uploadStatus.missing_chunks;
                    for (let i = 0; i < totalChunks; i++) {
                        if (!chunksToUpload.includes(i)) {
                            uploadedChunksRef.current.add(i);
                        }
                    }
                } else {
                    chunksToUpload = Array.from({ length: totalChunks }, (_, i) => i)
                        .filter(i => !uploadedChunksRef.current.has(i));
                }
            } catch {
                chunksToUpload = Array.from({ length: totalChunks }, (_, i) => i)
                    .filter(i => !uploadedChunksRef.current.has(i));
            }

            let completedCount = totalChunks - chunksToUpload.length;
            for (const chunkIndex of chunksToUpload) {
                await uploadChunkWithRetry(chunkIndex);
                completedCount++;
                const progress = Math.round((completedCount / totalChunks) * 70);
                setUploadProgress(progress);
            }

            setUploadProgress(75);
            await api.assembleVideoChunks(videoId, fileName);
            uploadedChunksRef.current.clear();
            return true;
        } catch (error: any) {
            throw new Error(error?.response?.data?.message || 'Failed to upload video. You can retry to resume from where it stopped.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // For image type, require media if changed or if no existing media
        if (mediaType === "image" && hasMediaChanged && !mediaFile) {
            setError("Please upload an image or GIF");
            return;
        }
        if (mediaType === "video" && !mediaFile && !formData.selectedVideo) {
            setError("Please upload a video or select an existing one");
            return;
        }

        const startSeconds = parseTimeToSeconds(formData.start_time);
        const endSeconds = parseTimeToSeconds(formData.end_time);

        if (endSeconds <= startSeconds) {
            setError("End time must be after start time");
            return;
        }
        if (mediaType === "video" && mediaFile && videoDuration > 0 && endSeconds > videoDuration) {
            setError("End time cannot exceed video duration");
            return;
        }

        try {
            setIsUploading(true);
            setUploadProgress(5);

            const adFormData = new FormData();
            adFormData.append("title", formData.title);
            if (formData.description) {
                adFormData.append("description", formData.description);
            }
            adFormData.append("media_type", mediaType);
            adFormData.append("start_time", formData.start_time);
            adFormData.append("end_time", formData.end_time);
            if (formData.targetVideo) {
                adFormData.append("video", formData.targetVideo);
            }
            // Always send categories so an empty selection is stored as "All Videos" (global)
            // and clears any previously targeted categories on update.
            selectedCategories.forEach((catId) => {
                adFormData.append("categories", catId.toString());
            });
            if (selectedCategories.length === 0) {
                adFormData.append("categories", "");
            }
            if (formData.redirect_link) {
                adFormData.append("redirect_link", formData.redirect_link);
            }

            if (mediaType === "image") {
                // Only append media_file if changed
                if (mediaFile) {
                    adFormData.append("media_file", mediaFile);
                }
                adFormData.append("display_duration", formData.display_duration.toString());
                setUploadProgress(50);
            } else {
                if (mediaFile) {
                    setUploadProgress(10);
                    // Step 1: Create video record (metadata only)
                    const videoMetaFormData = new FormData();
                    videoMetaFormData.append("title", mediaFile.name.replace(/\.[^/.]+$/, ""));
                    videoMetaFormData.append("description", "Interceptor ad video");
                    videoMetaFormData.append("status", "published");
                    // Ad media must NOT appear in the content list — only in the video player
                    videoMetaFormData.append("is_ad_media", "true");
                    const videoResponse = await api.createVideo(videoMetaFormData);
                    const videoId = videoResponse?.data?.id || videoResponse?.id;
                    if (!videoId) throw new Error("Failed to create video record");
                    setUploadProgress(15);

                    // Step 2: Upload chunks + assemble (triggers HLS conversion)
                    const uploadSuccess = await uploadVideoChunked(mediaFile, videoId);
                    if (!uploadSuccess) throw new Error("Video upload failed");
                    setUploadProgress(80);

                    adFormData.append("content_video", videoId.toString());
                } else if (formData.selectedVideo) {
                    setUploadProgress(50);
                    adFormData.append("content_video", formData.selectedVideo);
                }
            }

            setUploadProgress(90);
            await updateMutation.mutateAsync(adFormData);
            setUploadProgress(100);
        } catch (err: any) {
            setError(err?.message || "Failed to update interceptor ad");
        } finally {
            setIsUploading(false);
        }
    };

    const canSubmit = formData.title.trim() && (mediaType === "image" 
        ? (!!mediaFile || (!!existingMediaUrl && !hasMediaChanged))
        : (!!mediaFile || !!formData.selectedVideo));

    if (isLoadingAd) {
        return (
            <div>
                <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
                    <Skeleton variant="rectangular" width={80} height={36} />
                    <div>
                        <Skeleton variant="text" width={200} height={32} />
                        <Skeleton variant="text" width={300} height={20} />
                    </div>
                </Box>
                <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    <Skeleton variant="rectangular" sx={{ flex: 1, minWidth: 300, height: 400 }} />
                    <Skeleton variant="rectangular" sx={{ flex: 1, minWidth: 300, height: 400 }} />
                </Box>
            </div>
        );
    }

    return (
        <div>
            <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
                <Button variant="outlined" startIcon={<FaArrowLeft />} onClick={() => navigate("/advertisement/interceptor")} sx={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                    Back
                </Button>
                <div>
                    <h2 style={{ margin: 0 }}>Edit Interceptor Ad</h2>
                    <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)" }}>Update the interceptor ad settings</p>
                </div>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

            {isUploading && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>{uploadProgress < 70 ? "Uploading media..." : "Updating interceptor ad..."}</Typography>
                    <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
            )}

            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                <Paper sx={{ flex: 1, minWidth: 300, p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                        {mediaType === "image" ? <FaImage color="#FF7A00" /> : <FaVideo color="#FF7A00" />}
                        Ad Media
                    </Typography>

                    <ToggleButtonGroup
                        value={mediaType}
                        exclusive
                        onChange={handleMediaTypeChange}
                        sx={{ mb: 3, width: "100%" }}
                    >
                        <ToggleButton value="image" sx={{ flex: 1, "&.Mui-selected": { backgroundColor: "rgba(255, 122, 0, 0.1)", color: "#FF7A00" } }}>
                            <FaImage style={{ marginRight: 8 }} /> Image / GIF
                        </ToggleButton>
                        <ToggleButton value="video" sx={{ flex: 1, "&.Mui-selected": { backgroundColor: "rgba(255, 122, 0, 0.1)", color: "#FF7A00" } }}>
                            <FaVideo style={{ marginRight: 8 }} /> Video
                        </ToggleButton>
                    </ToggleButtonGroup>

                    {mediaPreview ? (
                        <Box sx={{ position: "relative" }}>
                            {mediaType === "image" ? (
                                <img src={mediaPreview} alt="Preview" style={{ width: "100%", borderRadius: 8, maxHeight: 220, objectFit: "contain", backgroundColor: "#f5f5f5" }} />
                            ) : (
                                <video src={mediaPreview} controls style={{ width: "100%", borderRadius: 8, backgroundColor: "#000", maxHeight: 220 }} />
                            )}
                            <IconButton size="small" onClick={removeMedia} sx={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.6)", color: "#fff", "&:hover": { backgroundColor: "rgba(211, 47, 47, 0.8)" } }}>
                                <FaTimes size={14} />
                            </IconButton>
                            {mediaType === "video" && videoDuration > 0 && (
                                <Box sx={{ mt: 2, p: 2, backgroundColor: "rgba(255, 122, 0, 0.05)", borderRadius: 2 }}>
                                    <Typography variant="body2" color="text.secondary">Duration</Typography>
                                    <Typography variant="h6" sx={{ color: "#FF7A00" }}>{formatDuration(videoDuration)}</Typography>
                                </Box>
                            )}
                            {mediaType === "image" && mediaFile && (
                                <Box sx={{ mt: 2, p: 2, backgroundColor: "rgba(255, 122, 0, 0.05)", borderRadius: 2 }}>
                                    <Typography variant="body2" color="text.secondary">Type</Typography>
                                    <Typography variant="h6" sx={{ color: "#FF7A00" }}>{isGif(mediaFile) ? "Animated GIF" : "Static Image"}</Typography>
                                </Box>
                            )}
                            {mediaType === "image" && !mediaFile && existingMediaUrl && (
                                <Box sx={{ mt: 2, p: 2, backgroundColor: "rgba(255, 122, 0, 0.05)", borderRadius: 2 }}>
                                    <Typography variant="body2" color="text.secondary">Current Media</Typography>
                                    <Typography variant="body2" sx={{ color: "#FF7A00" }}>Using existing image</Typography>
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <Box
                            component="label"
                            onDragEnter={(e: React.DragEvent) => handleDrag(e, true)}
                            onDragLeave={(e: React.DragEvent) => handleDrag(e, false)}
                            onDragOver={(e: React.DragEvent) => handleDrag(e, true)}
                            onDrop={handleDrop}
                            sx={{
                                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 150,
                                border: dragActive ? "2px dashed #FF7A00" : "2px dashed var(--border-color)", borderRadius: 2,
                                backgroundColor: dragActive ? "rgba(255, 122, 0, 0.05)" : "transparent",
                                cursor: (mediaType === "video" && formData.selectedVideo) ? "not-allowed" : "pointer",
                                opacity: (mediaType === "video" && formData.selectedVideo) ? 0.5 : 1,
                                pointerEvents: (mediaType === "video" && formData.selectedVideo) ? "none" : "auto",
                                transition: "all 0.2s ease",
                                "&:hover": { borderColor: "#FF7A00", backgroundColor: "rgba(255, 122, 0, 0.05)" },
                            }}
                        >
                            <input ref={fileInputRef} type="file" hidden accept={getAcceptedFileTypes()} onChange={handleFileChange} disabled={mediaType === "video" && !!formData.selectedVideo} />
                            <FaCloudUploadAlt size={36} color={dragActive ? "#FF7A00" : "#999"} />
                            <Typography variant="body2" sx={{ mt: 1 }}>Drag & drop or click to replace</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {mediaType === "image" ? "JPG, PNG, GIF, WebP" : "MP4, WebM, MOV"}
                            </Typography>
                        </Box>
                    )}

                    {mediaType === "video" && (
                        <>
                            <Box sx={{ display: "flex", alignItems: "center", my: 2 }}>
                                <Divider sx={{ flex: 1 }} />
                                <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>OR</Typography>
                                <Divider sx={{ flex: 1 }} />
                            </Box>

                            <FormControl fullWidth disabled={!!mediaFile}>
                                <InputLabel>Select Existing Video</InputLabel>
                                <Select value={formData.selectedVideo} label="Select Existing Video" onChange={(e) => {
                                    const videoId = e.target.value as string;
                                    const selectedVid = videos.find((v: any) => v.id.toString() === videoId);
                                    setFormData({
                                        ...formData,
                                        selectedVideo: videoId,
                                        start_time: "00:00:00",
                                        end_time: selectedVid?.duration ? secondsToTimeString(selectedVid.duration) : "00:00:30"
                                    });
                                    setHasMediaChanged(true);
                                }} startAdornment={<FaList size={14} color="#999" style={{ marginRight: 8, marginLeft: 8 }} />}>
                                    <MenuItem value=""><em>None</em></MenuItem>
                                    {videos.map((video: any) => (
                                        <MenuItem key={video.id} value={video.id}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                {video.thumbnail && <img src={video.thumbnail} alt="" style={{ width: 40, height: 24, objectFit: "cover", borderRadius: 4 }} />}
                                                <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>{video.title}</Typography>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            {mediaFile && <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>Clear uploaded video to select existing</Typography>}
                        </>
                    )}
                </Paper>

                <Paper sx={{ flex: 1, minWidth: 300, p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                        <FaClock color="#FF7A00" /> Ad Settings
                    </Typography>

                    <form onSubmit={handleSubmit}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <TextField
                                label="Title"
                                fullWidth
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter ad title"
                                helperText="A descriptive title for this ad"
                                size="small"
                            />

                            <TextField
                                label="Description"
                                fullWidth
                                multiline
                                rows={2}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Optional description"
                                helperText="Brief description of the ad (optional)"
                                size="small"
                            />

                            <FormControl fullWidth size="small">
                                <InputLabel>Target Categories</InputLabel>
                                <Select
                                    multiple
                                    value={selectedCategories}
                                    label="Target Categories"
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSelectedCategories(typeof value === 'string' ? [] : value);
                                    }}
                                    renderValue={(selected) =>
                                        mainCategories
                                            .filter((cat: any) => selected.includes(cat.id))
                                            .map((cat: any) => cat.name)
                                            .join(', ') || 'All Categories'
                                    }
                                >
                                    {mainCategories.map((cat: any) => (
                                        <MenuItem key={cat.id} value={cat.id}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                {cat.thumbnail && <img src={cat.thumbnail} alt="" style={{ width: 24, height: 24, objectFit: "cover", borderRadius: 4 }} />}
                                                <Typography variant="body2">{cat.name}</Typography>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                                    Leave empty to show on all categories. Select multiple to target specific categories.
                                </Typography>
                            </FormControl>

                            <TextField
                                label="Redirect Link"
                                fullWidth
                                value={formData.redirect_link}
                                onChange={(e) => setFormData({ ...formData, redirect_link: e.target.value })}
                                placeholder="https://example.com/landing-page"
                                helperText="URL to redirect when user clicks the ad"
                                size="small"
                                InputProps={{
                                    startAdornment: <FaLink size={14} color="#999" style={{ marginRight: 8 }} />
                                }}
                            />

                            {mediaType === "image" && (
                                <TextField
                                    label="Display Duration (seconds)"
                                    type="number"
                                    fullWidth
                                    value={formData.display_duration}
                                    onChange={(e) => setFormData({ ...formData, display_duration: Math.max(1, parseInt(e.target.value) || 5) })}
                                    helperText="How long to show the ad"
                                    size="small"
                                    inputProps={{ min: 1, max: 60 }}
                                />
                            )}

                            <Box sx={{ p: 2, backgroundColor: "rgba(76, 175, 80, 0.06)", borderRadius: 2, border: "1px solid rgba(76, 175, 80, 0.25)" }}>
                                <Typography variant="body2" fontWeight={600} sx={{ color: "#4CAF50" }}>
                                    Placement: Pre-roll (plays at the very start)
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                                    This ad plays automatically at the beginning of every targeted video — users watch it like a trailer before the main content.
                                </Typography>
                                <Box sx={{ display: "flex", gap: 2, mt: 1.5 }}>
                                    <TextField label="Start Time" fullWidth value={formData.start_time} InputProps={{ readOnly: true }} helperText="Fixed at 00:00:00 (video start)" size="small" />
                                    <TextField label="End Time" fullWidth value={formData.end_time} InputProps={{ readOnly: true }} helperText="Matches ad length" size="small" />
                                </Box>
                            </Box>

                            <Box sx={{ p: 2, backgroundColor: "rgba(255, 122, 0, 0.05)", borderRadius: 2, border: "1px solid rgba(255, 122, 0, 0.2)" }}>
                                <Typography variant="body2" color="text.secondary">Ad Slot Duration</Typography>
                                <Typography variant="h6" sx={{ color: "#FF7A00", mt: 0.5 }}>
                                    {(() => {
                                        const duration = parseTimeToSeconds(formData.end_time) - parseTimeToSeconds(formData.start_time);
                                        return duration > 0 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : "Invalid timing";
                                    })()}
                                </Typography>
                            </Box>

                            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 2 }}>
                                <Button variant="outlined" onClick={() => navigate("/advertisement/interceptor")} disabled={isUploading}>Cancel</Button>
                                <Button type="submit" variant="contained" startIcon={<FaSave />} disabled={isUploading || !canSubmit} sx={{ backgroundColor: "#FF7A00", "&:hover": { backgroundColor: "#E66D00" } }}>
                                    {isUploading ? "Updating..." : "Update Interceptor Ad"}
                                </Button>
                            </Box>
                        </Box>
                    </form>
                </Paper>
            </Box>
        </div>
    );
}
