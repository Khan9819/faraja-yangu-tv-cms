import { Box, CardContent, Typography, Skeleton } from '@mui/material';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import MonthFilter from './MonthFilter';

interface MetricsChartProps {
    enableZoom?: boolean;
    data?: any;
    onMonthChange?: (month: number) => void;
    month?: number;
    currentMonth?: number;
}

export default function MetricsChart({ enableZoom = true, data, onMonthChange, month, currentMonth }: MetricsChartProps) {
    // Generate days 1-31 for x-axis
    const defaultDays = Array.from({ length: 31 }, (_, i) => `Day ${i + 1}`);

    const defaultSeries = [
        {
            name: 'Views',
            data: defaultDays.map(() => 0),
        },
        {
            name: 'Likes',
            data: defaultDays.map(() => 0),
        },
        {
            name: 'Comments',
            data: defaultDays.map(() => 0),
        },
        {
            name: 'Watch Time (hrs)',
            data: defaultDays.map(() => 0),
        },
        {
            name: 'Active Users',
            data: defaultDays.map(() => 0),
        },
    ];

    // Use raw analytics response to build categories and series
    const analyticsRaw: any = data;
    const labels: any[] = Array.isArray(analyticsRaw?.labels) ? analyticsRaw.labels : [];

    const categories = labels.length > 0
        ? labels.map((label: any) => `Day ${label}`)
        : defaultDays;

    const series = analyticsRaw?.data
        ? [
            { name: 'Views', data: analyticsRaw.data.views ?? [] },
            { name: 'Likes', data: analyticsRaw.data.likes ?? [] },
            { name: 'Comments', data: analyticsRaw.data.comments ?? [] },
            { name: 'Watch Time (hrs)', data: analyticsRaw.data.watch_time ?? [] },
            { name: 'Active Users', data: analyticsRaw.data.active_users ?? [] },
        ]
        : defaultSeries;

    // Determine the currently selected month from backend response or props
    const backendMonth: number | undefined =
        typeof analyticsRaw?.month === 'number'
            ? analyticsRaw.month
            : (typeof month === 'number' ? month : currentMonth);
    const backendMonthLabel = backendMonth && backendMonth >= 1 && backendMonth <= 12
        ? ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][backendMonth - 1]
        : undefined;

    const options: ApexOptions = {
        chart: {
            type: 'line',
            height: 450,
            toolbar: {
                show: false,
            },
            background: 'transparent',
            zoom: {
                enabled: enableZoom,
            },
        },
        dataLabels: {
            enabled: false,
        },
        stroke: {
            curve: 'smooth',
            width: 3,
        },
        colors: ['#FF7A00', '#4CAF50', '#2196F3', '#9C27B0', '#FFC107'],
        xaxis: {
            categories,
            labels: {
                style: {
                    colors: '#888',
                },
                rotate: -45,
                rotateAlways: false,
            },
            tickAmount: 15,
        },
        yaxis: {
            labels: {
                style: {
                    colors: '#888',
                },
            },
        },
        grid: {
            borderColor: '#333',
            strokeDashArray: 5,
        },
        legend: {
            position: 'top',
            horizontalAlign: 'left',
            labels: {
                colors: '#888',
            },
            markers: {
                size: 6,
            },
        },
        tooltip: {
            theme: 'dark',
            shared: true,
            intersect: false,
            x: {
                show: true,
            },
        },
    };

    return (
        <div>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h6" sx={{ color: '#fff' }}>
                        Platform Analytics Overview
                    </Typography>
                    <MonthFilter
                        value={backendMonthLabel}
                        loading={!analyticsRaw}
                        onMonthChange={(label: string) => {
                            const monthIndex = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].indexOf(label);
                            if (monthIndex >= 0) {
                                onMonthChange?.(monthIndex + 1);
                            }
                        }}
                    />
                </Box>
                {analyticsRaw ? (
                    <ReactApexChart options={options} series={series} type="line" height={450} />
                ) : (
                    <Skeleton
                        variant="rectangular"
                        animation="wave"
                        height={450}
                        sx={{ bgcolor: '#1f1f1f', borderRadius: 1 }}
                    />
                )}
            </CardContent>
        </div>
    );
}
