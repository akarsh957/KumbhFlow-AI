/**
 * KumbhFlow AI - Master Controller Script
 * Connects maps, simulation loops, charting, CCTV simulations, and UI binds.
 */

import { MAP_CONFIG, NODES, EDGES, getNeighbors } from './config.js';
import { findPath } from './routing.js';
import { CrowdSimulator } from './simulation.js';
import { initCharts, updateCharts } from './charts.js';
import { initCamera, setCameraLocation, stopCameraLoop } from './camera.js';

// Application state variables
let authorityMap = null;
let pilgrimMap = null;
let simulator = null;
let currentLanguage = 'en';
let isBackendOnline = false;

// Leaflet Layer Groups
let authNodesLayer = null;
let authEdgesLayer = null;
let authAgentsLayer = null;
let authRoutePolyline = null;

let pilgrimRoutePolyline = null;
let pilgrimMarkersLayer = null;

// Node index translations for navigation guidance
const NODE_DIRECTIONS = {
    junction_station: 'Exit Prayagraj Junction Station south gate.',
    rambagh_station: 'Exit Rambagh Station south gate.',
    naini_parking: 'Board Shuttle bus from Naini parking lot.',
    jhalwa_parking: 'Exit Jhalwa Parking towards Sector 1 path.',
    entry_gate_a: 'Walk through Gate A (Sector 1) security arches.',
    entry_gate_b: 'Walk through Gate B (Sector 2) security arches.',
    checkpoint_alpha: 'Pass through Sector 3 Checkpoint (Kali Marg).',
    checkpoint_beta: 'Proceed through Sector 4 Checkpoint (Triveni Marg).',
    fort_road_junction: 'Follow Fort Road past the Prayagraj Fort walls.',
    hanuman_temple: 'Move around Bade Hanuman Temple (caution: dense crowds).',
    akshayavat: 'Head down Mela Marg past Akshayavat Temple.',
    qila_ghat: 'Arrive at Qila Bathing Ghat steps.',
    saraswati_ghat: 'Arrive at Saraswati Ghat banks.',
    pontoon_bridge_1: 'Cross the Ganges via Pontoon Bridge 1 (East).',
    pontoon_bridge_2: 'Cross the Ganges via Pontoon Bridge 2 (Central).',
    pontoon_bridge_3: 'Cross the Yamuna via Pontoon Bridge 3 (South).',
    shastri_bridge: 'Walk along the pedestrian path of Shastri Road Bridge.',
    sangam_entrance: 'Arrive at Triveni Sangam Confluence Bathing Area.',
    sector_5_ghat: 'Arrive at Sector 5 Sachan Bank Bathing Ghat.'
};

const HINDI_NODE_DIRECTIONS = {
    junction_station: 'प्रयागराज जंक्शन स्टेशन के दक्षिण द्वार से बाहर निकलें।',
    rambagh_station: 'रामबाग स्टेशन के दक्षिण द्वार से बाहर निकलें।',
    naini_parking: 'नैनी पार्किंग स्थल से शटल बस में सवार हों।',
    jhalwa_parking: 'झलवा पार्किंग से सेक्टर 1 मार्ग की ओर बढ़ें।',
    entry_gate_a: 'गेट ए (सेक्टर 1) सुरक्षा जांच से होकर गुजरें।',
    entry_gate_b: 'गेट बी (सेक्टर 2) सुरक्षा जांच से होकर गुजरें।',
    checkpoint_alpha: 'सेक्टर 3 चेकपॉइंट (काली मार्ग) से आगे बढ़ें।',
    checkpoint_beta: 'सेक्टर 4 चेकपॉइंट (त्रिवेणी मार्ग) से होकर जाएं।',
    fort_road_junction: 'किले की दीवारों के पास किला रोड पर चलें।',
    hanuman_temple: 'बड़े हनुमान मंदिर के चारों ओर धीरे चलें (चेतावनी: भारी भीड़)।',
    akshayavat: 'अक्षयवट मंदिर के पास मेला मार्ग पर जाएं।',
    qila_ghat: 'किला स्नान घाट की सीढ़ियों पर पहुंचें।',
    saraswati_ghat: 'सरस्वती घाट के किनारे पर पहुंचें।',
    pontoon_bridge_1: 'पंटून पुल 1 (पूर्व) से गंगा नदी पार करें।',
    pontoon_bridge_2: 'पंटून पुल 2 (मध्य) से गंगा नदी पार करें।',
    pontoon_bridge_3: 'पंटून पुल 3 (दक्षिण) से यमुना नदी पार करें।',
    shastri_bridge: 'शास्त्री रोड ब्रिज के पैदल मार्ग पर चलें।',
    sangam_entrance: 'पवित्र त्रिवेणी संगम स्नान क्षेत्र में पहुंचें।',
    sector_5_ghat: 'सेक्टर 5 सचन बैंक स्नान घाट पर पहुंचें।'
};

