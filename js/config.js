/**
 * KumbhFlow AI - Network and Map Configuration
 * Prayagraj Sangam Area Model
 */

export const MAP_CONFIG = {
    center: [25.4315, 81.8690],
    zoom: 14,
    minZoom: 13,
    maxZoom: 16,
    bounds: [
        [25.4050, 81.8150], // Southwest
        [25.4550, 81.9100]  // Northeast
    ]
};

// Node classifications and styling parameters
export const NODE_TYPES = {
    HUB: { label: 'Transport Hub', color: '#6366f1', icon: 'subway' },
    GATE: { label: 'Mela Gate', color: '#10b981', icon: 'door-open' },
    CHECKPOINT: { label: 'Security Sector Checkpoint', color: '#06b6d4', icon: 'shield-halved' },
    TEMPLE: { label: 'Bathing/Temple Landmark', color: '#a855f7', icon: 'place-of-worship' },
    GHAT: { label: 'Bathing Ghat', color: '#ec4899', icon: 'water' },
    BRIDGE: { label: 'Pontoon Bridge', color: '#f59e0b', icon: 'bridge' }
};

// Node Definitions (Coordinates, Capacity, Wait Time, Labels)
export const NODES = {
    junction_station: {
        id: 'junction_station',
        name: 'Prayagraj Junction Station',
        type: 'HUB',
        coords: [25.4449, 81.8298],
        capacity: 150000,
        currentCount: 15200,
        desc: 'Main railway junction receiving out-of-state trains.'
    },
    rambagh_station: {
        id: 'rambagh_station',
        name: 'Prayagraj Rambagh Station',
        type: 'HUB',
        coords: [25.4428, 81.8492],
        capacity: 80000,
        currentCount: 8400,
        desc: 'Secondary railway terminal closer to Mela boundary.'
    },
    naini_parking: {
        id: 'naini_parking',
        name: 'Naini Parking Lot (South)',
        type: 'HUB',
        coords: [25.4140, 81.8790],
        capacity: 60000,
        currentCount: 4100,
        desc: 'Primary southern transit parking and shuttle depot.'
    },
    jhalwa_parking: {
        id: 'jhalwa_parking',
        name: 'Jhalwa Parking Lot (West)',
        type: 'HUB',
        coords: [25.4380, 81.8150],
        capacity: 80000,
        currentCount: 9200,
        desc: 'Western transit parking, feeding pilgrims via Sector 1.'
    },
    entry_gate_a: {
        id: 'entry_gate_a',
        name: 'Mela Entry Gate A (Sector 1)',
        type: 'GATE',
        coords: [25.4365, 81.8560],
        capacity: 50000,
        currentCount: 4200,
        desc: 'Northern entry gate controlling pilgrim flow from Rambagh.'
    },
    entry_gate_b: {
        id: 'entry_gate_b',
        name: 'Mela Entry Gate B (Sector 2)',
        type: 'GATE',
        coords: [25.4390, 81.8680],
        capacity: 50000,
        currentCount: 5100,
        desc: 'Northeastern entrance from rural bypasses.'
    },
    checkpoint_alpha: {
        id: 'checkpoint_alpha',
        name: 'Sector 3 Checkpoint (Kali Marg)',
        type: 'CHECKPOINT',
        coords: [25.4330, 81.8630],
        capacity: 35000,
        currentCount: 18000,
        desc: 'Central junction control point managing flows to Fort road.'
    },
    checkpoint_beta: {
        id: 'checkpoint_beta',
        name: 'Sector 4 Checkpoint (Triveni Marg)',
        type: 'CHECKPOINT',
        coords: [25.4340, 81.8745],
        capacity: 35000,
        currentCount: 22000,
        desc: 'Primary bridge checkpoint feeding Northern Pontoon Bridges.'
    },
    fort_road_junction: {
        id: 'fort_road_junction',
        name: 'Qila Junction Point',
        type: 'CHECKPOINT',
        coords: [25.4285, 81.8710],
        capacity: 40000,
        currentCount: 15400,
        desc: 'Strategic intersection beside Prayagraj Fort walls.'
    },
    hanuman_temple: {
        id: 'hanuman_temple',
        name: 'Bade Hanuman Ji Temple',
        type: 'TEMPLE',
        coords: [25.4300, 81.8780],
        capacity: 25000,
        currentCount: 21800, // Near limit
        desc: 'High congestion landmark. Famous reclining Hanuman idol.'
    },
    akshayavat: {
        id: 'akshayavat',
        name: 'Akshayavat Sacred Tree (Fort)',
        type: 'TEMPLE',
        coords: [25.4265, 81.8755],
        capacity: 15000,
        currentCount: 3800,
        desc: 'Historical sacred fig tree located inside Prayagraj Fort.'
    },
    qila_ghat: {
        id: 'qila_ghat',
        name: 'Qila Bathing Ghat',
        type: 'GHAT',
        coords: [25.4255, 81.8725],
        capacity: 40000,
        currentCount: 8200,
        desc: 'Spacious stone ghat adjacent to the Akbar Fort walls.'
    },
    saraswati_ghat: {
        id: 'saraswati_ghat',
        name: 'Saraswati Ghat (Yamuna Bank)',
        type: 'GHAT',
        coords: [25.4215, 81.8655],
        capacity: 30000,
        currentCount: 6100,
        desc: 'Picturesque terraced ghat step on the banks of Yamuna river.'
    },
    pontoon_bridge_1: {
        id: 'pontoon_bridge_1',
        name: 'Pontoon Bridge 1 (Ganges East)',
        type: 'BRIDGE',
        coords: [25.4335, 81.8820],
        capacity: 15000,
        currentCount: 3200,
        desc: 'Northern floating pontoon crossing. Heavy pedestrian density.'
    },
    pontoon_bridge_2: {
        id: 'pontoon_bridge_2',
        name: 'Pontoon Bridge 2 (Ganges Central)',
        type: 'BRIDGE',
        coords: [25.4292, 81.8835],
        capacity: 15000,
        currentCount: 14100, // Very congested
        desc: 'Central crossing. High priority queueing and bottlenecks.'
    },
    pontoon_bridge_3: {
        id: 'pontoon_bridge_3',
        name: 'Pontoon Bridge 3 (Yamuna South)',
        type: 'BRIDGE',
        coords: [25.4210, 81.8790],
        capacity: 18000,
        currentCount: 5200,
        desc: 'Floating bridge connecting Arail/Naini sectors to Fort area.'
    },
    shastri_bridge: {
        id: 'shastri_bridge',
        name: 'Shastri Road Bridge',
        type: 'BRIDGE',
        coords: [25.4510, 81.8830],
        capacity: 100000,
        currentCount: 8000,
        desc: 'Vehicular bridge over Ganges, pedestrian path open.'
    },
    sangam_entrance: {
        id: 'sangam_entrance',
        name: 'Triveni Sangam Bathing Area',
        type: 'GHAT',
        coords: [25.4285, 81.8875],
        capacity: 200000,
        currentCount: 148500, // Core destination
        desc: 'The sacred confluence of Ganga, Yamuna, and Saraswati.'
    },
    sector_5_ghat: {
        id: 'sector_5_ghat',
        name: 'Sector 5 Ghat (Sachan Bank)',
        type: 'GHAT',
        coords: [25.4350, 81.8905],
        capacity: 60000,
        currentCount: 11400,
        desc: 'Alternative bathing ghat on the eastern bank of Ganges.'
    }
};

