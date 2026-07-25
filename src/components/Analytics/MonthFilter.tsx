import { Box, Button, Skeleton } from '@mui/material';
import { useEffect, useState } from 'react';

interface MonthFilterProps {
    value?: string;
    onMonthChange?: (month: string) => void;
    loading?: boolean;
}

const months = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];
export default function MonthFilter({ value, onMonthChange, loading }: MonthFilterProps) {
    const [selectedMonth, setSelectedMonth] = useState<string>(value || 'JAN');

    useEffect(() => {
        if (value && months.includes(value)) {
            setSelectedMonth(value);
        }
    }, [value]);

    const handleMonthClick = (month: string) => {
        setSelectedMonth(month);
        onMonthChange?.(month);
    };

    return (
        <Box
            sx={{
                display: 'flex',
                gap: 0,
                backgroundColor: '#1a1a1a',
                borderRadius: 1,
                padding: 0.5,
                width: 'fit-content',
            }}
        >
            {months.map((month) => (
                <Button
                    key={month}
                    onClick={() => handleMonthClick(month)}
                    sx={{
                        minWidth: '60px',
                        padding: '8px 16px',
                        color: selectedMonth === month ? '#fff' : '#888',
                        backgroundColor: selectedMonth === month ? '#333' : 'transparent',
                        borderRadius: 0.5,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        '&:hover': {
                            backgroundColor: selectedMonth === month ? '#333' : '#252525',
                        },
                        transition: 'all 0.2s ease',
                    }}
                >
                    {loading && selectedMonth === month ? (
                        <Skeleton
                            variant="text"
                            animation="wave"
                            width={40}
                            sx={{ bgcolor: '#3a3a3a', borderRadius: 1 }}
                        />
                    ) : (
                        month
                    )}
                </Button>
            ))}
        </Box>
    );
}