const TRANSLATIONS = {
    en: {
        langBtn: 'हिन्दी',
        title: 'Kumbh Companion',
        navBtn: 'Map',
        ghatBtn: 'Ghats',
        sosBtn: 'SOS Help',
        routeDist: 'Est. Distance',
        routeTime: 'Walk Time',
        routeSafety: 'Safety Index',
        sosTitle: 'Emergency Medical & Security',
        sosDesc: 'Pressing the button below sends your precise GPS coordinates to the command center authorities. Help will be dispatched immediately.',
        sosBtnText: 'Trigger SOS Alert',
        ghatTitle: 'Live Ghat Crowd Densities',
        searchStart: 'Origin',
        searchEnd: 'Destination'
    },
    hi: {
        langBtn: 'English',
        title: 'कुंभ साथी',
        navBtn: 'मानचित्र',
        ghatBtn: 'घाट स्थिति',
        sosBtn: 'एसओएस सहायता',
        routeDist: 'अनुमानित दूरी',
        routeTime: 'यात्रा समय',
        routeSafety: 'सुरक्षा सूचकांक',
        sosTitle: 'आपातकालीन चिकित्सा एवं सुरक्षा',
        sosDesc: 'नीचे दिए गए बटन को दबाने से आपके सटीक जीपीएस निर्देशांक नियंत्रण कक्ष अधिकारियों को भेज दिए जाते हैं। तुरंत सहायता भेजी जाएगी।',
        sosBtnText: 'एसओएस अलर्ट भेजें',
        ghatTitle: 'लाइव घाट भीड़ की स्थिति',
        searchStart: 'प्रस्थान स्थान',
        searchEnd: 'गंतव्य स्थान'
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check if backend is available
    await checkBackend();

    // 2. Initialize Views switching tabs
    initTabNavigation();

    // 3. Initialize Maps
    initMaps();

    // 4. Initialize CCTV Camera & Charts
    initCharts('forecast-chart', 'occupancy-chart');
    initCamera('cctv-canvas');

    // 5. Initialize Simulation Engine
    initSimulation();
    if (isBackendOnline && simulator) {
        simulator.isBackendOnline = true;
    }

    // 6. Bind UI Controls
    bindControls();

    // 7. Init Route on startup
    updatePilgrimRoute();

    // 8. Start system clock
    startClock();

    // 9. Start polling backend if active
    if (isBackendOnline) {
        startBackendSync();
    }
});

/**
 * Handle Tab Switching between Command Center and Pilgrim companion views
 */
function initTabNavigation() {
    const tabs = document.querySelectorAll('.switch-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetTab = tab.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(targetTab).classList.add('active');

            // Force Leaflet maps to refresh sizes immediately (prevent grey boxes)
            if (targetTab === 'tab-authority' && authorityMap) {
                authorityMap.invalidateSize();
            } else if (targetTab === 'tab-pilgrim' && pilgrimMap) {
                pilgrimMap.invalidateSize();
            }
        });
    });

    // Pilgrim App sub-views switching inside phone frame
    const phoneNavItems = document.querySelectorAll('.phone-nav-item');
    phoneNavItems.forEach(item => {
        item.addEventListener('click', () => {
            phoneNavItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const viewId = item.getAttribute('data-view');
            document.querySelectorAll('.phone-view-container').forEach(view => {
                view.style.display = 'none';
            });
            document.getElementById(viewId).style.display = 'flex';

            if (viewId === 'phone-view-nav' && pilgrimMap) {
                setTimeout(() => {
                    pilgrimMap.invalidateSize();
                }, 50);
            }
        });
    });
}

/**
 * Set up Leaflet map instances with customized dark style overlays
 */
