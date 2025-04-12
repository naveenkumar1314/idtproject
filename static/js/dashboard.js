/**
 * Dashboard.js - Handles all dashboard functionality for the Smart Agri Investment platform
 * Includes chart initialization, data processing, and interactive elements
 */

// Initialize the investor dashboard when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
});

function initDashboard() {
    // Initialize portfolio distribution chart if element exists
    const portfolioChartEl = document.getElementById('portfolioDistributionChart');
    if (portfolioChartEl) {
        initializePortfolioChart(portfolioChartEl);
    }
    
    // Initialize performance chart if element exists
    const performanceChartEl = document.getElementById('performanceChart');
    if (performanceChartEl) {
        initializePerformanceChart(performanceChartEl);
    }
    
    // Add event listeners to period selector buttons
    const periodButtons = document.querySelectorAll('[data-period]');
    periodButtons.forEach(button => {
        button.addEventListener('click', function() {
            updateChartPeriod(this.getAttribute('data-period'));
        });
    });
    
    // Add event listeners to chart type buttons
    const chartTypeButtons = document.querySelectorAll('[data-chart]');
    chartTypeButtons.forEach(button => {
        button.addEventListener('click', function() {
            updateChartType(this.getAttribute('data-chart'));
        });
    });
    
    // Fetch investment summary data
    fetchInvestmentSummary();
    
    // Calculate and display investment metrics
    calculateInvestmentMetrics();
}

// Initialize the portfolio distribution chart
function initializePortfolioChart(chartElement) {
    // Default data until API data is loaded
    const defaultData = {
        labels: ['Loading...'],
        datasets: [{
            data: [100],
            backgroundColor: ['#6c757d'],
            borderWidth: 0
        }]
    };
    
    const ctx = chartElement.getContext('2d');
    window.portfolioChart = new Chart(ctx, {
        type: 'doughnut',
        data: defaultData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Initialize the performance chart
function initializePerformanceChart(chartElement) {
    // Get performance data from the data attribute or fetch from API
    let performanceData;
    try {
        // Try to get data from a hidden element or other source
        performanceData = JSON.parse(document.getElementById('performance-data-json').textContent);
    } catch (e) {
        // Default data if can't find the source
        performanceData = {
            dates: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            revenues: [1200, 1300, 1400, 1350, 1500, 1600],
            expenses: [800, 850, 900, 950, 1000, 1050],
            profits: [400, 450, 500, 400, 500, 550]
        };
    }
    
    const ctx = chartElement.getContext('2d');
    window.performanceChart = createPerformanceChart(ctx, performanceData);
}

// Update chart based on selected period (monthly, quarterly, yearly)
function updateChartPeriod(period) {
    if (!window.performanceChart) return;
    
    // Update active state of buttons
    document.querySelectorAll('[data-period]').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-period="${period}"]`).classList.add('active');
    
    // Get current data
    const currentData = window.performanceChart.data;
    const labels = currentData.labels;
    const datasets = currentData.datasets;
    
    // Filter data based on selected period
    let filteredLabels, filteredDatasets;
    
    switch(period) {
        case 'monthly':
            // Use all data points
            filteredLabels = labels;
            filteredDatasets = datasets;
            break;
        case 'quarterly':
            // Select every 3rd data point
            filteredLabels = labels.filter((_, i) => i % 3 === 0);
            filteredDatasets = datasets.map(dataset => {
                return {
                    ...dataset,
                    data: dataset.data.filter((_, i) => i % 3 === 0)
                };
            });
            break;
        case 'yearly':
            // Select data points at yearly intervals or first/last if not enough data
            if (labels.length > 12) {
                filteredLabels = labels.filter((_, i) => i % 12 === 0);
                filteredDatasets = datasets.map(dataset => {
                    return {
                        ...dataset,
                        data: dataset.data.filter((_, i) => i % 12 === 0)
                    };
                });
            } else {
                // If less than a year of data, just show start and end
                filteredLabels = [labels[0], labels[labels.length - 1]];
                filteredDatasets = datasets.map(dataset => {
                    return {
                        ...dataset,
                        data: [dataset.data[0], dataset.data[dataset.data.length - 1]]
                    };
                });
            }
            break;
    }
    
    // Update chart data
    window.performanceChart.data.labels = filteredLabels;
    window.performanceChart.data.datasets = filteredDatasets;
    window.performanceChart.update();
}

// Update chart to show different metrics (profits, yields, revenue-expense)
function updateChartType(chartType) {
    if (!window.performanceChart) return;
    
    // Update active state of buttons
    document.querySelectorAll('[data-chart]').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-chart="${chartType}"]`).classList.add('active');
    
    // Get data from hidden element or API
    let performanceData;
    try {
        performanceData = JSON.parse(document.getElementById('performance-data-json').textContent);
    } catch (e) {
        console.error('Error loading performance data:', e);
        return;
    }
    
    // Update datasets based on chart type
    switch(chartType) {
        case 'profits':
            window.performanceChart.data.datasets = [{
                label: 'Profit',
                data: performanceData.profits,
                borderColor: chartColors.success,
                backgroundColor: chartColors.successLight,
                fill: true
            }];
            break;
        case 'yields':
            window.performanceChart.data.datasets = [{
                label: 'Yield',
                data: performanceData.yields,
                borderColor: chartColors.warning,
                backgroundColor: chartColors.warningLight,
                fill: true
            }];
            break;
        case 'revenue-expense':
            window.performanceChart.data.datasets = [
                {
                    label: 'Revenue',
                    data: performanceData.revenues,
                    borderColor: chartColors.info,
                    backgroundColor: chartColors.infoLight,
                    fill: true
                },
                {
                    label: 'Expenses',
                    data: performanceData.expenses,
                    borderColor: chartColors.danger,
                    backgroundColor: chartColors.dangerLight,
                    fill: true
                }
            ];
            break;
    }
    
    window.performanceChart.update();
}

// Fetch investment summary data from API
function fetchInvestmentSummary() {
    fetch('/api/investment-summary')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            updatePortfolioChart(data);
            updatePortfolioDistribution(data);
        })
        .catch(error => {
            console.error('Error fetching investment summary:', error);
            // Use sample data for display in case of API failure
            const sampleData = {
                farm_types: ['Crop', 'Livestock', 'Mixed'],
                investment_amounts: [5000, 3000, 2000],
                total_invested: 10000,
                total_roi: 1500
            };
            updatePortfolioChart(sampleData);
            updatePortfolioDistribution(sampleData);
        });
}

