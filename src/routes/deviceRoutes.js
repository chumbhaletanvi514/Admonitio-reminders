const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const deviceController = require('../controllers/deviceController');
const ticketController = require('../controllers/ticketController');

router.get('/dashboard', authMiddleware, deviceController.getDashboardData);
router.get('/detail/:deviceCode', authMiddleware, ticketController.getCoordinatorDeviceDetail);
router.post('/step-complete', authMiddleware, ticketController.completeStepAction);
router.post('/verify-resolution', authMiddleware, ticketController.verifyFinalResolution);
router.post('/profile-update', authMiddleware, ticketController.updateCoordinatorProfile);
router.get('/qr-codes', authMiddleware, deviceController.getDeviceQRCodes);

module.exports = router;