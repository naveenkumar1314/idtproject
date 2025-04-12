/**
 * Smart Agri Investment - Analytics Dashboard
 * This script handles data fetching, chart rendering and interactivity for the analytics page
 */

// Global chart instances for reuse
let roiTrendsChart = null;
let weatherYieldChart = null;
let marketPriceChart = null;
let riskLevelsChart = null;

// Chart type configuration (line is default)
let chartType = 'line';

// Modal information content
const chartInfo = {
    roi: `<p>This chart displays Return on Investment (ROI) trends over time, showing actual returns compared to target ROI.</p>
          <p>The chart includes:</p>
          <ul>
            <li><strong>Actual ROI:</strong> Real performance data based on farm profits</li>
            <li><strong>Target ROI:</strong> The expected ROI for this investment opportunity</li>
            <li><strong>Projected ROI:</strong> Estimated future ROI based on historical trends (if forecast is enabled)</li>
          </ul>`,
          
    weather: `<p>This chart illustrates the relationship between weather conditions and crop yields.</p>
             <p>The chart includes:</p>
             <ul>
               <li><strong>Actual Yields:</strong> Recorded harvest amounts</li>
               <li><strong>Predicted Yields:</strong> Expected yields based on weather correlation</li>
               <li><strong>Future Predictions:</strong> Yield forecasts based on seasonal patterns (if forecast is enabled)</li>
             </ul>
             <p>Weather icons indicate conditions during each period, showing how different weather affects productivity.</p>`,
             
    price: `<p>This chart forecasts market prices based on historical data and seasonality factors.</p>
           <p>The chart includes:</p>
           <ul>
             <li><strong>Historical Prices:</strong> Actual price per unit over time</li>
             <li><strong>Price Forecast:</strong> Projected prices for upcoming months (if forecast is enabled)</li>
           </ul>
           <p>Market price projections consider seasonality, inflation, and historical price trends.</p>`,
           
    risk: `<p>This chart analyzes investment risk levels over time based on multiple factors.</p>
          <p>The chart includes:</p>
          <ul>
            <li><strong>Overall Risk:</strong> Combined risk assessment score</li>
            <li><strong>Volatility Risk:</strong> Risk based on profit variability</li>
            <li><strong>Weather Risk:</strong> Risk from weather conditions</li>
            <li><strong>Financial Risk:</strong> Risk based on profit margins</li>
          </ul>
          <p>Lower risk scores indicate safer investments, while higher scores suggest greater volatility.</p>`
};

/**
 * Initialize the analytics dashboard
 */
function initAnalyticsDashboard() {
    // Set up event listeners
    setupEventListeners();
    
    // Initialize empty charts
    initializeCharts();
    
    // Show initial "no data" states
    document.getElementById('roiTrendsNoData').classList.remove('d-none');
    document.getElementById('weatherYieldNoData').classList.remove('d-none');
    document.getElementById('marketPriceNoData').classList.remove('d-none');
    document.getElementById('riskLevelsNoData').classList.remove('d-none');
    
    // Set the last updated timestamp
    updateLastUpdated();
    
    // Initialize tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
}

/**
 * Set up event listeners for the dashboard
 */
