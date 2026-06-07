/**
 * KumbhFlow AI - Dijkstra Routing Engine
 * Dynamic congestion-weighted pathfinding
 */

import { NODES, EDGES } from './config.js';

/**
 * Calculates the weight of an edge based on current distance, status, and congestion.
 * @param {Object} edge The graph edge between nodes
 * @param {Object} targetNode The node being traveled to
 * @param {string} mode 'shortest' or 'safe'
 * @returns {number} The cost of traversing the edge
 */
export function getEdgeWeight(edge, targetNode, mode = 'safe') {
    if (edge.status !== 'open') {
        return Infinity;
    }

    const baseDistance = edge.distance;
    if (mode === 'shortest') {
        return baseDistance;
    }

    // Safe mode: add congestion penalties
    // Calculate density of target node
    const nodeCapacity = targetNode.capacity || 10000;
    const nodeCount = targetNode.currentCount || 0;
    const nodeDensity = nodeCount / nodeCapacity;

    // Calculate density of the edge itself (simulated)
    const edgeCapacity = edge.capacity || (nodeCapacity * 0.4); // Edges have less capacity than junctions
    const edgeCount = edge.currentCount || 0;
    const edgeDensity = edgeCount / edgeCapacity;

    const maxDensity = Math.max(nodeDensity, edgeDensity);

    // Dynamic penalty formula: weight escalates exponentially when density > 50%
    // Formula: cost = base * (1 + 8 * density^4)
    // If density reaches 1.0 (100%), cost is multiplied by 9x.
    // If density reaches 1.2 (120%), cost is multiplied by 17x.
    const penalty = 1.0 + 10.0 * Math.pow(maxDensity, 4);

    return baseDistance * penalty;
}

/**
 * Custom implementation of Dijkstra's algorithm
 * @param {string} startNodeId 
 * @param {string} endNodeId 
 * @param {string} mode 'shortest' or 'safe'
 * @returns {Object|null} Path details including node IDs, coordinates, total distance, travel time, and safety level.
 */
export function findPath(startNodeId, endNodeId, mode = 'safe') {
    if (!NODES[startNodeId] || !NODES[endNodeId]) {
        console.error(`Invalid start (${startNodeId}) or end (${endNodeId}) nodes.`);
        return null;
    }

    const distances = {};
    const previous = {};
    const queue = new Set();

    // Initialize distances
    for (const nodeId in NODES) {
        distances[nodeId] = Infinity;
        previous[nodeId] = null;
        queue.add(nodeId);
    }
    distances[startNodeId] = 0;

    while (queue.size > 0) {
        // Find node with minimum distance in queue
        let u = null;
        for (const nodeId of queue) {
            if (u === null || distances[nodeId] < distances[u]) {
                u = nodeId;
            }
        }

        // If remaining node is unreachable or we reached the destination
        if (distances[u] === Infinity || u === endNodeId) {
            break;
        }

        queue.delete(u);

        // Find neighbors of u
        const neighbors = getNeighborsForPath(u);
        for (const neighbor of neighbors) {
            const v = neighbor.nodeId;
            if (!queue.has(v)) continue; // Already processed

            const edge = neighbor.edge;
            const targetNode = NODES[v];
            const weight = getEdgeWeight(edge, targetNode, mode);

            if (weight === Infinity) continue;

            const alt = distances[u] + weight;
            if (alt < distances[v]) {
                distances[v] = alt;
                previous[v] = u;
            }
        }
    }

    // Reconstruct path
    if (distances[endNodeId] === Infinity) {
        return null; // No path found
    }

    const pathNodeIds = [];
    let current = endNodeId;
    while (current !== null) {
        pathNodeIds.unshift(current);
        current = previous[current];
    }

    // Calculate aggregated metrics
    let totalDistance = 0;
    let maxCongestion = 0;
    const pathCoordinates = [];

    for (let i = 0; i < pathNodeIds.length; i++) {
        const nodeId = pathNodeIds[i];
        const node = NODES[nodeId];
        pathCoordinates.push(node.coords);

        if (i > 0) {
            const prevId = pathNodeIds[i - 1];
            // Find edge connecting prevId and nodeId
            const edge = EDGES.find(e => 
                (e.from === prevId && e.to === nodeId) || 
                (e.from === nodeId && e.to === prevId)
            );
            if (edge) {
                totalDistance += edge.distance;
                
                // Aggregate congestion metrics
                const targetNode = NODES[nodeId];
                const nodeDensity = targetNode.currentCount / (targetNode.capacity || 10000);
                const edgeDensity = (edge.currentCount || 0) / (edge.capacity || (targetNode.capacity * 0.4));
                maxCongestion = Math.max(maxCongestion, nodeDensity, edgeDensity);
            }
        }
    }

    // Calculate walking travel time in minutes (assumed average crowd walking speed of 1.2 m/s, slowing to 0.3 m/s in heavy crowd)
    // base travel speed: 1.2 m/s (72 meters/minute)
    // speed multiplier decreases as maxCongestion increases
    const speedMultiplier = Math.max(0.25, 1.0 - (maxCongestion * 0.75));
    const speedMetersPerMin = 72 * speedMultiplier;
    const estTimeMinutes = Math.round(totalDistance / speedMetersPerMin);

    // Compute Safety Index (100% is perfect, drops based on congestion)
    const safetyIndex = Math.max(15, Math.round(100 - (maxCongestion * 70)));

    return {
        path: pathNodeIds,
        coordinates: pathCoordinates,
        distance: totalDistance, // in meters
        time: estTimeMinutes, // in minutes
        safety: safetyIndex, // percentage
        maxCongestion: Math.min(1.5, maxCongestion) // normalized
    };
}

/**
 * Returns all active neighbors of a node from the graph.
 * Handles undirected nature of the map paths.
 */
function getNeighborsForPath(nodeId) {
    const neighbors = [];
    EDGES.forEach(edge => {
        // Must be open to travel
        if (edge.status !== 'open') return;

        if (edge.from === nodeId) {
            neighbors.push({ nodeId: edge.to, edge: edge });
        } else if (edge.to === nodeId) {
            neighbors.push({ nodeId: edge.from, edge: edge });
        }
    });
    return neighbors;
}
