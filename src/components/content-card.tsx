import type { FC, ReactNode } from "react";
import { Box, Typography, IconButton, Skeleton } from "@mui/material";
import { FaEdit, FaTrash } from "react-icons/fa";

interface ContentCardProps {
    thumbnail?: string;
    cover?: string;
    title: string;
    subtitle?: string;
    meta?: string;
    onClick?: () => void;
    onEdit?: (e: React.MouseEvent) => void;
    onDelete?: (e: React.MouseEvent) => void;
    actions?: ReactNode;
    aspectRatio?: string;
}

export const ContentCard: FC<ContentCardProps> = ({
    thumbnail,
    cover,
    title,
    subtitle,
    meta,
    onClick,
    onEdit,
    onDelete,
    actions,
    aspectRatio = "4/3",
}) => {
    const image = cover || thumbnail;

    return (
        <Box
            onClick={onClick}
            sx={{
                borderRadius: 2,
                overflow: "hidden",
                backgroundColor: "var(--background-dimmer)",
                border: "1px solid var(--border-color)",
                cursor: onClick ? "pointer" : "default",
                transition: "all 0.2s ease",
                "&:hover": onClick
                    ? {
                          borderColor: "var(--primary-color)",
                          transform: "translateY(-2px)",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                      }
                    : {},
                "&:hover .card-actions": {
                    opacity: 1,
                },
            }}
        >
            {/* Image area */}
            <Box
                sx={{
                    position: "relative",
                    width: "100%",
                    aspectRatio,
                    backgroundColor: "var(--background-light)",
                    overflow: "hidden",
                }}
            >
                {image ? (
                    <Box
                        component="img"
                        src={image}
                        alt={title}
                        sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                        }}
                    />
                ) : (
                    <Box
                        sx={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Typography variant="caption" sx={{ color: "var(--text-dimmer)" }}>
                            No Image
                        </Typography>
                    </Box>
                )}

                {/* Hover actions overlay */}
                {(onEdit || onDelete || actions) && (
                    <Box
                        className="card-actions"
                        sx={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            display: "flex",
                            gap: 0.5,
                            p: 0.75,
                            opacity: 0,
                            transition: "opacity 0.2s ease",
                        }}
                    >
                        {onEdit && (
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(e);
                                }}
                                sx={{
                                    backgroundColor: "rgba(0,0,0,0.6)",
                                    color: "#fff",
                                    width: 28,
                                    height: 28,
                                    "&:hover": { backgroundColor: "var(--primary-color)" },
                                }}
                            >
                                <FaEdit size={12} />
                            </IconButton>
                        )}
                        {onDelete && (
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(e);
                                }}
                                sx={{
                                    backgroundColor: "rgba(0,0,0,0.6)",
                                    color: "#fff",
                                    width: 28,
                                    height: 28,
                                    "&:hover": { backgroundColor: "#d32f2f" },
                                }}
                            >
                                <FaTrash size={12} />
                            </IconButton>
                        )}
                        {actions}
                    </Box>
                )}
            </Box>

            {/* Text area */}
            <Box sx={{ p: 1.5 }}>
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        color: "var(--text-color)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {title}
                </Typography>
                {subtitle && (
                    <Typography
                        variant="caption"
                        sx={{
                            color: "var(--text-dimmer)",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            lineHeight: 1.4,
                            mt: 0.25,
                        }}
                    >
                        {subtitle}
                    </Typography>
                )}
                {meta && (
                    <Typography
                        variant="caption"
                        sx={{ color: "var(--text-dimmer)", fontSize: "0.7rem", mt: 0.5, display: "block" }}
                    >
                        {meta}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

interface ContentCardGridProps {
    children: ReactNode;
    minWidth?: number;
}

export const ContentCardGrid: FC<ContentCardGridProps> = ({ children, minWidth = 220 }) => {
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
                gap: 2,
            }}
        >
            {children}
        </Box>
    );
};

export const ContentCardSkeleton: FC<{ count?: number; aspectRatio?: string }> = ({
    count = 6,
    aspectRatio = "4/3",
}) => {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <Box
                    key={i}
                    sx={{
                        borderRadius: 2,
                        overflow: "hidden",
                        backgroundColor: "var(--background-dimmer)",
                        border: "1px solid var(--border-color)",
                    }}
                >
                    <Skeleton variant="rectangular" sx={{ width: "100%", aspectRatio }} />
                    <Box sx={{ p: 1.5 }}>
                        <Skeleton variant="text" sx={{ width: "70%" }} />
                        <Skeleton variant="text" sx={{ width: "50%", fontSize: "0.7rem" }} />
                    </Box>
                </Box>
            ))}
        </>
    );
};
