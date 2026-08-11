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
        // Flex layout (sio absolute positioning) — label, value na chips
        // haziwezi kupandana tena hata kwenye skrini ndogo.
        <div
            className="d-flex flex-column justify-content-between gap-1 py-2 px-3"
            style={{
                backgroundColor: 'var(--background-dimmer)',
                border: '1px solid var(--border-color)',
                borderRadius: '5px',
                minWidth: '220px',
                minHeight: '90px',
                maxWidth: '100%',
            }}
        >
            <div className="d-flex align-items-center justify-content-between gap-2">
                <small className="my-0 text-truncate" style={{ minWidth: 0 }}>{props.label}</small>
                {props.icon && <div className="d-flex align-items-center flex-shrink-0">{props.icon}</div>}
            </div>
            <h5 className="my-0 text-truncate" style={{ minWidth: 0 }}>{props.value}</h5>
            {props.chips && props.chips.length > 0 && (
                <div className="d-flex flex-wrap gap-1" style={{ minHeight: 20 }}>
                    {props.chips.map((chip, i) => (
                        chip.tooltip ? (
                            <Tooltip key={i} title={chip.tooltip} arrow placement="top">
                                <Chip size="small" icon={chip.icon as any} label={chip.value} color={chip.color as any} variant="outlined" />
                            </Tooltip>
                        ) : (
                            <Chip size="small" key={i} icon={chip.icon as any} label={chip.value} color={chip.color as any} variant="outlined" />
                        )
                    ))}
                </div>
            )}
        </div>
    );

    return props.tooltip ? (
        <Tooltip title={props.tooltip} arrow placement="top">
            {content}
        </Tooltip>
    ) : content;
}
