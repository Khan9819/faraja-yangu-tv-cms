import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Avatar,
    Chip,
    IconButton,
    Tooltip,
    Slider,
    Skeleton,
    Divider,
    TextField,
    Collapse,
    CircularProgress,
} from '@mui/material';
import {
    FaPlay,
    FaPause,
    FaVolumeUp,
    FaVolumeMute,
    FaExpand,
    FaCompress,
    FaRedo,
    FaEdit,
    FaHeart,
    FaThumbsDown,
    FaBookmark,
    FaDownload,
    FaShareAlt,
    FaEye,
    FaComment,
    FaClock,
    FaReply,
    FaTrash,
    FaChevronDown,
    FaChevronUp,
} from 'react-icons/fa';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useAPI from '../../../hooks/useAPI';
import { PageHeader } from '../../../components/page-header';
import { WorkspaceContainer } from '../../../components/workspace-container';
import Hls from 'hls.js';
import { timeAgo, formatDate } from '../../../utils/dateUtils';

export default function VideoPreview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const api = useAPI();
    const queryClient = useQueryClient();
    const videoRef = useRef<HTMLVideoElement>(null);

    // Comment interaction state
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [replyText, setReplyText] = useState('');
    const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());

    // Player state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLooping, setIsLooping] = useState(false);

    // Fetch video details
    const { data: videoResponse, isLoading: isVideoLoading } = useQuery({
        queryKey: ['video', id],
        queryFn: () => api.getVideoById(Number(id)),
        enabled: !!id,
    });

    const video = videoResponse?.data;

    // Fetch HLS stream URL
    const videoUid = video?.uid;
    const { data: streamResponse } = useQuery({
        queryKey: ['video-stream', videoUid],
        queryFn: () => api.getVideoStreamUrl(videoUid as string),
        enabled: !!videoUid,
    });

    const streamUrl = streamResponse?.data?.stream_url ?? null;

    // Fetch comments
    const { data: commentsResponse, isLoading: isCommentsLoading } = useQuery({
        queryKey: ['video-comments', id],
        queryFn: () => api.getVideoComments(Number(id), { page_size: 50 }),
        enabled: !!id,
    });

    const comments = commentsResponse?.data ?? [];

    // Mutations
    const replyMutation = useMutation({
        mutationFn: ({ commentId, text }: { commentId: number; text: string }) => api.replyToComment(commentId, text),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['video-comments', id] });
            setReplyText('');
            setReplyingTo(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (commentId: number) => api.deleteComment(commentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['video-comments', id] });
        },
    });

    // Fetch viewers
    const { data: viewersResponse, isLoading: isViewersLoading } = useQuery({
        queryKey: ['video-viewers', id],
        queryFn: () => api.getVideoViewers(Number(id), { page_size: 50 }),
        enabled: !!id,
    });

    const viewers = viewersResponse?.data ?? [];

    // Fetch interactions summary
    const { data: interactionsResponse, isLoading: isInteractionsLoading } = useQuery({
        queryKey: ['video-interactions', id],
        queryFn: () => api.getVideoInteractions(Number(id)),
        enabled: !!id,
    });

    const interactions = interactionsResponse?.data ?? {};

    // Initialize HLS playback
    useEffect(() => {
        if (!videoRef.current) return;

        const videoEl = videoRef.current;
        const src = streamUrl || video?.video;
        if (!src) return;

        const isHls = typeof src === 'string' && src.endsWith('.m3u8');
        let hls: Hls | null = null;

        if (isHls) {
            if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
                videoEl.src = src;
            } else if (Hls.isSupported()) {
                hls = new Hls();
                hls.loadSource(src);
                hls.attachMedia(videoEl);
            }
        } else if (src) {
            videoEl.src = src;
        }

        return () => {
            if (hls) hls.destroy();
        };
    }, [streamUrl, video?.video]);

    // Player controls
    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) videoRef.current.pause();
        else videoRef.current.play();
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) setVideoDuration(videoRef.current.duration);
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
        if (videoRef.current) videoRef.current.volume = vol;
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
            if (!isFullscreen) videoRef.current.requestFullscreen();
            else document.exitFullscreen();
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
        if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const interactionItems = [
        { icon: <FaHeart size={14} />, label: 'Likes', value: interactions.likes_count ?? video?.likes_count ?? 0, color: '#e91e63' },
        { icon: <FaThumbsDown size={14} />, label: 'Dislikes', value: interactions.dislikes_count ?? 0, color: '#9e9e9e' },
        { icon: <FaBookmark size={14} />, label: 'Saved', value: interactions.saves_count ?? 0, color: '#ff9800' },
        { icon: <FaDownload size={14} />, label: 'Downloads', value: interactions.downloads_count ?? 0, color: '#2196f3' },
        { icon: <FaShareAlt size={14} />, label: 'Shares', value: interactions.shares_count ?? 0, color: '#4caf50' },
        { icon: <FaEye size={14} />, label: 'Views', value: interactions.views_count ?? video?.views_count ?? 0, color: '#FF7A00' },
        { icon: <FaComment size={14} />, label: 'Comments', value: interactions.comments_count ?? comments.length ?? 0, color: '#9c27b0' },
    ];

    if (isVideoLoading) {
        return (
            <div>
                <PageHeader title="Loading..." subtitle="Fetching video details" />
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Skeleton variant="rounded" width="65%" height={400} />
                    <Skeleton variant="rounded" width="35%" height={400} />
                </Box>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title={video?.title ?? 'Video Preview'}
                subtitle={video?.category_name ? `${video.category_name} · ${video?.duration?.slice(0, 8) ?? ''}` : 'Video playback and engagement details'}
                breadcrumbs={[
                    { label: 'Content', path: '/content/videos' },
                    { label: 'Videos', path: '/content/videos' },
                    { label: video?.title ?? 'Preview' },
                ]}
                actions={
                    <Tooltip title="Edit Video">
                        <IconButton
                            size="small"
                            onClick={() => navigate(`/content/videos/${id}/edit`)}
                            sx={{ color: 'var(--text-dimmer)', '&:hover': { color: 'var(--primary-color)' } }}
                        >
                            <FaEdit size={16} />
                        </IconButton>
                    </Tooltip>
                }
            />

            {/* Interaction Stats Bar */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                {isInteractionsLoading
                    ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} variant="rounded" width={100} height={32} />)
                    : interactionItems.map((item) => (
                        <Chip
                            key={item.label}
                            icon={<span style={{ color: item.color, display: 'flex', alignItems: 'center' }}>{item.icon}</span>}
                            label={`${item.value.toLocaleString()} ${item.label}`}
                            size="small"
                            variant="outlined"
                            sx={{
                                fontSize: '0.75rem',
                                borderColor: 'var(--border-color)',
                                '& .MuiChip-label': { fontWeight: 500 },
                            }}
                        />
                    ))
                }
            </Box>

            {/* Main Layout: Player (left) + Comments (right) */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
                {/* Video Player */}
                <Box sx={{ flex: 2, minWidth: 0 }}>
                    <Box
                        sx={{
                            backgroundColor: '#000',
                            borderRadius: 2,
                            overflow: 'hidden',
                            border: '1px solid var(--border-color)',
                        }}
                    >
                        {/* Video Element */}
                        <Box sx={{ width: '100%', aspectRatio: '16/9', position: 'relative', backgroundColor: '#1a1a1a' }}>
                            <video
                                ref={videoRef}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                loop={isLooping}
                                poster={video?.thumbnail}
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                            {!isPlaying && (
                                <Box
                                    onClick={togglePlay}
                                    sx={{
                                        position: 'absolute',
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        '&:hover .play-btn': { transform: 'scale(1.1)' },
                                    }}
                                >
                                    <Box
                                        className="play-btn"
                                        sx={{
                                            width: 64, height: 64, borderRadius: '50%',
                                            background: 'rgba(255, 122, 0, 0.85)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'transform 0.2s',
                                            boxShadow: '0 4px 20px rgba(255,122,0,0.4)',
                                        }}
                                    >
                                        <FaPlay size={22} color="#fff" style={{ marginLeft: 3 }} />
                                    </Box>
                                </Box>
                            )}
                        </Box>

                        {/* Player Controls */}
                        <Box sx={{ backgroundColor: '#2a2a2a', px: 2, py: 1.5 }}>
                            <Slider
                                value={currentTime}
                                max={videoDuration || 100}
                                onChange={handleSeek}
                                sx={{
                                    color: '#FF7A00',
                                    height: 4,
                                    p: 0,
                                    mb: 1,
                                    '& .MuiSlider-thumb': { width: 12, height: 12 },
                                    '& .MuiSlider-rail': { backgroundColor: '#555' },
                                }}
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconButton onClick={togglePlay} sx={{ color: '#FF7A00', p: 0.5 }}>
                                        {isPlaying ? <FaPause size={16} /> : <FaPlay size={16} />}
                                    </IconButton>
                                    <Typography variant="caption" sx={{ color: '#999', fontSize: '0.7rem' }}>
                                        {formatTime(currentTime)} / {formatTime(videoDuration)}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <IconButton onClick={toggleMute} sx={{ color: '#fff', p: 0.5 }}>
                                        {isMuted ? <FaVolumeMute size={14} /> : <FaVolumeUp size={14} />}
                                    </IconButton>
                                    <Slider
                                        value={isMuted ? 0 : volume}
                                        max={1} step={0.1}
                                        onChange={handleVolumeChange}
                                        sx={{ width: 70, color: '#fff', '& .MuiSlider-thumb': { width: 10, height: 10 } }}
                                    />
                                    <IconButton onClick={toggleLoop} sx={{ color: isLooping ? '#FF7A00' : '#fff', p: 0.5 }}>
                                        <FaRedo size={12} />
                                    </IconButton>
                                    <IconButton onClick={toggleFullscreen} sx={{ color: '#fff', p: 0.5 }}>
                                        {isFullscreen ? <FaCompress size={12} /> : <FaExpand size={12} />}
                                    </IconButton>
                                </Box>
                            </Box>
                        </Box>
                    </Box>

                    {/* Video Details */}
                    <WorkspaceContainer>
                        <Box sx={{ py: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Description</Typography>
                            <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', lineHeight: 1.6 }}>
                                {video?.description || 'No description available.'}
                            </Typography>
                            <Divider sx={{ my: 1.5 }} />
                            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'var(--text-dimmer)' }}>Status</Typography>
                                    <Box>
                                        <Chip label={video?.is_published ? 'Published' : 'Draft'} size="small" color={video?.is_published ? 'success' : 'default'} sx={{ mt: 0.5 }} />
                                    </Box>
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'var(--text-dimmer)' }}>Processing</Typography>
                                    <Box>
                                        <Chip label={video?.processing_status ?? 'N/A'} size="small" sx={{ mt: 0.5, textTransform: 'capitalize' }} />
                                    </Box>
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'var(--text-dimmer)' }}>Uploaded</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem', mt: 0.5 }}>
                                        {video?.created_at ? formatDate(video.created_at, 'long') : 'N/A'}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'var(--text-dimmer)' }}>Duration</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem', mt: 0.5 }}>
                                        {video?.duration?.slice(0, 8) ?? 'N/A'}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    </WorkspaceContainer>
                </Box>

                {/* Comments Panel (Right Side) */}
                <Box sx={{ flex: 1, minWidth: 280, maxWidth: 380 }}>
                    <WorkspaceContainer>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                <FaComment size={12} style={{ marginRight: 6 }} />
                                Comments
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'var(--text-dimmer)' }}>
                                {comments.length}
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 500, overflowY: 'auto', pr: 0.5 }}>
                            {isCommentsLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <Box key={i} sx={{ display: 'flex', gap: 1 }}>
                                        <Skeleton variant="circular" width={28} height={28} />
                                        <Box sx={{ flex: 1 }}>
                                            <Skeleton variant="text" width="60%" />
                                            <Skeleton variant="text" width="100%" />
                                        </Box>
                                    </Box>
                                ))
                            ) : comments.length === 0 ? (
                                <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', textAlign: 'center', py: 4 }}>
                                    No comments yet
                                </Typography>
                            ) : (
                                comments.map((comment: any) => (
                                    <Box
                                        key={comment.id}
                                        sx={{
                                            p: 1,
                                            borderRadius: 1.5,
                                            border: '1px solid var(--border-color)',
                                            '&:hover': { backgroundColor: 'rgba(255,122,0,0.03)' },
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Avatar
                                                src={comment.user_avatar}
                                                sx={{ width: 28, height: 28, fontSize: '0.65rem', backgroundColor: 'var(--primary-color)' }}
                                            >
                                                {(comment.user_name ?? comment.username ?? 'U')[0]}
                                            </Avatar>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>
                                                        {comment.user_name ?? comment.username ?? 'User'}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', fontSize: '0.62rem' }}>
                                                        {comment.created_at ? timeAgo(comment.created_at) : ''}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                                                    {comment.text}
                                                </Typography>
                                                {/* Action buttons */}
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                    <Tooltip title="Reply">
                                                        <IconButton size="small" onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(''); }} sx={{ p: 0.3 }}>
                                                            <FaReply size={10} color="var(--text-dimmer)" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton size="small" onClick={() => deleteMutation.mutate(comment.id)} sx={{ p: 0.3 }}>
                                                            <FaTrash size={10} color="var(--text-dimmer)" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    {(comment.replies_count > 0) && (
                                                        <Typography
                                                            variant="caption"
                                                            onClick={() => {
                                                                setExpandedReplies(prev => {
                                                                    const next = new Set(prev);
                                                                    next.has(comment.id) ? next.delete(comment.id) : next.add(comment.id);
                                                                    return next;
                                                                });
                                                            }}
                                                            sx={{ fontSize: '0.62rem', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.3 }}
                                                        >
                                                            {expandedReplies.has(comment.id) ? <FaChevronUp size={8} /> : <FaChevronDown size={8} />}
                                                            {comment.replies_count} {comment.replies_count === 1 ? 'reply' : 'replies'}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        </Box>

                                        {/* Reply input */}
                                        <Collapse in={replyingTo === comment.id}>
                                            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, ml: 4.5 }}>
                                                <TextField
                                                    size="small"
                                                    fullWidth
                                                    placeholder="Write a reply..."
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey && replyText.trim()) {
                                                            e.preventDefault();
                                                            replyMutation.mutate({ commentId: comment.id, text: replyText.trim() });
                                                        }
                                                    }}
                                                    sx={{ '& .MuiInputBase-input': { fontSize: '0.72rem', py: 0.8 } }}
                                                />
                                                <IconButton
                                                    size="small"
                                                    disabled={!replyText.trim() || replyMutation.isPending}
                                                    onClick={() => replyMutation.mutate({ commentId: comment.id, text: replyText.trim() })}
                                                    sx={{ color: 'var(--primary-color)' }}
                                                >
                                                    {replyMutation.isPending ? <CircularProgress size={14} /> : <FaReply size={12} />}
                                                </IconButton>
                                            </Box>
                                        </Collapse>

                                        {/* Replies list */}
                                        <Collapse in={expandedReplies.has(comment.id)}>
                                            <Box sx={{ ml: 4.5, mt: 1, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                                                {(comment.replies ?? []).map((reply: any) => (
                                                    <Box key={reply.id} sx={{ display: 'flex', gap: 0.8, p: 0.8, borderRadius: 1, backgroundColor: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)' }}>
                                                        <Avatar
                                                            src={reply.user_avatar}
                                                            sx={{ width: 22, height: 22, fontSize: '0.55rem', backgroundColor: 'var(--primary-color)' }}
                                                        >
                                                            {(reply.user_name ?? 'U')[0]}
                                                        </Avatar>
                                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.65rem' }}>
                                                                    {reply.user_name ?? 'User'}
                                                                </Typography>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                    <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', fontSize: '0.58rem' }}>
                                                                        {reply.created_at ? timeAgo(reply.created_at) : ''}
                                                                    </Typography>
                                                                    <Tooltip title="Delete reply">
                                                                        <IconButton size="small" onClick={() => deleteMutation.mutate(reply.id)} sx={{ p: 0.2 }}>
                                                                            <FaTrash size={8} color="var(--text-dimmer)" />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                </Box>
                                                            </Box>
                                                            <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', fontSize: '0.65rem', lineHeight: 1.4, wordBreak: 'break-word' }}>
                                                                {reply.text}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Box>
                                        </Collapse>
                                    </Box>
                                ))
                            )}
                        </Box>
                    </WorkspaceContainer>
                </Box>
            </Box>

            {/* Viewers Section (Bottom) */}
            <WorkspaceContainer>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        <FaEye size={12} style={{ marginRight: 6 }} />
                        Viewers
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-dimmer)' }}>
                        {viewers.length} viewers
                    </Typography>
                </Box>

                {isViewersLoading ? (
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} variant="rounded" width={220} height={56} sx={{ borderRadius: 2 }} />
                        ))}
                    </Box>
                ) : viewers.length === 0 ? (
                    <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', textAlign: 'center', display: 'block', py: 3 }}>
                        No viewers recorded yet
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        {viewers.map((viewer: any) => (
                            <Box
                                key={viewer.id ?? viewer.user_id}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    p: 1,
                                    pr: 1.5,
                                    borderRadius: 2,
                                    border: '1px solid var(--border-color)',
                                    minWidth: 200,
                                }}
                            >
                                <Avatar
                                    src={viewer.avatar ?? viewer.user_avatar}
                                    sx={{ width: 32, height: 32, fontSize: '0.7rem', backgroundColor: 'var(--primary-color)' }}
                                >
                                    {(viewer.full_name ?? viewer.user_name ?? viewer.username ?? 'U')[0]}
                                </Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem', display: 'block' }}>
                                        {viewer.full_name ?? viewer.user_name ?? viewer.username ?? 'Unknown'}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', fontSize: '0.62rem' }}>
                                            <FaClock size={8} style={{ marginRight: 3 }} />
                                            {viewer.watched_at ? timeAgo(viewer.watched_at) : viewer.last_watched ? timeAgo(viewer.last_watched) : ''}
                                        </Typography>
                                        {/* Show user interactions with this video */}
                                        {viewer.liked && (
                                            <Tooltip title="Liked">
                                                <span><FaHeart size={9} color="#e91e63" /></span>
                                            </Tooltip>
                                        )}
                                        {viewer.disliked && (
                                            <Tooltip title="Disliked">
                                                <span><FaThumbsDown size={9} color="#9e9e9e" /></span>
                                            </Tooltip>
                                        )}
                                        {viewer.saved && (
                                            <Tooltip title="Saved">
                                                <span><FaBookmark size={9} color="#ff9800" /></span>
                                            </Tooltip>
                                        )}
                                        {viewer.downloaded && (
                                            <Tooltip title="Downloaded">
                                                <span><FaDownload size={9} color="#2196f3" /></span>
                                            </Tooltip>
                                        )}
                                        {viewer.shared && (
                                            <Tooltip title="Shared">
                                                <span><FaShareAlt size={9} color="#4caf50" /></span>
                                            </Tooltip>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )}
            </WorkspaceContainer>
        </div>
    );
}
