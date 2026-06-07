/**
 * KumbhFlow AI - AI CCTV Camera Feed Simulator
 * Generates an interactive mock crowd detection video stream on HTML5 Canvas.
 */

let canvas = null;
let ctx = null;
let animId = null;
let particles = [];
let cameraLocationId = 'hanuman_temple';
let cameraName = 'Bade Hanuman Temple (CAM-04)';
let nodeReference = null;

// Mock video grain variables
let scanlineOffset = 0;

export function initCamera(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error('Camera canvas element not found.');
        return;
    }
    ctx = canvas.getContext('2d');

    // Resize canvas size inside container
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial particles
    generateParticles(35);

    // Start video loop
    startCameraLoop();
}

function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 400;
    canvas.height = rect.height || 220;
}

export function setCameraLocation(locationId, label, nodeObj) {
    cameraLocationId = locationId;
    cameraName = `${label} (CAM-${getCamNum(locationId)})`;
    nodeReference = nodeObj;
    
    // Scale particle count based on node current occupancy relative to capacity
    if (nodeObj) {
        const occupancyRatio = nodeObj.currentCount / nodeObj.capacity;
        const count = Math.min(120, Math.max(10, Math.round(occupancyRatio * 80)));
        generateParticles(count);
    }
}

function getCamNum(id) {
    const ids = ['junction_station', 'rambagh_station', 'checkpoint_beta', 'hanuman_temple', 'pontoon_bridge_2', 'sangam_entrance'];
    const idx = ids.indexOf(id);
    return idx !== -1 ? `0${idx + 1}` : '09';
}

function generateParticles(count) {
    if (!canvas) return;
    particles = [];
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 25, // speed pixels/sec
            vy: (Math.random() - 0.5) * 25,
            width: 14 + Math.random() * 8,  // bounding box dimensions
            height: 28 + Math.random() * 12,
            confidence: (0.85 + Math.random() * 0.14).toFixed(2),
            trackingId: Math.floor(1000 + Math.random() * 9000)
        });
    }
}

function startCameraLoop() {
    let lastTime = performance.now();

    const loop = (time) => {
        const dt = (time - lastTime) / 1000;
        lastTime = time;

        if (ctx && canvas) {
            drawCameraFeed(dt);
        }
        animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
}

export function stopCameraLoop() {
    if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
    }
    window.removeEventListener('resize', resizeCanvas);
}

