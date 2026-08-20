import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Button,
    TextField,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Alert,
    Stack,
    Paper,
    Divider,
    Slider,
    Tooltip,
    CircularProgress,
    ToggleButton,
    ToggleButtonGroup,
    LinearProgress,
} from '@mui/material';
import {
    FaUpload,
    FaImage,
    FaTrash,
    FaPlay,
    FaPause,
    FaVolumeUp,
    FaVolumeMute,
    FaExpand,
    FaCompress,
    FaCheckCircle,
    FaCloudUploadAlt,
    FaExclamationTriangle,
    FaRedo,
    FaSave,
    FaSpinner,
    FaGoogleDrive,
    FaLaptop,
    FaLink,
} from 'react-icons/fa';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useAPI from '../../../hooks/useAPI';
import Hls from 'hls.js';

type UploadSource = 'local' | 'google_drive';

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Rename an uploaded image with a random UUID so two different videos can
 * never save under the same object-storage key (e.g. two 'cover.jpg' uploads
 * used to overwrite each other, making videos share covers).
 */
function renameFileWithUUID(file: File): File {
    const extension = file.name.split('.').pop() || 'jpg';
    const newFileName = `${generateUUID()}.${extension}`;
    return new File([file], newFileName, { type: file.type });
}

interface VideoFormData {
    title: string;
    description: string;
    category: number | string;
    thumbnail: File | null;
    tv_poster: File | null;
    tv_landscape: File | null;
    tv_square: File | null;
    portrait_cover: File | null;
    videoFile: File | null;
    duration: string;
    status: string;
}

