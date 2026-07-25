import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    Button,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from "@mui/material";
import { FaPlus, FaTrash, FaEdit } from "react-icons/fa";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAPI from "../../../hooks/useAPI";

export default function WebsitePostList() {
    const navigate = useNavigate();
    const api = useAPI();
    const queryClient = useQueryClient();
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { data: postsResponse, isLoading } = useQuery({
        queryKey: ["website-posts"],
        queryFn: () => api.getWebsitePosts(),
    });
    const posts = postsResponse?.data || [];

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.deleteWebsitePost(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["website-posts"] });
            setDeleteId(null);
        },
        onError: (err: any) => {
            setError(err?.response?.data?.message || "Failed to delete post");
            setDeleteId(null);
        },
    });

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    };

    return (
        <div>
            <Box sx={{ mb: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                    <h2 style={{ margin: 0 }}>Website Posting</h2>
                    <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)" }}>Manage homepage posts</p>
                </div>
                <Button variant="contained" startIcon={<FaPlus />} onClick={() => navigate("/website-posting/create")} sx={{ backgroundColor: "#FF7A00", "&:hover": { backgroundColor: "#E66D00" } }}>
                    Ongeza Post
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

            {isLoading ? (
                <Typography>Loading...</Typography>
            ) : posts.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: "center" }}>
                    <Typography variant="body1" color="text.secondary">No website posts yet. Click "Ongeza Post" to create one.</Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Cover</TableCell>
                                <TableCell>Title</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Created</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {posts.map((post: any) => (
                                <TableRow key={post.id}>
                                    <TableCell>
                                        {post.cover_image && (
                                            <img src={post.cover_image} alt="" style={{ width: 80, height: 45, objectFit: "cover", borderRadius: 4 }} />
                                        )}
                                    </TableCell>
                                    <TableCell>{post.title}</TableCell>
                                    <TableCell>{formatDate(post.date)}</TableCell>
                                    <TableCell>{formatDate(post.created_at)}</TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => navigate(`/website-posting/${post.id}/edit`)} color="primary">
                                            <FaEdit />
                                        </IconButton>
                                        <IconButton size="small" onClick={() => setDeleteId(post.id)} color="error">
                                            <FaTrash />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)}>
                <DialogTitle>Delete Post</DialogTitle>
                <DialogContent>
                    <DialogContentText>Are you sure you want to delete this post?</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteId(null)}>Cancel</Button>
                    <Button onClick={() => deleteId && deleteMutation.mutate(deleteId)} color="error">Delete</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
