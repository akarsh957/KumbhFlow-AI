/**
 * KumbhFlow AI - Agent-Based Crowd Simulator
 * Models pilgrim traffic, density dynamics, and real-time alerts.
 */

import { NODES, EDGES, getNeighbors } from './config.js';
import { findPath } from './routing.js';

export class CrowdSimulator {
    constructor(updateCallback) {
        this.agents = [];
        this.updateCallback = updateCallback;
        this.timer = null;
        
        // Simulation speed parameters
        this.ticksPerSecond = 30; // 30 FPS updates
        this.speedMultiplier = 1.0; // Scalable speed (1x, 2x, 5x)
        
        // Configuration parameters
        this.spawnRate = 1.5; // average agents spawned per second
        this.weather = 'clear'; // 'clear', 'rain', 'extreme_heat'
        this.baseLoads = {}; // Initial baseline crowds
        
        // Alert queue
        this.alerts = [];
        
        // Unique agent IDs
        this.agentCounter = 0;

        // Initialize baseline loads
        this.initBaselineCrowds();
    }

    initBaselineCrowds() {
        // Add static baseline loads to nodes so the Mela feels populated from start
        for (const nodeId in NODES) {
            const node = NODES[nodeId];
            if (node.type === 'GHAT') {
                this.baseLoads[nodeId] = Math.round(node.capacity * 0.45); // 45% full
            } else if (node.type === 'TEMPLE') {
                this.baseLoads[nodeId] = Math.round(node.capacity * 0.55); // 55% full
            } else if (node.type === 'CHECKPOINT') {
                this.baseLoads[nodeId] = Math.round(node.capacity * 0.20); // 20% full
            } else {
                this.baseLoads[nodeId] = Math.round(node.capacity * 0.05); // 5% full
            }
            node.currentCount = this.baseLoads[nodeId];
        }
    }

    start() {
        if (this.timer) return;
        
        let lastTime = performance.now();
        const loop = (time) => {
            const dt = (time - lastTime) / 1000;
            lastTime = time;
            
            // Advance simulation
            this.update(dt * this.speedMultiplier);
            
            // Draw next frame
            this.timer = requestAnimationFrame(loop);
        };
        this.timer = requestAnimationFrame(loop);
    }

    stop() {
        if (this.timer) {
            cancelAnimationFrame(this.timer);
            this.timer = null;
        }
    }

    setSpeed(speed) {
        this.speedMultiplier = parseFloat(speed);
    }

    setSpawnRate(rate) {
        this.spawnRate = parseFloat(rate);
    }

    setWeather(weather) {
        this.weather = weather;
        this.triggerSystemAlert('WEATHER_CHANGE', `Weather condition updated to: ${weather.toUpperCase()}. Walking speeds adjusted.`);
    }

    triggerSystemAlert(type, message, location = null) {
        const alert = {
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: type, // 'SURGE', 'WEATHER_CHANGE', 'BRIDGE_CLOSE', 'SOS', 'SYSTEM'
            message: message,
            location: location,
            active: true
        };
        this.alerts.unshift(alert);
        if (this.alerts.length > 50) this.alerts.pop(); // keep last 50
    }

    spawnSurge(sourceId, quantity = 300) {
        if (!NODES[sourceId]) return;
        
        this.triggerSystemAlert('SURGE', `Crowd Surge detected at ${NODES[sourceId].name}. Spawning ${quantity} pilgrim groups.`, NODES[sourceId].coords);
        
        const possibleDestinations = ['sangam_entrance', 'sector_5_ghat', 'qila_ghat', 'saraswati_ghat'];
        
        for (let i = 0; i < quantity; i++) {
            const dest = possibleDestinations[Math.floor(Math.random() * possibleDestinations.length)];
            // Spread spawning out slightly in time to avoid overlap stacking
            const delay = Math.random() * 8.0; 
            setTimeout(() => {
                this.spawnAgent(sourceId, dest);
            }, delay * 1000 / this.speedMultiplier);
        }
    }

