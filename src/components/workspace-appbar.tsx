import type { FC } from "react";
interface IWorkspaceAppbarProps {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
    className?: string;
};

export const WorkspaceAppbar: FC<IWorkspaceAppbarProps> = (props) => {
    return (
        <div className={`d-flex justify-content-between align-items-center py-2 px-3 ${props.className}`} style={{borderBottom: '1px solid var(--background-dimmer)' }}>
            <div className="title">
                <h5 className="my-0">{props.title}</h5>
                <small className="my-0">{props.subtitle}</small>
            </div>
            <div className="actions d-flex justify-content-end align-items-center">
                {props.children}
            </div>
        </div>
    );
}
