import { Outlet } from "react-router-dom";
import { AppBar } from "../utils/appbar";
import { Navbar } from "../utils/navbar";

export const ProtectedLayout = () => {
    return (
        <div className="w-100 h-100 d-flex">
            <Navbar />
            <div className="content d-flex flex-column" style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto' }}>
                <AppBar />
                <div className="app-content" style={{ flex: 1, padding: '24px 28px', position: 'relative', overflow: 'auto' }}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
