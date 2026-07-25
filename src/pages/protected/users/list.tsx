import DataGridWrapper from '../../../components/DataTable/DataGridWrapper';
import type { GridColDef } from '@mui/x-data-grid';
import {
    Box, Chip, Avatar, Typography, IconButton, Dialog, DialogTitle,
    DialogContent, DialogActions, Button, Drawer, TextField, InputAdornment,
    Select, MenuItem, FormControl, Divider, Skeleton, Tooltip,
} from '@mui/material';
import { FaEye, FaBan, FaCheckCircle, FaSearch, FaComment, FaVideo, FaHeart, FaDownload, FaCoins, FaTrash, FaFilm } from 'react-icons/fa';
import { WorkspaceContainer } from '../../../components/workspace-container';
import { PageHeader } from '../../../components/page-header';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useAPI from '../../../hooks/useAPI';
import { useState } from 'react';
import { timeAgo, formatDate } from '../../../utils/dateUtils';
import { useNavigate } from 'react-router-dom';

export default function UsersList() {
    const api = useAPI();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [actionDialog, setActionDialog] = useState<{ open: boolean; userId: number | null; action: 'suspend' | 'unsuspend' | null }>({ open: false, userId: null, action: null });
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const { data: usersResponse, isLoading } = useQuery({
        queryKey: ['app-users', search, statusFilter],
        queryFn: () => api.getAppUsers({ search: search || undefined, status: statusFilter || undefined }),
    });

    const { data: userCommentsResponse, isLoading: isCommentsLoading } = useQuery({
        queryKey: ['user-comments', selectedUser?.id],
        queryFn: () => api.getUserComments(selectedUser.id, { page_size: 10 }),
        enabled: !!selectedUser,
    });

    const userComments = userCommentsResponse?.data ?? [];

    const users = (usersResponse?.data ?? []).map((u: any) => ({
        id: u.id,
        name: u.full_name || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.username,
        email: u.email,
        phone: u.phone_number ?? '',
        plan: u.plan ?? 'Free',
        status: u.is_suspended ? 'Suspended' : (u.is_active ? 'Active' : 'Inactive'),
        lastActive: u.last_active ?? u.last_login ?? '',
        joinedAt: u.date_joined,
        avatar: u.avatar,
        raw: u,
    }));

    const suspendMutation = useMutation({
        mutationFn: (id: number) => api.suspendAppUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['app-users'] });
            setActionDialog({ open: false, userId: null, action: null });
            if (selectedUser) setSelectedUser((p: any) => ({ ...p, is_suspended: true }));
        },
    });

    const unsuspendMutation = useMutation({
        mutationFn: (id: number) => api.unsuspendAppUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['app-users'] });
            setActionDialog({ open: false, userId: null, action: null });
            if (selectedUser) setSelectedUser((p: any) => ({ ...p, is_suspended: false }));
        },
    });

    const deleteCommentMutation = useMutation({
        mutationFn: (commentId: number) => api.deleteComment(commentId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-comments', selectedUser?.id] }),
    });

    const handleAction = () => {
        if (!actionDialog.userId || !actionDialog.action) return;
        if (actionDialog.action === 'suspend') suspendMutation.mutate(actionDialog.userId);
        else unsuspendMutation.mutate(actionDialog.userId);
    };

    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'User',
            flex: 1.5,
            minWidth: 200,
            filterable: true,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar src={params.row.avatar} sx={{ width: 28, height: 28, fontSize: '0.7rem', backgroundColor: 'var(--primary-color)' }}>
                        {params.value?.[0]}
                    </Avatar>
                    <Box>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>{params.value}</Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', fontSize: '0.7rem' }}>{params.row.email}</Typography>
                    </Box>
                </Box>
            ),
        },
        { field: 'phone', headerName: 'Phone', flex: 0.8, minWidth: 140, filterable: true },
        {
            field: 'plan', headerName: 'Plan', flex: 0.6, minWidth: 90, filterable: true,
            renderCell: (params) => (
                <Chip label={params.value} size="small" sx={{ fontSize: '0.7rem', height: 22, backgroundColor: params.value === 'Premium' ? 'rgba(255,122,0,0.12)' : 'rgba(100,100,100,0.12)', color: params.value === 'Premium' ? 'var(--primary-color)' : 'var(--text-dimmer)' }} />
            ),
        },
        {
            field: 'status', headerName: 'Status', flex: 0.6, minWidth: 100, filterable: true,
            renderCell: (params) => (
                <Chip label={params.value} size="small" sx={{ fontSize: '0.7rem', height: 22, backgroundColor: params.value === 'Active' ? 'rgba(46,125,50,0.12)' : 'rgba(211,47,47,0.12)', color: params.value === 'Active' ? '#2e7d32' : '#d32f2f' }} />
            ),
        },
        {
            field: 'lastActive', headerName: 'Last Active', flex: 1, minWidth: 140, filterable: true,
            valueFormatter: (value: any) => value ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
        },
        {
            field: 'joinedAt', headerName: 'Joined', flex: 0.8, minWidth: 110, filterable: true,
            valueFormatter: (value: any) => value ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
        },
        {
            field: 'actions', headerName: '', flex: 0.5, minWidth: 80, filterable: false, sortable: false, align: 'right', headerAlign: 'right',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="View profile">
                        <IconButton size="small" sx={{ color: 'var(--text-dimmer)', '&:hover': { color: 'var(--primary-color)' } }} onClick={() => setSelectedUser(params.row.raw)}>
                            <FaEye size={12} />
                        </IconButton>
                    </Tooltip>
                    {params.row.status === 'Active' ? (
                        <Tooltip title="Suspend user">
                            <IconButton size="small" sx={{ color: 'var(--text-dimmer)', '&:hover': { color: '#d32f2f' } }} onClick={() => setActionDialog({ open: true, userId: params.row.id, action: 'suspend' })}>
                                <FaBan size={12} />
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <Tooltip title="Restore access">
                            <IconButton size="small" sx={{ color: 'var(--text-dimmer)', '&:hover': { color: '#2e7d32' } }} onClick={() => setActionDialog({ open: true, userId: params.row.id, action: 'unsuspend' })}>
                                <FaCheckCircle size={12} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            ),
        },
    ];

    return (
        <div>
            <PageHeader title="Users" subtitle="App users and subscribers" />

            {/* Search + Filter Bar */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                <TextField
                    size="small"
                    placeholder="Search by name, email or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ flex: 1, minWidth: 240 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><FaSearch size={12} color="var(--text-dimmer)" /></InputAdornment> }}
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <Select displayEmpty value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <MenuItem value="">All Statuses</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="suspended">Suspended</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            <WorkspaceContainer>
                <DataGridWrapper columns={columns} rows={users} loading={isLoading} checkboxSelection />
            </WorkspaceContainer>

            {/* User Detail Drawer */}
            <Drawer
                anchor="right"
                open={!!selectedUser}
                onClose={() => setSelectedUser(null)}
                PaperProps={{ sx: { width: 420, backgroundColor: 'var(--background-color)', borderLeft: '1px solid var(--border-color)', p: 3 } }}
            >
                {selectedUser && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {/* Header */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar src={selectedUser.avatar} sx={{ width: 52, height: 52, fontSize: '1.2rem', backgroundColor: 'var(--primary-color)' }}>
                                {(selectedUser.full_name ?? selectedUser.username ?? 'U')[0]}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedUser.full_name ?? selectedUser.username}</Typography>
                                <Typography variant="caption" sx={{ color: 'var(--text-dimmer)' }}>{selectedUser.email}</Typography>
                                <Box sx={{ display: 'flex', gap: 0.8, mt: 0.5 }}>
                                    <Chip
                                        label={selectedUser.is_suspended ? 'Suspended' : (selectedUser.is_active ? 'Active' : 'Inactive')}
                                        size="small"
                                        sx={{ fontSize: '0.65rem', height: 18, backgroundColor: selectedUser.is_suspended ? 'rgba(211,47,47,0.12)' : 'rgba(46,125,50,0.12)', color: selectedUser.is_suspended ? '#d32f2f' : '#2e7d32' }}
                                    />
                                    <Chip label={selectedUser.auth_provider ?? 'email'} size="small" sx={{ fontSize: '0.65rem', height: 18, textTransform: 'capitalize' }} />
                                </Box>
                            </Box>
                            {selectedUser.is_suspended ? (
                                <Button size="small" variant="outlined" color="success" sx={{ textTransform: 'none', fontSize: '0.75rem' }} onClick={() => setActionDialog({ open: true, userId: selectedUser.id, action: 'unsuspend' })}>
                                    Restore
                                </Button>
                            ) : (
                                <Button size="small" variant="outlined" color="error" sx={{ textTransform: 'none', fontSize: '0.75rem' }} onClick={() => setActionDialog({ open: true, userId: selectedUser.id, action: 'suspend' })}>
                                    Suspend
                                </Button>
                            )}
                        </Box>

                        <Divider />

                        {/* Info */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {[
                                { label: 'Phone', value: selectedUser.phone_number ?? '—' },
                                { label: 'Joined', value: selectedUser.date_joined ? formatDate(selectedUser.date_joined, 'long') : '—' },
                                { label: 'Last Active', value: selectedUser.last_active ? timeAgo(selectedUser.last_active) : '—' },
                                { label: 'Verified', value: selectedUser.is_verified ? 'Yes' : 'No' },
                            ].map(({ label, value }) => (
                                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="caption" sx={{ color: 'var(--text-dimmer)' }}>{label}</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 500 }}>{value}</Typography>
                                </Box>
                            ))}
                        </Box>

                        <Divider />

                        {/* Activity Stats */}
                        <Box>
                            <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Activity</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                {[
                                    { icon: <FaVideo size={11} />, label: 'Watched', value: selectedUser.videos_watched_count ?? 0, color: '#FF7A00' },
                                    { icon: <FaHeart size={11} />, label: 'Favorites', value: selectedUser.favorites_count ?? 0, color: '#e91e63' },
                                    { icon: <FaDownload size={11} />, label: 'Downloads', value: selectedUser.downloads_count ?? 0, color: '#2196f3' },
                                    { icon: <FaComment size={11} />, label: 'Comments', value: selectedUser.comments_count ?? 0, color: '#9c27b0' },
                                    { icon: <FaCoins size={11} />, label: 'Credits', value: selectedUser.credits ?? 0, color: '#ff9800' },
                                ].map(({ icon, label, value, color }) => (
                                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.6, px: 1.2, py: 0.6, borderRadius: 1.5, border: '1px solid var(--border-color)', minWidth: 90 }}>
                                        <span style={{ color }}>{icon}</span>
                                        <Box>
                                            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.78rem', display: 'block' }}>{value}</Typography>
                                            <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', fontSize: '0.62rem' }}>{label}</Typography>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>

                        <Divider />

                        {/* User Comments */}
                        <Box>
                            <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recent Comments</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1, maxHeight: 280, overflowY: 'auto' }}>
                                {isCommentsLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="rounded" height={52} sx={{ borderRadius: 1.5 }} />)
                                ) : userComments.length === 0 ? (
                                    <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', py: 2, textAlign: 'center', display: 'block' }}>No comments yet</Typography>
                                ) : (
                                    userComments.map((c: any) => (
                                        <Box key={c.id} sx={{ p: 1, borderRadius: 1.5, border: '1px solid var(--border-color)', display: 'flex', gap: 1 }}>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                                                    <FaFilm size={9} color="var(--primary-color)" />
                                                    <Typography
                                                        variant="caption"
                                                        sx={{ fontSize: '0.65rem', color: 'var(--primary-color)', fontWeight: 500, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                                        onClick={() => { setSelectedUser(null); navigate(`/content/videos/${c.video_id}/view`); }}
                                                    >
                                                        {c.video_title ?? `Video #${c.video_id}`}
                                                    </Typography>
                                                    {c.is_reply && <Chip label="reply" size="small" sx={{ fontSize: '0.55rem', height: 14, ml: 0.5 }} />}
                                                </Box>
                                                <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', lineHeight: 1.4, wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {c.text}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', fontSize: '0.6rem', display: 'block', mt: 0.3 }}>
                                                    {c.created_at ? timeAgo(c.created_at) : ''}
                                                </Typography>
                                            </Box>
                                            <Tooltip title="Delete comment">
                                                <IconButton size="small" onClick={() => deleteCommentMutation.mutate(c.id)} sx={{ p: 0.3, alignSelf: 'flex-start' }}>
                                                    <FaTrash size={9} color="var(--text-dimmer)" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    ))
                                )}
                            </Box>
                        </Box>
                    </Box>
                )}
            </Drawer>

            {/* Suspend/Unsuspend Confirmation */}
            <Dialog
                open={actionDialog.open}
                onClose={() => setActionDialog({ open: false, userId: null, action: null })}
                PaperProps={{ sx: { backgroundColor: 'var(--background-color)', border: '1px solid var(--border-color)', borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>
                    {actionDialog.action === 'suspend' ? 'Suspend User' : 'Restore User'}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        {actionDialog.action === 'suspend'
                            ? 'Are you sure you want to suspend this user? They will lose access to the platform.'
                            : 'Are you sure you want to restore access for this user?'}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setActionDialog({ open: false, userId: null, action: null })} size="small" sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button
                        onClick={handleAction}
                        variant="contained"
                        size="small"
                        disabled={suspendMutation.isPending || unsuspendMutation.isPending}
                        sx={{ textTransform: 'none', backgroundColor: actionDialog.action === 'suspend' ? '#d32f2f' : '#2e7d32', '&:hover': { backgroundColor: actionDialog.action === 'suspend' ? '#b71c1c' : '#1b5e20' } }}
                    >
                        {(suspendMutation.isPending || unsuspendMutation.isPending) ? 'Processing...' : 'Confirm'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
