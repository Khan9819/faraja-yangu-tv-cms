import { useState } from "react";
import { Box, Typography, Avatar, Skeleton, IconButton, Tooltip } from "@mui/material";
import { WorkspaceContainer } from "../../components/workspace-container";
import { PageHeader } from "../../components/page-header";
import Summary from "../../components/summary";
import DataGridWrapper from "../../components/DataTable/DataGridWrapper";
import type { GridColDef } from "@mui/x-data-grid";
import { FaUser, FaEye, FaHeart, FaClock, FaComment, FaAd, FaBell, FaMobile, FaChartLine, FaUserCheck, FaFilm, FaTrash, FaGlobe, FaUsers, FaPlay, FaDesktop } from "react-icons/fa";
import MetricsChart from "../../components/Analytics/MetricsChart";
import useApiServices from "../../hooks/useAPI";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timeAgo, formatDate } from "../../utils/dateUtils";
import { IoMdPersonAdd } from "react-icons/io";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {

    const api = useApiServices();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);

    const deleteCommentMutation = useMutation({
        mutationFn: (commentId: number) => api.deleteComment(commentId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recent-comments'] }),
    });
    const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});
    const [repliesData, setRepliesData] = useState<Record<number, any[]>>({});
    const [loadingReplies, setLoadingReplies] = useState<Record<number, boolean>>({});

    const toggleReplies = async (commentId: number) => {
        const isExpanded = expandedReplies[commentId];
        if (isExpanded) {
            setExpandedReplies((prev) => ({ ...prev, [commentId]: false }));
            return;
        }
        if (!repliesData[commentId]) {
            setLoadingReplies((prev) => ({ ...prev, [commentId]: true }));
            try {
                const response = await api.getCommentReplies(commentId);
                if (response?.success) {
                    setRepliesData((prev) => ({ ...prev, [commentId]: response.data ?? [] }));
                }
            } finally {
                setLoadingReplies((prev) => ({ ...prev, [commentId]: false }));
            }
        }
        setExpandedReplies((prev) => ({ ...prev, [commentId]: true }));
    };

    const { data: dashboardSummaryResponse, isLoading: isSummaryLoading } = useQuery({
        queryKey: ["dashboard-summary"],
        queryFn: () => api.getDashboard(),
    });

    const { data: activeUsersTodayResponse, isLoading: isActiveUsersLoading } = useQuery({
        queryKey: ["active-users-today"],
        queryFn: () => api.getActiveUsersToday(),
    });

    const { data: analyticsChartResponse } = useQuery({
        queryKey: ["dashboard-analytics-chart", selectedMonth],
        queryFn: () => api.getDashboardAnalyticsChart(selectedMonth),
    });

    const { data: recentCommentsResponse, isLoading: isCommentsLoading } = useQuery({
        queryKey: ["recent-comments"],
        queryFn: () => api.getRecentComments({ limit: 5 }),
    });

    // Website engagement (live) — cards za farajayangutv.co.tz
    const { data: websiteSummaryResponse, isLoading: isWebsiteSummaryLoading } = useQuery({
        queryKey: ["website-summary"],
        queryFn: () => api.getWebsiteSummary(),
        refetchInterval: 15_000,
    });
    const { data: websiteRealtimeResponse } = useQuery({
        queryKey: ["website-realtime"],
        queryFn: () => api.getWebsiteRealtime(),
        refetchInterval: 5_000,
    });

    const activeUsersToday = activeUsersTodayResponse?.data ?? [];
    const summary: any = dashboardSummaryResponse?.data ?? {};
    const recentComments = recentCommentsResponse?.data ?? [];
    const websiteSummary: any = websiteSummaryResponse?.data ?? {};
    const websiteRealtime: any = websiteRealtimeResponse?.data ?? {};
    const websiteActiveNow = websiteRealtime.active_now ?? websiteSummary.active_now ?? 0;

    // Onyesha muda vizuri: sekunde kama chini ya 1m, dakika kama chini ya 1h,
    // vinginevyo masaa. (Kabla: muda mdogo ulionekana kama "0.0h" = data "haipo".)
    const formatWatch = (sec: number | undefined) => {
        const total = Number(sec ?? 0);
        if (total < 60) return `${Math.round(total)}s`;
        if (total < 3600) return `${(total / 60).toFixed(1)}m`;
        return `${(total / 3600).toFixed(1)}h`;
    };

    const gridColumns: GridColDef[] = [
        { field: 'name', headerName: 'Name', flex: 1.2, minWidth: 180, filterable: true },
        { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 220, filterable: true },
        { field: 'provider', headerName: 'Provider', flex: 0.6, minWidth: 100, filterable: true },
        { field: 'videosWatched', headerName: 'Videos Watched', flex: 0.7, minWidth: 120, type: 'number', filterable: true },
        {
            field: 'lastActive',
            headerName: 'Last Active',
            flex: 1,
            minWidth: 160,
            filterable: true,
            renderCell: (params: any) => {
                const raw = params.value;
                if (!raw) return '';
                return formatDate(raw, 'datetime');
            },
        },
    ];

    const data = activeUsersToday.map((user: any) => ({
        id: user.id,
        name: user.full_name,
        email: user.email,
        provider: user.provider ?? "email",
        videosWatched: user.watched_video_count_today ?? 0,
        lastActive: user.last_active ?? user.last_login,
    }));

    return (
        <div>
            <PageHeader
                title="Dashboard"
                subtitle="Overview and platform insights"
            />

            {/* Summary Cards - Row 1: Users & Engagement */}
            <div className="d-flex flex-wrap justify-content-start gap-2 mb-3">
                <Summary
                    label="Total Clients"
                    value={isSummaryLoading ? "..." : (summary.clients?.total ?? 0).toString()}
                    icon={<FaUser size={16} />}
                    tooltip="Total registered clients on the platform"
                    chips={[
                        { value: `+${summary.clients?.today ?? 0}`, color: "success", icon: <IoMdPersonAdd size={16} />, tooltip: "Registered today" },
                        { value: `${summary.clients?.month ?? 0}`, color: "info", tooltip: "This month" },
                        { value: `${summary.clients?.year ?? 0}`, color: "default", tooltip: "This year" },
                    ]}
                />
                <Summary
                    label="Active Users"
                    value={isSummaryLoading ? "..." : (summary.active_users?.total ?? 0).toString()}
                    icon={<FaUserCheck size={16} />}
                    tooltip="Users who have been active on the platform"
                    chips={[
                        { value: `${summary.active_users?.today ?? 0}`, color: "success", tooltip: "Active today" },
                        { value: `${summary.active_users?.month ?? 0}`, color: "info", tooltip: "Active this month" },
                        { value: `${summary.active_users?.year ?? 0}`, color: "default", tooltip: "Active this year" },
                    ]}
                />
                <Summary
                    label="Retention"
                    value={isSummaryLoading ? "..." : `${summary.retention?.active_last_30_days_pct?.toFixed(0) ?? 0}%`}
                    icon={<FaChartLine size={16} />}
                    tooltip="User retention rate (30-day)"
                    chips={[
                        { value: `${summary.retention?.active_last_7_days ?? 0}`, color: "info", tooltip: "Active last 7 days" },
                        { value: `${summary.retention?.active_last_30_days ?? 0}`, color: "default", tooltip: "Active last 30 days" },
                    ]}
                />
                <Summary
                    label="Engagement Rate"
                    value={isSummaryLoading ? "..." : `${((summary.engagement_rate?.total ?? 0) * 100).toFixed(1)}%`}
                    icon={<FaChartLine size={16} />}
                    tooltip="Overall user engagement rate"
                    chips={[
                        { value: `${((summary.engagement_rate?.today ?? 0) * 100).toFixed(0)}%`, color: "success", tooltip: "Today's engagement" },
                        { value: `${((summary.engagement_rate?.month ?? 0) * 100).toFixed(0)}%`, color: "info", tooltip: "This month's engagement" },
                    ]}
                />
                <Summary
                    label="Total Views"
                    value={isSummaryLoading ? "..." : (summary.views?.total ?? 0).toString()}
                    icon={<FaEye size={16} />}
                    tooltip="Total video views across the platform"
                    chips={[
                        { value: `${summary.views?.today ?? 0}`, color: "success", tooltip: "Views today" },
                        { value: `${summary.views?.month ?? 0}`, color: "info", tooltip: "Views this month" },
                        { value: `${summary.views?.year ?? 0}`, color: "default", tooltip: "Views this year" },
                    ]}
                />
                <Summary
                    label="Watch Time"
                    value={isSummaryLoading ? "..." : `${summary.watch_time?.total ?? 0}h`}
                    icon={<FaClock size={16} />}
                    tooltip="Total watch time in hours"
                    chips={[
                        { value: `${summary.watch_time?.today ?? 0}h`, color: "success", tooltip: "Watch time today" },
                        { value: `${summary.watch_time?.month ?? 0}h`, color: "info", tooltip: "Watch time this month" },
                    ]}
                />
                <Summary
                    label="Avg Watch/User"
                    value={isSummaryLoading ? "..." : `${(summary.avg_watch_time_per_user?.total ?? 0).toFixed(1)}h`}
                    icon={<FaClock size={16} />}
                    tooltip="Average watch time per user"
                    chips={[
                        { value: `${(summary.avg_watch_time_per_user?.today ?? 0).toFixed(1)}h`, color: "success", tooltip: "Avg today" },
                        { value: `${(summary.avg_watch_time_per_user?.month ?? 0).toFixed(1)}h`, color: "info", tooltip: "Avg this month" },
                    ]}
                />
                <Summary
                    label="Total Likes"
                    value={isSummaryLoading ? "..." : (summary.likes?.total ?? 0).toString()}
                    icon={<FaHeart size={16} />}
                    tooltip="Total likes on videos"
                    chips={[
                        { value: `${summary.likes?.today ?? 0}`, color: "success", tooltip: "Likes today" },
                        { value: `${summary.likes?.month ?? 0}`, color: "info", tooltip: "Likes this month" },
                        { value: `${summary.likes?.year ?? 0}`, color: "default", tooltip: "Likes this year" },
                    ]}
                />
                <Summary
                    label="Comments"
                    value={isSummaryLoading ? "..." : (summary.comments?.total ?? 0).toString()}
                    icon={<FaComment size={16} />}
                    tooltip="Total comments on videos"
                    chips={[
                        { value: `${summary.comments?.today ?? 0}`, color: "success", tooltip: "Comments today" },
                        { value: `${summary.comments?.month ?? 0}`, color: "info", tooltip: "Comments this month" },
                        { value: `${summary.comments?.year ?? 0}`, color: "default", tooltip: "Comments this year" },
                    ]}
                />
                <Summary
                    label="Ads"
                    value={isSummaryLoading ? "..." : (summary.ads?.total_ads ?? 0).toString()}
                    icon={<FaAd size={16} />}
                    tooltip="Total advertisements on the platform"
                    chips={[
                        { value: `${summary.ads?.published_ads ?? 0}`, color: "success", tooltip: "Published ads" },
                        { value: `${summary.ads?.types?.carousel ?? 0}`, color: "info", tooltip: "Carousel ads" },
                        { value: `${summary.ads?.types?.video ?? 0}`, color: "default", tooltip: "Video ads" },
                    ]}
                />
                <Summary
                    label="Notifications"
                    value={isSummaryLoading ? "..." : (summary.analytics?.notifications?.total ?? 0).toString()}
                    icon={<FaBell size={16} />}
                    tooltip="System notifications"
                    chips={[
                        { value: `${summary.analytics?.notifications?.unread ?? 0}`, color: "warning", tooltip: "Unread notifications" },
                    ]}
                />
                <Summary
                    label="Devices"
                    value={isSummaryLoading ? "..." : (summary.devices?.total ?? 0).toString()}
                    icon={<FaMobile size={16} />}
                    tooltip={`Total registered devices (v${summary.devices?.latest_version ?? "N/A"})`}
                    chips={[
                        { value: `${summary.devices?.androids ?? 0}`, color: "success", tooltip: "Android devices" },
                        { value: `${summary.devices?.iOS ?? 0}`, color: "info", tooltip: "iOS devices" },
                        { value: `${summary.devices?.uptodate_ratio?.toFixed(0) ?? 0}%`, color: "default", tooltip: "Up-to-date devices" },
                    ]}
                />
            </div>

            {/* Website Engagement Cards (farajayangutv.co.tz) */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, mt: 1 }}>
                <FaGlobe size={13} style={{ color: 'var(--primary-color)' }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Website Engagement (Live)</Typography>
                <Typography variant="caption" sx={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
                    {websiteActiveNow} mtandaoni sasa
                </Typography>
            </Box>
            <div className="d-flex flex-wrap justify-content-start gap-2 mb-3">
                <Summary
                    label="Active Now (Website)"
                    value={isWebsiteSummaryLoading ? "..." : String(websiteActiveNow)}
                    icon={<FaUsers size={16} />}
                    tooltip="Watu wanaofuatilia website sasa (dakika 5 zilizopita)"
                    chips={[
                        { value: `Sessions today: ${websiteSummary.today_sessions ?? 0}`, color: "success", tooltip: "Sessions leo" },
                        { value: `Unique: ${websiteSummary.unique_sessions ?? 0}`, color: "info", tooltip: "Unique sessions zote" },
                    ]}
                />
                <Summary
                    label="Website Pageviews"
                    value={isWebsiteSummaryLoading ? "..." : (websiteSummary.total_pageviews ?? 0).toString()}
                    icon={<FaEye size={16} />}
                    tooltip="Jumla ya pageviews za website"
                    chips={[
                        { value: `Today: ${websiteSummary.today_pageviews ?? 0}`, color: "success", tooltip: "Pageviews leo" },
                    ]}
                />
                <Summary
                    label="Website Video Plays"
                    value={isWebsiteSummaryLoading ? "..." : (websiteSummary.total_video_plays ?? 0).toString()}
                    icon={<FaPlay size={16} />}
                    tooltip="Video zilizochezwa kwenye website"
                    chips={[
                        { value: `Today: ${websiteSummary.today_video_plays ?? 0}`, color: "warning", tooltip: "Video plays leo" },
                    ]}
                />
                <Summary
                    label="Website Watch Time"
                    value={isWebsiteSummaryLoading ? "..." : formatWatch(websiteSummary.watch_seconds_total)}
                    icon={<FaClock size={16} />}
                    tooltip="Muda wa kutazama kwenye website"
                    chips={[
                        { value: `Avg/play: ${formatWatch(websiteSummary.avg_watch_seconds)}`, color: "warning", tooltip: "Muda wa wastani wa kutazama kwa kila video play" },
                    ]}
                />
                <Summary
                    label="Website Devices"
                    value={isWebsiteSummaryLoading ? "..." : (websiteSummary.unique_sessions ?? 0).toString()}
                    icon={<FaDesktop size={16} />}
                    tooltip="Migawanyo ya devices zinazotumika kwenye website"
                    chips={[
                        { value: `Mobile: ${websiteSummary.devices?.mobile ?? 0}`, color: "info", tooltip: "Mobile devices" },
                        { value: `Desktop: ${websiteSummary.devices?.desktop ?? 0}`, color: "success", tooltip: "Desktop devices" },
                        { value: `Tablet: ${websiteSummary.devices?.tablet ?? 0}`, color: "default", tooltip: "Tablet devices" },
                    ]}
                />
            </div>

            {/* Analytics Chart */}
            <WorkspaceContainer>
                <MetricsChart
                    enableZoom={false}
                    data={analyticsChartResponse?.data}
                    month={selectedMonth}
                    currentMonth={selectedMonth}
                    onMonthChange={setSelectedMonth}
                />
            </WorkspaceContainer>
            {/* Recent Comments & Active Users - Side by Side */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: { xs: "wrap", lg: "nowrap" } }}>
                {/* Recent Comments */}
                <Box sx={{ flex: 1, minWidth: 320 }}>
                    <WorkspaceContainer>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                <FaComment size={12} style={{ marginRight: 6 }} />
                                Recent Comments
                            </Typography>
                            <Typography variant="caption" sx={{ color: "var(--text-dimmer)" }}>{recentComments.length} comments</Typography>
                        </Box>
                        <Box sx={{ display: "flex", flexDirection: "column" }}>
                            {isCommentsLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <Box key={i} sx={{ display: "flex", gap: 1.25, py: 1.5, borderBottom: "1px solid var(--border-color)", "&:last-child": { borderBottom: "none" } }}>
                                        <Skeleton variant="circular" width={36} height={36} />
                                        <Box sx={{ flex: 1 }}>
                                            <Skeleton variant="text" width="35%" sx={{ mb: 0.5 }} />
                                            <Skeleton variant="text" width="95%" />
                                            <Skeleton variant="text" width="60%" />
                                        </Box>
                                    </Box>
                                ))
                            ) : recentComments.length === 0 ? (
                                <Box sx={{ textAlign: "center", py: 5 }}>
                                    <FaComment size={32} style={{ opacity: 0.12, marginBottom: 10 }} />
                                    <Typography variant="caption" sx={{ color: "var(--text-dimmer)", display: "block" }}>
                                        No recent comments
                                    </Typography>
                                </Box>
                            ) : (
                                recentComments.map((comment: any) => (
                                    <Box key={comment.id} sx={{ borderBottom: "1px solid var(--border-color)", "&:last-child": { borderBottom: "none" } }}>
                                        {/* Parent comment */}
                                        <Box sx={{ display: "flex", gap: 1.25, py: 1.5 }}>
                                            <Avatar
                                                src={comment.author_avatar ?? comment.user_avatar}
                                                sx={{ width: 36, height: 36, fontSize: "0.8rem", backgroundColor: "var(--primary-color)", flexShrink: 0, cursor: "pointer" }}
                                                onClick={() => {
                                                    const videoId = comment.video_id ?? comment.video;
                                                    if (videoId) navigate(`/content/videos/${videoId}/view`);
                                                }}
                                            >
                                                {(comment.author_name ?? comment.user_name ?? comment.username ?? "U")[0]}
                                            </Avatar>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.25 }}>
                                                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.78rem", color: "var(--primary-color)" }}>
                                                        {comment.author_name ?? comment.user_name ?? comment.username ?? "User"}
                                                    </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Typography variant="caption" sx={{ color: "var(--text-dimmer)", fontSize: "0.58rem", flexShrink: 0, ml: 1 }}>
                                                            {comment.created_at ? timeAgo(comment.created_at) : ""}
                                                        </Typography>
                                                    <Tooltip title="Delete comment">
                                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteCommentMutation.mutate(comment.id); }} sx={{ p: 0.2 }}>
                                                            <FaTrash size={9} color="var(--text-dimmer)" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                                </Box>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: "var(--text-secondary)",
                                                        lineHeight: 1.5,
                                                        fontSize: "0.74rem",
                                                        wordBreak: "break-word",
                                                        display: "block",
                                                    }}
                                                >
                                                    {comment.comment ?? comment.text ?? comment.content ?? comment.body}
                                                </Typography>
                                                {(comment.video_title) && (
                                                    <Box
                                                        sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mt: 0.5, px: 0.8, py: 0.2, borderRadius: 1, backgroundColor: "rgba(255,122,0,0.06)", border: "1px solid rgba(255,122,0,0.12)", cursor: "pointer" }}
                                                        onClick={() => {
                                                            const videoId = comment.video_id ?? comment.video;
                                                            if (videoId) navigate(`/content/videos/${videoId}/view`);
                                                        }}
                                                    >
                                                        <FaFilm size={8} color="var(--primary-color)" />
                                                        <Typography variant="caption" sx={{ fontSize: "0.58rem", color: "var(--primary-color)", fontWeight: 500 }}>
                                                            {comment.video_title}
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {/* Action bar */}
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 0.75 }}>
                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                                                        <FaHeart size={11} color={comment.likes_count > 0 ? "var(--primary-color)" : "var(--text-dimmer)"} style={{ opacity: comment.likes_count > 0 ? 0.8 : 0.5 }} />
                                                        <Typography variant="caption" sx={{ fontSize: "0.62rem", color: "var(--text-dimmer)" }}>
                                                            {comment.likes_count ?? 0}
                                                        </Typography>
                                                    </Box>
                                                    {(comment.replies_count > 0) && (
                                                        <Box
                                                            sx={{ display: "flex", alignItems: "center", gap: 0.4, cursor: "pointer" }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleReplies(comment.id);
                                                            }}
                                                        >
                                                            <FaComment size={11} color="var(--primary-color)" style={{ opacity: 0.7 }} />
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    fontSize: "0.62rem",
                                                                    color: "var(--primary-color)",
                                                                    fontWeight: 500,
                                                                    "&:hover": { textDecoration: "underline" },
                                                                }}
                                                            >
                                                                {expandedReplies[comment.id] ? "Hide replies" : `${comment.replies_count} repl${comment.replies_count === 1 ? "y" : "ies"}`}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Box>
                                        </Box>

                                        {/* Replies */}
                                        {expandedReplies[comment.id] && (
                                            <Box sx={{ display: "flex", pb: 1.5 }}>
                                                {/* Thread line */}
                                                <Box sx={{ width: 36, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                                                    <Box sx={{ width: 2, height: "100%", backgroundColor: "rgba(255,122,0,0.12)", borderRadius: 1 }} />
                                                </Box>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    {loadingReplies[comment.id] ? (
                                                        Array.from({ length: 2 }).map((_, i) => (
                                                            <Box key={i} sx={{ display: "flex", gap: 1, py: 1 }}>
                                                                <Skeleton variant="circular" width={28} height={28} />
                                                                <Box sx={{ flex: 1 }}>
                                                                    <Skeleton variant="text" width="30%" sx={{ mb: 0.3 }} />
                                                                    <Skeleton variant="text" width="85%" />
                                                                </Box>
                                                            </Box>
                                                        ))
                                                    ) : (
                                                        (repliesData[comment.id] ?? []).map((reply: any) => (
                                                            <Box key={reply.id} sx={{ display: "flex", gap: 1, py: 1, borderBottom: "1px solid rgba(255,122,0,0.06)", "&:last-child": { borderBottom: "none" } }}>
                                                                <Avatar
                                                                    src={reply.author_avatar ?? reply.user_avatar}
                                                                    sx={{ width: 28, height: 28, fontSize: "0.65rem", backgroundColor: "var(--primary-color)", flexShrink: 0, opacity: 0.9 }}
                                                                >
                                                                    {(reply.author_name ?? reply.user_name ?? reply.username ?? "U")[0]}
                                                                </Avatar>
                                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.2 }}>
                                                                        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.72rem", color: "var(--primary-color)" }}>
                                                                            {reply.author_name ?? reply.user_name ?? reply.username ?? "User"}
                                                                        </Typography>
                                                                        <Typography variant="caption" sx={{ color: "var(--text-dimmer)", fontSize: "0.56rem", flexShrink: 0, ml: 1 }}>
                                                                            {reply.created_at ? timeAgo(reply.created_at) : ""}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Typography
                                                                        variant="caption"
                                                                        sx={{
                                                                            color: "var(--text-secondary)",
                                                                            lineHeight: 1.5,
                                                                            fontSize: "0.7rem",
                                                                            wordBreak: "break-word",
                                                                            display: "block",
                                                                        }}
                                                                    >
                                                                        {reply.comment ?? reply.text ?? reply.content ?? reply.body}
                                                                    </Typography>
                                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, mt: 0.4 }}>
                                                                        <FaHeart size={10} color={reply.likes_count > 0 ? "var(--primary-color)" : "var(--text-dimmer)"} style={{ opacity: reply.likes_count > 0 ? 0.8 : 0.5 }} />
                                                                        <Typography variant="caption" sx={{ fontSize: "0.58rem", color: "var(--text-dimmer)" }}>
                                                                            {reply.likes_count ?? 0}
                                                                        </Typography>
                                                                    </Box>
                                                                </Box>
                                                            </Box>
                                                        ))
                                                    )}
                                                </Box>
                                            </Box>
                                        )}
                                    </Box>
                                ))
                            )}
                        </Box>
                    </WorkspaceContainer>
                </Box>

                {/* Active Users Today */}
                <Box sx={{ flex: 2, minWidth: 400 }}>
                    <WorkspaceContainer>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Active Users Today</Typography>
                            <Typography variant="caption" sx={{ color: "var(--text-dimmer)" }}>{data.length} users</Typography>
                        </Box>
                        <DataGridWrapper columns={gridColumns} rows={data} loading={isActiveUsersLoading} checkboxSelection />
                    </WorkspaceContainer>
                </Box>            </Box>

            {/* Scheduled Videos Queue */}
            <ScheduledQueue api={api} navigate={navigate} />
        </div>
    );
}

