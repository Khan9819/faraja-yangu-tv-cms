import type { FC } from "react";

interface IWorkspaceContainerProps {
    children: any
};

export const WorkspaceContainer: FC<IWorkspaceContainerProps> = (props) => {
    return (
        <div className="p-3 rounded my-2" style={{border: '1px solid var(--background-dimmer)', backgroundColor: 'var(--background-dimmer)'}}>
            {props.children}
        </div>
    );
}
