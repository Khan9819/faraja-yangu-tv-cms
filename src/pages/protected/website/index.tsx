import { Box, Typography, Skeleton } from '@mui/material';
import { FaGlobe, FaEye, FaPlay, FaClock, FaUsers, FaSignal, FaDesktop } from 'react-icons/fa';
import { WorkspaceContainer } from '../../../components/workspace-container';
import { PageHeader } from '../../../components/page-header';
import Summary from '../../../components/summary';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useQuery } from '@tanstack/react-query';
import useAPI from '../../../hooks/useAPI';

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
    pageview: { label: 'Pageview', color: '#10b981' },
    video_play: { label: 'Video Play', color: '#e2a44b' },
    video_pause: { label: 'Video Pause', color: '#888' },
    video_end: { label: 'Video End', color: '#888' },
    watch_seconds: { label: 'Watch Time', color: '#e2a44b' },
    scroll: { label: 'Scroll', color: '#4caf50' },
    click: { label: 'Click', color: '#2196f3' },
    heartbeat: { label: 'Heartbeat', color: '#888' },
};

export default function WebsiteEngagement() {
    const api = useAPI();

    const { data: summaryResponse, isLoading: isSummaryLoading } = useQuery({
        queryKey: ['website-summary'],
        queryFn: () => api.getWebsiteSummary(),
        refetchInterval: 15_000,
    });

    // Real-time: polling kila sekunde 5 (live counter + recent events)
    const { data: realtimeResponse, isLoading: isRealtimeLoading } = useQuery({
        queryKey: ['website-realtime'],
        queryFn: () => api.getWebsiteRealtime(),
        refetchInterval: 5_000,
    });

    const { data: topVideosResponse, isLoading: isTopVideosLoading } = useQuery({
        queryKey: ['website-top-videos'],
        queryFn: () => api.getWebsiteTopVideos({ limit: 10 }),
        refetchInterval: 30_000,
    });

    const { data: timelineResponse, isLoading: isTimelineLoading } = useQuery({
        queryKey: ['website-timeline'],
        queryFn: () => api.getWebsiteTimeline(),
        refetchInterval: 30_000,
    });

    const summary = summaryResponse?.data ?? {};
    const realtime = realtimeResponse?.data ?? {};
    const topVideos = topVideosResponse?.data ?? [];
    const timeline = timelineResponse?.data ?? {};
    const recentEvents = realtime.recent_events ?? [];

    const formatNumber = (n: number | undefined) => {
        if (n === undefined || n === null) return '0';
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
        return n.toString();
    };

    const formatWatch = (sec: number | undefined) => {
        const total = Number(sec ?? 0);
        if (total < 60) return `${total}s`;
        if (total < 3600) return `${(total / 60).toFixed(1)}m`;
        return `${(total / 3600).toFixed(1)}h`;
    };

    const chartOptions: ApexOptions = {
        chart: {
            type: 'area',
            height: 350,
            toolbar: { show: false },
            background: 'transparent',
            zoom: { enabled: false },
        },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2.5 },
        colors: ['#10b981', '#e2a44b', '#4caf50'],
        fill: {
            type: 'gradient',
            gradient: { opacityFrom: 0.35, opacityTo: 0.05 },
        },
        xaxis: {
            categories: timeline.labels ?? [],
            labels: { style: { colors: '#888' }, rotate: -45 },
            tickAmount: 12,
        },
        yaxis: {
            labels: { style: { colors: '#888' } },
            min: 0,
        },
        grid: { borderColor: '#333', strokeDashArray: 5 },
        legend: { position: 'top', horizontalAlign: 'left', labels: { colors: '#888' } },
        tooltip: { theme: 'dark', shared: true, intersect: false },
    };

    const chartSeries = [
        { name: 'Pageviews', data: timeline.pageviews ?? [] },
        { name: 'Video Plays', data: timeline.video_plays ?? [] },
        { name: 'Active Sessions', data: timeline.active_sessions ?? [] },
    ];

    return (
        <div>
            <PageHeader
                title="Website"
                subtitle="Website engagement real-time (farajayangutv.co.tz)"
                actions={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#10b981' }}>
                        <FaSignal size={14} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Mtandaoni sasa: {isRealtimeLoading ? '...' : (realtime.active_now ?? summary.active_now ?? 0)}
                        </Typography>
                    </Box>
                }
            />

            {/* Summary Cards */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                <Summary
                    label="Active Now (5 min)"
                    value={isRealtimeLoading ? '...' : String(realtime.active_now ?? summary.active_now ?? 0)}
                    icon={<FaUsers size={14} />}
                    chips={[{ value: `Today sessions: ${summary.today_sessions ?? 0}`, color: 'success' }]}
                />
                <Summary
                    label="Total Pageviews"
                    value={isSummaryLoading ? '...' : formatNumber(summary.total_pageviews)}
                    icon={<FaEye size={14} />}
                    chips={[{ value: `Today: ${summary.today_pageviews ?? 0}`, color: 'info' }]}
                />
                <Summary
                    label="Total Video Plays"
                    value={isSummaryLoading ? '...' : formatNumber(summary.total_video_plays)}
                    icon={<FaPlay size={14} />}
                    chips={[{ value: `Today: ${summary.today_video_plays ?? 0}`, color: 'warning' }]}
                />
                <Summary
                    label="Watch Time"
                    value={isSummaryLoading ? '...' : formatWatch(summary.watch_seconds_total)}
                    icon={<FaClock size={14} />}
                    chips={[
                        { value: `Avg/play: ${formatWatch(summary.avg_watch_seconds)}`, color: 'warning', tooltip: 'Muda wa wastani wa kutazama kwa kila video play' },
                    ]}
                />
                <Summary
                    label="Devices"
                    value={isSummaryLoading ? '...' : formatNumber(summary.unique_sessions)}
                    icon={<FaDesktop size={14} />}
                    tooltip="Migawanyo ya devices zinazotumika kwenye website"
                    chips={[
                        { value: `Mobile: ${summary.devices?.mobile ?? 0}`, color: 'info', tooltip: 'Mobile devices' },
                        { value: `Desktop: ${summary.devices?.desktop ?? 0}`, color: 'success', tooltip: 'Desktop devices' },
                        { value: `Tablet: ${summary.devices?.tablet ?? 0}`, color: 'default', tooltip: 'Tablet devices' },
                    ]}
                />
                <Summary
                    label="Unique Sessions"
                    value={isSummaryLoading ? '...' : formatNumber(summary.unique_sessions)}
                    icon={<FaGlobe size={14} />}
                />
            </Box>

            {/* 24h Timeline Chart */}
            <Box sx={{ mb: 3 }}>
                <WorkspaceContainer>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Saa 24 zilizopita — shughuli za website
                        </Typography>
                    </Box>
                    {isTimelineLoading ? (
                        <Skeleton variant="rectangular" animation="wave" height={350} sx={{ bgcolor: '#1f1f1f', borderRadius: 1 }} />
                    ) : (
                        <ReactApexChart options={chartOptions} series={chartSeries} type="area" height={350} />
                    )}
                </WorkspaceContainer>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {/* Real-time events */}
                <Box sx={{ flex: 1.2, minWidth: 300 }}>
                    <WorkspaceContainer>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Recent Activity (dakika 60 zilizopita)
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <FaSignal size={10} /> live
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {isRealtimeLoading && recentEvents.length === 0 ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} variant="rounded" height={44} sx={{ borderRadius: 2 }} />
                                ))
                            ) : recentEvents.length === 0 ? (
                                <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', py: 2, textAlign: 'center' }}>
                                    Hakuna events bado — tembelea farajayangutv.co.tz
                                </Typography>
                            ) : (
                                recentEvents.map((ev: any, index: number) => {
                                    const meta = EVENT_LABELS[ev.event_type] ?? { label: ev.event_type, color: '#888' };
                                    return (
                                        <Box
                                            key={index}
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                p: 1.2,
                                                borderRadius: 2,
                                                border: '1px solid var(--border-color)',
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                                                <Box
                                                    sx={{
                                                        width: 9,
                                                        height: 9,
                                                        borderRadius: '50%',
                                                        backgroundColor: meta.color,
                                                        flex: '0 0 auto',
                                                    }}
                                                />
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem', lineHeight: 1.2 }}>
                                                        {meta.label}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                                                        {ev.video_title || ev.page || ev.event_type}
                                                        {ev.value ? ` · ${ev.value}${ev.event_type === 'watch_seconds' ? 's' : '%'}` : ''}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', flex: '0 0 auto' }}>
                                                {ev.time_ago}
                                            </Typography>
                                        </Box>
                                    );
                                })
                            )}
                        </Box>
                    </WorkspaceContainer>
                </Box>

                {/* Top videos kwenye website */}
                <Box sx={{ flex: 1, minWidth: 300 }}>
                    <WorkspaceContainer>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>
                            Videos Zilizotazamwa Zaidi (Website)
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {isTopVideosLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} variant="rounded" height={56} sx={{ borderRadius: 2 }} />
                                ))
                            ) : topVideos.length === 0 ? (
                                <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', py: 2, textAlign: 'center' }}>
                                    Hakuna video plays bado
                                </Typography>
                            ) : (
                                topVideos.map((video: any, index: number) => (
                                    <Box
                                        key={video.video_uid ?? index}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            p: 1.5,
                                            borderRadius: 2,
                                            border: '1px solid var(--border-color)',
                                        }}
                                    >
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>
                                                {video.video_title}
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                                                <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <FaPlay size={10} /> {video.plays} plays
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <FaClock size={10} /> {formatWatch(video.watch_seconds)}
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
            </Box>
        </div>
    );
}
