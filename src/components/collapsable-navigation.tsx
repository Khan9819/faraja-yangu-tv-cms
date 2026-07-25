import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import Collapse from "@mui/material/Collapse";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import type { AppRoute } from "../interfaces/route";

interface CollapsableNavigationProps {
    title: string;
    icon?: React.ElementType;
    children?: AppRoute[];
    rootPath?: string;
}

export default function CollapsableNavigation({
    title,
    icon: Icon,
    children = [],
    rootPath,
}: CollapsableNavigationProps) {
    const location = useLocation();
    const isActive = rootPath ? location.pathname.startsWith(rootPath) : false;
    const [open, setOpen] = useState(isActive);

    return (
        <div className="w-100" style={{ marginBottom: 2 }}>
            {/* Parent button */}
            <button
                type="button"
                className="btn d-flex justify-content-between align-items-center w-100 text-start py-2 px-3"
                onClick={() => setOpen(!open)}
                style={{
                    borderRadius: 6,
                    border: "none",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--text-dimmer)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "6px 12px",
                }}
            >
                <div className="d-flex align-items-center gap-2">
                    {Icon && <Icon size={13} />}
                    <span>{title}</span>
                </div>
                {children.length > 0 &&
                    (open ? (
                        <FiChevronDown style={{ color: "var(--text-dimmer)" }} size={14} />
                    ) : (
                        <FiChevronRight style={{ color: "var(--text-dimmer)" }} size={14} />
                    ))}
            </button>

            {/* Child items */}
            <Collapse in={open} timeout="auto" unmountOnExit>
                <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingLeft: 12, marginTop: 2 }}>
                    {children.map((child, i) =>
                        child.render ? (
                            <NavLink
                                key={i}
                                to={`${rootPath}/${child.path}`}
                                className={({ isActive }) =>
                                    `text-decoration-none d-flex align-items-center gap-2 px-3 py-2 nav-item-link ${
                                        isActive ? "active-navigation" : ""
                                    }`
                                }
                            >
                                {child.icon && <child.icon size={13} />}
                                <span style={{ fontSize: "0.8rem" }}>{child.title}</span>
                            </NavLink>
                        ) : null
                    )}
                </div>
            </Collapse>
        </div>
    );
}