    spawnAgent(sourceId, destId) {
        // Determine routing mode
        // 75% of pilgrims follow "safe path" (mock app users), 25% follow "shortest path" (uninformed)
        const routingMode = Math.random() < 0.75 ? 'safe' : 'shortest';
        const pathData = findPath(sourceId, destId, routingMode);
        
        if (!pathData || pathData.path.length < 2) return;

        // Base agent speed: around 0.00015 lat/lng units per second
        // Weather adjustment
        let baseSpeed = 0.045 + Math.random() * 0.015; // Speed in coordinate steps per sec
        if (this.weather === 'rain') {
            baseSpeed *= 0.50; // Slow down 50% in rain
        } else if (this.weather === 'extreme_heat') {
            baseSpeed *= 0.80; // Slow down 20% in heat
        }

        const agent = {
            id: ++this.agentCounter,
            source: sourceId,
            destination: destId,
            path: pathData.path,
            coordsPath: pathData.coordinates,
            currentSegmentIndex: 0,
            progress: 0,
            lat: pathData.coordinates[0][0],
            lng: pathData.coordinates[0][1],
            speed: baseSpeed,
            state: 'walking', // 'walking', 'bathing', 'returning'
            bathingDuration: 10 + Math.random() * 20, // bathing time in seconds
            bathingTimer: 0,
            routingMode: routingMode,
            size: 5 + Math.floor(Math.random() * 15) // Size of pilgrim group (5 to 20 people)
        };

        this.agents.push(agent);
    }

    update(dt) {
        // Randomly spawn regular agents
        const spawnChance = this.spawnRate * dt;
        if (Math.random() < spawnChance) {
            const hubs = ['junction_station', 'rambagh_station', 'naini_parking', 'jhalwa_parking'];
            const ghats = ['sangam_entrance', 'sector_5_ghat', 'qila_ghat', 'saraswati_ghat'];
            
            const start = hubs[Math.floor(Math.random() * hubs.length)];
            const end = ghats[Math.floor(Math.random() * ghats.length)];
            this.spawnAgent(start, end);
        }

        // Reset real-time counts to baseline levels before summing agent counts
        for (const nodeId in NODES) {
            NODES[nodeId].currentCount = this.baseLoads[nodeId] || 0;
        }
        EDGES.forEach(edge => {
            edge.currentCount = 0;
        });

        const activeAgents = [];

        // Update active agents
        this.agents.forEach(agent => {
            if (agent.state === 'walking') {
                const fromNodeId = agent.path[agent.currentSegmentIndex];
                const toNodeId = agent.path[agent.currentSegmentIndex + 1];
                const fromCoords = agent.coordsPath[agent.currentSegmentIndex];
                const toCoords = agent.coordsPath[agent.currentSegmentIndex + 1];

                // Check if the edge they are on is closed. If closed, force reroute!
                const edge = EDGES.find(e => 
                    (e.from === fromNodeId && e.to === toNodeId) || 
                    (e.from === toNodeId && e.to === fromNodeId)
                );

                if (edge && edge.status !== 'open') {
                    // Recalculate path from current node to destination
                    const newPathData = findPath(fromNodeId, agent.destination, agent.routingMode);
                    if (newPathData && newPathData.path.length >= 2) {
                        agent.path = newPathData.path;
                        agent.coordsPath = newPathData.coordinates;
                        agent.currentSegmentIndex = 0;
                        agent.progress = 0;
                    }
                }

                // Calculate segment distance (Euclidean in lat/lng space for visual speed consistency)
                const latDiff = toCoords[0] - fromCoords[0];
                const lngDiff = toCoords[1] - fromCoords[1];
                const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

                // Progress speed
                const step = (agent.speed / (distance || 0.01)) * dt;
                
                // Adjust speed based on local node crowd density
                const targetNode = NODES[toNodeId];
                const targetDensity = (targetNode.currentCount || 0) / (targetNode.capacity || 10000);
                const localCongestionFactor = Math.max(0.15, 1.0 - (targetDensity * 0.8)); // Slow down up to 85% in congestion
                
                agent.progress += step * localCongestionFactor;

                if (agent.progress >= 1.0) {
                    // Arrived at intermediate node
                    agent.currentSegmentIndex++;
                    agent.progress = 0;
                    
                    if (agent.currentSegmentIndex >= agent.path.length - 1) {
                        // Arrived at final destination (ghat)
                        agent.state = 'bathing';
                        agent.bathingTimer = agent.bathingDuration;
                        agent.lat = toCoords[0];
                        agent.lng = toCoords[1];
                    } else {
                        // Move to next segment
                        agent.lat = toCoords[0];
                        agent.lng = toCoords[1];
                    }
                } else {
                    // Interpolate position
                    agent.lat = fromCoords[0] + latDiff * agent.progress;
                    agent.lng = fromCoords[1] + lngDiff * agent.progress;
                }

                // Increment counts for nodes and edges
                NODES[fromNodeId].currentCount += agent.size;
                if (edge) {
                    edge.currentCount += agent.size;
                }

                activeAgents.push(agent);

            } else if (agent.state === 'bathing') {
                agent.bathingTimer -= dt;
                
                // Keep agent at ghat coords
                const finalGhatId = agent.path[agent.path.length - 1];
                NODES[finalGhatId].currentCount += agent.size;

                if (agent.bathingTimer <= 0) {
                    // Finished bathing, path back to a random station
                    const hubs = ['junction_station', 'rambagh_station', 'naini_parking', 'jhalwa_parking'];
                    const returnHub = hubs[Math.floor(Math.random() * hubs.length)];
                    const pathData = findPath(finalGhatId, returnHub, agent.routingMode);
                    
                    if (pathData && pathData.path.length >= 2) {
                        agent.state = 'returning';
                        agent.path = pathData.path;
                        agent.coordsPath = pathData.coordinates;
                        agent.currentSegmentIndex = 0;
                        agent.progress = 0;
                        activeAgents.push(agent);
                    }
                    // If no return path, agent leaves the system (despawns)
                } else {
                    activeAgents.push(agent);
                }

            } else if (agent.state === 'returning') {
                // Moving back to stations
                const fromNodeId = agent.path[agent.currentSegmentIndex];
                const toNodeId = agent.path[agent.currentSegmentIndex + 1];
                const fromCoords = agent.coordsPath[agent.currentSegmentIndex];
                const toCoords = agent.coordsPath[agent.currentSegmentIndex + 1];

                const latDiff = toCoords[0] - fromCoords[0];
                const lngDiff = toCoords[1] - fromCoords[1];
                const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

                const step = (agent.speed / (distance || 0.01)) * dt;
                agent.progress += step;

                if (agent.progress >= 1.0) {
                    agent.currentSegmentIndex++;
                    agent.progress = 0;
                    
                    if (agent.currentSegmentIndex >= agent.path.length - 1) {
                        // Left the system via station
                        NODES[toNodeId].currentCount += agent.size;
                        // Despawns: not pushed to activeAgents
                    } else {
                        agent.lat = toCoords[0];
                        agent.lng = toCoords[1];
                        NODES[fromNodeId].currentCount += agent.size;
                        activeAgents.push(agent);
                    }
                } else {
                    agent.lat = fromCoords[0] + latDiff * agent.progress;
                    agent.lng = fromCoords[1] + lngDiff * agent.progress;
                    NODES[fromNodeId].currentCount += agent.size;
                    
                    const edge = EDGES.find(e => 
                        (e.from === fromNodeId && e.to === toNodeId) || 
                        (e.from === toNodeId && e.to === fromNodeId)
                    );
                    if (edge) {
                        edge.currentCount += agent.size;
                    }
                    
                    activeAgents.push(agent);
                }
            }
        });

        this.agents = activeAgents;

        // Double check limits and generate warning alerts if nodes exceed 85% capacity
        for (const nodeId in NODES) {
            const node = NODES[nodeId];
            if (node.currentCount > node.capacity) {
                // Exceeded 100%
                this.checkAndTriggerAlert(nodeId, 'CRITICAL', `${node.name} is severely congested! Count: ${node.currentCount}/${node.capacity}. Evacuation recommended.`);
            } else if (node.currentCount > node.capacity * 0.85) {
                // Exceeded 85%
                this.checkAndTriggerAlert(nodeId, 'WARNING', `${node.name} is approaching maximum capacity (${Math.round((node.currentCount/node.capacity)*100)}%). Directing traffic to alternatives.`);
            }
        }

        // Trigger callback to update UI
        if (this.updateCallback) {
            this.updateCallback(this.agents, this.alerts);
        }
    }

