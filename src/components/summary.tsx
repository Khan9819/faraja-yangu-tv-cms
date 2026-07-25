import { Chip, Tooltip } from "@mui/material";

interface CustomChipProps {
    icon?: React.ReactNode;
    value: string;
    color: string;
    tooltip?: string;
}

interface ISummaryProps {
    label: string;
    value: string;
    icon?: React.ReactNode;
    chips?: CustomChipProps[];
    tooltip?: string;
}

export default function Summary(props: ISummaryProps) {
    const content = (
        <div className="d-flex flex-column gap-1 justify-content-center py-2 px-3 position-relative" style={{ backgroundColor: 'var(--background-dimmer)', border: '1px solid var(--border-color)', borderRadius: '5px', minWidth: '220px', height: '90.0px' }}>
            <div className="d-flex align-items-center gap-2 position-relative">
                <small className="my-0">{props.label}</small>
                <div className="d-flex align-items-center gap-2 position-absolute end-0">
                    {props.icon && props.icon}
                </div>
            </div>
            <h5 className="my-0">{props.value}</h5>
            <div className="d-flex align-items-center gap-2 position-absolute" style={{ bottom: '10px', right: '10px' }}>
                {props.chips && props.chips.map((chip, i) => (
                    chip.tooltip ? (
                        <Tooltip key={i} title={chip.tooltip} arrow placement="top">
                            <Chip size="small" icon={chip.icon as any} label={chip.value} color={chip.color as any} variant="outlined" />
                        </Tooltip>
                    ) : (
                        <Chip size="small" key={i} icon={chip.icon as any} label={chip.value} color={chip.color as any} variant="outlined" />
                    )
                ))}
            </div>
        </div>
    );

    return props.tooltip ? (
        <Tooltip title={props.tooltip} arrow placement="top">
            {content}
        </Tooltip>
    ) : content;
}