const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const extinguisherController = require('../controllers/extinguisherController');

// Public verification endpoints
router.get('/confirm-replaced', extinguisherController.confirmReplacedFromEmail);
router.get('/public-status/:deviceCode', extinguisherController.getPublicExtinguisherStatus);

// Protected coordinator endpoints
router.get('/dashboard', authMiddleware, extinguisherController.getExtinguisherDashboard);
router.post('/update-expiry', authMiddleware, extinguisherController.updateSingleExpiryDate);
router.post('/bulk-update-expiry', authMiddleware, extinguisherController.updateBulkExpiryDate);
router.get('/qr-codes', authMiddleware, extinguisherController.getExtinguisherQRCodes);
router.post('/replace-all', authMiddleware, extinguisherController.replaceAllExtinguishers);

module.exports = router;