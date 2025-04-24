/**
 * Common Chart.js configuration and utility functions
 * This file provides consistent chart styling and utilities for the Smart Agri Investment platform
 */

// Common colors used across charts
const chartColors = {
    success: '#38b000',    // Primary green for positive data
    info: '#0dcaf0',       // Blue for informational data
    warning: '#fd7e14',    // Orange for caution/medium risk
    danger: '#dc3545',     // Red for negative data/high risk
    dark: '#212529',       // Dark background color
    light: '#f8f9fa',      // Light text/lines
    muted: '#6c757d',      // Muted/secondary elements
    successLight: 'rgba(56, 176, 0, 0.1)',
    infoLight: 'rgba(13, 202, 240, 0.1)',
    warningLight: 'rgba(253, 126, 20, 0.1)',
    dangerLight: 'rgba(220, 53, 69, 0.1)'
};

// Default font configuration for all charts
Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
Chart.defaults.font.size = 12;

// Money formatter for chart tooltips and labels
function formatMoney(value) {
    return '₹' + value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Percentage formatter
function formatPercentage(value) {
    return value.toFixed(1) + '%';
}

// Common options for line charts
const lineChartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top',
            labels: {
                usePointStyle: true,
                padding: 20
            }
        },
        tooltip: {
            mode: 'index',
            intersect: false,
            padding: 10,
            borderWidth: 1,
            titleFont: {
                size: 14
            },
            bodyFont: {
                size: 13
            }
        }
    },
    elements: {
        line: {
            tension: 0.3, // Smoother curves
            borderWidth: 2
        },
        point: {
            radius: 3,
            hoverRadius: 5,
            hitRadius: 10
        }
    },
    scales: {
        x: {
            grid: {
                display: false
            }
        },
        y: {
            beginAtZero: true,
            grid: {
                color: 'rgba(255, 255, 255, 0.05)'
            }
        }
    }
};

// Common options for bar charts
const barChartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top',
            labels: {
                usePointStyle: true,
                padding: 20
            }
        },
        tooltip: {
            mode: 'index',
            intersect: false
        }
    },
    scales: {
        x: {
            grid: {
                display: false
            }
        },
        y: {
            beginAtZero: true,
            grid: {
                color: 'rgba(255, 255, 255, 0.05)'
            }
        }
    }
};

// Common options for doughnut/pie charts
const doughnutChartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                usePointStyle: true,
                padding: 20
            }
        },
        tooltip: {
            callbacks: {
                label: function(context) {
                    const label = context.label || '';
                    const value = context.raw || 0;
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = Math.round((value / total) * 100);
                    return `${label}: ${formatMoney(value)} (${percentage}%)`;
                }
            }
        }
    },
    cutout: '70%'
};

// Create a stacked dataset for comparison charts
function createStackedDataset(labels, datasets) {
    return {
        labels: labels,
        datasets: datasets.map((dataset, index) => {
            return {
                label: dataset.label,
                data: dataset.data,
                backgroundColor: dataset.color || chartColors.success,
                borderColor: dataset.borderColor || dataset.color || chartColors.success,
                borderWidth: 1
            };
        })
    };
}

// Create investment performance chart with dynamic date range
function createPerformanceChart(ctx, data, options = {}) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.dates,
            datasets: [
                {
                    label: 'Revenue',
                    data: data.revenues,
                    borderColor: chartColors.info,
                    backgroundColor: chartColors.infoLight,
                    fill: true
                },
                {
                    label: 'Profit',
                    data: data.profits,
                    borderColor: chartColors.success,
                    backgroundColor: chartColors.successLight,
                    fill: true
                },
                {
                    label: 'Expenses',
                    data: data.expenses,
                    borderColor: chartColors.danger,
                    backgroundColor: chartColors.dangerLight,
                    fill: true
                }
            ]
        },
        options: {
            ...lineChartDefaults,
            ...options,
            plugins: {
                ...lineChartDefaults.plugins,
                ...options.plugins,
                tooltip: {
                    ...lineChartDefaults.plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatMoney(context.raw);
                        }
                    }
                }
            },
            scales: {
                ...lineChartDefaults.scales,
                ...options.scales,
                y: {
                    ...lineChartDefaults.scales.y,
                    ...options.scales?.y,
                    ticks: {
                        ...lineChartDefaults.scales.y?.ticks,
                        callback: function(value) {
                            return formatMoney(value);
                        }
                    }
                }
            }
        }
    });
}

// Create ROI comparison chart
function createROIComparisonChart(ctx, data, options = {}) {
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.categories,
            datasets: [{
                label: 'Average Annual ROI (%)',
                data: data.values,
                backgroundColor: data.colors || Array(data.categories.length).fill(chartColors.success),
                borderWidth: 0
            }]
        },
        options: {
            ...barChartDefaults,
            ...options,
            plugins: {
                ...barChartDefaults.plugins,
                ...options.plugins,
                tooltip: {
                    ...barChartDefaults.plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatPercentage(context.raw);
                        }
                    }
                }
            },
            scales: {
                ...barChartDefaults.scales,
                ...options.scales,
                y: {
                    ...barChartDefaults.scales.y,
                    ...options.scales?.y,
                    ticks: {
                        ...barChartDefaults.scales.y?.ticks,
                        callback: function(value) {
                            return formatPercentage(value);
                        }
                    }
                }
            }
        }
    });
}

// Create funding progress doughnut chart
function createFundingChart(ctx, funded, total, options = {}) {
    const percentage = (funded / total) * 100;
    
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Funded', 'Remaining'],
            datasets: [{
                data: [funded, Math.max(0, total - funded)],
                backgroundColor: [chartColors.success, chartColors.dark],
                borderWidth: 0
            }]
        },
        options: {
            ...doughnutChartDefaults,
            ...options,
            plugins: {
                ...doughnutChartDefaults.plugins,
                ...options.plugins,
                tooltip: {
                    ...doughnutChartDefaults.plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            const label = context.label;
                            const value = context.raw;
                            const percentage = (value / total) * 100;
                            return `${label}: ${formatMoney(value)} (${percentage.toFixed(1)}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Create portfolio distribution chart
function createPortfolioChart(ctx, categories, values, options = {}) {
    // Generate colors based on number of categories
    const colors = [
        chartColors.success,
        chartColors.info,
        chartColors.warning,
        '#6610f2', // Purple
        '#d63384', // Pink
        '#20c997', // Teal
    ];
    
    // Ensure we have enough colors by repeating the array if necessary
    const categoryColors = categories.map((_, i) => colors[i % colors.length]);
    
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: values,
                backgroundColor: categoryColors,
                borderWidth: 0
            }]
        },
        options: {
            ...doughnutChartDefaults,
            ...options
        }
    });
}
