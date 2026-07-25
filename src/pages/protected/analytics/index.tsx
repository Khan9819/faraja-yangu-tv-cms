import { Box, Typography, Skeleton, FormControl, Select, MenuItem } from '@mui/material';
import { useState } from 'react';
import { FaVideo, FaEye, FaThumbsUp, FaUsers } from 'react-icons/fa';
import { WorkspaceContainer } from '../../../components/workspace-container';
import { PageHeader } from '../../../components/page-header';
import Summary from '../../../components/summary';
import { useQuery } from '@tanstack/react-query';
import useAPI from '../../../hooks/useAPI';

export default function Analytics() {
    const api = useAPI();
    const [topVideosPeriod, setTopVideosPeriod] = useState('all');

    const { data: summaryResponse, isLoading: isSummaryLoading } = useQuery({
        queryKey: ['reports-summary'],
        queryFn: () => api.getReportsSummary(),
    });

    const { data: topVideosResponse, isLoading: isTopVideosLoading } = useQuery({
        queryKey: ['reports-top-videos', topVideosPeriod],
        queryFn: () => api.getTopVideos({ limit: 10, period: topVideosPeriod }),
    });

    const { data: categoryPerfResponse, isLoading: isCategoryLoading } = useQuery({
        queryKey: ['reports-category-performance'],
        queryFn: () => api.getCategoryPerformance(),
    });

    const summary = summaryResponse?.data ?? {};
    const topVideos = topVideosResponse?.data ?? [];
    const categoryPerf = categoryPerfResponse?.data ?? [];

    const formatNumber = (n: number | undefined) => {
        if (n === undefined || n === null) return '0';
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
        return n.toString();
    };

    return (
        <div>
            <PageHeader
                title="Reports"
                subtitle="Platform performance and usage insights"
            />

            {/* Summary Cards */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                <Summary
                    label="Total Videos"
                    value={isSummaryLoading ? '...' : (summary.total_videos ?? 0).toString()}
                    icon={<FaVideo size={14} />}
                    chips={[
                        { value: `Published: ${summary.published_videos ?? 0}`, color: 'success' },
                        { value: `Draft: ${summary.draft_videos ?? 0}`, color: 'warning' },
                    ]}
                />
                <Summary label="Total Views" value={isSummaryLoading ? '...' : formatNumber(summary.total_views)} icon={<FaEye size={14} />} />
                <Summary label="Total Likes" value={isSummaryLoading ? '...' : formatNumber(summary.total_likes)} icon={<FaThumbsUp size={14} />} />
                <Summary label="Active Users" value={isSummaryLoading ? '...' : formatNumber(summary.active_users)} icon={<FaUsers size={14} />} />
            </Box>

            {/* Top Videos & Category Performance */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 300 }}>
                    <WorkspaceContainer>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Top Performing Videos</Typography>
                            <FormControl size="small" sx={{ minWidth: 110 }}>
                                <Select value={topVideosPeriod} onChange={(e) => setTopVideosPeriod(e.target.value)}>
                                    <MenuItem value="all">All Time</MenuItem>
                                    <MenuItem value="week">This Week</MenuItem>
                                    <MenuItem value="month">This Month</MenuItem>
                                    <MenuItem value="year">This Year</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {isTopVideosLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <Skeleton key={i} variant="rounded" height={56} sx={{ borderRadius: 2 }} />
                                ))
                            ) : topVideos.length === 0 ? (
                                <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', py: 2, textAlign: 'center' }}>No data available</Typography>
                            ) : (
                                topVideos.map((video: any, index: number) => (
                                    <Box
                                        key={video.id ?? index}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            p: 1.5,
                                            borderRadius: 2,
                                            border: '1px solid var(--border-color)',
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.82rem' }}>
                                                {video.title}
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                                                <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <FaEye size={10} /> {formatNumber(video.views_count ?? video.views)}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <FaThumbsUp size={10} /> {formatNumber(video.likes_count ?? video.likes)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Typography variant="caption" sx={{ color: 'var(--primary-color)', fontWeight: 600 }}>
                                            #{index + 1}
                                        </Typography>
                                    </Box>
                                ))
                            )}
                        </Box>
                    </WorkspaceContainer>
                </Box>

                {/* Category Performance */}
                <Box sx={{ flex: 1, minWidth: 300 }}>
                    <WorkspaceContainer>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>
                            Category Performance
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {isCategoryLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <Skeleton key={i} variant="rounded" height={56} sx={{ borderRadius: 2 }} />
                                ))
                            ) : categoryPerf.length === 0 ? (
                                <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', py: 2, textAlign: 'center' }}>No data available</Typography>
                            ) : (
                                categoryPerf.map((cat: any, index: number) => (
                                    <Box
                                        key={cat.id ?? index}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            p: 1.5,
                                            borderRadius: 2,
                                            border: '1px solid var(--border-color)',
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.82rem' }}>
                                                {cat.name ?? cat.category}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'var(--text-dimmer)' }}>
                                                {cat.video_count ?? cat.videos} videos
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                                            {formatNumber(cat.total_views ?? cat.views)}
                                        </Typography>
                                    </Box>
                                ))
                            )}
                        </Box>
                    </WorkspaceContainer>
                </Box>
            </Box>
        </div>
    );
}
