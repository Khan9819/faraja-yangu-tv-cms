import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import logo from "../assets/logo.png";
import { protected_routes } from "../utils/navigation";
import type { AppRoute } from "../interfaces/route";
import { NavLink } from "react-router-dom";
import CollapsableNavigation from "../components/collapsable-navigation";

export const Navbar: FC = () => {
    return (
        <Box
            className="navigation"
            sx={{
                width: 220,
                minWidth: 220,
                borderRight: "1px solid var(--border-color)",
                backgroundColor: "var(--background-color)",
                display: "flex",
                flexDirection: "column",
                height: "100%",
                overflow: "hidden",
            }}
        >
            {/* Logo */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 2.5,
                    height: 54,
                    borderBottom: "1px solid var(--border-color)",
                    flexShrink: 0,
                }}
            >
                <img src={logo} alt="FarajaTV" style={{ width: 24, height: 24, objectFit: "contain" }} />
                <Typography
                    sx={{
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        color: "var(--text-color)",
                        letterSpacing: "-0.01em",
                    }}
                >
                    FarajaTV
                </Typography>
            </Box>

            {/* Nav items */}
            <Box
                sx={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    py: 1.5,
                    px: 1.5,
                    "&::-webkit-scrollbar": { width: 3 },
                    "&::-webkit-scrollbar-thumb": { backgroundColor: "var(--border-color)", borderRadius: 2 },
                }}
            >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                    {protected_routes.map((route: AppRoute, index) => {
                        if (route.type === "ParentRoute" && route.render) {
                            return (
                                <CollapsableNavigation
                                    key={index}
                                    title={route.title!}
                                    rootPath={route.path}
                                    icon={route.icon}
                                    children={route.children}
                                />
                            );
                        }

                        if (route.render) {
                            return (
                                <NavLink
                                    key={index}
                                    to={route.path}
                                    end
                                    className={({ isActive }) =>
                                        `w-100 text-decoration-none d-flex align-items-center gap-2 px-3 py-2 nav-item-link ${
                                            isActive ? "active-navigation" : ""
                                        }`
                                    }
                                >
                                    {route.icon && <route.icon size={15} />}
                                    <span style={{ fontSize: "0.82rem" }}>{route.title}</span>
                                </NavLink>
                            );
                        }
                        return null;
                    })}
                </Box>
            </Box>
        </Box>
    );
}
