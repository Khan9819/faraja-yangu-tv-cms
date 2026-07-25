import { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Typography,
    TextField,
    IconButton,
    Avatar,
    Badge,
    InputAdornment,
    CircularProgress,
} from "@mui/material";
import { FaPaperPlane, FaSearch, FaComment, FaUser } from "react-icons/fa";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAPI from "../../../hooks/useAPI";
import { PageHeader } from "../../../components/page-header";

function timeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

interface Conversation {
    user_id: number;
    user_name: string;
    user_avatar: string | null;
    video_id: number;
    video_title: string;
    video_thumbnail: string | null;
    latest_text: string;
    latest_at: string;
    message_count: number;
}

interface Message {
    id: number;
    uid: string;
    text: string;
    author_name: string;
    author_avatar: string | null;
    author_id: number;
    created_at: string;
    is_reply: boolean;
    reply_to_id: number | null;
    is_me: boolean;
}

export default function CommentsInbox() {
    const api = useAPI();
    const queryClient = useQueryClient();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [replyText, setReplyText] = useState("");

    const { data: convResponse, isLoading: convLoading } = useQuery({
        queryKey: ["comment-conversations", debouncedSearch],
        queryFn: () => api.getCommentConversations(debouncedSearch || undefined),
    });

    const conversations: Conversation[] = useMemo(() => {
        return convResponse?.data || [];
    }, [convResponse]);

    const { data: msgResponse, isLoading: msgLoading } = useQuery({
        queryKey: ["comment-conversation", selectedConversation?.user_id, selectedConversation?.video_id],
        queryFn: () =>
            api.getCommentConversation(selectedConversation!.user_id, selectedConversation!.video_id),
        enabled: !!selectedConversation,
    });

    const messages: Message[] = useMemo(() => {
        return msgResponse?.data?.messages || [];
    }, [msgResponse]);

    const replyMutation = useMutation({
        mutationFn: ({ commentId, text }: { commentId: number; text: string }) =>
            api.replyToComment(commentId, text),
        onSuccess: () => {
            setReplyText("");
            queryClient.invalidateQueries({
                queryKey: ["comment-conversation", selectedConversation?.user_id, selectedConversation?.video_id],
            });
            queryClient.invalidateQueries({ queryKey: ["comment-conversations"] });
        },
    });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendReply = () => {
        if (!replyText.trim() || !selectedConversation || messages.length === 0) return;
        const targetComment = messages[messages.length - 1];
        replyMutation.mutate({ commentId: targetComment.id, text: replyText.trim() });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendReply();
        }
    };

    return (
        <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <Box sx={{ px: 3, pt: 2, flexShrink: 0 }}>
                <PageHeader
                    title="Comments"
                    subtitle="Manage user comments and replies"
                    breadcrumbs={[{ label: "Comments", path: "/comments" }]}
                />
            </Box>

            <Box sx={{ display: "flex", flex: 1, overflow: "hidden", borderTop: "1px solid var(--border-color)" }}>
                {/* Left sidebar */}
                <Box
                    sx={{
                        width: 320,
                        minWidth: 320,
                        borderRight: "1px solid var(--border-color)",
                        display: "flex",
                        flexDirection: "column",
                        backgroundColor: "var(--background-color)",
                        overflow: "hidden",
                    }}
                >
                    {/* Search — fixed */}
                    <Box sx={{ p: 1.5, borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
                        <TextField
                            placeholder="Search conversations..."
                            size="small"
                            fullWidth
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <FaSearch size={12} color="var(--text-dimmer)" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    fontSize: "0.82rem",
                                    backgroundColor: "var(--background-light)",
                                    borderRadius: 2,
                                },
                            }}
                        />
                    </Box>

                    {/* Conversations — scrollable only */}
                    <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                        {convLoading && conversations.length === 0 && (
                            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                                <CircularProgress size={24} />
                            </Box>
                        )}

                        {conversations.map((conv) => {
                            const isSelected =
                                selectedConversation?.user_id === conv.user_id &&
                                selectedConversation?.video_id === conv.video_id;
                            return (
                                <Box
                                    key={`${conv.user_id}-${conv.video_id}`}
                                    onClick={() => setSelectedConversation(conv)}
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1.5,
                                        p: 1.5,
                                        cursor: "pointer",
                                        borderBottom: "1px solid var(--border-color)",
                                        backgroundColor: isSelected ? "var(--background-light)" : "transparent",
                                        "&:hover": { backgroundColor: "var(--background-light)" },
                                        transition: "background-color 0.15s ease",
                                    }}
                                >
                                    <Badge
                                        badgeContent={conv.message_count}
                                        color="primary"
                                        sx={{
                                            "& .MuiBadge-badge": {
                                                fontSize: "0.65rem",
                                                height: 18,
                                                minWidth: 18,
                                            },
                                        }}
                                    >
                                        <Avatar src={conv.user_avatar || undefined} sx={{ width: 40, height: 40, fontSize: "0.85rem" }}>
                                            <FaUser size={14} />
                                        </Avatar>
                                    </Badge>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.25 }}>
                                            <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {conv.user_name}
                                            </Typography>
                                            <Typography sx={{ fontSize: "0.7rem", color: "var(--text-dimmer)", flexShrink: 0, ml: 0.5 }}>
                                                {conv.latest_at ? timeAgo(conv.latest_at) : ""}
                                            </Typography>
                                        </Box>
                                        <Typography sx={{ fontSize: "0.75rem", color: "var(--primary-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", mb: 0.25 }}>
                                            {conv.video_title}
                                        </Typography>
                                        <Typography sx={{ fontSize: "0.78rem", color: "var(--text-dimmer)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {conv.latest_text}
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        })}

                        {!convLoading && conversations.length === 0 && (
                            <Box sx={{ textAlign: "center", p: 4, color: "var(--text-dimmer)" }}>
                                <FaComment size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                                <Typography sx={{ fontSize: "0.82rem" }}>No conversations yet</Typography>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Right panel - messages */}
                <Box
                    sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        backgroundColor: "var(--background-light)",
                        overflow: "hidden",
                    }}
                >
                    {selectedConversation ? (
                        <>
                            {/* Header */}
                            <Box
                                sx={{
                                    p: 1.5,
                                    borderBottom: "1px solid var(--border-color)",
                                    backgroundColor: "var(--background-color)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                    flexShrink: 0,
                                }}
                            >
                                <Avatar
                                    src={selectedConversation.user_avatar || undefined}
                                    sx={{ width: 36, height: 36, fontSize: "0.8rem" }}
                                >
                                    <FaUser size={12} />
                                </Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-color)" }}>
                                        {selectedConversation.user_name}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontSize: "0.75rem",
                                            color: "var(--text-dimmer)",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {selectedConversation.video_title}
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Messages area */}
                            <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
                                {msgLoading && messages.length === 0 && (
                                    <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                                        <CircularProgress size={24} />
                                    </Box>
                                )}

                                {messages.map((msg, index) => {
                                    const isUser = !msg.is_me;
                                    const showDate =
                                        index === 0 ||
                                        new Date(msg.created_at).toDateString() !==
                                            new Date(messages[index - 1].created_at).toDateString();

                                    return (
                                        <Box key={msg.id} sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                            {showDate && (
                                                <Box sx={{ display: "flex", justifyContent: "center", my: 1 }}>
                                                    <Typography
                                                        sx={{
                                                            fontSize: "0.7rem",
                                                            color: "var(--text-dimmer)",
                                                            backgroundColor: "var(--background-color)",
                                                            px: 1.5,
                                                            py: 0.25,
                                                            borderRadius: 3,
                                                        }}
                                                    >
                                                        {new Date(msg.created_at).toLocaleDateString("en-US", {
                                                            weekday: "short",
                                                            month: "short",
                                                            day: "numeric",
                                                        })}
                                                    </Typography>
                                                </Box>
                                            )}

                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    justifyContent: isUser ? "flex-start" : "flex-end",
                                                    alignItems: "flex-end",
                                                    gap: 0.75,
                                                }}
                                            >
                                                {isUser && (
                                                    <Avatar
                                                        src={msg.author_avatar || undefined}
                                                        sx={{ width: 28, height: 28, fontSize: "0.7rem" }}
                                                    >
                                                        <FaUser size={10} />
                                                    </Avatar>
                                                )}

                                                <Box
                                                    sx={{
                                                        maxWidth: "70%",
                                                        backgroundColor: isUser ? "var(--background-color)" : "var(--primary-color)",
                                                        color: isUser ? "var(--text-color)" : "#fff",
                                                        px: 1.5,
                                                        py: 1,
                                                        borderRadius: 2,
                                                        border: isUser ? "1px solid var(--border-color)" : "none",
                                                        wordBreak: "break-word",
                                                    }}
                                                >
                                                    <Typography sx={{ fontSize: "0.82rem", lineHeight: 1.4 }}>
                                                        {msg.text}
                                                    </Typography>
                                                    <Typography
                                                        sx={{
                                                            fontSize: "0.65rem",
                                                            color: isUser ? "var(--text-dimmer)" : "rgba(255,255,255,0.75)",
                                                            textAlign: "right",
                                                            mt: 0.5,
                                                        }}
                                                    >
                                                        {new Date(msg.created_at).toLocaleTimeString("en-US", {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                            hour12: true,
                                                        })}
                                                    </Typography>
                                                </Box>

                                                {!isUser && (
                                                    <Avatar
                                                        src={msg.author_avatar || undefined}
                                                        sx={{ width: 28, height: 28, fontSize: "0.7rem" }}
                                                    >
                                                        <FaUser size={10} />
                                                    </Avatar>
                                                )}
                                            </Box>
                                        </Box>
                                    );
                                })}

                                <div ref={messagesEndRef} />
                            </Box>

                            {/* Reply input */}
                            <Box
                                sx={{
                                    p: 1.5,
                                    borderTop: "1px solid var(--border-color)",
                                    backgroundColor: "var(--background-color)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    flexShrink: 0,
                                }}
                            >
                                <TextField
                                    placeholder="Type a reply..."
                                    fullWidth
                                    multiline
                                    maxRows={3}
                                    size="small"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={replyMutation.isPending}
                                    sx={{
                                        "& .MuiOutlinedInput-root": {
                                            fontSize: "0.85rem",
                                            backgroundColor: "var(--background-light)",
                                            borderRadius: 3,
                                        },
                                    }}
                                />
                                <IconButton
                                    onClick={handleSendReply}
                                    disabled={!replyText.trim() || replyMutation.isPending}
                                    sx={{
                                        backgroundColor: "var(--primary-color)",
                                        color: "#fff",
                                        width: 40,
                                        height: 40,
                                        borderRadius: "50%",
                                        flexShrink: 0,
                                        "&:hover": { backgroundColor: "#E66D00" },
                                        "&.Mui-disabled": {
                                            backgroundColor: "var(--border-color)",
                                            color: "var(--text-dimmer)",
                                        },
                                    }}
                                >
                                    {replyMutation.isPending ? (
                                        <CircularProgress size={16} sx={{ color: "#fff" }} />
                                    ) : (
                                        <FaPaperPlane size={14} />
                                    )}
                                </IconButton>
                            </Box>
                        </>
                    ) : (
                        <Box
                            sx={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--text-dimmer)",
                                gap: 1.5,
                            }}
                        >
                            <FaComment size={48} style={{ opacity: 0.3 }} />
                            <Typography sx={{ fontSize: "0.9rem" }}>Select a conversation to view messages</Typography>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