    checkAndTriggerAlert(nodeId, severity, message) {
        // Prevent flood of identical alerts. Only alert once every 20 seconds for the same node.
        const recentAlert = this.alerts.find(a => a.location === NODES[nodeId].coords && (Date.now() - new Date(a.time).getTime() < 20000));
        if (!recentAlert) {
            this.triggerSystemAlert(severity, message, NODES[nodeId].coords);
        }
    }

    closeBridge(bridgeId) {
        const edge = EDGES.find(e => e.from === bridgeId || e.to === bridgeId);
        if (edge) {
            edge.status = 'closed';
            this.triggerSystemAlert('BRIDGE_CLOSE', `${NODES[bridgeId].name} has been CLOSED by authorities for safety. Routing recalculated.`, NODES[bridgeId].coords);
        }
    }

    openBridge(bridgeId) {
        const edge = EDGES.find(e => e.from === bridgeId || e.to === bridgeId);
        if (edge) {
            edge.status = 'open';
            this.triggerSystemAlert('SYSTEM', `${NODES[bridgeId].name} is now OPEN. Normal traffic resumed.`, NODES[bridgeId].coords);
        }
    }

    simulateSOS(lat, lng) {
        this.triggerSystemAlert('SOS', `SOS Emergency Alert received from pilgrim location [${lat.toFixed(4)}, ${lng.toFixed(4)}]. Dispatching nearest medical team.`, [lat, lng]);
    }
}
