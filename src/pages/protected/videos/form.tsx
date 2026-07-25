import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Button,
    TextField,
    MenuItem,
    Card,
    CardContent,
    Typography,
    FormControl,
    InputLabel,
    Select,
    Stack,
} from '@mui/material';
import { FaSave, FaArrowLeft, FaUpload } from 'react-icons/fa';
import { WorkspaceContainer } from '../../../components/workspace-container';

export default function VideoForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        subcategory: '',
        thumbnail: null as File | null,
        videoFile: null as File | null,
        duration: '',
        status: 'Draft',
        adIntervals: [] as { type: string; timestamp: number }[],
    });

    const categories = ['Documentary', 'Nature', 'Travel', 'Entertainment', 'Education'];
    const subcategories = ['Culture', 'Wildlife', 'Beaches', 'Music', 'Technology'];
    const adTypes = ['interstitial', 'banner', 'rewarded'];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Implement save logic
        console.log('Form data:', formData);
        navigate('/content/videos');
    };

    const handleFileChange = (field: 'thumbnail' | 'videoFile') => (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, [field]: e.target.files[0] });
        }
    };

    const addAdInterval = () => {
        setFormData({
            ...formData,
            adIntervals: [...formData.adIntervals, { type: 'interstitial', timestamp: 0 }],
        });
    };

    const removeAdInterval = (index: number) => {
        const newIntervals = formData.adIntervals.filter((_, i) => i !== index);
        setFormData({ ...formData, adIntervals: newIntervals });
    };

    const updateAdInterval = (index: number, field: 'type' | 'timestamp', value: string | number) => {
        const newIntervals = [...formData.adIntervals];
        newIntervals[index] = { ...newIntervals[index], [field]: value };
        setFormData({ ...formData, adIntervals: newIntervals });
    };

    return (
        <div>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0 }}>{isEdit ? 'Edit Video' : 'Create New Video'}</h2>
                    <p style={{ margin: '4px 0 0 0', color: '#666' }}>
                        {isEdit ? 'Update video details' : 'Add a new video to your library'}
                    </p>
                </div>
                <Button
                    variant="outlined"
                    startIcon={<FaArrowLeft />}
                    onClick={() => navigate('/content/videos')}
                >
                    Back to List
                </Button>
            </Box>

            <WorkspaceContainer>
                <form onSubmit={handleSubmit}>
                    <Stack spacing={3}>
                        {/* Basic Information */}
                        <Typography variant="h6" gutterBottom>
                            Basic Information
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Box sx={{ flex: '1 1 60%', minWidth: 250 }}>
                                <TextField
                                    fullWidth
                                    label="Video Title"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </Box>

                            <Box sx={{ flex: '1 1 35%', minWidth: 200 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        value={formData.status}
                                        label="Status"
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <MenuItem value="Draft">Draft</MenuItem>
                                        <MenuItem value="Published">Published</MenuItem>
                                        <MenuItem value="Archived">Archived</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                        </Box>

                        <TextField
                            fullWidth
                            label="Description"
                            multiline
                            rows={4}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />

                        {/* Category Selection */}
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                            <FormControl fullWidth required>
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={formData.category}
                                    label="Category"
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {categories.map((cat) => (
                                        <MenuItem key={cat} value={cat}>
                                            {cat}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            </Box>

                            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Subcategory</InputLabel>
                                    <Select
                                        value={formData.subcategory}
                                        label="Subcategory"
                                        onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                                    >
                                        {subcategories.map((subcat) => (
                                            <MenuItem key={subcat} value={subcat}>
                                                {subcat}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>
                        </Box>

                        {/* File Uploads */}
                        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                            Media Files
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Box sx={{ flex: '1 1 45%', minWidth: 250 }}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Thumbnail Image
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            component="label"
                                            startIcon={<FaUpload />}
                                            fullWidth
                                        >
                                            Upload Thumbnail
                                            <input
                                                type="file"
                                                hidden
                                                accept="image/*"
                                                onChange={handleFileChange('thumbnail')}
                                            />
                                        </Button>
                                        {formData.thumbnail && (
                                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                                {formData.thumbnail.name}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Box>

                            <Box sx={{ flex: '1 1 45%', minWidth: 250 }}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Video File
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            component="label"
                                            startIcon={<FaUpload />}
                                            fullWidth
                                        >
                                            Upload Video
                                            <input
                                                type="file"
                                                hidden
                                                accept="video/*"
                                                onChange={handleFileChange('videoFile')}
                                            />
                                        </Button>
                                        {formData.videoFile && (
                                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                                {formData.videoFile.name}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Box>
                        </Box>

                        {/* Ad Intervals */}
                        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                            Ad Intervals
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Define when ads should appear during video playback
                        </Typography>

                        {formData.adIntervals.map((interval, index) => (
                            <Card variant="outlined" key={index}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <Box sx={{ flex: '1 1 30%', minWidth: 150 }}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Ad Type</InputLabel>
                                                <Select
                                                    value={interval.type}
                                                    label="Ad Type"
                                                    onChange={(e) =>
                                                        updateAdInterval(index, 'type', e.target.value)
                                                    }
                                                >
                                                    {adTypes.map((type) => (
                                                        <MenuItem key={type} value={type}>
                                                            {type}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Box>
                                        <Box sx={{ flex: '1 1 30%', minWidth: 150 }}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Timestamp (seconds)"
                                                type="number"
                                                value={interval.timestamp}
                                                onChange={(e) =>
                                                    updateAdInterval(index, 'timestamp', parseInt(e.target.value))
                                                }
                                            />
                                        </Box>
                                        <Box sx={{ flex: '1 1 30%', minWidth: 150 }}>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => removeAdInterval(index)}
                                                fullWidth
                                            >
                                                Remove
                                            </Button>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}

                        <Button variant="outlined" onClick={addAdInterval}>
                            + Add Ad Interval
                        </Button>

                        {/* Submit Buttons */}
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
                            <Button variant="outlined" onClick={() => navigate('/content/videos')}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                startIcon={<FaSave />}
                                sx={{ backgroundColor: '#FF7A00', '&:hover': { backgroundColor: '#E66D00' } }}
                            >
                                {isEdit ? 'Update Video' : 'Create Video'}
                            </Button>
                        </Box>
                    </Stack>
                </form>
            </WorkspaceContainer>
        </div>
    );
}
