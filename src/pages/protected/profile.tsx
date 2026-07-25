import { useEffect, useState } from 'react';
import { Box, Typography, Avatar, TextField, Button, Divider, Alert } from '@mui/material';
import { FaSave } from 'react-icons/fa';
import { PageHeader } from '../../components/page-header';
import { WorkspaceContainer } from '../../components/workspace-container';
import useAuth from '../../hooks/useAuth';
import useAPI from '../../hooks/useAPI';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export default function Profile() {
    const auth: any = useAuth();
    const api = useAPI();
    const queryClient = useQueryClient();
    const contextProfile = auth?.auth?.profile;

    const { data: profileResponse } = useQuery({
        queryKey: ['profile'],
        queryFn: () => api.getProfile(),
    });

    const profile = profileResponse?.data ?? contextProfile;

    const [form, setForm] = useState({ first_name: '', last_name: '', email: '', username: '' });
    const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (profile) {
            setForm({
                first_name: profile.first_name ?? profile.user?.first_name ?? '',
                last_name: profile.last_name ?? profile.user?.last_name ?? '',
                email: profile.email ?? profile.user?.email ?? '',
                username: profile.username ?? profile.user?.username ?? '',
            });
        }
    }, [profile]);

    const updateProfileMutation = useMutation({
        mutationFn: (data: any) => api.updateProfile(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
        },
        onError: () => setProfileMsg({ type: 'error', text: 'Failed to update profile.' }),
    });

    const changePasswordMutation = useMutation({
        mutationFn: (data: any) => api.changePassword(data),
        onSuccess: () => {
            setPwForm({ current_password: '', new_password: '', confirm_password: '' });
            setPwMsg({ type: 'success', text: 'Password changed successfully.' });
        },
        onError: () => setPwMsg({ type: 'error', text: 'Failed to change password. Check your current password.' }),
    });

    const handleSaveProfile = () => {
        setProfileMsg(null);
        updateProfileMutation.mutate(form);
    };

    const handleChangePassword = () => {
        setPwMsg(null);
        if (pwForm.new_password !== pwForm.confirm_password) {
            setPwMsg({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        if (!pwForm.current_password || !pwForm.new_password) {
            setPwMsg({ type: 'error', text: 'All password fields are required.' });
            return;
        }
        changePasswordMutation.mutate(pwForm);
    };

    const displayName = profile?.first_name
        ? `${profile.first_name} ${profile.last_name || ''}`
        : profile?.user?.first_name
            ? `${profile.user.first_name} ${profile.user.last_name || ''}`
            : profile?.username || profile?.user?.username || 'Admin User';

    const displayEmail = profile?.email || profile?.user?.email || '';
    const displayRole = profile?.permission || profile?.user?.permission || 'Administrator';

    return (
        <div>
            <PageHeader
                title="Profile"
                subtitle="Manage your account details"
            />

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {/* Profile Card */}
                <WorkspaceContainer>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3, px: 4, minWidth: 240 }}>
                        <Avatar
                            src={profile?.avatar || profile?.user?.avatar || undefined}
                            sx={{
                                width: 72,
                                height: 72,
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                backgroundColor: 'var(--primary-color)',
                                mb: 2,
                            }}
                        >
                            {displayName[0]}
                        </Avatar>
                        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                            {displayName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-dimmer)' }}>
                            {displayEmail}
                        </Typography>
                        <Divider sx={{ width: '100%', my: 2 }} />
                        <Box sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="caption" sx={{ color: 'var(--text-dimmer)' }}>Role</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 500 }}>{displayRole}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption" sx={{ color: 'var(--text-dimmer)' }}>Status</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 500, color: '#2e7d32' }}>Active</Typography>
                            </Box>
                        </Box>
                    </Box>
                </WorkspaceContainer>

                {/* Edit Form */}
                <Box sx={{ flex: 1, minWidth: 300 }}>
                    <WorkspaceContainer>
                        <Box sx={{ py: 2, px: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>Account Information</Typography>
                            {profileMsg && <Alert severity={profileMsg.type} sx={{ mb: 2, fontSize: '0.8rem' }}>{profileMsg.text}</Alert>}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <TextField label="First Name" size="small" fullWidth value={form.first_name} onChange={(e) => setForm(p => ({ ...p, first_name: e.target.value }))} />
                                    <TextField label="Last Name" size="small" fullWidth value={form.last_name} onChange={(e) => setForm(p => ({ ...p, last_name: e.target.value }))} />
                                </Box>
                                <TextField label="Email" size="small" fullWidth value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
                                <TextField label="Username" size="small" fullWidth value={form.username} onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))} />
                            </Box>
                            <Box sx={{ mt: 3 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<FaSave size={12} />}
                                    size="small"
                                    onClick={handleSaveProfile}
                                    disabled={updateProfileMutation.isPending}
                                    sx={{
                                        backgroundColor: 'var(--primary-color)',
                                        textTransform: 'none',
                                        fontWeight: 500,
                                        fontSize: '0.8rem',
                                        borderRadius: 2,
                                        '&:hover': { backgroundColor: '#E66D00' },
                                    }}
                                >
                                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </Box>
                        </Box>
                    </WorkspaceContainer>

                    <Box sx={{ mt: 2 }}>
                        <WorkspaceContainer>
                            <Box sx={{ py: 2, px: 2 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>Change Password</Typography>
                                {pwMsg && <Alert severity={pwMsg.type} sx={{ mb: 2, fontSize: '0.8rem' }}>{pwMsg.text}</Alert>}
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <TextField label="Current Password" size="small" fullWidth type="password" value={pwForm.current_password} onChange={(e) => setPwForm(p => ({ ...p, current_password: e.target.value }))} />
                                    <TextField label="New Password" size="small" fullWidth type="password" value={pwForm.new_password} onChange={(e) => setPwForm(p => ({ ...p, new_password: e.target.value }))} />
                                    <TextField label="Confirm New Password" size="small" fullWidth type="password" value={pwForm.confirm_password} onChange={(e) => setPwForm(p => ({ ...p, confirm_password: e.target.value }))} />
                                </Box>
                                <Box sx={{ mt: 3 }}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={handleChangePassword}
                                        disabled={changePasswordMutation.isPending}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 500,
                                            fontSize: '0.8rem',
                                            borderRadius: 2,
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--text-color)',
                                            '&:hover': { borderColor: 'var(--primary-color)', color: 'var(--primary-color)' },
                                        }}
                                    >
                                        {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                                    </Button>
                                </Box>
                            </Box>
                        </WorkspaceContainer>
                    </Box>
                </Box>
            </Box>
        </div>
    );
}