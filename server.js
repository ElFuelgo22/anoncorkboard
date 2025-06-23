const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files from public directory
app.use(express.static('public'));
app.use(express.json());

// API endpoint to get environment variables for client
app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
        adminUsername: process.env.ADMIN_USERNAME,
        adminPassword: process.env.ADMIN_PASSWORD
    });
});

// Serve main page
app.get('/', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } 
    catch (err) {
        res.status(500).send('Error loading main page');
    }
});

// Serve admin page
app.get('/admin', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    } 
    catch (err) {
        res.status(500).send('Error loading admin page');
    }
});

// Serve setup page
app.get('/setup', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'public', 'setup.html'));
    } 
    catch (err) {
        res.status(500).send('Error loading setup page');
    }
});

// Handle 404s
app.use((req, res) => {
    try {
        res.status(404).send('Page not found');
    } 
    catch (err) {
        res.status(500).send('Error handling 404');
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌅 Sunset Corkboard server running on http:/localhost:${PORT}`);
    console.log(`📌 Main board: http://localhost:${PORT}`);
    console.log(`⚙️ Admin panel: http://localhost:${PORT}/admin`);
});