function initMaps() {
    // CartoDB dark tile URL
    const darkTilesUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const osmAttrib = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    // A. Main Map (Authority View)
    authorityMap = L.map('leaflet-map', {
        center: MAP_CONFIG.center,
        zoom: MAP_CONFIG.zoom,
        minZoom: MAP_CONFIG.minZoom,
        maxZoom: MAP_CONFIG.maxZoom,
        zoomControl: true,
        attributionControl: true
    });
    
    L.tileLayer(darkTilesUrl, { attribution: osmAttrib }).addTo(authorityMap);

    authNodesLayer = L.layerGroup().addTo(authorityMap);
    authEdgesLayer = L.layerGroup().addTo(authorityMap);
    authAgentsLayer = L.layerGroup().addTo(authorityMap);
    authRoutePolyline = L.layerGroup().addTo(authorityMap);

    // B. Pilgrim App mini-map
    pilgrimMap = L.map('phone-leaflet-map', {
        center: MAP_CONFIG.center,
        zoom: MAP_CONFIG.zoom - 1, // slightly zoomed out for phone viewport
        minZoom: MAP_CONFIG.minZoom - 1,
        maxZoom: MAP_CONFIG.maxZoom,
        zoomControl: false, // minimalist UI for mobile
        attributionControl: false
    });

    L.tileLayer(darkTilesUrl).addTo(pilgrimMap);

    pilgrimRoutePolyline = L.layerGroup().addTo(pilgrimMap);
    pilgrimMarkersLayer = L.layerGroup().addTo(pilgrimMap);
}

/**
 * Initialize simulation callbacks
 */
function initSimulation() {
    simulator = new CrowdSimulator((agents, alerts) => {
        // Callback executed at 30fps
        
        // 1. Draw agents on authority map
        drawAgents(agents);

        // 2. Draw nodes on authority map with real-time density coloring
        drawNodesAndEdges();

        // 3. Update Chart.js data
        updateCharts(NODES, simulator);

        // 4. Update logs dashboard
        updateAlertsLogs(alerts);

        // 5. Update Pilgrim view wait times & active alerts
        updatePilgrimGhatsView();
        
        // 6. Update general counters
        document.getElementById('app-users-count').innerText = Math.round(agents.length * 8.5 + 45000).toLocaleString();
    });

    // Start simulation loop
    simulator.start();
}

/**
 * Redraw simulated pilgrim particle dots on map
 */
function drawAgents(agents) {
    authAgentsLayer.clearLayers();
    
    agents.forEach(agent => {
        // Color code: Indigo for smart routing app users, Amber for shortest-path uninformed pilgrims
        const color = agent.routingMode === 'safe' ? '#6366f1' : '#f59e0b';
        
        const marker = L.circleMarker([agent.lat, agent.lng], {
            radius: 2.5,
            color: color,
            fillColor: color,
            fillOpacity: 0.8,
            weight: 0,
            pane: 'markerPane'
        });
        authAgentsLayer.addLayer(marker);
    });
}

/**
 * Redraw physical Mela grid nodes and edges.
 * Color updates dynamically depending on current density count / node capacity.
 */
function drawNodesAndEdges() {
    authNodesLayer.clearLayers();
    authEdgesLayer.clearLayers();

    // 1. Draw Edges (Pathways & Pontoon Bridges)
    EDGES.forEach(edge => {
        const fromNode = NODES[edge.from];
        const toNode = NODES[edge.to];
        
        if (!fromNode || !toNode) return;

        let edgeColor = 'rgba(255, 255, 255, 0.2)'; // open highway
        let edgeWeight = 2;
        let isDashed = false;

        if (edge.status !== 'open') {
            edgeColor = 'rgba(239, 68, 68, 0.4)'; // closed bridge
            edgeWeight = 3;
            isDashed = true;
        } else {
            // Density of edge based on simulation load
            const cap = edge.capacity || ((fromNode.capacity + toNode.capacity) * 0.2);
            const utilization = (edge.currentCount || 0) / cap;
            if (utilization > 0.85) {
                edgeColor = '#ef4444'; // Red
                edgeWeight = 4;
            } else if (utilization > 0.60) {
                edgeColor = '#f59e0b'; // Amber
                edgeWeight = 3;
            } else {
                edgeColor = '#10b981'; // Green
                edgeWeight = 2;
            }
        }

        const polyline = L.polyline([fromNode.coords, toNode.coords], {
            color: edgeColor,
            weight: edgeWeight,
            dashArray: isDashed ? '5, 5' : null,
            opacity: 0.7
        });
        
        // Popup detailing edge capacity
        polyline.bindPopup(`
            <div style="color:#f8fafc; font-family:'Outfit';">
                <strong>Pathway segment</strong><br>
                From: ${fromNode.name}<br>
                To: ${toNode.name}<br>
                Status: <span style="color:${edge.status === 'open'?'#10b981':'#ef4444'}; font-weight:bold">${edge.status.toUpperCase()}</span><br>
                Active Pilgrims: ${edge.currentCount.toLocaleString()}
            </div>
        `);
        authEdgesLayer.addLayer(polyline);
    });

    // 2. Draw Nodes (Junctions, Gates, Ghats, Temples)
    for (const nodeId in NODES) {
        const node = NODES[nodeId];
        const utilization = node.currentCount / node.capacity;
        
        let color = '#10b981'; // Green: Safe
        if (utilization > 0.85) {
            color = '#ef4444'; // Red: Critical
        } else if (utilization > 0.60) {
            color = '#f59e0b'; // Amber: Warning
        }

        const size = Math.max(8, Math.min(22, 6 + (node.capacity / 12000)));

        const marker = L.circleMarker(node.coords, {
            radius: size,
            color: color,
            fillColor: color,
            fillOpacity: 0.5,
            weight: 2,
            pane: 'overlayPane'
        });

        // Click marker to update CCTV target camera
        marker.on('click', () => {
            const camSelector = document.getElementById('select-cctv-cam');
            // If option exists in selector, select it
            const option = Array.from(camSelector.options).find(opt => opt.value === nodeId);
            if (option) {
                camSelector.value = nodeId;
                setCameraLocation(nodeId, node.name, node);
            }
        });

        marker.bindPopup(`
            <div style="color:#f8fafc; font-family:'Outfit',sans-serif; width: 200px;">
                <h4 style="margin-bottom:4px; font-weight:700; color:#ffffff;">${node.name}</h4>
                <p style="font-size:11px; margin-bottom:6px; color:var(--text-muted);">${node.desc}</p>
                <div style="border-top:1px solid var(--border-light); padding-top:6px; font-size:12px;">
                    <strong>Occupancy:</strong> ${node.currentCount.toLocaleString()} / ${node.capacity.toLocaleString()}<br>
                    <strong>Density Level:</strong> <span style="font-weight:700; color:${color}">${(utilization * 100).toFixed(1)}%</span>
                </div>
            </div>
        `);

        authNodesLayer.addLayer(marker);
    }
}

