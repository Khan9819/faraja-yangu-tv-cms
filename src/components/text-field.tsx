import { TextField } from "@mui/material";

const CustomTextField = ({ label, name, disabled, value, onChange, onError, error, helperText, type = 'text', className, required }: { label: string, name: string, disabled?: boolean, value: string, onChange: any, onError: any, error: boolean, helperText: string, type?: string, className?: string, required?: boolean }) => {
    return (
        <TextField
            variant="standard"
            size="small"
            focused
            disabled={disabled}
            label={label}
            name={name}
            value={value}
            onChange={onChange}
            onError={onError}
            error={error}
            helperText={helperText}
            type={type}
            className={className}
            required={required}
        />
    );
}

export default CustomTextField;
