import { Outlet } from "react-router-dom"
import logo from "../assets/logo.png"
import { MiniFooter } from "../utils/mini.footer"
export const AuthLayout = () => {
    return (
        <div className="w-100 h-100 d-flex flex-column justify-content-center align-items-center">
            <div className="h-100 w-100 d-flex flex-column justify-content-center align-items-center">
                <img src={logo} alt="" style={{ width: '100px', height: '100px' }} />
                <div style={{ maxWidth: '400px', minWidth: '400px', minHeight: '100px', backgroundColor: 'var(--background-dimmer)', border: '1px solid var(--background-light)', borderRadius: '4px', padding: '31px 25px' }} className="my-2">
                    <Outlet />
                </div>
                <div className="text-center d-flex flex-column justify-content-center align-items-center my-2">
                    {/* <small>This platform is reserved for <b>FarajaYanguTv Staff</b> Use Only</small> */}
                    <small><i>Every request and action done here is logged and monitored</i></small>
                </div>
            </div>
            <MiniFooter />
        </div>
    );
}