/**
 * Draw the active route calculated by the pilgrim navigator onto the maps
 */
function drawRoutePathOnMaps(coordinates) {
    authRoutePolyline.clearLayers();
    pilgrimRoutePolyline.clearLayers();

    if (!coordinates || coordinates.length < 2) return;

    // Draw on Main Authority Map (thick translucent glow line)
    const lineAuth = L.polyline(coordinates, {
        color: '#6366f1',
        weight: 6,
        opacity: 0.45,
        lineCap: 'round'
    });
    authRoutePolyline.addLayer(lineAuth);

    const lineAuthInner = L.polyline(coordinates, {
        color: '#a5b4fc',
        weight: 2,
        opacity: 0.8,
        lineCap: 'round'
    });
    authRoutePolyline.addLayer(lineAuthInner);

    // Draw on mini Pilgrim App Map (solid bright blue line)
    const linePilgrim = L.polyline(coordinates, {
        color: '#6366f1',
        weight: 4,
        opacity: 0.9,
        lineCap: 'round'
    });
    pilgrimRoutePolyline.addLayer(linePilgrim);

    // Highlight start and end markers on pilgrim map
    pilgrimMarkersLayer.clearLayers();
    
    const startCoords = coordinates[0];
    const endCoords = coordinates[coordinates.length - 1];

    const startMarker = L.circleMarker(startCoords, {
        radius: 6,
        color: '#06b6d4',
        fillColor: '#06b6d4',
        fillOpacity: 1,
        weight: 2
    });
    
    const endMarker = L.circleMarker(endCoords, {
        radius: 6,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 1,
        weight: 2
    });

    pilgrimMarkersLayer.addLayer(startMarker);
    pilgrimMarkersLayer.addLayer(endMarker);
    
    // Fit pilgrim map bounds tightly to the route path
    pilgrimMap.fitBounds(linePilgrim.getBounds(), { padding: [15, 15] });
}

/**
 * Update the active incident list feed in Command Center
 */
