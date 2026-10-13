const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

// Public endpoints (no authentication required for students)
router.get('/device/:deviceCode', ticketController.getDeviceByCode);
router.post('/report', ticketController.createTicket);

module.exports = router;