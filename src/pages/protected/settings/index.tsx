import { useState } from 'react';
import { Box, Tabs, Tab, Typography, Avatar, Chip, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Switch } from '@mui/material';
import { FaUserShield, FaCog, FaBell, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import type { GridColDef } from '@mui/x-data-grid';
import { PageHeader } from '../../../components/page-header';
import { WorkspaceContainer } from '../../../components/workspace-container';
import DataGridWrapper from '../../../components/DataTable/DataGridWrapper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useAPI from '../../../hooks/useAPI';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
    return (
        <div role="tabpanel" hidden={value !== index} className="tab-panel">
            {value === index && <Box>{children}</Box>}
        </div>
    );
}

export default function Settings() {
    const api = useAPI();
    const queryClient = useQueryClient();
    const [tabValue, setTabValue] = useState(0);
    const [adminDialog, setAdminDialog] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<any>(null);
    const [deleteDialog, setDeleteDialog] = useState<number | null>(null);
    const [adminForm, setAdminForm] = useState({ first_name: '', last_name: '', email: '', username: '', role: 'admin', password: '' });
    const [settingsForm, setSettingsForm] = useState<any>(null);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // Fetch admin users
    const { data: adminUsersResponse, isLoading: isAdminLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: () => api.getAdminUsers(),
    });

    // Fetch settings
    const { data: settingsResponse } = useQuery({
        queryKey: ['settings'],
        queryFn: () => api.getSettings(),
    });

    const adminUsers = (adminUsersResponse?.data ?? []).map((u: any) => ({
        id: u.id,
        name: u.full_name || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.username,
        email: u.email,
        role: u.permission ?? u.role ?? 'Admin',
        status: u.is_active ? 'Active' : 'Inactive',
        lastLogin: u.last_login ?? '',
    }));

    // Sync settingsForm when data loads
    if (settingsResponse?.data && settingsForm === null) {
        const data = settingsResponse.data;
        setSettingsForm({
            ...data,
            // release_notes ni JSON array backend — kwenye form tunaweka kama text (mstari kwa mstari)
            release_notes: Array.isArray(data.release_notes) ? data.release_notes.join('\n') : '',
        });
    }

    const handleSaveSettings = async () => {
        if (!settingsForm) return;
        setIsSavingSettings(true);
        const payload = {
            ...settingsForm,
            release_notes: String(settingsForm.release_notes || '')
                .split('\n')
                .map((line: string) => line.trim())
                .filter(Boolean),
        };
        await api.updateSettings(payload).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ['settings'] });
        setIsSavingSettings(false);
    };

    const createAdminMutation = useMutation({
        mutationFn: (data: any) => api.createAdminUser(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            handleCloseAdminDialog();
        },
    });

    const updateAdminMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => api.updateAdminUser(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            handleCloseAdminDialog();
        },
    });

    const deleteAdminMutation = useMutation({
        mutationFn: (id: number) => api.deleteAdminUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setDeleteDialog(null);
        },
    });

    const handleOpenAdminDialog = (admin?: any) => {
        if (admin) {
            setEditingAdmin(admin);
            setAdminForm({
                first_name: admin.name?.split(' ')[0] ?? '',
                last_name: admin.name?.split(' ').slice(1).join(' ') ?? '',
                email: admin.email,
                username: admin.email,
                role: admin.role?.toLowerCase() ?? 'admin',
                password: '',
            });
        } else {
            setEditingAdmin(null);
            setAdminForm({ first_name: '', last_name: '', email: '', username: '', role: 'admin', password: '' });
        }
        setAdminDialog(true);
    };

    const handleCloseAdminDialog = () => {
        setAdminDialog(false);
        setEditingAdmin(null);
        setAdminForm({ first_name: '', last_name: '', email: '', username: '', role: 'admin', password: '' });
    };

    const handleSaveAdmin = () => {
        if (editingAdmin) {
            const payload: any = { ...adminForm };
            if (!payload.password) delete payload.password;
            updateAdminMutation.mutate({ id: editingAdmin.id, data: payload });
        } else {
            createAdminMutation.mutate(adminForm);
        }
    };

    const adminColumns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'Name',
            flex: 1.5,
            minWidth: 180,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', backgroundColor: 'var(--primary-color)' }}>
                        {params.value?.[0]}
                    </Avatar>
                    <Box>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>{params.value}</Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-dimmer)', fontSize: '0.7rem' }}>{params.row.email}</Typography>
                    </Box>
                </Box>
            ),
        },
        {
            field: 'role',
            headerName: 'Role',
            flex: 0.8,
            minWidth: 120,
            renderCell: (params) => (
                <Chip
                    label={params.value}
                    size="small"
                    sx={{
                        fontSize: '0.7rem',
                        height: 22,
                        backgroundColor: params.value === 'Super Admin' ? 'rgba(255,122,0,0.12)' : 'rgba(100,100,100,0.12)',
                        color: params.value === 'Super Admin' ? 'var(--primary-color)' : 'var(--text-dimmer)',
                    }}
                />
            ),
        },
        {
            field: 'status',
            headerName: 'Status',
            flex: 0.6,
            minWidth: 100,
            renderCell: (params) => (
                <Chip
                    label={params.value}
                    size="small"
                    sx={{
                        fontSize: '0.7rem',
                        height: 22,
                        backgroundColor: params.value === 'Active' ? 'rgba(46,125,50,0.12)' : 'rgba(100,100,100,0.12)',
                        color: params.value === 'Active' ? '#2e7d32' : 'var(--text-dimmer)',
                    }}
                />
            ),
        },
        {
            field: 'lastLogin',
            headerName: 'Last Login',
            flex: 1,
            minWidth: 150,
            valueFormatter: (value: any) => {
                if (!value) return 'Never';
                return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            },
        },
        {
            field: 'actions',
            headerName: '',
            flex: 0.5,
            minWidth: 80,
            filterable: false,
            sortable: false,
            align: 'right',
            headerAlign: 'right',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="small" sx={{ color: 'var(--text-dimmer)', '&:hover': { color: 'var(--primary-color)' } }} onClick={() => handleOpenAdminDialog(params.row)}>
                        <FaEdit size={12} />
                    </IconButton>
                    <IconButton size="small" sx={{ color: 'var(--text-dimmer)', '&:hover': { color: '#d32f2f' } }} onClick={() => setDeleteDialog(params.row.id)}>
                        <FaTrash size={12} />
                    </IconButton>
                </Box>
            ),
        },
    ];

    const isSavingAdmin = createAdminMutation.isPending || updateAdminMutation.isPending;

    return (
        <div>
            <PageHeader
                title="Settings"
                subtitle="System configuration and admin management"
            />

            <Box sx={{ borderBottom: 1, borderColor: 'var(--border-color)' }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, v) => setTabValue(v)}
                    sx={{
                        minHeight: 40,
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontSize: '0.82rem',
                            fontWeight: 500,
                            minHeight: 40,
                            py: 0,
                            color: 'var(--text-dimmer)',
                            '&.Mui-selected': { color: 'var(--primary-color)' },
                        },
                        '& .MuiTabs-indicator': { backgroundColor: 'var(--primary-color)' },
                    }}
                >
                    <Tab icon={<FaUserShield size={13} />} iconPosition="start" label="Admin Users" />
                    <Tab icon={<FaCog size={13} />} iconPosition="start" label="General" />
                    <Tab icon={<FaBell size={13} />} iconPosition="start" label="Notifications" />
                </Tabs>
            </Box>

            {/* Admin Users Tab */}
            <TabPanel value={tabValue} index={0}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, mt: 2 }}>
                    <Button
                        variant="contained"
                        startIcon={<FaPlus size={12} />}
                        size="small"
                        onClick={() => handleOpenAdminDialog()}
                        sx={{
                            backgroundColor: 'var(--primary-color)',
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '0.8rem',
                            borderRadius: 2,
                            px: 2,
                            '&:hover': { backgroundColor: '#E66D00' },
                        }}
                    >
                        Add Admin
                    </Button>
                </Box>
                <WorkspaceContainer>
                    <DataGridWrapper columns={adminColumns} rows={adminUsers} loading={isAdminLoading} checkboxSelection />
                </WorkspaceContainer>
            </TabPanel>

            {/* General Settings Tab */}
            <TabPanel value={tabValue} index={1}>
                <WorkspaceContainer>
                    <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 480 }}>
                        <TextField
                            label="Platform Name"
                            size="small"
                            fullWidth
                            value={settingsForm?.platform_name ?? ''}
                            onChange={(e) => setSettingsForm((p: any) => ({ ...p, platform_name: e.target.value }))}
                        />
                        <TextField
                            label="Language"
                            size="small"
                            fullWidth
                            value={settingsForm?.language ?? ''}
                            onChange={(e) => setSettingsForm((p: any) => ({ ...p, language: e.target.value }))}
                        />
                        <TextField
                            label="App Version (latest)"
                            size="small"
                            fullWidth
                            value={settingsForm?.app_version ?? ''}
                            onChange={(e) => setSettingsForm((p: any) => ({ ...p, app_version: e.target.value }))}
                            helperText="Inatumiwa na in-app update card — weka version mpya zaidi kwenye Play Store"
                        />
                        <TextField
                            label="Minimum Version"
                            size="small"
                            fullWidth
                            value={settingsForm?.minimum_version ?? ''}
                            onChange={(e) => setSettingsForm((p: any) => ({ ...p, minimum_version: e.target.value }))}
                        />
                        <TextField
                            label="Update URL"
                            size="small"
                            fullWidth
                            value={settingsForm?.update_url ?? ''}
                            onChange={(e) => setSettingsForm((p: any) => ({ ...p, update_url: e.target.value }))}
                        />
                        <TextField
                            label="Release Notes (mstari kwa mstari)"
                            size="small"
                            fullWidth
                            multiline
                            minRows={3}
                            value={settingsForm?.release_notes ?? ''}
                            onChange={(e) => setSettingsForm((p: any) => ({ ...p, release_notes: e.target.value }))}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.82rem' }}>Force Update</Typography>
                                <Typography variant="caption" sx={{ color: 'var(--text-dimmer)' }}>Lazimisha mtumiaji asasishe kabla ya kutumia</Typography>
                            </Box>
                            <Switch
                                size="small"
                                checked={!!settingsForm?.is_force_update}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettingsForm((p: any) => ({ ...p, is_force_update: e.target.checked }))}
                            />
                        </Box>
                        <Box>
                            <Typography variant="caption" sx={{ color: 'var(--text-dimmer)' }}>Authentication</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.82rem', mt: 0.3 }}>JWT with httpOnly cookies</Typography>
                        </Box>
                        <Button
                            variant="contained"
                            size="small"
                            disabled={isSavingSettings}
                            onClick={handleSaveSettings}
                            sx={{ alignSelf: 'flex-start', backgroundColor: 'var(--primary-color)', textTransform: 'none', '&:hover': { backgroundColor: '#E66D00' } }}
                        >
                            {isSavingSettings ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </Box>
                </WorkspaceContainer>
            </TabPanel>

            {/* Notifications Tab */}
            <TabPanel value={tabValue} index={2}>
                <WorkspaceContainer>
                    <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 480 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>Push Notifications</Typography>
                                <Typography variant="caption" sx={{ color: 'var(--text-dimmer)' }}>Send push notifications to app users</Typography>
                            </Box>
                            <FormControl size="small" sx={{ minWidth: 110 }}>
                                <Select
                                    value={settingsForm?.push_notifications_enabled ? 'enabled' : 'disabled'}
                                    onChange={(e) => setSettingsForm((p: any) => ({ ...p, push_notifications_enabled: e.target.value === 'enabled' }))}
                                >
                                    <MenuItem value="enabled">Enabled</MenuItem>
                                    <MenuItem value="disabled">Disabled</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>Email Notifications</Typography>
                                <Typography variant="caption" sx={{ color: 'var(--text-dimmer)' }}>Send email notifications to users</Typography>
                            </Box>
                            <FormControl size="small" sx={{ minWidth: 110 }}>
                                <Select
                                    value={settingsForm?.email_notifications_enabled ? 'enabled' : 'disabled'}
                                    onChange={(e) => setSettingsForm((p: any) => ({ ...p, email_notifications_enabled: e.target.value === 'enabled' }))}
                                >
                                    <MenuItem value="enabled">Enabled</MenuItem>
                                    <MenuItem value="disabled">Disabled</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <Button
                            variant="contained"
                            size="small"
                            disabled={isSavingSettings}
                            onClick={handleSaveSettings}
                            sx={{ alignSelf: 'flex-start', backgroundColor: 'var(--primary-color)', textTransform: 'none', '&:hover': { backgroundColor: '#E66D00' } }}
                        >
                            {isSavingSettings ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </Box>
                </WorkspaceContainer>
            </TabPanel>

            {/* Admin Create/Edit Dialog */}
            <Dialog
                open={adminDialog}
                onClose={handleCloseAdminDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { backgroundColor: 'var(--background-color)', border: '1px solid var(--border-color)', borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>
                    {editingAdmin ? 'Edit Admin User' : 'Add Admin User'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField label="First Name" size="small" fullWidth value={adminForm.first_name} onChange={(e) => setAdminForm(p => ({ ...p, first_name: e.target.value }))} />
                            <TextField label="Last Name" size="small" fullWidth value={adminForm.last_name} onChange={(e) => setAdminForm(p => ({ ...p, last_name: e.target.value }))} />
                        </Box>
                        <TextField label="Email" size="small" fullWidth value={adminForm.email} onChange={(e) => setAdminForm(p => ({ ...p, email: e.target.value }))} />
                        <TextField label="Username" size="small" fullWidth value={adminForm.username} onChange={(e) => setAdminForm(p => ({ ...p, username: e.target.value }))} />
                        <FormControl size="small" fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select label="Role" value={adminForm.role} onChange={(e) => setAdminForm(p => ({ ...p, role: e.target.value }))}>
                                <MenuItem value="super_admin">Super Admin</MenuItem>
                                <MenuItem value="admin">Admin</MenuItem>
                                <MenuItem value="moderator">Moderator</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label={editingAdmin ? 'New Password (leave blank to keep)' : 'Password'}
                            size="small"
                            fullWidth
                            type="password"
                            value={adminForm.password}
                            onChange={(e) => setAdminForm(p => ({ ...p, password: e.target.value }))}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleCloseAdminDialog} size="small" sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button
                        onClick={handleSaveAdmin}
                        variant="contained"
                        size="small"
                        disabled={isSavingAdmin}
                        sx={{ backgroundColor: 'var(--primary-color)', textTransform: 'none', '&:hover': { backgroundColor: '#E66D00' } }}
                    >
                        {isSavingAdmin ? 'Saving...' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialog !== null}
                onClose={() => setDeleteDialog(null)}
                PaperProps={{ sx: { backgroundColor: 'var(--background-color)', border: '1px solid var(--border-color)', borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>Remove Admin User</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">Are you sure you want to remove this admin user? This action cannot be undone.</Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteDialog(null)} size="small" sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button
                        onClick={() => deleteDialog && deleteAdminMutation.mutate(deleteDialog)}
                        variant="contained"
                        color="error"
                        size="small"
                        disabled={deleteAdminMutation.isPending}
                        sx={{ textTransform: 'none' }}
                    >
                        {deleteAdminMutation.isPending ? 'Removing...' : 'Remove'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