function updateAlertsLogs(alerts) {
    const feed = document.getElementById('alerts-feed');
    if (!feed) return;

    // Filter active alerts count
    const activeAlerts = alerts.filter(a => a.active);
    const alertCountElement = document.getElementById('app-alerts-count');
    if (alertCountElement) {
        alertCountElement.innerText = activeAlerts.length;
        if (activeAlerts.length > 0) {
            alertCountElement.style.color = 'var(--color-danger)';
            document.getElementById('system-status-text').innerText = 'SYSTEM: CONGESTION ALERTS ACTIVE';
            document.getElementById('system-status-text').parentElement.style.color = 'var(--color-danger)';
            document.getElementById('system-status-text').parentElement.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            document.getElementById('system-status-text').parentElement.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            document.querySelector('.status-dot').style.backgroundColor = 'var(--color-danger)';
            document.querySelector('.status-dot').style.boxShadow = '0 0 8px var(--color-danger)';
            
            // Show alert banner on phone companion app
            document.getElementById('phone-alert-banner').style.display = 'flex';
            document.getElementById('phone-alert-text').innerText = activeAlerts[0].message;
        } else {
            alertCountElement.style.color = 'var(--color-success)';
            document.getElementById('system-status-text').innerText = 'SYSTEM: OPTIMAL';
            document.getElementById('system-status-text').parentElement.style.color = 'var(--color-success)';
            document.getElementById('system-status-text').parentElement.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            document.getElementById('system-status-text').parentElement.style.borderColor = 'rgba(16, 185, 129, 0.2)';
            document.querySelector('.status-dot').style.backgroundColor = 'var(--color-success)';
            document.querySelector('.status-dot').style.boxShadow = '0 0 8px var(--color-success)';
            document.getElementById('phone-alert-banner').style.display = 'none';
        }
    }

    // Refresh log panel DOM
    feed.innerHTML = '';
    
    // Add default init message if feed empty
    if (alerts.length === 0) {
        feed.innerHTML = `
            <div class="alert-item SYSTEM">
                <div class="alert-item-header">
                    <span>System Initialized</span>
                    <span class="alert-time">10:00 AM</span>
                </div>
                <div>Monitoring 19 network nodes and 26 pathway edges. Simulation is running.</div>
            </div>
        `;
        return;
    }

    alerts.forEach(alert => {
        const item = document.createElement('div');
        item.className = `alert-item ${alert.type}`;
        item.innerHTML = `
            <div class="alert-item-header">
                <span>${alert.type.replace('_', ' ')}</span>
                <span class="alert-time">${alert.time}</span>
            </div>
            <div>${alert.message}</div>
        `;
        
        // Fly to location on map if clicked
        if (alert.location) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                authorityMap.setView(alert.location, MAP_CONFIG.maxZoom, { animate: true });
            });
        }
        
        feed.appendChild(item);
    });
}

/**
 * Recalculate route and redraw details inside pilgrim companion UI
 */
function updatePilgrimRoute() {
    const startId = document.getElementById('phone-select-start').value;
    const endId = document.getElementById('phone-select-end').value;
    const activeRouteBtn = document.querySelector('.route-toggle-btn.active');
    const mode = activeRouteBtn ? activeRouteBtn.getAttribute('data-mode') : 'safe';

    const pathData = findPath(startId, endId, mode);

    const txtDistance = document.getElementById('phone-route-distance');
    const txtTime = document.getElementById('phone-route-time');
    const txtSafety = document.getElementById('phone-route-safety');
    const barSafety = document.getElementById('phone-safety-bar');
    const listInstructions = document.getElementById('phone-route-instructions');

    if (pathData) {
        // Draw path coordinates polylines
        drawRoutePathOnMaps(pathData.coordinates);

        // Update card labels
        const distKm = (pathData.distance / 1000).toFixed(1);
        txtDistance.innerText = `${distKm} km`;
        txtTime.innerText = `${pathData.time} mins`;
        txtSafety.innerText = `${pathData.safety}%`;
        
        // Color-code Safety indices
        barSafety.style.width = `${pathData.safety}%`;
        if (pathData.safety > 80) {
            txtSafety.style.color = 'var(--color-success)';
            barSafety.style.backgroundColor = 'var(--color-success)';
        } else if (pathData.safety > 50) {
            txtSafety.style.color = 'var(--color-warning)';
            barSafety.style.backgroundColor = 'var(--color-warning)';
        } else {
            txtSafety.style.color = 'var(--color-danger)';
            barSafety.style.backgroundColor = 'var(--color-danger)';
        }

        // Build step directions list
        listInstructions.innerHTML = '';
        pathData.path.forEach((nodeId, idx) => {
            const step = document.createElement('div');
            step.className = 'instruction-step';
            
            // Translate direction steps
            const textDirections = currentLanguage === 'en' ? NODE_DIRECTIONS : HINDI_NODE_DIRECTIONS;
            let dirText = textDirections[nodeId] || `Proceed past landmark ${NODES[nodeId].name}.`;
            
            // Prefix step number
            step.innerText = `${idx + 1}. ${dirText}`;
            listInstructions.appendChild(step);
        });
    } else {
        // No path (e.g. all links blocked)
        txtDistance.innerText = '--';
        txtTime.innerText = '--';
        txtSafety.innerText = '0%';
        barSafety.style.width = '0%';
        listInstructions.innerHTML = `<div style="color:var(--color-danger); text-align:center; padding: 10px;">
            <i class="fa-solid fa-triangle-exclamation"></i> No safe path found. Infrastructure isolated.
        </div>`;
        authRoutePolyline.clearLayers();
        pilgrimRoutePolyline.clearLayers();
        pilgrimMarkersLayer.clearLayers();
    }
}

