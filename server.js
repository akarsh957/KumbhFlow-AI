require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8081;

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, './')));

// In-Memory Database Fallbacks
let localIncidents = [
    {
        id: "sys-init",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: "SYSTEM",
        message: "System initialized. Running in local fallback mode (no MongoDB Atlas connection).",
        location: null,
        active: true
    }
];

let localSettings = {
    weather: 'clear',
    simulationSpeed: 1.0,
    spawnRate: 1.5,
    bridgeStates: {
        pontoon_bridge_1: 'open',
        pontoon_bridge_2: 'open',
        pontoon_bridge_3: 'open'
    }
};

// MongoDB Connect using Mongoose (Atlas support)
const MONGODB_URI = process.env.MONGODB_URI;
let dbConnected = false;

if (MONGODB_URI) {
    console.log("Connecting to MongoDB Atlas...");
    mongoose.connect(MONGODB_URI)
        .then(() => {
            console.log("Connected to MongoDB Atlas successfully.");
            dbConnected = true;
            // Clean up init logs to notify DB connectivity
            localIncidents = [
                {
                    id: "sys-db",
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    type: "SYSTEM",
                    message: "MongoDB Atlas connected successfully. Real-time logging active.",
                    location: null,
                    active: true
                }
            ];
        })
        .catch(err => {
            console.error("MongoDB connection error:", err.message);
            console.log("Falling back to local in-memory database.");
        });
} else {
    console.log("MONGODB_URI not found in environment. Running with local in-memory database.");
}

// Mongoose Schemas & Models
const IncidentSchema = new mongoose.Schema({
    id: String,
    time: String,
    type: String, // 'SURGE', 'WEATHER_CHANGE', 'BRIDGE_CLOSE', 'SOS', 'SYSTEM'
    message: String,
    location: [Number], // [lat, lng]
    active: { type: Boolean, default: true }
}, { timestamps: true });

const SettingSchema = new mongoose.Schema({
    key: { type: String, unique: true },
    value: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const Incident = mongoose.model('Incident', IncidentSchema);
const Setting = mongoose.model('Setting', SettingSchema);

// Helper to check if we should query MongoDB or use local memory
function useDB() {
    return dbConnected && mongoose.connection.readyState === 1;
}

// ==========================================
// REST API ROUTES
// ==========================================

// 1. GET INCIDENTS
app.get('/api/incidents', async (req, res) => {
    try {
        if (useDB()) {
            const dbIncidents = await Incident.find({}).sort({ createdAt: -1 }).limit(50);
            res.json(dbIncidents);
        } else {
            res.json(localIncidents);
        }
    } catch (err) {
        console.error("Error fetching incidents:", err.message);
        res.json(localIncidents); // fallback on error
    }
});

// 2. POST INCIDENT
app.post('/api/incidents', async (req, res) => {
    const { type, message, location } = req.body;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newId = Date.now() + Math.random().toString(36).substr(2, 5);

    const incidentData = {
        id: newId,
        time: timeStr,
        type: type || 'SYSTEM',
        message: message,
        location: location || null,
        active: true
    };

    try {
        if (useDB()) {
            const doc = new Incident(incidentData);
            await doc.save();
            res.status(201).json(doc);
        } else {
            localIncidents.unshift(incidentData);
            if (localIncidents.length > 50) localIncidents.pop();
            res.status(201).json(incidentData);
        }
    } catch (err) {
        console.error("Error creating incident:", err.message);
        localIncidents.unshift(incidentData);
        if (localIncidents.length > 50) localIncidents.pop();
        res.status(201).json(incidentData);
    }
});

// 3. GET SETTINGS
app.get('/api/settings', async (req, res) => {
    try {
        if (useDB()) {
            const docs = await Setting.find({});
            if (docs.length === 0) {
                // Initialize default database settings
                for (const key in localSettings) {
                    await Setting.findOneAndUpdate({ key }, { value: localSettings[key] }, { upsert: true });
                }
                return res.json(localSettings);
            }
            // Parse setting array to object
            const currentSettings = {};
            docs.forEach(doc => {
                currentSettings[doc.key] = doc.value;
            });
            res.json(currentSettings);
        } else {
            res.json(localSettings);
        }
    } catch (err) {
        console.error("Error fetching settings:", err.message);
        res.json(localSettings);
    }
});

// 4. PUT SETTINGS
app.put('/api/settings', async (req, res) => {
    const updateData = req.body; // e.g. { weather: 'rain' } or { spawnRate: 2.0 }

    try {
        if (useDB()) {
            for (const key in updateData) {
                await Setting.findOneAndUpdate({ key }, { value: updateData[key] }, { upsert: true });
            }
            // Fetch updated settings
            const docs = await Setting.find({});
            const currentSettings = {};
            docs.forEach(doc => {
                currentSettings[doc.key] = doc.value;
            });
            res.json(currentSettings);
        } else {
            // Update local memory settings
            for (const key in updateData) {
                if (key === 'bridgeStates') {
                    localSettings.bridgeStates = { ...localSettings.bridgeStates, ...updateData[key] };
                } else {
                    localSettings[key] = updateData[key];
                }
            }
            res.json(localSettings);
        }
    } catch (err) {
        console.error("Error updating settings:", err.message);
        res.json(localSettings);
    }
});

// Serve frontend for all other paths (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(`KumbhFlow AI server running on http://localhost:${PORT}`);
    console.log(`Environment: ${MONGODB_URI ? 'MongoDB Atlas Configured' : 'In-Memory DB Mode'}`);
    console.log(`========================================================`);
});
