

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const extinguisherRoutes = require('./routes/extinguisherRoutes');
const cronService = require('./services/cronService');

const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/extinguishers', extinguisherRoutes);

// Segregated Reminder Triggers
app.post('/api/reminders/trigger-water-coolers', async (req, res) => {
  await cronService.runDailyIncompleteCheck();
  await cronService.runSevenDayVerificationCheck();
  res.json({ success: true, message: 'Water Cooler reminder scan complete!' });
});

app.post('/api/reminders/trigger-extinguishers', async (req, res) => {
  await cronService.runExtinguisherExpiryCheck();
  res.json({ success: true, message: 'Fire Extinguisher reminder scan complete!' });
});

app.post('/api/reminders/trigger-now', async (req, res) => {
  await cronService.runDailyIncompleteCheck();
  await cronService.runSevenDayVerificationCheck();
  await cronService.runExtinguisherExpiryCheck();
  res.json({ success: true, message: 'Full campus reminder scan complete!' });
});

// Page Routing
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/select-category', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/select-category.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.get('/extinguisher-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/extinguisher-dashboard.html'));
});

app.get('/extinguisher-qr', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/extinguisher-qr.html'));
});

app.get('/ticket-detail', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/ticket-detail.html'));
});

app.get('/qr-codes', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/qr-codes.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start Background Cron Schedulers
cronService.startSchedulers();

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});