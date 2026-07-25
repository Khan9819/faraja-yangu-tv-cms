import { Divider, IconButton, Badge, Menu, MenuItem, ListItemIcon, ListItemText, Typography, Box, Avatar, InputBase, Button } from "@mui/material";
import { useState, type FC } from "react";
import { FaBell, FaSun, FaMoon, FaSignOutAlt, FaCog, FaUserCircle, FaCheck } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useRecoilState } from "recoil";
import { theme as themeAtom } from "../context/global.states";
import useAPI from "../hooks/useAPI";
import useAuth from "../hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const AppBar: FC = () => {
    const navigate = useNavigate();
    const [currentTheme, setCurrentTheme] = useRecoilState<string>(themeAtom);
    const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
    const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
    const api = useAPI();
    const auth: any = useAuth();
    const queryClient = useQueryClient();
    const profile = auth?.auth?.profile;

    const { data: notificationsResponse } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => api.getNotifications({ page_size: 10 }),
        refetchInterval: 30000,
    });

    const notifications = notificationsResponse?.data ?? [];
    const unreadCount = notifications.filter((n: any) => !n.read && !n.is_read).length;

    const markReadMutation = useMutation({
        mutationFn: (id: number) => api.markNotificationRead(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => api.markAllNotificationsRead(),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    });

    const handleThemeToggle = () => {
        setCurrentTheme(currentTheme === 'dark' ? 'light' : 'dark');
    };

    const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
        setNotificationAnchor(event.currentTarget);
    };

    const handleNotificationClose = () => {
        setNotificationAnchor(null);
    };

    const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setUserMenuAnchor(event.currentTarget);
    };

    const handleUserMenuClose = () => {
        setUserMenuAnchor(null);
    };

    const handleProfile = () => {
        handleUserMenuClose();
        navigate('/profile');
    };

    const handleSettings = () => {
        handleUserMenuClose();
        navigate('/settings');
    };

    const handleLogout = async () => {
        handleUserMenuClose();
        await api.logout();        
        navigate(0)
    };

    return (
        <Box
            sx={{
                height: 54,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2.5,
                borderBottom: "1px solid var(--border-color)",
                backgroundColor: "var(--background-color)",
                flexShrink: 0,
            }}
        >
            {/* Search */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    backgroundColor: "var(--background-dimmer)",
                    borderRadius: 2,
                    px: 1.5,
                    py: 0.5,
                    width: 280,
                    border: "1px solid var(--border-color)",
                }}
            >
                <FiSearch size={14} style={{ color: "var(--text-dimmer)", flexShrink: 0 }} />
                <InputBase
                    placeholder="Search..."
                    sx={{
                        fontSize: "0.8rem",
                        color: "var(--text-color)",
                        "& input::placeholder": { color: "var(--text-dimmer)", opacity: 1 },
                        flex: 1,
                    }}
                />
            </Box>

            {/* Right actions */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <IconButton
                    size="small"
                    onClick={handleThemeToggle}
                    title={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    sx={{ color: "var(--text-dimmer)", "&:hover": { color: "var(--text-color)" } }}
                >
                    {currentTheme === 'dark' ? <FaSun size={14} /> : <FaMoon size={14} />}
                </IconButton>

                <IconButton
                    size="small"
                    onClick={handleNotificationClick}
                    title="Notifications"
                    sx={{ color: "var(--text-dimmer)", "&:hover": { color: "var(--text-color)" } }}
                >
                    <Badge badgeContent={unreadCount} color="error" variant={unreadCount > 0 ? "standard" : "dot"} invisible={unreadCount === 0}>
                        <FaBell size={14} />
                    </Badge>
                </IconButton>

                <Menu
                    anchorEl={notificationAnchor}
                    open={Boolean(notificationAnchor)}
                    onClose={handleNotificationClose}
                    PaperProps={{
                        sx: {
                            width: 320,
                            maxHeight: 400,
                            backgroundColor: "var(--background-dimmer)",
                            border: "1px solid var(--border-color)",
                            mt: 1,
                        },
                    }}
                    transformOrigin={{ horizontal: "right", vertical: "top" }}
                    anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                >
                    <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                            Notifications
                        </Typography>
                        {unreadCount > 0 && (
                            <Button
                                size="small"
                                startIcon={<FaCheck size={10} />}
                                onClick={() => { markAllReadMutation.mutate(); }}
                                sx={{ fontSize: "0.65rem", textTransform: "none", color: "var(--primary-color)", minWidth: 0, p: 0.5 }}
                            >
                                Mark all read
                            </Button>
                        )}
                    </Box>
                    {notifications.length > 0 ? (
                        notifications.map((notification: any) => (
                            <MenuItem
                                key={notification.id}
                                onClick={() => {
                                    if (!notification.read && !notification.is_read) {
                                        markReadMutation.mutate(notification.id);
                                    }
                                    handleNotificationClose();
                                }}
                                sx={{
                                    py: 1.5,
                                    opacity: (notification.read || notification.is_read) ? 0.6 : 1,
                                    borderLeft: (!notification.read && !notification.is_read) ? "3px solid var(--primary-color)" : "3px solid transparent",
                                }}
                            >
                                <Box>
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.8rem" }}>
                                        {notification.title ?? notification.type}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                                        {notification.message}
                                    </Typography>
                                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25, fontSize: "0.65rem" }}>
                                        {notification.created_at ? new Date(notification.created_at).toLocaleString() : notification.time ?? ''}
                                    </Typography>
                                </Box>
                            </MenuItem>
                        ))
                    ) : (
                        <MenuItem disabled>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
                                No new notifications
                            </Typography>
                        </MenuItem>
                    )}
                </Menu>

                <Divider orientation="vertical" sx={{ height: 20, mx: 0.5 }} />

                {/* User avatar + menu */}
                <IconButton
                    size="small"
                    onClick={handleUserMenuClick}
                    sx={{ p: 0.25 }}
                >
                    <Avatar
                        sx={{
                            width: 30,
                            height: 30,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            backgroundColor: "var(--primary-color)",
                            color: "#fff",
                        }}
                    >
                        {profile?.first_name?.[0] || profile?.username?.[0] || "A"}
                    </Avatar>
                </IconButton>
                <Menu
                    anchorEl={userMenuAnchor}
                    open={Boolean(userMenuAnchor)}
                    onClose={handleUserMenuClose}
                    PaperProps={{
                        sx: {
                            width: 200,
                            backgroundColor: "var(--background-dimmer)",
                            border: "1px solid var(--border-color)",
                            mt: 1,
                        },
                    }}
                    transformOrigin={{ horizontal: "right", vertical: "top" }}
                    anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                >
                    <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid var(--border-color)" }}>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.8rem" }}>
                            {profile?.first_name || profile?.username || "Admin"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                            {profile?.email || ""}
                        </Typography>
                    </Box>
                    <MenuItem onClick={handleProfile} sx={{ py: 1, fontSize: "0.82rem" }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                            <FaUserCircle size={14} />
                        </ListItemIcon>
                        <ListItemText primaryTypographyProps={{ fontSize: "0.82rem" }}>Profile</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={handleSettings} sx={{ py: 1 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                            <FaCog size={14} />
                        </ListItemIcon>
                        <ListItemText primaryTypographyProps={{ fontSize: "0.82rem" }}>Settings</ListItemText>
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={handleLogout} sx={{ py: 1 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                            <FaSignOutAlt size={14} style={{ color: "#d32f2f" }} />
                        </ListItemIcon>
                        <ListItemText>
                            <Typography sx={{ fontSize: "0.82rem" }} color="error">Logout</Typography>
                        </ListItemText>
                    </MenuItem>
                </Menu>
            </Box>
        </Box>
    );
}
