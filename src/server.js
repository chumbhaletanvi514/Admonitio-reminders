require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const cronService = require('./services/cronService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/tickets', ticketRoutes);

// TEST ENDPOINT: Manually trigger reminder scan right now for demo/presentation
app.post('/api/reminders/trigger-now', async (req, res) => {
  await cronService.runDailyIncompleteCheck();
  await cronService.runSevenDayVerificationCheck();
  res.json({ success: true, message: 'Reminder scan triggered. Check terminal console or inbox!' });
});

// Page Routing
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.get('/ticket-detail', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/ticket-detail.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start Background Cron Schedulers
cronService.startSchedulers();

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

app.get('/qr-codes', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/qr-codes.html'));
});