function setupEventListeners() {
    // Farm selection change
    document.getElementById('farmSelect').addEventListener('change', function() {
        const farmId = this.value;
        if (farmId) {
            fetchFarmOpportunities(farmId);
            loadWeatherYieldData(farmId);
            loadMarketPriceData(farmId);
        } else {
            // Reset opportunity select
            const opportunitySelect = document.getElementById('opportunitySelect');
            opportunitySelect.innerHTML = '<option value="">Select Project</option>';
            opportunitySelect.disabled = true;
            
            // Reset charts
            resetCharts();
        }
    });
    
    // Opportunity selection change
    document.getElementById('opportunitySelect').addEventListener('change', function() {
        const opportunityId = this.value;
        if (opportunityId) {
            loadROITrendsData(opportunityId);
            loadRiskLevelsData(opportunityId);
        } else {
            // Reset ROI and Risk charts
            resetROIChart();
            resetRiskChart();
        }
    });
    
    // Time period change
    document.getElementById('chartPeriod').addEventListener('change', function() {
        // Refresh all charts with the new period
        refreshAllCharts();
    });
    
    // Forecast toggle
    document.getElementById('includeForecast').addEventListener('change', function() {
        // Refresh all charts with forecast setting
        refreshAllCharts();
    });
    
    // Refresh button
    document.getElementById('refreshDataBtn').addEventListener('click', function() {
        refreshAllCharts();
        updateLastUpdated();
    });
    
    // Chart type buttons
    document.querySelectorAll('.chart-type-btn').forEach(button => {
        button.addEventListener('click', function() {
            chartType = this.getAttribute('data-type');
            refreshAllCharts();
        });
    });
    
    // Chart info buttons
    document.getElementById('roiInfoBtn').addEventListener('click', function() {
        showInfoModal('ROI Trends', chartInfo.roi);
    });
    
    document.getElementById('weatherInfoBtn').addEventListener('click', function() {
        showInfoModal('Weather vs. Yield', chartInfo.weather);
    });
    
    document.getElementById('priceInfoBtn').addEventListener('click', function() {
        showInfoModal('Market Price Prediction', chartInfo.price);
    });
    
    document.getElementById('riskInfoBtn').addEventListener('click', function() {
        showInfoModal('Risk Level Analysis', chartInfo.risk);
    });
    
    // Download chart button
    document.getElementById('downloadChartBtn').addEventListener('click', function() {
        // Create a zip of all charts
        alert('Chart download functionality will be available in a future update.');
    });
}

/**
 * Initialize empty chart canvases
 */
function initializeCharts() {
    // ROI Trends Chart
    const roiCtx = document.getElementById('roiTrendsChart').getContext('2d');
    roiTrendsChart = new Chart(roiCtx, {
        type: chartType,
        data: {
            labels: [],
            datasets: []
        },
        options: getChartOptions('ROI (%)')
    });
    
    // Weather vs Yield Chart
    const weatherCtx = document.getElementById('weatherYieldChart').getContext('2d');
    weatherYieldChart = new Chart(weatherCtx, {
        type: chartType,
        data: {
            labels: [],
            datasets: []
        },
        options: getChartOptions('Yield (tons)')
    });
    
    // Market Price Chart
    const priceCtx = document.getElementById('marketPriceChart').getContext('2d');
    marketPriceChart = new Chart(priceCtx, {
        type: chartType,
        data: {
            labels: [],
            datasets: []
        },
        options: getChartOptions('Price per Unit ($)')
    });
    
    // Risk Levels Chart
    const riskCtx = document.getElementById('riskLevelsChart').getContext('2d');
    riskLevelsChart = new Chart(riskCtx, {
        type: chartType,
        data: {
            labels: [],
            datasets: []
        },
        options: getChartOptions('Risk Level (%)')
    });
}

/**
 * Get standard chart options with customizable y-axis label
 */
function getChartOptions(yAxisLabel) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            tooltip: {
                mode: 'index',
                intersect: false
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: yAxisLabel
                }
            }
        }
    };
}

/**
 * Fetch available investment opportunities for a farm
 */
function fetchFarmOpportunities(farmId) {
    // In a real application, this would fetch from the server
    fetch(`/farm/${farmId}`)
        .then(response => {
            if (response.ok) {
                // Parse the HTML to extract opportunities
                return response.text();
            }
            throw new Error('Farm not found');
        })
        .then(html => {
            // Create a temporary element to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Find the opportunities section
            const opportunities = [];
            const opportunityElements = tempDiv.querySelectorAll('.opportunity-card');
            
            opportunityElements.forEach(element => {
                const id = element.getAttribute('data-opportunity-id');
                const title = element.querySelector('.opportunity-title').textContent;
                
                if (id && title) {
                    opportunities.push({ id, title });
                }
            });
            
            // Update the opportunity select
            updateOpportunitySelect(opportunities);
        })
        .catch(error => {
            console.error('Error fetching farm opportunities:', error);
            // Reset opportunity select
            const opportunitySelect = document.getElementById('opportunitySelect');
            opportunitySelect.innerHTML = '<option value="">Select Project</option>';
            opportunitySelect.disabled = true;
        });
}

