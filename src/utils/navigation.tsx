import { lazy } from 'react'
import type { AppRoute } from '../interfaces/route'
import { FaTachometerAlt, FaFilm, FaPlus, FaEdit, FaEye, FaUsers, FaChartLine, FaCog, FaFolderOpen, FaAd, FaPlay, FaComments, FaGlobe } from 'react-icons/fa'
// ////////////////////////////////////////////////////////////////////////// //
const Login = lazy(() => import('../pages/auth/login'))
const RequestPasswordReset = lazy(() => import('../pages/auth/request-password-reset'))
const ResetPassword = lazy(() => import('../pages/auth/reset-password'))
const FinalizeAccountSetup = lazy(() => import('../pages/auth/finalize-account-setup'))
const Dashboard = lazy(() => import('../pages/protected/dashboard'))
const Profile = lazy(() => import('../pages/protected/profile'))
// ////////////////////////////////////////////////////////////////////////// //

// ////////////////////////////////////////////////////////////////////////// //
const VideosList = lazy(() => import('../pages/protected/videos/list'))
const VideoStudio = lazy(() => import('../pages/protected/videos/studio'))
const VideoPreview = lazy(() => import('../pages/protected/videos/preview'))
const CategoriesList = lazy(() => import('../pages/protected/categories/list'))
const SubcategoriesList = lazy(() => import('../pages/protected/categories/subcategories'))
const CategoryVideos = lazy(() => import('../pages/protected/categories/category-videos'))
const UsersList = lazy(() => import('../pages/protected/users/list'))
const Analytics = lazy(() => import('../pages/protected/analytics'))
const Settings = lazy(() => import('../pages/protected/settings'))
const AdvertisementList = lazy(() => import('../pages/protected/advertisement/list'))
const AdvertisementStudio = lazy(() => import('../pages/protected/advertisement/studio'))
const InterceptorList = lazy(() => import('../pages/protected/advertisement/interceptor/list'))
const InterceptorCreate = lazy(() => import('../pages/protected/advertisement/interceptor/create'))
const InterceptorEdit = lazy(() => import('../pages/protected/advertisement/interceptor/edit'))
const CommentsInbox = lazy(() => import('../pages/protected/comments/inbox'))
const WebsitePostList = lazy(() => import('../pages/protected/website-posting/list'))
const WebsitePostCreate = lazy(() => import('../pages/protected/website-posting/create'))
const WebsitePostEdit = lazy(() => import('../pages/protected/website-posting/edit'))
const WebsiteEngagement = lazy(() => import('../pages/protected/website'))
// ////////////////////////////////////////////////////////////////////////// //

const auth_routes = [
    {
        path: '/',
        element: Login
    },
    {
        path: '/login',
        element: Login
    },
    {
        path: '/request-password-reset',
        element: RequestPasswordReset
    },
    {
        path: '/reset-password',
        element: ResetPassword
    },
    {
        path: '/finalize-account-setup',
        element: FinalizeAccountSetup
    },
]