// Update portfolio chart with retrieved data
function updatePortfolioChart(data) {
    if (!window.portfolioChart) return;
    
    // Update chart data
    window.portfolioChart.data.labels = data.farm_types;
    window.portfolioChart.data.datasets[0].data = data.investment_amounts;
    
    // Set colors for different farm types
    const colors = [
        chartColors.success,
        chartColors.info,
        chartColors.warning,
        '#6610f2', // Purple
        '#d63384', // Pink
        '#20c997'  // Teal
    ];
    
    window.portfolioChart.data.datasets[0].backgroundColor = 
        data.farm_types.map((_, i) => colors[i % colors.length]);
    
    window.portfolioChart.update();
}

// Update portfolio distribution text elements
function updatePortfolioDistribution(data) {
    const portfolioDiv = document.getElementById('portfolioDistribution');
    if (!portfolioDiv) return;
    
    portfolioDiv.innerHTML = '';
    
    // Set appropriate colors
    const colors = [
        chartColors.success,
        chartColors.info,
        chartColors.warning,
        '#6610f2', // Purple
        '#d63384', // Pink
        '#20c997'  // Teal
    ];
    
    data.farm_types.forEach((type, i) => {
        const percentage = Math.round((data.investment_amounts[i] / data.total_invested) * 100);
        
        const item = document.createElement('div');
        item.className = 'd-flex justify-content-between align-items-center mb-2';
        item.innerHTML = `
            <div class="d-flex align-items-center">
                <span class="badge me-2" style="background-color: ${colors[i % colors.length]};">&nbsp;</span>
                <span>${type}</span>
            </div>
            <span>$${data.investment_amounts[i].toFixed(2)} (${percentage}%)</span>
        `;
        
        portfolioDiv.appendChild(item);
    });
}

// Calculate and update investment metrics (projected returns, risk level, etc.)
function calculateInvestmentMetrics() {
    // Get elements
    const projectedReturnsEl = document.getElementById('projected-returns');
    const avgRoiEl = document.getElementById('avg-roi');
    const overallRiskEl = document.getElementById('overall-risk');
    const riskIndicatorEl = document.getElementById('risk-indicator');
    
    if (!projectedReturnsEl) return;
    
    // Get investments data from table or API
    const investments = Array.from(document.querySelectorAll('table tbody tr')).map(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
            return {
                amount: parseFloat(cells[2].textContent.replace('$', '').trim()),
                roi: parseFloat(cells[4].textContent.replace('%', '').trim()) / 100,
                status: cells[5].textContent.trim()
            };
        }
        return null;
    }).filter(inv => inv !== null);
    
    if (investments.length > 0) {
        // Calculate projected returns
        const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
        const weightedRoi = investments.reduce((sum, inv) => sum + (inv.roi * inv.amount), 0) / totalInvested;
        const projectedReturns = totalInvested * weightedRoi;
        
        // Update UI
        projectedReturnsEl.textContent = projectedReturns.toFixed(2);
        avgRoiEl.textContent = (weightedRoi * 100).toFixed(1) + '%';
        
        // Calculate risk level
        const rois = investments.map(inv => inv.roi);
        const avgRoi = rois.reduce((sum, roi) => sum + roi, 0) / rois.length;
        const variance = rois.reduce((sum, roi) => sum + Math.pow(roi - avgRoi, 2), 0) / rois.length;
        const riskScore = Math.min(variance * 100, 100);
        
        let riskLevel = 'Low';
        let riskColor = 'success';
        let riskWidth = 33;
        
        if (riskScore > 30) {
            riskLevel = 'Medium';
            riskColor = 'warning';
            riskWidth = 66;
        }
        
        if (riskScore > 60) {
            riskLevel = 'High';
            riskColor = 'danger';
            riskWidth = 100;
        }
        
        if (overallRiskEl) overallRiskEl.textContent = riskLevel;
        
        if (riskIndicatorEl) {
            riskIndicatorEl.style.width = `${riskWidth}%`;
            riskIndicatorEl.className = `progress-bar bg-${riskColor}`;
        }
    } else {
        // Default values for no investments
        if (projectedReturnsEl) projectedReturnsEl.textContent = '0.00';
        if (avgRoiEl) avgRoiEl.textContent = '0.0%';
        if (overallRiskEl) overallRiskEl.textContent = 'N/A';
        if (riskIndicatorEl) riskIndicatorEl.style.width = '0%';
    }
}