/**
 * Update the opportunity select dropdown with available options
 */
function updateOpportunitySelect(opportunities) {
    const opportunitySelect = document.getElementById('opportunitySelect');
    
    // Clear existing options
    opportunitySelect.innerHTML = '<option value="">Select Project</option>';
    
    // Add new options
    opportunities.forEach(opportunity => {
        const option = document.createElement('option');
        option.value = opportunity.id;
        option.textContent = opportunity.title;
        opportunitySelect.appendChild(option);
    });
    
    // Enable the select
    opportunitySelect.disabled = false;
}

/**
 * Load ROI trends data for a specific opportunity
 */
function loadROITrendsData(opportunityId) {
    fetch(`/api/roi-trends/${opportunityId}`)
        .then(response => response.json())
        .then(data => {
            updateROITrendsChart(data);
            updateROITrendsSummary(data);
            generateROIInsights(data);
        })
        .catch(error => {
            console.error('Error loading ROI trends data:', error);
            resetROIChart();
        });
}

/**
 * Update the ROI trends chart with data
 */
function updateROITrendsChart(data) {
    // Show/hide elements
    document.getElementById('roiTrendsNoData').classList.add('d-none');
    document.getElementById('roiTrendsSummary').classList.remove('d-none');
    
    // Get forecast setting
    const includeForecast = document.getElementById('includeForecast').checked;
    
    // Get labels and data based on period
    const period = document.getElementById('chartPeriod').value;
    let { dates, values } = processTimeSeriesData(data.dates, data.roi_values, period);
    
    // Limit to historical data if forecast is disabled
    if (!includeForecast && data.dates.length < dates.length) {
        dates = dates.slice(0, data.dates.length);
        values = values.slice(0, data.dates.length);
    }
    
    // Update the chart
    roiTrendsChart.data.labels = dates;
    roiTrendsChart.data.datasets = [
        {
            label: 'Actual ROI',
            data: values,
            borderColor: '#38b000',
            backgroundColor: 'rgba(56, 176, 0, 0.1)',
            borderWidth: 2,
            fill: true
        },
        {
            label: 'Target ROI',
            data: Array(dates.length).fill(data.target_roi),
            borderColor: '#6c757d',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0
        }
    ];
    
    // Update chart type
    roiTrendsChart.config.type = chartType;
    
    // Update the chart
    roiTrendsChart.update();
}

/**
 * Update ROI trends summary information
 */
function updateROITrendsSummary(data) {
    // Target ROI
    document.getElementById('targetRoi').textContent = `${data.target_roi}%`;
    
    // Current ROI (latest value)
    const currentRoi = data.roi_values[data.roi_values.length - 1];
    document.getElementById('currentRoi').textContent = `${currentRoi}%`;
    
    // ROI Trend
    let trendIcon, trendClass;
    if (data.roi_values.length >= 2) {
        const lastRoi = data.roi_values[data.roi_values.length - 1];
        const prevRoi = data.roi_values[data.roi_values.length - 2];
        
        if (lastRoi > prevRoi) {
            trendIcon = '<i class="fas fa-arrow-up text-success me-1"></i>';
            trendClass = 'text-success';
        } else if (lastRoi < prevRoi) {
            trendIcon = '<i class="fas fa-arrow-down text-danger me-1"></i>';
            trendClass = 'text-danger';
        } else {
            trendIcon = '<i class="fas fa-arrows-alt-h text-warning me-1"></i>';
            trendClass = 'text-warning';
        }
    } else {
        trendIcon = '<i class="fas fa-minus text-muted me-1"></i>';
        trendClass = '';
    }
    
    document.getElementById('roiTrend').innerHTML = trendIcon + `<span class="${trendClass}">` + 
        (data.roi_values.length >= 2 ? `${Math.abs(data.roi_values[data.roi_values.length - 1] - data.roi_values[data.roi_values.length - 2]).toFixed(2)}%` : 'No trend data') + 
        '</span>';
}

/**
 * Load weather vs. yield data for a specific farm
 */