const protected_routes: AppRoute[] = [
  {
    type: "ChildRoute",
    title: "Dashboard",
    path: "/",
    slug: "dashboard",
    subtitle: "Overview and stats",
    element: Dashboard,
    icon: FaTachometerAlt,
    render: true,
  },
  {
    type: "ParentRoute",
    title: "Content",
    path: "/content",
    slug: "content",
    subtitle: "Manage your digital content",
    element: Dashboard,
    render: true,
    children: [
      {
        path: "videos",
        title: "Videos",
        slug: "content/videos",
        subtitle: "Manage video library",
        render: true,
        element: VideosList,
        icon: FaFilm,
      },
      {
        path: "videos/create",
        title: "Create Video",
        slug: "content/videos/create",
        subtitle: "Upload a new video",
        render: false,
        element: VideoStudio,
        icon: FaPlus,
      },
      {
        path: "videos/:id/edit",
        title: "Edit Video",
        slug: "content/videos/:id/edit",
        subtitle: "Edit video details",
        render: false,
        element: VideoStudio,
        icon: FaEdit,
      },
      {
        path: "videos/:id/view",
        title: "View Video",
        slug: "content/videos/:id/view",
        subtitle: "View video details",
        render: false,
        element: VideoPreview,
        icon: FaEye,
      },
      {
        path: "categories",
        title: "Categories",
        slug: "content/categories",
        subtitle: "Manage categories",
        render: true,
        element: CategoriesList,
        icon: FaFolderOpen,
      },
      {
        path: "categories/:id/subcategories",
        title: "Subcategories",
        slug: "content/categories/:id/subcategories",
        subtitle: "View subcategories",
        render: false,
        element: SubcategoriesList,
        icon: FaFolderOpen,
      },
      {
        path: "categories/:id/videos",
        title: "Category Videos",
        slug: "content/categories/:id/videos",
        subtitle: "Videos in category",
        render: false,
        element: CategoryVideos,
        icon: FaFilm,
      },
    ],
  },
  {
    type: "ParentRoute",
    title: "Advertisement",
    path: "/advertisement",
    slug: "advertisement",
    subtitle: "Manage advertisements",
    element: Dashboard,
    render: true,
    children: [
      {
        path: "list",
        title: "Carousel",
        slug: "advertisement/list",
        subtitle: "Manage carousel advertisements",
        element: AdvertisementList,
        icon: FaAd,
        render: true,
      },
      {
        path: "interceptor",
        title: "Playback Interceptor",
        slug: "advertisement/interceptor",
        subtitle: "Manage playback interceptor advertisements",
        element: InterceptorList,
        icon: FaPlay,
        render: true,
      },
      {
        path: "interceptor/create",
        title: "Create Interceptor Advertisement",
        slug: "advertisement/interceptor/create",
        subtitle: "Create a new interceptor advertisement",
        element: InterceptorCreate,
        icon: FaPlus,
        render: false,
      },
      {
        path: "interceptor/edit/:id",
        title: "Edit Interceptor Advertisement",
        slug: "advertisement/interceptor/edit/:id",
        subtitle: "Edit an interceptor advertisement",
        element: InterceptorEdit,
        icon: FaEdit,
        render: false,
      },
      {
        path: "create",
        title: "Create Advertisement",
        slug: "advertisement/create",
        subtitle: "Create a new advertisement",
        element: AdvertisementStudio,
        icon: FaPlus,
        render: false,
      },
      {
        path: ":id/edit",
        title: "Edit Advertisement",
        slug: "advertisement/:id/edit",
        subtitle: "Edit advertisement details",
        element: AdvertisementStudio,
        icon: FaEdit,
        render: false,
      },
    ],
  },
  {
    type: "ParentRoute",
    title: "Website Posting",
    path: "/website-posting",
    slug: "website-posting",
    subtitle: "Manage homepage posts",
    element: Dashboard,
    render: true,
    icon: FaGlobe,
    children: [
      {
        path: "",
        title: "All Posts",
        slug: "website-posting/list",
        subtitle: "View all website posts",
        render: true,
        element: WebsitePostList,
        icon: FaGlobe,
      },
      {
        path: "create",
        title: "Ongeza Post",
        slug: "website-posting/create",
        subtitle: "Create a new website post",
        render: false,
        element: WebsitePostCreate,
        icon: FaPlus,
      },
      {
        path: ":id/edit",
        title: "Edit Post",
        slug: "website-posting/:id/edit",
        subtitle: "Edit website post",
        render: false,
        element: WebsitePostEdit,
        icon: FaEdit,
      },
    ],
  },
  {
    type: "ChildRoute",
    title: "Comments",
    path: "/comments",
    slug: "comments",
    subtitle: "User comments inbox",
    element: CommentsInbox,
    icon: FaComments,
    render: true,
  },
  {
    type: "ChildRoute",
    title: "Users",
    path: "/users",
    slug: "users",
    subtitle: "App users",
    element: UsersList,
    icon: FaUsers,
    render: true,
  },
  {
    type: "ChildRoute",
    title: "Website",
    path: "/website",
    slug: "website",
    subtitle: "Website engagement real-time",
    element: WebsiteEngagement,
    icon: FaGlobe,
    render: true,
  },
  {
    type: "ChildRoute",
    title: "Reports",
    path: "/reports",
    slug: "reports",
    subtitle: "Analytics and performance reports",
    element: Analytics,
    icon: FaChartLine,
    render: true,
  },
  {
    type: "ChildRoute",
    title: "Profile",
    path: "/profile",
    slug: "profile",
    subtitle: "Manage your account details",
    element: Profile,
    render: false,
  },
  {
    type: "ChildRoute",
    title: "Settings",
    path: "/settings",
    slug: "settings",
    subtitle: "System configuration",
    element: Settings,
    icon: FaCog,
    render: true,
  },
];

const flat_protected_routes = protected_routes.flatMap((route) => {
  if (route.type === "ChildRoute") {
    return [route];
  }

  if (route.type === "ParentRoute" && route.children) {
    return route.children.map((childRoute) => {
      return {
        ...childRoute,
        path: `${route.path}/${childRoute.path}`,
      };
    });
  }

  return [];
});

export {
    auth_routes,
    protected_routes,
    flat_protected_routes
}