/**
 * Dynamically list ghat wait times and densities in the mobile companion app
 */
function updatePilgrimGhatsView() {
    const list = document.getElementById('phone-ghat-list');
    if (!list) return;

    list.innerHTML = '';
    const targetGhatIds = ['sangam_entrance', 'sector_5_ghat', 'qila_ghat', 'saraswati_ghat'];

    targetGhatIds.forEach(id => {
        const node = NODES[id];
        if (!node) return;

        const density = node.currentCount / node.capacity;
        let lvlClass = 'SAFE';
        let waitTime = '15 mins';

        if (density > 0.90) {
            lvlClass = 'CROWDED';
            waitTime = '3.5 hrs';
        } else if (density > 0.70) {
            lvlClass = 'CROWDED';
            waitTime = '2 hrs';
        } else if (density > 0.40) {
            lvlClass = 'MODERATE';
            waitTime = '45 mins';
        }

        const card = document.createElement('div');
        card.className = 'ghat-status-card';
        
        let labelName = node.name;
        if (currentLanguage === 'hi') {
            if (id === 'sangam_entrance') labelName = 'त्रिवेणी संगम स्नान क्षेत्र';
            if (id === 'sector_5_ghat') labelName = 'सेक्टर 5 सचन घाट';
            if (id === 'qila_ghat') labelName = 'किला घाट';
            if (id === 'saraswati_ghat') labelName = 'सरस्वती घाट';
        }

        let timeLabel = currentLanguage === 'en' ? 'Wait' : 'प्रतीक्षा समय';
        let peopleLabel = currentLanguage === 'en' ? 'people' : 'श्रद्धालु';

        card.innerHTML = `
            <div>
                <div class="ghat-name">${labelName}</div>
                <div class="ghat-utilization">${timeLabel}: ${waitTime} • ${node.currentCount.toLocaleString()} ${peopleLabel}</div>
            </div>
            <span class="ghat-level ${lvlClass}">${currentLanguage === 'en' ? lvlClass : (lvlClass==='SAFE'?'सुरक्षित':(lvlClass==='MODERATE'?'मध्यम':'अत्यधिक भीड़'))}</span>
        `;
        list.appendChild(card);
    });
}

/**
 * Event bindings for buttons and slider controls
 */