function loadWeatherYieldData(farmId) {
    fetch(`/api/weather-yield/${farmId}`)
        .then(response => response.json())
        .then(data => {
            updateWeatherYieldChart(data);
            updateWeatherYieldSummary(data);
            generateWeatherInsights(data);
        })
        .catch(error => {
            console.error('Error loading weather vs. yield data:', error);
            resetWeatherChart();
        });
}

/**
 * Update the weather vs. yield chart with data
 */
function updateWeatherYieldChart(data) {
    // Show/hide elements
    document.getElementById('weatherYieldNoData').classList.add('d-none');
    document.getElementById('weatherYieldSummary').classList.remove('d-none');
    
    // Get forecast setting
    const includeForecast = document.getElementById('includeForecast').checked;
    
    // Get labels and data based on period
    const period = document.getElementById('chartPeriod').value;
    let { dates: historicalDates, values: actualYields } = processTimeSeriesData(data.dates, data.yields_actual, period);
    let { values: predictedYields } = processTimeSeriesData(data.dates, data.yields_predicted, period);
    
    // Create datasets
    const datasets = [
        {
            label: 'Actual Yield',
            data: actualYields,
            borderColor: '#38b000',
            backgroundColor: 'rgba(56, 176, 0, 0.1)',
            borderWidth: 2,
            fill: true
        },
        {
            label: 'Predicted Yield',
            data: predictedYields,
            borderColor: '#0dcaf0',
            backgroundColor: 'rgba(13, 202, 240, 0.1)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: true
        }
    ];
    
    // Add future predictions if enabled
    if (includeForecast && data.future_dates && data.future_dates.length > 0) {
        // Process future data
        const { dates: futureDates, values: futureYields } = processTimeSeriesData(data.future_dates, data.future_predictions, period);
        
        // Combine dates and add forecast dataset
        const allDates = [...historicalDates];
        
        // Only add future dates that aren't already in the historical dates
        futureDates.forEach(date => {
            if (!allDates.includes(date)) {
                allDates.push(date);
            }
        });
        
        // Create full datasets with null values for gap between historical and future
        const fullActualData = actualYields.concat(Array(allDates.length - actualYields.length).fill(null));
        const fullPredictedData = predictedYields.concat(Array(allDates.length - predictedYields.length).fill(null));
        
        // Create future dataset with nulls for historical period
        const futureData = Array(historicalDates.length).fill(null).concat(futureYields);
        
        // Update datasets
        datasets[0].data = fullActualData;
        datasets[1].data = fullPredictedData;
        
        // Add future dataset
        datasets.push({
            label: 'Future Forecast',
            data: futureData,
            borderColor: '#fd7e14',
            backgroundColor: 'rgba(253, 126, 20, 0.1)',
            borderWidth: 2,
            borderDash: [3, 3],
            fill: true
        });
        
        // Update chart labels
        weatherYieldChart.data.labels = allDates;
    } else {
        // Just use historical dates
        weatherYieldChart.data.labels = historicalDates;
    }
    
    // Update chart datasets
    weatherYieldChart.data.datasets = datasets;
    
    // Update chart type
    weatherYieldChart.config.type = chartType;
    
    // Update the chart
    weatherYieldChart.update();
}

/**
 * Update weather yield summary information
 */
function updateWeatherYieldSummary(data) {
    // Create weather legend
    const weatherLegend = document.getElementById('weatherLegend');
    weatherLegend.innerHTML = '';
    
    // Get unique weather conditions
    const uniqueConditions = [...new Set(data.weather_conditions)];
    
    // Create legend items
    uniqueConditions.forEach(condition => {
        const legendItem = document.createElement('div');
        legendItem.className = 'weather-legend-item mx-2';
        
        // Select appropriate icon based on condition
        let icon;
        switch (condition) {
            case 'Sunny':
                icon = 'sun';
                break;
            case 'Cloudy':
                icon = 'cloud';
                break;
            case 'Rainy':
                icon = 'cloud-rain';
                break;
            case 'Storm':
                icon = 'bolt';
                break;
            case 'Drought':
                icon = 'hot';
                break;
            case 'Ideal':
                icon = 'check-circle';
                break;
            case 'Cold':
                icon = 'snowflake';
                break;
            case 'Hot':
                icon = 'temperature-high';
                break;
            default:
                icon = 'cloud';
        }
        
        legendItem.innerHTML = `
            <i class="fas fa-${icon} me-1 text-info"></i>
            <span>${condition}</span>
        `;
        
        weatherLegend.appendChild(legendItem);
    });
}