function ScheduledQueue({ api, navigate }: { api: any; navigate: any }) {
    const { data: scheduledResponse, isLoading } = useQuery({
        queryKey: ['scheduled-videos'],
        queryFn: () => api.getScheduledVideos(),
        refetchInterval: 30_000,
    });
    const queryClient = useQueryClient();
    const publishNowMutation = useMutation({
        mutationFn: (videoId: number) => api.publishNow(videoId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scheduled-videos'] });
            queryClient.invalidateQueries({ queryKey: ['videos'] });
        },
    });

    const videos: any[] = scheduledResponse?.data ?? [];
    if (isLoading || videos.length === 0) return null;

    return (
        <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <FaClock size={13} style={{ color: '#f59e0b' }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Scheduled Videos ({videos.length})</Typography>
            </Box>
            <WorkspaceContainer>
                {videos.map((video: any) => (
                    <Box key={video.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, borderBottom: '1px solid var(--border-color)', '&:last-child': { borderBottom: 'none' } }}>
                        <Avatar src={video.thumbnail} sx={{ width: 48, height: 48, borderRadius: 1 }} variant="rounded" />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{video.title}</Typography>
                            <Typography variant="caption" sx={{ color: 'var(--text-dimmer)' }}>
                                Publishes: {new Date(video.scheduled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Publish now">
                                <IconButton size="small" onClick={() => publishNowMutation.mutate(video.id)} disabled={publishNowMutation.isPending}>
                                    <FaPlay size={12} color="#10b981" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="View video">
                                <IconButton size="small" onClick={() => navigate(`/content/videos/${video.id}/view`)}>
                                    <FaEye size={12} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                ))}
            </WorkspaceContainer>
        </Box>
    );
}