// Edge Networks (Connecting Nodes)
// Formatted: { from: 'node_a', to: 'node_b', distance: meters, currentCount: pilgrims, status: 'open'|'closed' }
export const EDGES = [
    { from: 'junction_station', to: 'jhalwa_parking', distance: 2200, status: 'open' },
    { from: 'junction_station', to: 'rambagh_station', distance: 2500, status: 'open' },
    { from: 'jhalwa_parking', to: 'entry_gate_a', distance: 4000, status: 'open' },
    { from: 'junction_station', to: 'entry_gate_a', distance: 3500, status: 'open' },
    { from: 'rambagh_station', to: 'entry_gate_a', distance: 1200, status: 'open' },
    { from: 'rambagh_station', to: 'entry_gate_b', distance: 1900, status: 'open' },
    { from: 'entry_gate_a', to: 'checkpoint_alpha', distance: 900, status: 'open' },
    { from: 'entry_gate_b', to: 'checkpoint_beta', distance: 1100, status: 'open' },
    { from: 'checkpoint_alpha', to: 'fort_road_junction', distance: 800, status: 'open' },
    { from: 'checkpoint_alpha', to: 'checkpoint_beta', distance: 1300, status: 'open' },
    { from: 'checkpoint_beta', to: 'pontoon_bridge_1', distance: 950, status: 'open' },
    { from: 'checkpoint_beta', to: 'hanuman_temple', distance: 600, status: 'open' },
    { from: 'fort_road_junction', to: 'saraswati_ghat', distance: 1100, status: 'open' },
    { from: 'fort_road_junction', to: 'akshayavat', distance: 550, status: 'open' },
    { from: 'fort_road_junction', to: 'hanuman_temple', distance: 700, status: 'open' },
    { from: 'akshayavat', to: 'qila_ghat', distance: 350, status: 'open' },
    { from: 'hanuman_temple', to: 'qila_ghat', distance: 650, status: 'open' },
    { from: 'hanuman_temple', to: 'pontoon_bridge_2', distance: 500, status: 'open' },
    { from: 'qila_ghat', to: 'pontoon_bridge_3', distance: 750, status: 'open' },
    { from: 'naini_parking', to: 'pontoon_bridge_3', distance: 1200, status: 'open' },
    { from: 'pontoon_bridge_1', to: 'sector_5_ghat', distance: 850, status: 'open' },
    { from: 'pontoon_bridge_2', to: 'sangam_entrance', distance: 450, status: 'open' },
    { from: 'pontoon_bridge_3', to: 'sangam_entrance', distance: 1000, status: 'open' },
    { from: 'sector_5_ghat', to: 'sangam_entrance', distance: 950, status: 'open' },
    // Alternate long-bypass paths
    { from: 'entry_gate_b', to: 'shastri_bridge', distance: 1800, status: 'open' },
    { from: 'shastri_bridge', to: 'sector_5_ghat', distance: 2200, status: 'open' }
];

// Helper to double-link edges (undirected graph)
export function getNeighbors(nodeId) {
    const neighbors = [];
    EDGES.forEach(edge => {
        if (edge.status !== 'open') return;
        
        if (edge.from === nodeId) {
            neighbors.push({ node: edge.to, distance: edge.distance, edge: edge });
        } else if (edge.to === nodeId) {
            neighbors.push({ node: edge.from, distance: edge.distance, edge: edge });
        }
    });
    return neighbors;
}