/**
 * Load market price prediction data for a specific farm
 */
function loadMarketPriceData(farmId) {
    fetch(`/api/market-price-prediction/${farmId}`)
        .then(response => response.json())
        .then(data => {
            updateMarketPriceChart(data);
            updateMarketPriceSummary(data);
            generateMarketPriceInsights(data);
        })
        .catch(error => {
            console.error('Error loading market price prediction data:', error);
            resetMarketPriceChart();
        });
}

/**
 * Update the market price chart with data
 */
function updateMarketPriceChart(data) {
    // Show/hide elements
    document.getElementById('marketPriceNoData').classList.add('d-none');
    document.getElementById('marketPriceSummary').classList.remove('d-none');
    
    // Get forecast setting
    const includeForecast = document.getElementById('includeForecast').checked;
    
    // Get labels and data based on period
    const period = document.getElementById('chartPeriod').value;
    let { dates: historicalDates, values: historicalPrices } = processTimeSeriesData(data.dates, data.historical_prices, period);
    
    // Create datasets
    const datasets = [
        {
            label: 'Historical Price',
            data: historicalPrices,
            borderColor: '#0dcaf0',
            backgroundColor: 'rgba(13, 202, 240, 0.1)',
            borderWidth: 2,
            fill: true
        }
    ];
    
    // Add future predictions if enabled
    if (includeForecast && data.future_dates && data.future_dates.length > 0) {
        // Process future data
        const { dates: futureDates, values: futurePrices } = processTimeSeriesData(data.future_dates, data.predicted_prices, period);
        
        // Combine dates
        const allDates = [...historicalDates];
        
        // Only add future dates that aren't already in the historical dates
        futureDates.forEach(date => {
            if (!allDates.includes(date)) {
                allDates.push(date);
            }
        });
        
        // Create full historical dataset with null values for future
        const fullHistoricalData = historicalPrices.concat(Array(allDates.length - historicalPrices.length).fill(null));
        
        // Create future dataset with nulls for historical period
        const futureData = Array(historicalDates.length).fill(null).concat(futurePrices);
        
        // Update historical dataset
        datasets[0].data = fullHistoricalData;
        
        // Add future dataset
        datasets.push({
            label: 'Price Forecast',
            data: futureData,
            borderColor: '#fd7e14',
            backgroundColor: 'rgba(253, 126, 20, 0.1)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: true
        });
        
        // Update chart labels
        marketPriceChart.data.labels = allDates;
    } else {
        // Just use historical dates
        marketPriceChart.data.labels = historicalDates;
    }
    
    // Update chart datasets
    marketPriceChart.data.datasets = datasets;
    
    // Update chart type
    marketPriceChart.config.type = chartType;
    
    // Update the chart
    marketPriceChart.update();
}

/**
 * Update market price summary information
 */
function updateMarketPriceSummary(data) {
    // Current price (latest historical price)
    const currentPrice = data.historical_prices[data.historical_prices.length - 1];
    document.getElementById('currentPrice').textContent = `$${currentPrice}`;
    
    // Forecast price (6 months ahead if available)
    if (data.predicted_prices && data.predicted_prices.length > 0) {
        const forecastPrice = data.predicted_prices[data.predicted_prices.length - 1];
        document.getElementById('forecastPrice').textContent = `$${forecastPrice}`;
        
        // Calculate price trend (difference between forecast and current)
        const priceDifference = forecastPrice - currentPrice;
        const percentChange = ((priceDifference / currentPrice) * 100).toFixed(1);
        
        let trendIcon, trendClass;
        if (priceDifference > 0) {
            trendIcon = '<i class="fas fa-arrow-up text-success me-1"></i>';
            trendClass = 'text-success';
        } else if (priceDifference < 0) {
            trendIcon = '<i class="fas fa-arrow-down text-danger me-1"></i>';
            trendClass = 'text-danger';
        } else {
            trendIcon = '<i class="fas fa-arrows-alt-h text-warning me-1"></i>';
            trendClass = 'text-warning';
        }
        
        document.getElementById('priceTrend').innerHTML = trendIcon + `<span class="${trendClass}">${percentChange}%</span>`;
    } else {
        document.getElementById('forecastPrice').textContent = '--';
        document.getElementById('priceTrend').innerHTML = '<i class="fas fa-minus text-muted me-1"></i><span>No forecast</span>';
    }
}

