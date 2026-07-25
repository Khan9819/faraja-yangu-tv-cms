import type { FC, ReactNode } from "react";
import { Box, Typography, Breadcrumbs, Link } from "@mui/material";
import { FiChevronRight } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

interface BreadcrumbItem {
    label: string;
    path?: string;
}

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    breadcrumbs?: BreadcrumbItem[];
    actions?: ReactNode;
}

export const PageHeader: FC<PageHeaderProps> = ({ title, subtitle, breadcrumbs, actions }) => {
    const navigate = useNavigate();

    return (
        <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Box>
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <Breadcrumbs
                        separator={<FiChevronRight size={12} />}
                        sx={{ mb: 0.5, "& .MuiBreadcrumbs-separator": { mx: 0.5 } }}
                    >
                        {breadcrumbs.map((crumb, index) =>
                            crumb.path ? (
                                <Link
                                    key={index}
                                    component="button"
                                    underline="hover"
                                    onClick={() => navigate(crumb.path!)}
                                    sx={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-dimmer)",
                                        cursor: "pointer",
                                        "&:hover": { color: "var(--primary-color)" },
                                    }}
                                >
                                    {crumb.label}
                                </Link>
                            ) : (
                                <Typography key={index} sx={{ fontSize: "0.75rem", color: "var(--text-dimmer)" }}>
                                    {crumb.label}
                                </Typography>
                            )
                        )}
                    </Breadcrumbs>
                )}
                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: 600,
                        fontSize: "1.35rem",
                        letterSpacing: "-0.01em",
                        color: "var(--text-color)",
                    }}
                >
                    {title}
                </Typography>
                {subtitle && (
                    <Typography
                        variant="body2"
                        sx={{ mt: 0.25, color: "var(--text-dimmer)", fontSize: "0.8rem" }}
                    >
                        {subtitle}
                    </Typography>
                )}
            </Box>
            {actions && (
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexShrink: 0 }}>
                    {actions}
                </Box>
            )}
        </Box>
    );
};
