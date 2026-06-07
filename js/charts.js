/**
 * KumbhFlow AI - Analytics Charts Handler
 * Renders predictive forecasts and real-time sector capacity bars.
 */

let forecastChart = null;
let occupancyChart = null;

/**
 * Initializes the analytics charts using Chart.js
 */
export function initCharts(forecastCanvasId, occupancyCanvasId) {
    const ctxForecast = document.getElementById(forecastCanvasId);
    const ctxOccupancy = document.getElementById(occupancyCanvasId);

    if (!ctxForecast || !ctxOccupancy) {
        console.error('Canvas elements for charts not found.');
        return;
    }

    // Chart.js defaults configuration for dark theme
    Chart.defaults.color = 'rgba(255, 255, 255, 0.7)';
    Chart.defaults.font.family = "'Outfit', sans-serif";
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.08)';

    // 1. Crowd Density Forecast Chart (Line Chart)
    const hours = ['08:00 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM', '10:00 PM', '12:00 AM'];
    const historicalData = [120, 145, 185, 240, 275, null, null, null, null]; // Simulated thousands of pilgrims
    const predictedData = [null, null, null, 240, 275, 340, 420, 310, 190]; // Forecast curve

    forecastChart = new Chart(ctxForecast, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [
                {
                    label: 'Recorded Density (k)',
                    data: historicalData,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#ffffff',
                    pointRadius: 4
                },
                {
                    label: 'AI Projected Forecast (k)',
                    data: predictedData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    borderDash: [5, 5],
                    tension: 0.4,
                    pointBackgroundColor: '#f59e0b',
                    pointRadius: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: 12, padding: 15 }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    title: { display: true, text: 'Pilgrims Count (Thousands)' },
                    min: 0,
                    max: 500,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });

    // 2. Sector Occupancy Chart (Horizontal Bar Chart)
    const sectors = ['Sangam Ghat', 'Hanuman Temple', 'Checkpoint Beta', 'Gate B', 'Pontoon Br. 2'];
    const currentOccupancy = [148, 21.8, 22, 5.1, 14.1]; // initial values in k
    const capacities = [200, 25, 35, 50, 15]; // max capacities in k

    occupancyChart = new Chart(ctxOccupancy, {
        type: 'bar',
        data: {
            labels: sectors,
            datasets: [
                {
                    label: 'Current (k)',
                    data: currentOccupancy,
                    backgroundColor: function(context) {
                        const index = context.dataIndex;
                        if (index === undefined) return '#6366f1';
                        const val = currentOccupancy[index];
                        const cap = capacities[index];
                        const density = val / cap;
                        if (density > 0.9) return '#ef4444'; // Red
                        if (density > 0.7) return '#f59e0b'; // Orange
                        return '#10b981'; // Green
                    },
                    borderRadius: 4,
                    barThickness: 10
                },
                {
                    label: 'Max Safe Limit (k)',
                    data: capacities,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 4,
                    barThickness: 10
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: 12 }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Crowd Count (k)' },
                    min: 0,
                    max: 220,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                y: {
                    grid: { display: false }
                }
            }
        }
    });
}

/**
 * Updates the charts based on the real-time simulation state.
 */
export function updateCharts(nodes, simulatorState) {
    if (!forecastChart || !occupancyChart) return;

    // Define target sectors we want to track on the chart
    const trackingMap = {
        'Sangam Ghat': 'sangam_entrance',
        'Hanuman Temple': 'hanuman_temple',
        'Checkpoint Beta': 'checkpoint_beta',
        'Gate B': 'entry_gate_b',
        'Pontoon Br. 2': 'pontoon_bridge_2'
    };

    const sectors = Object.keys(trackingMap);
    const newOccupancy = [];
    const newCapacities = [];

    sectors.forEach(label => {
        const nodeId = trackingMap[label];
        const node = nodes[nodeId];
        if (node) {
            newOccupancy.push(parseFloat((node.currentCount / 1000).toFixed(1)));
            newCapacities.push(parseFloat((node.capacity / 1000).toFixed(1)));
        }
    });

    // Update Bar Chart Data
    occupancyChart.data.datasets[0].data = newOccupancy;
    occupancyChart.data.datasets[1].data = newCapacities;
    occupancyChart.update('none'); // Update without animation for performance

    // Update Forecast Chart Data based on current simulation context
    // If there is an active surge or weather is bad, let's bump the projected forecast curve up!
    let forecastMultiplier = 1.0;
    if (simulatorState.weather === 'rain') {
        forecastMultiplier = 0.85; // Less overall arrivals, but longer queues
    } else if (simulatorState.weather === 'extreme_heat') {
        forecastMultiplier = 0.90;
    }
    
    // Add surge impact
    const activeSurges = simulatorState.alerts.filter(a => a.type === 'SURGE' && a.active);
    if (activeSurges.length > 0) {
        forecastMultiplier += 0.15 * activeSurges.length;
    }

    // Calculate total active pilgrims in thousands
    let totalActive = 0;
    for (const key in nodes) {
        totalActive += nodes[key].currentCount;
    }
    const totalActiveK = parseFloat((totalActive / 1000).toFixed(1));

    // Shift forecast line to match the real-time current total pilgrim count
    const historicalData = forecastChart.data.datasets[0].data;
    const predictedData = forecastChart.data.datasets[1].data;

    // We hardcode index 3 (2:00 PM) as the "current time" line
    historicalData[3] = totalActiveK;
    predictedData[3] = totalActiveK;
    
    // Smooth out forecast indices based on multiplier
    predictedData[4] = Math.round(310 * forecastMultiplier);
    predictedData[5] = Math.round(390 * forecastMultiplier);
    predictedData[6] = Math.round(450 * forecastMultiplier);
    predictedData[7] = Math.round(320 * forecastMultiplier);
    predictedData[8] = Math.round(180 * forecastMultiplier);

    forecastChart.update('none');
}