/**
 * Load risk levels data for a specific opportunity
 */
function loadRiskLevelsData(opportunityId) {
    fetch(`/api/risk-levels/${opportunityId}`)
        .then(response => response.json())
        .then(data => {
            updateRiskLevelsChart(data);
            updateRiskLevelsSummary(data);
            generateRiskInsights(data);
        })
        .catch(error => {
            console.error('Error loading risk levels data:', error);
            resetRiskChart();
        });
}

/**
 * Update the risk levels chart with data
 */
function updateRiskLevelsChart(data) {
    // Show/hide elements
    document.getElementById('riskLevelsNoData').classList.add('d-none');
    document.getElementById('riskLevelsSummary').classList.remove('d-none');
    
    // Get labels and data based on period
    const period = document.getElementById('chartPeriod').value;
    let { dates, values: overallRisks } = processTimeSeriesData(data.dates, data.overall_risks, period);
    let { values: volatilityRisks } = processTimeSeriesData(data.dates, data.volatility_risks, period);
    let { values: weatherRisks } = processTimeSeriesData(data.dates, data.weather_risks, period);
    let { values: financialRisks } = processTimeSeriesData(data.dates, data.financial_risks, period);
    
    // Update the chart
    riskLevelsChart.data.labels = dates;
    riskLevelsChart.data.datasets = [
        {
            label: 'Overall Risk',
            data: overallRisks,
            borderColor: '#dc3545',
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
            borderWidth: 2,
            fill: true
        },
        {
            label: 'Volatility Risk',
            data: volatilityRisks,
            borderColor: '#fd7e14',
            backgroundColor: 'rgba(253, 126, 20, 0.1)',
            borderWidth: 2,
            fill: true
        },
        {
            label: 'Weather Risk',
            data: weatherRisks,
            borderColor: '#0dcaf0',
            backgroundColor: 'rgba(13, 202, 240, 0.1)',
            borderWidth: 2,
            fill: true
        },
        {
            label: 'Financial Risk',
            data: financialRisks,
            borderColor: '#6610f2',
            backgroundColor: 'rgba(102, 16, 242, 0.1)',
            borderWidth: 2,
            fill: true
        }
    ];
    
    // Update chart type
    riskLevelsChart.config.type = chartType;
    
    // Update the chart
    riskLevelsChart.update();
}

/**
 * Update risk levels summary information
 */
function updateRiskLevelsSummary(data) {
    // Initial risk level
    document.getElementById('initialRisk').innerHTML = `<span class="${getRiskClass(data.base_risk_level)}">${data.base_risk_level}</span>`;
    
    // Current risk (latest category)
    const currentRiskCategory = data.risk_categories[data.risk_categories.length - 1];
    document.getElementById('currentRisk').innerHTML = `<span class="${getRiskClass(currentRiskCategory)}">${currentRiskCategory}</span>`;
    
    // Risk trend
    let trendText, trendIcon, trendClass;
    
    if (data.overall_risks.length >= 2) {
        const lastRisk = data.overall_risks[data.overall_risks.length - 1];
        const firstRisk = data.overall_risks[0];
        const difference = lastRisk - firstRisk;
        
        if (difference < -5) {
            trendText = 'Decreasing';
            trendIcon = '<i class="fas fa-arrow-down text-success me-1"></i>';
            trendClass = 'text-success';
        } else if (difference > 5) {
            trendText = 'Increasing';
            trendIcon = '<i class="fas fa-arrow-up text-danger me-1"></i>';
            trendClass = 'text-danger';
        } else {
            trendText = 'Stable';
            trendIcon = '<i class="fas fa-arrows-alt-h text-warning me-1"></i>';
            trendClass = 'text-warning';
        }
    } else {
        trendText = 'No trend data';
        trendIcon = '<i class="fas fa-minus text-muted me-1"></i>';
        trendClass = '';
    }
    
    document.getElementById('riskTrend').innerHTML = trendIcon + `<span class="${trendClass}">${trendText}</span>`;
}

