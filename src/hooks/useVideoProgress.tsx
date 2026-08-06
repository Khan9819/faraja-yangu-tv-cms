import { useEffect, useRef, useState, useCallback } from 'react';
import useAuth from './useAuth';
import API from '../services/api.services';

const apiServices = new API();

interface VariantProgress {
    name: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    message: string;
}

interface VideoProgressData {
    type: 'connection' | 'progress' | 'complete' | 'error';
    stage?: string;
    progress?: number;
    message?: string;
    status?: string;
    video_id?: number;
    hls_path?: string;
    error?: string;
    variants?: Record<string, VariantProgress>;
}

interface VideoProgressState {
    stage: string;
    progress: number;
    message: string;
    status: 'pending' | 'connected' | 'processing' | 'completed' | 'failed' | 'error';
    variants?: Record<string, VariantProgress>;
}

interface UseVideoProgressReturn {
    progressMap: Record<number, VideoProgressState>;
    connectToVideo: (videoId: number) => void;
    disconnectFromVideo: (videoId: number) => void;
    activeConnections: number[];
    resetRetries: () => void;
}

const MAX_CONNECTIONS = 5;
const MAX_RETRIES = 3;

export default function useVideoProgress(
    videoIds: number[],
    onComplete?: (videoId: number) => void
): UseVideoProgressReturn {
    const { auth }: any = useAuth();
    const [progressMap, setProgressMap] = useState<Record<number, VideoProgressState>>({});
    const wsRefs = useRef<Record<number, WebSocket>>({});
    const [activeConnections, setActiveConnections] = useState<number[]>([]);
    const retryCountRef = useRef<Record<number, number>>({});
    const pollTimers = useRef<Record<number, NodeJS.Timeout>>({});
    const retryTimers = useRef<Record<number, NodeJS.Timeout>>({});
    const completedRef = useRef<Set<number>>(new Set());

    const socketHost = apiServices.socketHost;

    const updateProgress = useCallback((videoId: number, data: Partial<VideoProgressState>) => {
        setProgressMap(prev => ({
            ...prev,
            [videoId]: {
                ...prev[videoId],
                ...data,
            },
        }));
    }, []);

    const connectToVideo = useCallback((videoId: number) => {
        if (wsRefs.current[videoId]) {
            return;
        }

        // Never re-connect or reset a video that already completed
        if (completedRef.current.has(videoId)) {
            return;
        }

        if (activeConnections.length >= MAX_CONNECTIONS) {
            return;
        }

        // Check retry limit
        const currentRetries = retryCountRef.current[videoId] || 0;
        if (currentRetries >= MAX_RETRIES) {
            console.log(`Video ${videoId} has reached max retries (${MAX_RETRIES})`);
            return;
        }

        const token = auth?.access_token;
        if (!token) {
            console.warn('No access token available for WebSocket connection');
            return;
        }

        // Increment retry count
        retryCountRef.current[videoId] = currentRetries + 1;

        const wsUrl = `${socketHost}/socket/stream/progress/${videoId}/?token=${token}`;
        const ws = new WebSocket(wsUrl);
        wsRefs.current[videoId] = ws;

        setActiveConnections(prev => [...prev, videoId]);
        // Preserve existing progress — don't reset to 0 (prevents the indicator
        // jumping back on reconnect, which read as "flicker").
        updateProgress(videoId, {
            stage: '',
            message: 'Connecting...',
            status: 'pending',
        });

        ws.onopen = () => {
            console.log(`WebSocket connected for video ${videoId}`);
        };

        ws.onmessage = (event) => {
            try {
                const data: VideoProgressData = JSON.parse(event.data);

                switch (data.type) {
                    case 'connection':
                        updateProgress(videoId, {
                            status: 'connected',
                            message: data.message || 'Connected',
                        });
                        break;

                    case 'progress':
                        updateProgress(videoId, {
                            stage: data.stage || '',
                            progress: data.progress || 0,
                            message: data.message || '',
                            status: 'processing',
                            variants: data.variants,
                        });
                        break;

                    case 'complete':
                        updateProgress(videoId, {
                            status: 'completed',
                            progress: 100,
                            message: data.message || 'Completed',
                        });
                        completedRef.current.add(videoId);
                        ws.close();
                        if (onComplete) {
                            onComplete(videoId);
                        }
                        break;

                    case 'error':
                        updateProgress(videoId, {
                            status: 'failed',
                            message: data.message || 'Processing failed',
                        });
                        ws.close();
                        break;
                }
            } catch (e) {
                console.error('Failed to parse WebSocket message:', e);
            }
        };

        ws.onerror = (error) => {
            console.error(`WebSocket error for video ${videoId}:`, error);
            updateProgress(videoId, {
                status: 'error',
                message: 'Connection error',
            });
        };

        ws.onclose = (event) => {
            delete wsRefs.current[videoId];
            setActiveConnections(prev => prev.filter(id => id !== videoId));

            // Never overwrite a completed video with an error state
            if (completedRef.current.has(videoId)) {
                return;
            }

            if (event.code === 4001) {
                updateProgress(videoId, {
                    status: 'error',
                    message: 'Authentication failed',
                });
                return;
            }

            if (event.code === 1000 || event.code === 1001) {
                // Normal server close — don't burn retries. Do a one-shot
                // direct status check; if the video already completed we mark
                // it done without waiting for the retry/poll fallback.
                setTimeout(async () => {
                    try {
                        const resp: any = await apiServices.getVideoById(videoId);
                        const v: any = resp?.data ?? resp;
                        if (!v || !v.id) return;
                        if (v.processing_status === 'completed') {
                            updateProgress(videoId, { status: 'completed', progress: 100, message: 'Completed' });
                            completedRef.current.add(videoId);
                            if (onComplete) onComplete(videoId);
                        }
                    } catch (_) {}
                }, 2000);
                return;
            }

            // Check if we should show max retries message (fresh state read)
            const retries = retryCountRef.current[videoId] || 0;
            if (retries >= MAX_RETRIES) {
                setProgressMap(prev => {
                    if (prev[videoId]?.status === 'completed') return prev;
                    return {
                        ...prev,
                        [videoId]: {
                            ...prev[videoId],
                            status: 'error',
                            message: 'Max connection attempts reached',
                        },
                    };
                });
            }
        };
    }, [auth?.access_token, socketHost, activeConnections.length, updateProgress, onComplete, progressMap]);

    // ── HTTP polling fallback (queries the video directly, NOT the feed page,
    //    so completion shows up for ANY video even if it's not in the first
    //    feed page — fixes "status stuck until browser refresh") ──
    const startPolling = useCallback((videoId: number) => {
        if (pollTimers.current[videoId]) return;
        const poll = async () => {
            try {
                const resp: any = await apiServices.getVideoById(videoId);
                const video: any = resp?.data ?? resp;
                if (!video || !video.id) return;
                const status = video.processing_status;
                if (status === 'completed') {
                    updateProgress(videoId, { status: 'completed', progress: 100, message: 'Completed' });
                    completedRef.current.add(videoId);
                    if (onComplete) onComplete(videoId);
                    clearInterval(pollTimers.current[videoId]);
                    delete pollTimers.current[videoId];
                } else if (status === 'failed' || status === 'killed') {
                    updateProgress(videoId, { status: 'failed', message: video.processing_error || 'Processing failed' });
                    clearInterval(pollTimers.current[videoId]);
                    delete pollTimers.current[videoId];
                } else if (status === 'processing' || status === 'pending' || status === 'assembling') {
                    updateProgress(videoId, { status: 'processing', stage: video.processing_stage || '', progress: video.processing_progress || 0, message: video.processing_message || 'Processing...' });
                }
            } catch (_) {}
        };
        poll(); // immediate first check
        pollTimers.current[videoId] = setInterval(poll, 10000);
    }, [updateProgress, onComplete]);

    const startPollingForExhaustedVideos = useCallback(() => {
        videoIds.forEach(id => {
            const retries = retryCountRef.current[id] || 0;
            const hasWs = !!wsRefs.current[id];
            if (!hasWs && retries >= MAX_RETRIES && !completedRef.current.has(id)) {
                startPolling(id);
            }
        });
    }, [videoIds, startPolling]);

    const disconnectFromVideo = useCallback((videoId: number) => {
        const ws = wsRefs.current[videoId];
        if (ws) {
            ws.close();
            delete wsRefs.current[videoId];
            setActiveConnections(prev => prev.filter(id => id !== videoId));
        }
        if (pollTimers.current[videoId]) {
            clearInterval(pollTimers.current[videoId]);
            delete pollTimers.current[videoId];
        }
        if (retryTimers.current[videoId]) {
            clearTimeout(retryTimers.current[videoId]);
            delete retryTimers.current[videoId];
        }
    }, []);

    const resetRetries = useCallback(() => {
        retryCountRef.current = {};
        // NOTE: completedRef is intentionally NOT cleared — completed videos
        // must never re-connect (prevents onComplete refetch loops).
        Object.values(pollTimers.current).forEach(t => clearInterval(t));
        pollTimers.current = {};
        Object.values(retryTimers.current).forEach(t => clearTimeout(t));
        retryTimers.current = {};
        setProgressMap({});
    }, []);

    useEffect(() => {
        const processingVideos = videoIds.filter(id => {
            const retries = retryCountRef.current[id] || 0;
            return !wsRefs.current[id] && retries < MAX_RETRIES && !completedRef.current.has(id);
        });
        const availableSlots = MAX_CONNECTIONS - activeConnections.length;
        const videosToConnect = processingVideos.slice(0, availableSlots);

        videosToConnect.forEach(videoId => {
            connectToVideo(videoId);
        });

        // Fall back to HTTP polling for videos that exhausted retries
        startPollingForExhaustedVideos();
    }, [videoIds, activeConnections.length, connectToVideo, startPollingForExhaustedVideos]);

    useEffect(() => {
        return () => {
            Object.values(wsRefs.current).forEach(ws => ws.close());
            wsRefs.current = {};
            Object.values(pollTimers.current).forEach(t => clearInterval(t));
            pollTimers.current = {};
            Object.values(retryTimers.current).forEach(t => clearTimeout(t));
            retryTimers.current = {};
        };
    }, []);

    return {
        progressMap,
        connectToVideo,
        disconnectFromVideo,
        activeConnections,
        resetRetries,
    };
}
