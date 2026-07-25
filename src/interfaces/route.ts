import type { ComponentType } from "react";

// Base type for all routes
interface BaseRoute {
  title?: string;
  subtitle?: string;
  slug?: string;
  path: string;
  element: ComponentType<any>;
  icon?: ComponentType<any>;
  render?: boolean;
}

// Specialized route types
interface ParentRoute extends BaseRoute {
  type: "ParentRoute";
  children?: ChildRoute[];
}

interface ChildRoute extends BaseRoute {
  type?: "ChildRoute"; // optional, for flexibility
}

// Unified type
type AppRoute = ParentRoute | ChildRoute;

export type { AppRoute, ParentRoute, ChildRoute };