/**
 * Get CSS class based on risk level
 */
function getRiskClass(riskLevel) {
    switch (riskLevel) {
        case 'Low':
            return 'text-success';
        case 'Medium':
            return 'text-warning';
        case 'High':
            return 'text-danger';
        default:
            return '';
    }
}

/**
 * Process time series data based on selected period
 */
function processTimeSeriesData(dates, values, period = 'monthly') {
    if (!dates || !values || dates.length === 0 || values.length === 0) {
        return { dates: [], values: [] };
    }
    
    // Make copies to avoid modifying originals
    const datesCopy = [...dates];
    const valuesCopy = [...values];
    
    // For demo purposes, we'll just use subsets of the data based on period
    switch (period) {
        case 'quarterly':
            // Use every 3rd point
            return {
                dates: datesCopy.filter((_, i) => i % 3 === 0),
                values: valuesCopy.filter((_, i) => i % 3 === 0)
            };
        case 'yearly':
            // Use first point of each year
            const yearlyData = { dates: [], values: [] };
            let currentYear = null;
            
            datesCopy.forEach((date, i) => {
                const year = date.substring(0, 4);
                if (year !== currentYear) {
                    currentYear = year;
                    yearlyData.dates.push(date);
                    yearlyData.values.push(valuesCopy[i]);
                }
            });
            
            return yearlyData;
        case 'monthly':
        default:
            // Use all data points
            return { dates: datesCopy, values: valuesCopy };
    }
}

/**
 * Generate insights for ROI trends
 */
function generateROIInsights(data) {
    // This would generate insights based on the ROI data
    // For now, we'll just update the insights container
    updateInsightsContainer([
        {
            title: 'ROI Performance',
            icon: 'chart-line',
            content: `The investment is currently generating a ${data.roi_values[data.roi_values.length - 1]}% ROI, compared to the target of ${data.target_roi}%.`,
            iconClass: 'text-success'
        }
    ]);
}

/**
 * Generate insights for weather vs. yield data
 */
function generateWeatherInsights(data) {
    // This would generate insights based on the weather and yield data
    // For now, we'll just update the insights container
    updateInsightsContainer([
        {
            title: 'Weather Impact',
            icon: 'cloud-sun-rain',
            content: 'Weather conditions have a significant impact on crop yields, with ideal conditions increasing yield by up to 20%.',
            iconClass: 'text-info'
        }
    ], true); // Append to existing insights
}

/**
 * Generate insights for market price predictions
 */
function generateMarketPriceInsights(data) {
    // This would generate insights based on the market price data
    // For now, we'll just update the insights container
    let trendDirection = '';
    let trendClass = '';
    
    if (data.predicted_prices && data.historical_prices) {
        const lastHistorical = data.historical_prices[data.historical_prices.length - 1];
        const lastPredicted = data.predicted_prices[data.predicted_prices.length - 1];
        
        if (lastPredicted > lastHistorical) {
            trendDirection = 'upward';
            trendClass = 'text-success';
        } else if (lastPredicted < lastHistorical) {
            trendDirection = 'downward';
            trendClass = 'text-danger';
        } else {
            trendDirection = 'stable';
            trendClass = 'text-warning';
        }
    }
    
    updateInsightsContainer([
        {
            title: 'Market Price Trend',
            icon: 'dollar-sign',
            content: `The market price for ${data.farm_type} crops shows a <span class="${trendClass}">${trendDirection}</span> trend over the next 6 months.`,
            iconClass: 'text-warning'
        }
    ], true); // Append to existing insights
}

/**
 * Generate insights for risk levels
 */