function bindControls() {
    // 1. Simulation controls
    document.getElementById('slider-speed').addEventListener('input', (e) => {
        const val = e.target.value;
        document.getElementById('speed-val').innerText = val;
        simulator.setSpeed(val);
    });
    document.getElementById('slider-speed').addEventListener('change', async (e) => {
        if (isBackendOnline) {
            try {
                await fetch('/api/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ simulationSpeed: parseFloat(e.target.value) })
                });
            } catch (err) {}
        }
    });

    document.getElementById('slider-spawn').addEventListener('input', (e) => {
        const val = e.target.value;
        document.getElementById('spawn-val').innerText = val;
        simulator.setSpawnRate(val);
    });
    document.getElementById('slider-spawn').addEventListener('change', async (e) => {
        if (isBackendOnline) {
            try {
                await fetch('/api/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ spawnRate: parseFloat(e.target.value) })
                });
            } catch (err) {}
        }
    });

    document.getElementById('select-weather').addEventListener('change', async (e) => {
        const weatherVal = e.target.value;
        simulator.setWeather(weatherVal);
        
        if (isBackendOnline) {
            try {
                await fetch('/api/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ weather: weatherVal })
                });
                
                await fetch('/api/incidents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'WEATHER_CHANGE',
                        message: `Weather condition updated to: ${weatherVal.toUpperCase()}. Walking speeds adjusted.`
                    })
                });
            } catch (err) {}
        }
    });

    // 2. Crowd surge action
    document.getElementById('btn-trigger-surge').addEventListener('click', async () => {
        const sourceId = document.getElementById('select-surge-node').value;
        const sourceName = NODES[sourceId] ? NODES[sourceId].name : sourceId;
        simulator.spawnSurge(sourceId, 350);

        if (isBackendOnline) {
            try {
                await fetch('/api/incidents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'SURGE',
                        message: `Crowd Surge detected at ${sourceName}. Spawning 350 pilgrim groups.`,
                        location: NODES[sourceId] ? NODES[sourceId].coords : null
                    })
                });
            } catch (err) {}
        }
    });

    // 3. Authority alerts broadcast
    document.getElementById('btn-broadcast-alert').addEventListener('click', async () => {
        const input = document.getElementById('input-alert-msg');
        const msg = input.value.trim();
        if (msg) {
            simulator.triggerSystemAlert('SYSTEM', `AUTHORITY ALERT: ${msg}`);
            input.value = '';

            if (isBackendOnline) {
                try {
                    await fetch('/api/incidents', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'SYSTEM',
                            message: `AUTHORITY ALERT: ${msg}`
                        })
                    });
                } catch (err) {}
            }
        }
    });

    // 4. Infrastructure control triggers (Open/Close Bridges)
    document.getElementById('btn-close-bridge').addEventListener('click', async () => {
        const bridgeId = document.getElementById('select-bridge').value;
        const bridgeName = NODES[bridgeId] ? NODES[bridgeId].name : bridgeId;
        const bridgeCoords = NODES[bridgeId] ? NODES[bridgeId].coords : null;
        
        simulator.closeBridge(bridgeId);
        updatePilgrimRoute(); // refresh active path planner

        if (isBackendOnline) {
            try {
                const res = await fetch('/api/settings');
                const settings = await res.json();
                const bridgeStates = settings.bridgeStates || {};
                bridgeStates[bridgeId] = 'closed';
                
                await fetch('/api/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bridgeStates })
                });

                await fetch('/api/incidents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'BRIDGE_CLOSE',
                        message: `${bridgeName} has been CLOSED by authorities for safety. Routing recalculated.`,
                        location: bridgeCoords
                    })
                });
            } catch (err) {}
        }
    });

    document.getElementById('btn-open-bridge').addEventListener('click', async () => {
        const bridgeId = document.getElementById('select-bridge').value;
        const bridgeName = NODES[bridgeId] ? NODES[bridgeId].name : bridgeId;
        const bridgeCoords = NODES[bridgeId] ? NODES[bridgeId].coords : null;

        simulator.openBridge(bridgeId);
        updatePilgrimRoute();

        if (isBackendOnline) {
            try {
                const res = await fetch('/api/settings');
                const settings = await res.json();
                const bridgeStates = settings.bridgeStates || {};
                bridgeStates[bridgeId] = 'open';
                
                await fetch('/api/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bridgeStates })
                });

                await fetch('/api/incidents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'SYSTEM',
                        message: `${bridgeName} is now OPEN. Normal traffic resumed.`,
                        location: bridgeCoords
                    })
                });
            } catch (err) {}
        }
    });

    // 5. CCTV Camera selector bind
    document.getElementById('select-cctv-cam').addEventListener('change', (e) => {
        const camId = e.target.value;
        const node = NODES[camId];
        const label = e.target.options[e.target.selectedIndex].text.split('(')[0].trim();
        setCameraLocation(camId, label, node);
    });

    // 6. Pilgrim route selections
    document.getElementById('phone-select-start').addEventListener('change', updatePilgrimRoute);
    document.getElementById('phone-select-end').addEventListener('change', updatePilgrimRoute);

    const routeModeBtns = document.querySelectorAll('.route-toggle-btn');
    routeModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            routeModeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updatePilgrimRoute();
        });
    });

    // 7. Pilgrim SOS Button trigger
    document.getElementById('btn-phone-sos').addEventListener('click', async () => {
        const startId = document.getElementById('phone-select-start').value;
        const startNode = NODES[startId];
        if (startNode) {
            simulator.simulateSOS(startNode.coords[0], startNode.coords[1]);
            alert(currentLanguage === 'en' ? 'SOS alert transmitted to police control room!' : 'एसओएस अलर्ट पुलिस नियंत्रण कक्ष को भेज दिया गया है!');

            if (isBackendOnline) {
                try {
                    await fetch('/api/incidents', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'SOS',
                            message: `SOS Emergency Alert received from pilgrim location [${startNode.coords[0].toFixed(4)}, ${startNode.coords[1].toFixed(4)}]. Dispatching nearest medical team.`,
                            location: startNode.coords
                        })
                    });
                } catch (err) {}
            }
        }
    });

    // 8. Pilgrim app multilingual toggle button
    document.getElementById('btn-phone-lang').addEventListener('click', (e) => {
        currentLanguage = currentLanguage === 'en' ? 'hi' : 'en';
        e.target.innerText = TRANSLATIONS[currentLanguage].langBtn;
        
        // Translate elements in phone APP
        translatePhoneApp();
        updatePilgrimRoute();
        updatePilgrimGhatsView();
    });
}

/**
 * Updates UI labels inside simulated phone based on active language (English/Hindi)
 */
