const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const deviceController = require('../controllers/deviceController');
const ticketController = require('../controllers/ticketController');

// All coordinator dashboard endpoints protected by JWT authMiddleware
router.get('/dashboard', authMiddleware, deviceController.getDashboardData);
router.get('/detail/:deviceCode', authMiddleware, ticketController.getCoordinatorDeviceDetail);
router.post('/action', authMiddleware, ticketController.updateTicketAction);

module.exports = router;