function drawCameraFeed(dt) {
    const w = canvas.width;
    const h = canvas.height;

    // 1. Dark grey surveillance screen base
    ctx.fillStyle = '#0f1016';
    ctx.fillRect(0, 0, w, h);

    // Draw grid overlay (simulating floor tiles/calibration grid)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }

    // 2. Determine density and thresholds from current camera node
    let density = 0.5;
    let totalCount = 28;
    if (nodeReference) {
        density = Math.min(1.5, nodeReference.currentCount / nodeReference.capacity);
        totalCount = Math.round(nodeReference.currentCount / 100); // scaled representational count
    }

    let statusText = 'STABLE';
    let statusColor = '#10b981'; // Green
    if (density > 0.9) {
        statusText = 'CRITICAL OVERCROWDING';
        statusColor = '#ef4444'; // Red
    } else if (density > 0.7) {
        statusText = 'WARNING DENSITY';
        statusColor = '#f59e0b'; // Amber
    }

    // Dynamic adjustment of particles count over time to look organic (people moving in/out of frame)
    const targetParticleCount = Math.min(100, Math.max(10, Math.round(density * 70)));
    if (particles.length < targetParticleCount && Math.random() < 0.05) {
        // Add particle
        particles.push({
            x: Math.random() < 0.5 ? 0 : w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 30,
            vy: (Math.random() - 0.5) * 30,
            width: 14 + Math.random() * 8,
            height: 28 + Math.random() * 12,
            confidence: (0.88 + Math.random() * 0.11).toFixed(2),
            trackingId: Math.floor(1000 + Math.random() * 9000)
        });
    } else if (particles.length > targetParticleCount && Math.random() < 0.05) {
        // Remove particle
        particles.pop();
    }

    // 3. Draw and update particles
    particles.forEach(p => {
        // Move particle
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Bounce off walls or wrap around
        if (p.x < 0) { p.x = 0; p.vx *= -1; }
        if (p.x > w) { p.x = w; p.vx *= -1; }
        if (p.y < 0) { p.y = 0; p.vy *= -1; }
        if (p.y > h) { p.y = h; p.vy *= -1; }

        // Draw object dot (simulating human heat signature or center point)
        ctx.fillStyle = statusColor + '77'; // Semi-transparent based on density status
        ctx.beginPath();
        ctx.arc(p.x, p.y - p.height/3, 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw YOLO-style Bounding Box
        ctx.strokeStyle = statusColor;
        ctx.lineWidth = 1.2;
        const bx = p.x - p.width / 2;
        const by = p.y - p.height + 4;
        ctx.strokeRect(bx, by, p.width, p.height);

        // Bounding Box Label (e.g. "P_0381 94%")
        ctx.fillStyle = statusColor;
        ctx.font = '8px monospace';
        ctx.fillText(`P_${p.trackingId} ${p.confidence}`, bx, by - 3);

        // Subtly draw tracking trail vector
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.3, p.y - p.vy * 0.3); // direction indicator
        ctx.stroke();
    });

    // 4. CCTV HUD Interface Overlays
    // Outer Border Frame
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    // Corner brackets
    const bracketSize = 12;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    // Top-Left
    ctx.beginPath(); ctx.moveTo(8, 8 + bracketSize); ctx.lineTo(8, 8); ctx.lineTo(8 + bracketSize, 8); ctx.stroke();
    // Top-Right
    ctx.beginPath(); ctx.moveTo(w - 8, 8 + bracketSize); ctx.lineTo(w - 8, 8); ctx.lineTo(w - 8 - bracketSize, 8); ctx.stroke();
    // Bottom-Left
    ctx.beginPath(); ctx.moveTo(8, h - 8 - bracketSize); ctx.lineTo(8, h - 8); ctx.lineTo(8 + bracketSize, h - 8); ctx.stroke();
    // Bottom-Right
    ctx.beginPath(); ctx.moveTo(w - 8, h - 8 - bracketSize); ctx.lineTo(w - 8, h - 8); ctx.lineTo(w - 8 - bracketSize, h - 8); ctx.stroke();

    // Red Recording Dot (Blinks every second)
    const isBlinkOn = Math.floor(time / 1000) % 2 === 0;
    if (isBlinkOn) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(22, 22, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Text HUD Overlay
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.fillText('REC', 31, 25);

    // Camera Label
    ctx.fillText(cameraName.toUpperCase(), 20, h - 20);

    // System Metrics
    ctx.font = '9px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const timeString = new Date().toISOString().replace('T', ' ').substring(0, 19);
    ctx.fillText(timeString, w - 145, 25);
    ctx.fillText(`FPS: 30.00`, w - 145, 38);
    ctx.fillText(`AI RESOLUTION: 1080P`, w - 145, 51);
    
    // Crowd Analytics Display Panel
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(w - 148, h - 68, 135, 45);
    ctx.strokeStyle = statusColor + '55';
    ctx.lineWidth = 1;
    ctx.strokeRect(w - 148, h - 68, 135, 45);

    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = statusColor;
    ctx.fillText(`FLOW EVAL: ${statusText}`, w - 142, h - 56);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`PEOPLE COUNT: ${particles.length}`, w - 142, h - 44);
    ctx.fillText(`DENSITY INDEX: ${(density * 100).toFixed(1)}%`, w - 142, h - 32);

    // Video Scanlines overlay effect
    scanlineOffset += dt * 8;
    if (scanlineOffset > 10) scanlineOffset = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    for (let y = Math.floor(scanlineOffset); y < h; y += 8) {
        ctx.fillRect(8, y, w - 16, 2);
    }
}