function translatePhoneApp() {
    const dict = TRANSLATIONS[currentLanguage];

    document.querySelector('.app-nav-bar h2').innerHTML = `<i class="fa-solid fa-gopuran" style="color: var(--color-warning);"></i> ${dict.title}`;
    
    // Nav Bottom Bar Labels
    document.getElementById('lbl-nav-btn').innerText = dict.navBtn;
    document.getElementById('lbl-ghat-btn').innerText = dict.ghatBtn;
    document.getElementById('lbl-sos-btn').innerText = dict.sosBtn;

    // Route info labels
    document.getElementById('lbl-route-dist').innerText = dict.routeDist;
    document.getElementById('lbl-route-time').innerText = dict.routeTime;
    document.getElementById('lbl-route-safety').innerText = dict.routeSafety;

    // SOS Details
    document.getElementById('lbl-sos-title').innerText = dict.sosTitle;
    document.getElementById('lbl-sos-desc').innerText = dict.sosDesc;
    document.getElementById('btn-phone-sos').innerText = dict.sosBtnText;

    // Ghats
    document.getElementById('lbl-ghat-status-title').innerText = dict.ghatTitle;

    // Route buttons translations
    const btnShortest = document.getElementById('btn-route-shortest');
    const btnSafe = document.getElementById('btn-route-safe');
    
    btnShortest.innerText = currentLanguage === 'en' ? 'Shortest Path' : 'लघुत्तम मार्ग';
    btnSafe.innerText = currentLanguage === 'en' ? 'KumbhFlow Smart Path' : 'स्मार्ट सुरक्षित मार्ग';
}

/**
 * Visual Clock updates in top header
 */
function startClock() {
    setInterval(() => {
        const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
        const nowString = new Date().toLocaleTimeString('en-US', options);
        document.getElementById('system-clock').innerText = nowString;
        
        // Phone Clock
        const phoneTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        document.getElementById('phone-clock').innerText = phoneTime;
    }, 1000);
}

/**
 * Check if Express MERN-style backend is active
 */
async function checkBackend() {
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            isBackendOnline = true;
            console.log("KumbhFlow API Backend: ONLINE. Database synchronization enabled.");
            return true;
        }
    } catch (e) {}
    isBackendOnline = false;
    console.log("KumbhFlow API Backend: OFFLINE. Running in graceful local fallback mode.");
    return false;
}

/**
 * Start periodic polling of backend state to sync multiple users / tab views
 */
function startBackendSync() {
    setInterval(async () => {
        if (!isBackendOnline) return;
        try {
            // 1. Sync Settings
            const resSettings = await fetch('/api/settings');
            if (resSettings.ok) {
                const settings = await resSettings.json();
                syncSettingsToSimulator(settings);
            }

            // 2. Sync Active Incidents Log
            const resIncidents = await fetch('/api/incidents');
            if (resIncidents.ok) {
                const logs = await resIncidents.json();
                if (simulator) {
                    simulator.alerts = logs;
                    updateAlertsLogs(logs);
                }
            }
        } catch (e) {
            console.warn("Backend synchronization connection lost.");
            isBackendOnline = false;
        }
    }, 1500);
}

/**
 * Synchronize settings object from backend into the current simulator configuration
 */
function syncSettingsToSimulator(settings) {
    if (!simulator) return;

    // A. Sync Weather
    if (settings.weather && settings.weather !== simulator.weather) {
        simulator.weather = settings.weather;
        document.getElementById('select-weather').value = settings.weather;
    }

    // B. Sync Simulation Speed
    if (settings.simulationSpeed !== undefined && Math.abs(settings.simulationSpeed - simulator.speedMultiplier) > 0.01) {
        simulator.speedMultiplier = settings.simulationSpeed;
        document.getElementById('slider-speed').value = settings.simulationSpeed;
        document.getElementById('speed-val').innerText = settings.simulationSpeed;
    }

    // C. Sync Spawn Rate
    if (settings.spawnRate !== undefined && Math.abs(settings.spawnRate - simulator.spawnRate) > 0.01) {
        simulator.spawnRate = settings.spawnRate;
        document.getElementById('slider-spawn').value = settings.spawnRate;
        document.getElementById('spawn-val').innerText = settings.spawnRate;
    }

    // D. Sync Bridge states
    if (settings.bridgeStates) {
        let stateChanged = false;
        for (const bridgeId in settings.bridgeStates) {
            const status = settings.bridgeStates[bridgeId];
            const edge = simulator.getEdgeByBridgeId(bridgeId);
            if (edge && edge.status !== status) {
                edge.status = status;
                stateChanged = true;
            }
        }
        if (stateChanged) {
            updatePilgrimRoute();
        }
    }
}