export default function VideoStudio() {
    const navigate = useNavigate();
    const { id } = useParams();
    const api = useAPI();
    const queryClient = useQueryClient();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState<VideoFormData>({
        title: '',
        description: '',
        category: '',
        thumbnail: null,
        tv_poster: null,
        tv_landscape: null,
        tv_square: null,
        portrait_cover: null,
        videoFile: null,
        duration: '',
        status: 'published',
    });

    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStats, setUploadStats] = useState<{ speed: number; eta: number; completedChunks: number; totalChunks: number } | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const [tvPosterPreview, setTvPosterPreview] = useState<string | null>(null);
    const [tvLandscapePreview, setTvLandscapePreview] = useState<string | null>(null);
    const [tvSquarePreview, setTvSquarePreview] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadFailed, setUploadFailed] = useState(false);
    const [createdVideoId, setCreatedVideoId] = useState<number | null>(null);

    // Google Drive import states
    const [uploadSource, setUploadSource] = useState<UploadSource>('local');
    const [googleDriveUrl, setGoogleDriveUrl] = useState('');
    const [googleDriveImporting, setGoogleDriveImporting] = useState(false);
    const [googleDriveImportStatus, setGoogleDriveImportStatus] = useState<string | null>(null);
    const [googleDriveImportProgress, setGoogleDriveImportProgress] = useState(0);
    const googleDrivePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const uploadedChunksRef = useRef<Set<number>>(new Set());

    // Video player states
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLooping, setIsLooping] = useState(false);

    // Fetch categories
    const { data: categoriesResponse } = useQuery({
        queryKey: ['categories', 'all'],
        queryFn: () => api.getCategories('children'),
    });

    const categories = categoriesResponse?.data || [];

    // Fetch video details if editing
    const { data: videoData, isLoading: isLoadingVideo } = useQuery({
        queryKey: ['video', id],
        queryFn: () => api.getVideoById(Number(id)),
        enabled: isEdit && !!id,
    });

    // Fetch video streaming URL (HLS) if editing, using video UUID
    const videoUid = videoData?.data?.uid;
    const { data: videoStreamData } = useQuery({
        queryKey: ['video-stream', videoUid],
        queryFn: () => api.getVideoStreamUrl(videoUid as string),
        enabled: isEdit && !!videoUid,
    });

    useEffect(() => {
        if (videoData?.data) {
            const video = videoData.data;
            setFormData({
                title: video.title || '',
                description: video.description || '',
                category: video.category || '',
                thumbnail: null,
                tv_poster: null,
                tv_landscape: null,
                tv_square: null,
                portrait_cover: null,
                videoFile: null,
                duration: video.duration || '',
                status: video.status || 'published',
            });
            if (video.thumbnail) {
                setThumbnailPreview(video.thumbnail);
            }
            if (video.tv_poster) {
                setTvPosterPreview(video.tv_poster);
            }
            if (video.tv_landscape) {
                setTvLandscapePreview(video.tv_landscape);
            }
            if (video.tv_square) {
                setTvSquarePreview(video.tv_square);
            }
            // Fallback: if stream URL is not yet available, use original video URL (MP4)
            if (!videoPreview && video.video) {
                setVideoPreview(video.video);
            }
        }
    }, [videoData, videoPreview]);

    // When stream URL data is available, prefer it for preview (HLS)
    useEffect(() => {
        if (!videoStreamData) return;

        const streamPayload: any = videoStreamData;
        const streamUrl = streamPayload?.data?.stream_url || null;

        if (streamUrl) {
            setVideoPreview(streamUrl);
        }
    }, [videoStreamData]);

    // Initialize HLS playback when preview is an HLS source
    useEffect(() => {
        if (!videoRef.current || !videoPreview) return;

        const isHlsSource = typeof videoPreview === 'string' && videoPreview.endsWith('.m3u8');
        let hls: Hls | null = null;

        if (isHlsSource) {
            const videoElement = videoRef.current;

            if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS support (Safari)
                videoElement.src = videoPreview;
            } else if (Hls.isSupported()) {
                // Use hls.js for other browsers
                hls = new Hls();
                hls.loadSource(videoPreview);
                hls.attachMedia(videoElement);
            }
        }

        return () => {
            if (hls) {
                hls.destroy();
            }
        };
    }, [videoPreview]);

    // Cleanup object URLs and polling on unmount
    useEffect(() => {
        return () => {
            if (videoPreview && videoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(videoPreview);
            }
            if (googleDrivePollingRef.current) {
                clearInterval(googleDrivePollingRef.current);
            }
        };
    }, []);

    const handleFileChange = (field: 'thumbnail' | 'tv_poster' | 'tv_landscape' | 'tv_square' | 'videoFile') => (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFormData({ ...formData, [field]: file });

            if (field === 'thumbnail') {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setThumbnailPreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            } else if (field === 'tv_poster') {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setTvPosterPreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            } else if (field === 'tv_landscape') {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setTvLandscapePreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            } else if (field === 'tv_square') {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setTvSquarePreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            } else {
                // For videos, use Object URL to avoid memory issues with large files
                // Revoke previous object URL to prevent memory leaks
                if (videoPreview && videoPreview.startsWith('blob:')) {
                    URL.revokeObjectURL(videoPreview);
                }
                
                const objectUrl = URL.createObjectURL(file);
                setVideoPreview(objectUrl);
                
                // Extract video duration using a temporary video element
                const tempVideo = document.createElement('video');
                tempVideo.preload = 'metadata';
                tempVideo.onloadedmetadata = () => {
                    const duration = Math.floor(tempVideo.duration);
                    const hours = Math.floor(duration / 3600);
                    const minutes = Math.floor((duration % 3600) / 60);
                    const seconds = duration % 60;
                    const timeString = hours > 0
                        ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                        : `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    setFormData(prev => ({
                        ...prev,
                        duration: timeString,
                    }));
                    // Clean up temp video element
                    tempVideo.src = '';
                };
                tempVideo.onerror = () => {
                    console.error('Error loading video metadata');
                };
                tempVideo.src = objectUrl;
            }
        }
    };

    const handleRemoveFile = (field: 'thumbnail' | 'tv_poster' | 'tv_landscape' | 'tv_square' | 'videoFile') => {
        setFormData({ ...formData, [field]: null });
        if (field === 'thumbnail') {
            setThumbnailPreview(null);
        } else if (field === 'tv_poster') {
            setTvPosterPreview(null);
        } else if (field === 'tv_landscape') {
            setTvLandscapePreview(null);
        } else if (field === 'tv_square') {
            setTvSquarePreview(null);
        } else {
            if (videoPreview && videoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(videoPreview);
            }
            setVideoPreview(null);
        }
    };

    // Google Drive URL validation
    const isValidGoogleDriveUrl = (url: string): boolean => {
        const patterns = [
            /^https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+/,
            /^https:\/\/drive\.google\.com\/open\?id=[a-zA-Z0-9_-]+/,
            /^https:\/\/docs\.google\.com\/.*\/d\/[a-zA-Z0-9_-]+/,
        ];
        return patterns.some(pattern => pattern.test(url.trim()));
    };

    // Poll Google Drive import status
    const pollGoogleDriveImportStatus = (videoId: number) => {
        if (googleDrivePollingRef.current) {
            clearInterval(googleDrivePollingRef.current);
        }

        setGoogleDriveImporting(true);
        setGoogleDriveImportStatus('Initiating import from Google Drive...');
        setGoogleDriveImportProgress(5);

        googleDrivePollingRef.current = setInterval(async () => {
            try {
                const response = await api.getGoogleDriveImportStatus(videoId);
                const status = response?.data;

                if (!status) return;

                setGoogleDriveImportProgress(status.progress ?? 0);
                setGoogleDriveImportStatus(status.message ?? 'Processing...');

                if (status.status === 'completed') {
                    if (googleDrivePollingRef.current) {
                        clearInterval(googleDrivePollingRef.current);
                        googleDrivePollingRef.current = null;
                    }
                    setGoogleDriveImporting(false);
                    setGoogleDriveImportProgress(100);
                    setGoogleDriveImportStatus('Import completed successfully!');
                    queryClient.invalidateQueries({ queryKey: ['videos'] });
                } else if (status.status === 'failed') {
                    if (googleDrivePollingRef.current) {
                        clearInterval(googleDrivePollingRef.current);
                        googleDrivePollingRef.current = null;
                    }
                    setGoogleDriveImporting(false);
                    setUploadError(status.message || 'Google Drive import failed.');
                    setUploadFailed(true);
                }
            } catch (error: any) {
                console.error('Error polling Google Drive import status:', error);
            }
        }, 3000);
    };

    // Handle Google Drive import submission
    const handleGoogleDriveSubmit = async () => {
        if (!googleDriveUrl || !isValidGoogleDriveUrl(googleDriveUrl)) {
            setUploadError('Please enter a valid Google Drive link.');
            return;
        }

        try {
            setUploadError(null);
            setUploadFailed(false);

            // Create the video record first with metadata
            const submitData = new FormData();
            submitData.append('title', formData.title);
            submitData.append('description', formData.description);
            submitData.append('category', formData.category.toString());
            submitData.append('duration', formData.duration);
            submitData.append('status', formData.status);

            if (formData.thumbnail) {
                submitData.append('thumbnail', renameFileWithUUID(formData.thumbnail));
            }
            if (formData.tv_poster) {
                submitData.append('tv_poster', renameFileWithUUID(formData.tv_poster));
            }
            if (formData.tv_landscape) {
                submitData.append('tv_landscape', renameFileWithUUID(formData.tv_landscape));
            }
            if (formData.tv_square) {
                submitData.append('tv_square', renameFileWithUUID(formData.tv_square));
            }

            let videoId = createdVideoId;

            if (!videoId) {
                const response = isEdit && id
                    ? await api.updateVideo(Number(id), submitData)
                    : await api.createVideo(submitData);

                videoId = response.data?.id || response.id;

                if (!videoId) {
                    throw new Error('Failed to create video record');
                }

                setCreatedVideoId(Number(videoId));
            }

            // Trigger Google Drive import on the backend
            await api.importVideoFromGoogleDrive(Number(videoId), googleDriveUrl.trim());

            // Start polling for import progress
            pollGoogleDriveImportStatus(Number(videoId));
        } catch (error: any) {
            setUploadError(error?.response?.data?.message || error?.message || 'Failed to start Google Drive import.');
            setUploadFailed(true);
            setGoogleDriveImporting(false);
        }
    };

    // Video player controls
    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setVideoDuration(videoRef.current.duration);
            const duration = Math.floor(videoRef.current.duration);
            const hours = Math.floor(duration / 3600);
            const minutes = Math.floor((duration % 3600) / 60);
            const seconds = duration % 60;
            const timeString = hours > 0
                ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                : `${minutes}:${seconds.toString().padStart(2, '0')}`;
            setFormData(prev => ({ ...prev, duration: timeString }));
        }
    };

    const handleSeek = (_: Event, value: number | number[]) => {
        const time = value as number;
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleVolumeChange = (_: Event, value: number | number[]) => {
        const vol = value as number;
        setVolume(vol);
        if (videoRef.current) {
            videoRef.current.volume = vol;
        }
        setIsMuted(vol === 0);
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const toggleFullscreen = () => {
        if (videoRef.current) {
            if (!isFullscreen) {
                videoRef.current.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
            setIsFullscreen(!isFullscreen);
        }
    };

    const toggleLoop = () => {
        if (videoRef.current) {
            videoRef.current.loop = !isLooping;
            setIsLooping(!isLooping);
        }
    };

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Chunked upload for large files using presigned URLs for direct R2 upload
    const uploadVideoChunked = async (file: File, videoId: number) => {
        setIsUploading(true);
        setUploadError(null);
        setUploadFailed(false);
        const chunkSize = 10 * 1024 * 1024; // 10MB chunks (was 5MB — faster uploads)
        const totalChunks = Math.ceil(file.size / chunkSize);
        const fileName = file.name;
        const maxRetries = 5; // Was 3 — more resilient for slow networks

        // Upload speed + time tracking
        const uploadStartTime = Date.now();
        let lastChunkTime = Date.now();
        let lastBytesUploaded = 0;

        const getUploadStats = (completedChunks: number, totalChunks: number) => {
            const now = Date.now();
            const elapsed = (now - uploadStartTime) / 1000; // seconds
            const completedBytes = completedChunks * chunkSize;
            const speed = elapsed > 0 ? completedBytes / elapsed : 0; // bytes/sec
            const remainingChunks = totalChunks - completedChunks;
            const remainingBytes = remainingChunks * chunkSize;
            const eta = speed > 0 ? remainingBytes / speed : 0; // seconds
            return {
                speed: speed / 1024 / 1024, // MB/s
                eta: Math.round(eta),
                completedChunks,
                totalChunks,
            };
        };

        // Helper function to upload a single chunk with retry logic
        const uploadChunkWithRetry = async (chunkIndex: number, retryCount = 0): Promise<void> => {
            const start = chunkIndex * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);

            // Always get a FRESH presigned URL for each attempt (never reuse expired URLs)
            const chunkUploadUrlResponse = await api.getChunkUploadUrl(videoId, chunkIndex, totalChunks);
            const chunkUploadUrl = chunkUploadUrlResponse.data?.upload_url;
            const requiredHeaders = chunkUploadUrlResponse.data?.required_headers || { 'Content-Type': 'application/octet-stream' };

            if (!chunkUploadUrl) {
                throw new Error(`Failed to get upload URL for chunk ${chunkIndex}`);
            }

            try {
                // Upload chunk directly to R2 using presigned URL (raw binary PUT)
                await api.directUploadVideoChunk(chunkUploadUrl, chunk, requiredHeaders);
                // Track successfully uploaded chunk locally for resume
                uploadedChunksRef.current.add(chunkIndex);
                lastChunkTime = Date.now();
                lastBytesUploaded += chunk.size;
            } catch (error: any) {
                const status = error?.response?.status;
                // Retry on transient failures
                const retryable = [502, 504, 403, 408, 429, 500].includes(status) || !status;
                if (retryable && retryCount < maxRetries) {
                    console.log(`Chunk ${chunkIndex + 1}/${totalChunks} failed (HTTP ${status}), retrying (${retryCount + 1}/${maxRetries})...`);
                    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
                    return uploadChunkWithRetry(chunkIndex, retryCount + 1);
                }
                throw error;
            }
        };

        try {
            // Check upload status to support resume (skip already-uploaded chunks)
            let chunksToUpload: number[] = [];
            try {
                const statusResponse = await api.getUploadStatus(videoId, totalChunks);
                const uploadStatus = statusResponse.data;

                if (uploadStatus?.is_complete) {
                    setUploadProgress(90);
                    chunksToUpload = [];
                } else if (uploadStatus?.missing_chunks?.length > 0) {
                    chunksToUpload = uploadStatus.missing_chunks;
                    const alreadyUploaded = uploadStatus.uploaded_count || 0;
                    const progress = Math.round((alreadyUploaded / totalChunks) * 90);
                    setUploadProgress(progress);
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
            const initialProgress = Math.round((completedCount / totalChunks) * 90);
            setUploadProgress(initialProgress);

            // Upload missing chunks with per-chunk progress
            for (const chunkIndex of chunksToUpload) {
                await uploadChunkWithRetry(chunkIndex);
                completedCount++;

                // Update progress with speed + ETA
                const progress = Math.round((completedCount / totalChunks) * 90);
                setUploadProgress(progress);

                // Update upload stats for UI
                const stats = getUploadStats(completedCount, totalChunks);
                setUploadStats?.(stats);
            }

            // Assemble chunks on the server
            setUploadProgress(95);
            await api.assembleVideoChunks(videoId, fileName);
            
            setUploadProgress(100);
            setIsUploading(false);
            uploadedChunksRef.current.clear();
            return true;
        } catch (error: any) {
            setIsUploading(false);
            setUploadFailed(true);
            setUploadError(error?.response?.data?.message || 'Failed to upload video. You can retry to resume from where it stopped.');
            return false;
        }
    };

    const handleRetryUpload = async () => {
        if (!createdVideoId || !formData.videoFile) return;
        setUploadError(null);
        setUploadFailed(false);
        const uploadSuccess = await uploadVideoChunked(formData.videoFile, createdVideoId);
        if (uploadSuccess) {
            queryClient.invalidateQueries({ queryKey: ['videos'] });
            navigate('/content/videos');
        }
    };

    const saveMutation = useMutation({
        mutationFn: (data: FormData) => {
            if (isEdit && id) {
                return api.updateVideo(Number(id), data);
            }
            return api.createVideo(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['videos'] });
            navigate('/content/videos');
        },
        onError: (error: any) => {
            setUploadError(error.message || 'Failed to save video');
        },
    });

    const handleSubmit = async () => {
        try {
            // First, create the video record with metadata (without the large video file)
            const submitData = new FormData();
            submitData.append('title', formData.title);
            submitData.append('description', formData.description);
            submitData.append('category', formData.category.toString());
            submitData.append('duration', formData.duration);
            submitData.append('status', formData.status);

            if (formData.thumbnail) {
                submitData.append('thumbnail', renameFileWithUUID(formData.thumbnail));
            }
            if (formData.tv_poster) {
                submitData.append('tv_poster', renameFileWithUUID(formData.tv_poster));
            }
            if (formData.tv_landscape) {
                submitData.append('tv_landscape', renameFileWithUUID(formData.tv_landscape));
            }
            if (formData.tv_square) {
                submitData.append('tv_square', renameFileWithUUID(formData.tv_square));
            }

            // For edit mode or if no video file, proceed normally
            if (isEdit || !formData.videoFile) {
                saveMutation.mutate(submitData);
                return;
            }

            // If we already have a video record from a previous failed upload, resume upload
            if (createdVideoId && formData.videoFile) {
                await handleRetryUpload();
                return;
            }

            // For new videos with video file, create record first
            setIsUploading(true);
            const response = await (isEdit && id 
                ? api.updateVideo(Number(id), submitData)
                : api.createVideo(submitData));

            // Get the video ID from response
            const videoId = response.data?.id || response.id;

            if (!videoId) {
                throw new Error('Failed to create video record');
            }

            setCreatedVideoId(Number(videoId));

            // Then upload the video file in chunks
            if (formData.videoFile) {
                const uploadSuccess = await uploadVideoChunked(formData.videoFile, Number(videoId));
                
                if (uploadSuccess) {
                    queryClient.invalidateQueries({ queryKey: ['videos'] });
                    navigate('/content/videos');
                } else {
                    setUploadError('Video record created but file upload failed. Please try uploading again.');
                }
            }
        } catch (error: any) {
            setIsUploading(false);
            setUploadError(error.message || 'Failed to save video');
        }
    };

    if (isLoadingVideo) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <Typography>Loading video...</Typography>
            </Box>
        );
    }

    console.log(categories)

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            {/* <WorkspaceAppbar title={isEdit ? 'Edit Video' : 'Video Studio'} subtitle={isEdit ? 'Update your video details' : 'Upload and configure your video'}>
                <IconButton
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={saveMutation.isPending || !formData.title || !formData.category}
                    startIcon={<FaSave />}
                    sx={{
                        background: 'linear-gradient(135deg, #FF7A00 0%, #FF9F40 100%)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #E66D00 0%, #FF8A20 100%)',
                        },
                    }}
                >
                    {saveMutation.isPending ? <FaSpinner /> : isEdit ? <FaSave /> : <FaCloudUploadAlt />}
                </IconButton>
            </WorkspaceAppbar> */}
            {/* Alerts Section */}
            <Box sx={{ px: 0, mb: 0 }}>
                {uploadProgress === 100 && !isUploading && (
                    <Alert severity="success" icon={<FaCheckCircle />} sx={{ mb: 1 }}>
                        Video uploaded successfully!
                    </Alert>
                )}
                {googleDriveImportProgress === 100 && !googleDriveImporting && uploadSource === 'google_drive' && (
                    <Alert severity="success" icon={<FaCheckCircle />} sx={{ mb: 1 }}>
                        Video imported from Google Drive successfully! The server is now processing it.
                    </Alert>
                )}
                {uploadError && (
                    <Alert
                        severity="error"
                        sx={{ mb: 1 }}
                        action={
                            createdVideoId && formData.videoFile && (
                                <Button
                                    color="inherit"
                                    size="small"
                                    onClick={handleRetryUpload}
                                    startIcon={<FaRedo />}
                                    disabled={isUploading}
                                >
                                    Retry Upload
                                </Button>
                            )
                        }
                    >
                        {uploadError}
                    </Alert>
                )}
                {saveMutation.isError && (
                    <Alert severity="error" sx={{ mb: 1 }}>
                        Failed to save video. Please try again.
                    </Alert>
                )}
            </Box>

            {/* Main Studio Layout */}
            <Box sx={{ flex: 1, display: 'flex', gap: 0, px: 0, pb: 3, overflow: 'hidden' }}>
                {/* Left: Canvas/Video Player */}
                <Paper
                    elevation={2}
                    sx={{
                        flex: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 0,
                        overflow: 'hidden',
                        backgroundColor: '#000',
                    }}
                >
                    {/* Video Canvas */}
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            backgroundColor: '#1a1a1a',
                            overflow: 'hidden',
                        }}
                    >
                        {!videoPreview && !formData.videoFile && !googleDriveImporting ? (
                            <Box
                                sx={{
                                    textAlign: 'center',
                                    p: 4,
                                    maxWidth: 480,
                                    width: '100%',
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 100,
                                        height: 100,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #FF7A00 0%, #FF9F40 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 20px',
                                        boxShadow: '0 8px 24px rgba(255, 122, 0, 0.3)',
                                    }}
                                >
                                    {uploadSource === 'local' ? (
                                        <FaCloudUploadAlt size={48} color="#fff" />
                                    ) : (
                                        <FaGoogleDrive size={48} color="#fff" />
                                    )}
                                </Box>
                                <Typography variant="h6" color="#fff" gutterBottom>
                                    {uploadSource === 'local' ? 'Upload from Device' : 'Import from Google Drive'}
                                </Typography>
                                <Typography variant="body2" color="#999" sx={{ mb: 3 }}>
                                    {uploadSource === 'local'
                                        ? 'Select a video file from your computer'
                                        : 'Paste a Google Drive share link and the server will download it'}
                                </Typography>

                                {/* Upload Source Toggle */}
                                <ToggleButtonGroup
                                    value={uploadSource}
                                    exclusive
                                    onChange={(_, value) => {
                                        if (value !== null) {
                                            setUploadSource(value);
                                            setUploadError(null);
                                        }
                                    }}
                                    sx={{
                                        mb: 3,
                                        '& .MuiToggleButton-root': {
                                            color: '#999',
                                            borderColor: '#444',
                                            textTransform: 'none',
                                            px: 3,
                                            py: 1,
                                            '&.Mui-selected': {
                                                color: '#fff',
                                                backgroundColor: 'rgba(255, 122, 0, 0.2)',
                                                borderColor: '#FF7A00',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(255, 122, 0, 0.3)',
                                                },
                                            },
                                            '&:hover': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            },
                                        },
                                    }}
                                >
                                    <ToggleButton value="local">
                                        <FaLaptop size={14} style={{ marginRight: 8 }} />
                                        Local File
                                    </ToggleButton>
                                    <ToggleButton value="google_drive">
                                        <FaGoogleDrive size={14} style={{ marginRight: 8 }} />
                                        Google Drive
                                    </ToggleButton>
                                </ToggleButtonGroup>

                                {uploadSource === 'local' ? (
                                    <Button
                                        variant="contained"
                                        component="label"
                                        startIcon={<FaUpload />}
                                        sx={{
                                            background: 'linear-gradient(135deg, #FF7A00 0%, #FF9F40 100%)',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #E66D00 0%, #FF8A20 100%)',
                                            },
                                        }}
                                    >
                                        Select Video
                                        <input
                                            type="file"
                                            hidden
                                            accept="video/*"
                                            onChange={handleFileChange('videoFile')}
                                        />
                                    </Button>
                                ) : (
                                    <Box sx={{ width: '100%' }}>
                                        <TextField
                                            fullWidth
                                            placeholder="https://drive.google.com/file/d/..."
                                            value={googleDriveUrl}
                                            onChange={(e) => {
                                                setGoogleDriveUrl(e.target.value);
                                                setUploadError(null);
                                            }}
                                            error={!!uploadError && uploadSource === 'google_drive'}
                                            helperText={
                                                uploadError && uploadSource === 'google_drive'
                                                    ? uploadError
                                                    : 'Paste a Google Drive share link (file must be shared as "Anyone with the link")'
                                            }
                                            InputProps={{
                                                startAdornment: (
                                                    <FaLink size={14} color="#999" style={{ marginRight: 8, flexShrink: 0 }} />
                                                ),
                                            }}
                                            sx={{
                                                mb: 2,
                                                '& .MuiOutlinedInput-root': {
                                                    color: '#fff',
                                                    '& fieldset': { borderColor: '#444' },
                                                    '&:hover fieldset': { borderColor: '#666' },
                                                    '&.Mui-focused fieldset': { borderColor: '#FF7A00' },
                                                },
                                                '& .MuiFormHelperText-root': {
                                                    color: uploadError ? undefined : '#777',
                                                },
                                            }}
                                        />
                                        <Typography variant="caption" color="#666" sx={{ display: 'block', mb: 2, textAlign: 'left' }}>
                                            Supported formats: Google Drive file links, shared links
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        ) : googleDriveImporting ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    p: 4,
                                    width: '100%',
                                    maxWidth: 420,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 100,
                                        height: 100,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #FF7A00 0%, #FF9F40 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mb: 3,
                                        boxShadow: '0 8px 24px rgba(255, 122, 0, 0.3)',
                                    }}
                                >
                                    <FaGoogleDrive size={44} color="#fff" />
                                </Box>
                                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 1 }}>
                                    Importing from Google Drive
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#aaa', mb: 3, textAlign: 'center' }}>
                                    {googleDriveImportStatus || 'Processing...'}
                                </Typography>
                                <Box sx={{ width: '100%', mb: 2 }}>
                                    <LinearProgress
                                        variant={googleDriveImportProgress > 0 ? 'determinate' : 'indeterminate'}
                                        value={googleDriveImportProgress}
                                        sx={{
                                            height: 8,
                                            borderRadius: 4,
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            '& .MuiLinearProgress-bar': {
                                                background: 'linear-gradient(135deg, #FF7A00 0%, #FF9F40 100%)',
                                                borderRadius: 4,
                                            },
                                        }}
                                    />
                                </Box>
                                <Typography variant="caption" sx={{ color: '#777' }}>
                                    {googleDriveImportProgress > 0 ? `${googleDriveImportProgress}% complete` : 'Starting...'}
                                </Typography>
                            </Box>
                        ) : googleDriveImportProgress === 100 && !googleDriveImporting ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    p: 4,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 100,
                                        height: 100,
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(76, 175, 80, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mb: 2,
                                    }}
                                >
                                    <FaCheckCircle size={44} color="#4caf50" />
                                </Box>
                                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 1 }}>
                                    Import Complete
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#aaa', mb: 3 }}>
                                    {googleDriveImportStatus}
                                </Typography>
                                <Button
                                    variant="contained"
                                    onClick={() => navigate('/content/videos')}
                                    sx={{
                                        background: 'linear-gradient(135deg, #FF7A00 0%, #FF9F40 100%)',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #E66D00 0%, #FF8A20 100%)',
                                        },
                                    }}
                                >
                                    Go to Videos
                                </Button>
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    width: '100%',
                                    maxWidth: '100%',
                                    aspectRatio: '16/9',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <video
                                    ref={videoRef}
                                    src={videoPreview && !videoPreview.endsWith('.m3u8') ? videoPreview : ''}
                                    onTimeUpdate={handleTimeUpdate}
                                    onLoadedMetadata={handleLoadedMetadata}
                                    loop={isLooping}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                    }}
                                />
                                {/* Replace/Remove Video Buttons */}
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 16,
                                        right: 16,
                                        display: 'flex',
                                        gap: 1,
                                    }}
                                >
                                    <Tooltip title="Replace Video">
                                        <IconButton
                                            component="label"
                                            sx={{
                                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                                color: '#fff',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(255, 122, 0, 0.8)',
                                                },
                                            }}
                                        >
                                            <FaUpload size={16} />
                                            <input
                                                type="file"
                                                hidden
                                                accept="video/*"
                                                onChange={handleFileChange('videoFile')}
                                            />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Remove Video">
                                        <IconButton
                                            onClick={() => handleRemoveFile('videoFile')}
                                            sx={{
                                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                                color: '#fff',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(211, 47, 47, 0.8)',
                                                },
                                            }}
                                        >
                                            <FaTrash size={16} />
                                        </IconButton>
                                    </Tooltip>
                                </Box>

                                {/* Upload Progress / Failure Overlay */}
                                {(isUploading || uploadFailed) && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: 'rgba(0, 0, 0, 0.85)',
                                            zIndex: 10,
                                        }}
                                    >
                                        {uploadFailed ? (
                                            <>
                                                <Box
                                                    sx={{
                                                        width: 100,
                                                        height: 100,
                                                        borderRadius: '50%',
                                                        backgroundColor: 'rgba(211, 47, 47, 0.15)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        mb: 2,
                                                    }}
                                                >
                                                    <FaExclamationTriangle size={40} color="#f44336" />
                                                </Box>
                                                <Typography
                                                    variant="h6"
                                                    sx={{ color: '#fff', fontWeight: 600, mb: 1 }}
                                                >
                                                    Upload Failed
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ color: '#aaa', mb: 3, textAlign: 'center', maxWidth: 320 }}
                                                >
                                                    {uploadProgress > 0
                                                        ? `Stopped at ${uploadProgress}%. Your progress is saved — retry will resume from where it left off.`
                                                        : 'Something went wrong. You can retry the upload.'}
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 2 }}>
                                                    <Button
                                                        variant="contained"
                                                        startIcon={<FaRedo />}
                                                        onClick={handleRetryUpload}
                                                        sx={{
                                                            background: 'linear-gradient(135deg, #FF7A00 0%, #FF9F40 100%)',
                                                            '&:hover': {
                                                                background: 'linear-gradient(135deg, #E66D00 0%, #FF8A20 100%)',
                                                            },
                                                        }}
                                                    >
                                                        Retry Upload
                                                    </Button>
                                                    <Button
                                                        variant="outlined"
                                                        onClick={() => {
                                                            setUploadFailed(false);
                                                            setUploadError(null);
                                                        }}
                                                        sx={{
                                                            color: '#aaa',
                                                            borderColor: '#555',
                                                            '&:hover': {
                                                                borderColor: '#888',
                                                                backgroundColor: 'rgba(255,255,255,0.05)',
                                                            },
                                                        }}
                                                    >
                                                        Dismiss
                                                    </Button>
                                                </Box>
                                            </>
                                        ) : (
                                            <>
                                                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                                    <CircularProgress
                                                        variant="determinate"
                                                        value={uploadProgress}
                                                        size={120}
                                                        thickness={4}
                                                        sx={{
                                                            color: '#FF7A00',
                                                        }}
                                                    />
                                                    <Box
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            bottom: 0,
                                                            right: 0,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="h4"
                                                            component="div"
                                                            sx={{ color: '#fff', fontWeight: 700 }}
                                                        >
                                                            {uploadProgress}%
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Typography
                                                    variant="body1"
                                                    sx={{ color: '#fff', mt: 3, fontWeight: 500 }}
                                                >
                                                    {uploadProgress < 100 ? 'Uploading video...' : 'Finalizing upload...'}
                                                </Typography>
                                                {uploadStats && uploadProgress < 100 && (
                                                    <Box sx={{ mt: 1, textAlign: 'center' }}>
                                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                                            Chunk {uploadStats.completedChunks}/{uploadStats.totalChunks} | {' '}
                                                            {uploadStats.speed > 0 ? `${uploadStats.speed.toFixed(1)} MB/s` : 'Calculating...'} | {' '}
                                                            {uploadStats.eta > 0 ? `~${uploadStats.eta}s remaining` : ''}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>

                    {/* Video Controls - Always Visible */}
                    <Box sx={{ backgroundColor: '#2a2a2a', p: 2, minHeight: 120 }}>
                        {(videoPreview || formData.videoFile) ? (
                            <>
                                {/* Timeline */}
                                <Box sx={{ mb: 2 }}>
                                    <Slider
                                        value={currentTime}
                                        max={videoDuration || 100}
                                        onChange={handleSeek}
                                        sx={{
                                            color: '#FF7A00',
                                            '& .MuiSlider-thumb': {
                                                width: 12,
                                                height: 12,
                                            },
                                            '& .MuiSlider-rail': {
                                                backgroundColor: '#555',
                                            },
                                        }}
                                    />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                        <Typography variant="caption" color="#999">
                                            {formatTime(currentTime)}
                                        </Typography>
                                        <Typography variant="caption" color="#999">
                                            {formatTime(videoDuration)}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Player Controls */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
                                        <IconButton
                                            onClick={togglePlay}
                                            sx={{
                                                color: '#FF7A00',
                                                '&:hover': { backgroundColor: 'rgba(255, 122, 0, 0.1)' },
                                            }}
                                        >
                                            {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} />}
                                        </IconButton>
                                    </Tooltip>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                                        <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
                                            <IconButton
                                                onClick={toggleMute}
                                                sx={{
                                                    color: '#fff',
                                                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                                                }}
                                            >
                                                {isMuted ? <FaVolumeMute size={18} /> : <FaVolumeUp size={18} />}
                                            </IconButton>
                                        </Tooltip>
                                        <Slider
                                            value={isMuted ? 0 : volume}
                                            max={1}
                                            step={0.1}
                                            onChange={handleVolumeChange}
                                            sx={{
                                                width: 100,
                                                color: '#fff',
                                                '& .MuiSlider-thumb': {
                                                    width: 10,
                                                    height: 10,
                                                },
                                            }}
                                        />
                                    </Box>

                                    <Tooltip title={isLooping ? 'Disable Loop' : 'Enable Loop'}>
                                        <IconButton
                                            onClick={toggleLoop}
                                            sx={{
                                                color: isLooping ? '#FF7A00' : '#fff',
                                                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                                            }}
                                        >
                                            <FaRedo size={16} />
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Fullscreen">
                                        <IconButton
                                            onClick={toggleFullscreen}
                                            sx={{
                                                color: '#fff',
                                                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                                            }}
                                        >
                                            {isFullscreen ? <FaCompress size={16} /> : <FaExpand size={16} />}
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <Typography variant="body2" color="#666">
                                    Upload a video to see controls
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Paper>

                {/* Right: Attributes Panel */}
                <Paper
                    elevation={2}
                    sx={{
                        flex: 1,
                        borderRadius: 0,
                        overflow: 'auto',
                        maxHeight: '100%',
                    }}
                >
                    <Box sx={{ p: 3 }}>
                        <div className="d-flex justify-content-between align-items-center">
                            <Typography variant="h6" fontWeight={600} gutterBottom>
                                Video Details
                            </Typography>
                            <Button
                                variant="contained"
                                onClick={uploadSource === 'google_drive' && !isEdit ? handleGoogleDriveSubmit : handleSubmit}
                                disabled={
                                    saveMutation.isPending
                                    || !formData.title
                                    || !formData.category
                                    || googleDriveImporting
                                    || (uploadSource === 'google_drive' && !isEdit && !googleDriveUrl)
                                }
                                startIcon={
                                    saveMutation.isPending || googleDriveImporting
                                        ? <FaSpinner />
                                        : isEdit
                                            ? <FaSave />
                                            : uploadSource === 'google_drive'
                                                ? <FaGoogleDrive />
                                                : <FaCloudUploadAlt />
                                }
                                sx={{
                                    background: 'linear-gradient(135deg, #FF7A00 0%, #FF9F40 100%)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #E66D00 0%, #FF8A20 100%)',
                                    },
                                }}
                            >
                                {saveMutation.isPending
                                    ? 'Saving...'
                                    : googleDriveImporting
                                        ? 'Importing...'
                                        : isEdit
                                            ? 'Save Changes'
                                            : uploadSource === 'google_drive'
                                                ? 'Import from Drive'
                                                : 'Upload Video'}
                            </Button>
                        </div>
                        <Divider sx={{ mb: 3 }} />

                        <Stack spacing={3}>
                            {/* Thumbnail Upload */}
                            <Box>
                                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                                    Thumbnail
                                </Typography>
                                {!thumbnailPreview ? (
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            width: '100%',
                                            aspectRatio: '16/9',
                                            border: '2px dashed',
                                            borderColor: 'divider',
                                            borderRadius: 2,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                borderColor: '#FF7A00',
                                                backgroundColor: 'rgba(255, 122, 0, 0.05)',
                                            },
                                        }}
                                    >
                                        <FaImage size={32} color="#999" />
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                                            Upload thumbnail
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            component="label"
                                            size="small"
                                            startIcon={<FaUpload />}
                                        >
                                            Browse
                                            <input
                                                type="file"
                                                hidden
                                                accept="image/*"
                                                onChange={handleFileChange('thumbnail')}
                                            />
                                        </Button>
                                    </Paper>
                                ) : (
                                    <Box
                                        sx={{
                                            position: 'relative',
                                            width: '100%',
                                            aspectRatio: '16/9',
                                            borderRadius: 2,
                                            overflow: 'hidden',
                                            backgroundColor: '#000',
                                        }}
                                    >
                                        <img
                                            src={thumbnailPreview}
                                            alt="Thumbnail"
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                display: 'block',
                                            }}
                                        />
                                        <IconButton
                                            onClick={() => handleRemoveFile('thumbnail')}
                                            sx={{
                                                position: 'absolute',
                                                top: 8,
                                                right: 8,
                                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                                color: '#fff',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(211, 47, 47, 0.8)',
                                                },
                                            }}
                                        >
                                            <FaTrash size={14} />
                                        </IconButton>
                                    </Box>
                                )}
                            </Box>

                            {/* TV Poster */}
                            <Box>
                                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                                    TV Poster <Typography variant="caption" color="text.secondary">(1080x1350 recommended)</Typography>
                                </Typography>
                                {!tvPosterPreview ? (
                                    <Paper elevation={0} sx={{ width: '100%', aspectRatio: '4/5', border: '2px dashed', borderColor: 'divider', borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { borderColor: '#FF7A00', backgroundColor: 'rgba(255, 122, 0, 0.05)' } }}>
                                        <FaImage size={32} color="#999" />
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                                            Upload TV poster
                                        </Typography>
                                        <Button variant="outlined" component="label" size="small" startIcon={<FaUpload />}>
                                            Browse
                                            <input type="file" hidden accept="image/*" onChange={handleFileChange('tv_poster')} />
                                        </Button>
                                    </Paper>
                                ) : (
                                    <Box sx={{ position: 'relative', width: '100%', aspectRatio: '4/5', borderRadius: 2, overflow: 'hidden', backgroundColor: '#000' }}>
                                        <img src={tvPosterPreview} alt="TV Poster" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                        <IconButton onClick={() => handleRemoveFile('tv_poster')} sx={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0, 0, 0, 0.6)', color: '#fff', '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.8)' } }}>
                                            <FaTrash size={14} />
                                        </IconButton>
                                    </Box>
                                )}
                            </Box>

                            {/* TV Landscape/Banner */}
                            <Box>
                                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                                    TV Landscape / Banner <Typography variant="caption" color="text.secondary">(1280x720 recommended)</Typography>
                                </Typography>
                                {!tvLandscapePreview ? (
                                    <Paper elevation={0} sx={{ width: '100%', aspectRatio: '16/9', border: '2px dashed', borderColor: 'divider', borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { borderColor: '#FF7A00', backgroundColor: 'rgba(255, 122, 0, 0.05)' } }}>
                                        <FaImage size={32} color="#999" />
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                                            Upload TV landscape
                                        </Typography>
                                        <Button variant="outlined" component="label" size="small" startIcon={<FaUpload />}>
                                            Browse
                                            <input type="file" hidden accept="image/*" onChange={handleFileChange('tv_landscape')} />
                                        </Button>
                                    </Paper>
                                ) : (
                                    <Box sx={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 2, overflow: 'hidden', backgroundColor: '#000' }}>
                                        <img src={tvLandscapePreview} alt="TV Landscape" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                        <IconButton onClick={() => handleRemoveFile('tv_landscape')} sx={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0, 0, 0, 0.6)', color: '#fff', '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.8)' } }}>
                                            <FaTrash size={14} />
                                        </IconButton>
                                    </Box>
                                )}
                            </Box>

                            {/* TV Square */}
                            <Box>
                                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                                    TV Square <Typography variant="caption" color="text.secondary">(540x540 recommended)</Typography>
                                </Typography>
                                {!tvSquarePreview ? (
                                    <Paper elevation={0} sx={{ width: '100%', aspectRatio: '1/1', border: '2px dashed', borderColor: 'divider', borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { borderColor: '#FF7A00', backgroundColor: 'rgba(255, 122, 0, 0.05)' } }}>
                                        <FaImage size={32} color="#999" />
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                                            Upload TV square
                                        </Typography>
                                        <Button variant="outlined" component="label" size="small" startIcon={<FaUpload />}>
                                            Browse
                                            <input type="file" hidden accept="image/*" onChange={handleFileChange('tv_square')} />
                                        </Button>
                                    </Paper>
                                ) : (
                                    <Box sx={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 2, overflow: 'hidden', backgroundColor: '#000' }}>
                                        <img src={tvSquarePreview} alt="TV Square" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                        <IconButton onClick={() => handleRemoveFile('tv_square')} sx={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0, 0, 0, 0.6)', color: '#fff', '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.8)' } }}>
                                            <FaTrash size={14} />
                                        </IconButton>
                                    </Box>
                                )}
                            </Box>

                            {/* Title */}
                            <TextField
                                label="Title"
                                fullWidth
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter video title"
                            />

                            {/* Description */}
                            <TextField
                                label="Description"
                                fullWidth
                                multiline
                                rows={4}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe your video"
                            />

                            {/* Category */}
                            <FormControl fullWidth required>
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={formData.category}
                                    label="Category"
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {categories.map((cat: any) => (
                                        <MenuItem key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {/* Duration */}
                            <TextField
                                label="Duration"
                                fullWidth
                                value={formData.duration}
                                InputProps={{
                                    readOnly: true,
                                }}
                                helperText="Auto-detected from video"
                            />

                            {/* Status */}
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={formData.status}
                                    label="Status"
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <MenuItem value="draft">Draft</MenuItem>
                                    <MenuItem value="published">Published</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
