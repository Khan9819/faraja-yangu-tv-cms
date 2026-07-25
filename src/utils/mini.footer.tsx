export const MiniFooter = () => {
    return (
            <div className="w-100 d-flex justify-content-between align-items-center py-2 px-4" style={{borderTop: '1px solid var(--background-dimmer)'}}>
                <small>All rights reserved &copy; {new Date().getFullYear()}</small>
                <small>Build and Maintained by <b>Nexent Company Limited</b></small>
            </div>
    );
}