function generateRiskInsights(data) {
    // This would generate insights based on the risk data
    // For now, we'll just update the insights container
    updateInsightsContainer([
        {
            title: 'Risk Assessment',
            icon: 'shield-alt',
            content: `The overall investment risk is classified as <span class="${getRiskClass(data.risk_categories[data.risk_categories.length - 1])}">${data.risk_categories[data.risk_categories.length - 1]}</span>.`,
            iconClass: 'text-danger'
        }
    ], true); // Append to existing insights
}

/**
 * Update the insights container with new insights
 */
function updateInsightsContainer(insights, append = false) {
    const container = document.getElementById('insightsContainer');
    
    // Hide "no insights" message
    document.getElementById('noInsights').classList.add('d-none');
    
    // Clear container if not appending
    if (!append) {
        container.innerHTML = '';
    }
    
    // Add new insights
    insights.forEach(insight => {
        const insightElement = document.createElement('div');
        insightElement.className = 'col-md-6 col-lg-3 mb-3';
        insightElement.innerHTML = `
            <div class="card h-100 border-0 bg-dark-subtle">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <div class="me-3">
                            <i class="fas fa-${insight.icon} fa-2x ${insight.iconClass}"></i>
                        </div>
                        <h5 class="mb-0">${insight.title}</h5>
                    </div>
                    <p class="mb-0">${insight.content}</p>
                </div>
            </div>
        `;
        container.appendChild(insightElement);
    });
}

/**
 * Refresh all charts with current settings
 */
function refreshAllCharts() {
    const farmId = document.getElementById('farmSelect').value;
    const opportunityId = document.getElementById('opportunitySelect').value;
    
    if (farmId) {
        loadWeatherYieldData(farmId);
        loadMarketPriceData(farmId);
        
        if (opportunityId) {
            loadROITrendsData(opportunityId);
            loadRiskLevelsData(opportunityId);
        }
    }
}

/**
 * Reset all charts to empty state
 */
function resetCharts() {
    resetROIChart();
    resetWeatherChart();
    resetMarketPriceChart();
    resetRiskChart();
    
    // Clear insights
    document.getElementById('insightsContainer').innerHTML = '';
    document.getElementById('noInsights').classList.remove('d-none');
}

/**
 * Reset the ROI trends chart
 */
function resetROIChart() {
    // Reset chart data
    roiTrendsChart.data.labels = [];
    roiTrendsChart.data.datasets = [];
    roiTrendsChart.update();
    
    // Show "no data" message
    document.getElementById('roiTrendsNoData').classList.remove('d-none');
    document.getElementById('roiTrendsSummary').classList.add('d-none');
}

/**
 * Reset the weather vs. yield chart
 */
function resetWeatherChart() {
    // Reset chart data
    weatherYieldChart.data.labels = [];
    weatherYieldChart.data.datasets = [];
    weatherYieldChart.update();
    
    // Show "no data" message
    document.getElementById('weatherYieldNoData').classList.remove('d-none');
    document.getElementById('weatherYieldSummary').classList.add('d-none');
}

/**
 * Reset the market price chart
 */
function resetMarketPriceChart() {
    // Reset chart data
    marketPriceChart.data.labels = [];
    marketPriceChart.data.datasets = [];
    marketPriceChart.update();
    
    // Show "no data" message
    document.getElementById('marketPriceNoData').classList.remove('d-none');
    document.getElementById('marketPriceSummary').classList.add('d-none');
}

/**
 * Reset the risk levels chart
 */
function resetRiskChart() {
    // Reset chart data
    riskLevelsChart.data.labels = [];
    riskLevelsChart.data.datasets = [];
    riskLevelsChart.update();
    
    // Show "no data" message
    document.getElementById('riskLevelsNoData').classList.remove('d-none');
    document.getElementById('riskLevelsSummary').classList.add('d-none');
}

/**
 * Show information modal with chart details
 */
function showInfoModal(title, content) {
    const modal = new bootstrap.Modal(document.getElementById('infoModal'));
    document.getElementById('infoModalLabel').textContent = title;
    document.getElementById('infoModalContent').innerHTML = content;
    modal.show();
}

/**
 * Update the "Last Updated" timestamp
 */
function updateLastUpdated() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    document.getElementById('lastUpdated').textContent = now.toLocaleDateString('en-US', options);
}