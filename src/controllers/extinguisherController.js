const prisma = require('../config/db');
const QRCode = require('qrcode');

// 1. Fetch Extinguisher Dashboard Data & Metrics
exports.getExtinguisherDashboard = async (req, res) => {
  try {
    const extinguishers = await prisma.device.findMany({
      where: { category: 'FIRE_EXTINGUISHER' },
      orderBy: { deviceCode: 'asc' },
    });

    console.log(`[EXTINGUISHER API] Found ${extinguishers.length} extinguishers in database.`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let expiredCount = 0;
    let criticalCount = 0;
    let validCount = 0;

    const formattedDevices = extinguishers.map(dev => {
      let daysRemaining = null;
      let status = 'VALID';

      if (dev.expiryDate) {
        const expDate = new Date(dev.expiryDate);
        expDate.setHours(0, 0, 0, 0);
        daysRemaining = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

        if (daysRemaining <= 0) {
          status = 'EXPIRED';
          expiredCount++;
        } else if (daysRemaining <= 15) {
          status = 'CRITICAL';
          criticalCount++;
        } else {
          status = 'VALID';
          validCount++;
        }
      }

      return {
        ...dev,
        daysRemaining,
        status,
      };
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalExtinguishers: extinguishers.length,
        validCount,
        criticalCount,
        expiredCount,
      },
      devices: formattedDevices,
    });
  } catch (error) {
    console.error('Error loading extinguisher dashboard:', error);
    return res.status(500).json({ success: false, message: 'Could not load extinguisher data.' });
  }
};

// 2. Update Expiry Date for a SPECIFIC Extinguisher
exports.updateSingleExpiryDate = async (req, res) => {
  try {
    const { deviceCode, expiryDate } = req.body;

    if (!deviceCode || !expiryDate) {
      return res.status(400).json({ success: false, message: 'Device code and new expiry date are required.' });
    }

    const updated = await prisma.device.update({
      where: { deviceCode: String(deviceCode) },
      data: {
        expiryDate: new Date(expiryDate),
        lastService: new Date()
      }
    });

    return res.status(200).json({
      success: true,
      message: `Expiry date updated for ${deviceCode}.`,
      device: updated
    });
  } catch (error) {
    console.error('Error updating extinguisher expiry date:', error);
    return res.status(500).json({ success: false, message: 'Failed to update date.' });
  }
};

// 3. BULK Update Expiry Date for ALL Extinguishers
exports.updateBulkExpiryDate = async (req, res) => {
  try {
    const { expiryDate } = req.body;

    if (!expiryDate) {
      return res.status(400).json({ success: false, message: 'A target expiry date is required.' });
    }

    const result = await prisma.device.updateMany({
      where: { category: 'FIRE_EXTINGUISHER' },
      data: {
        expiryDate: new Date(expiryDate),
        lastService: new Date()
      }
    });

    return res.status(200).json({
      success: true,
      message: `Updated expiry date for all ${result.count} campus fire extinguishers.`,
      updatedCount: result.count
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    return res.status(500).json({ success: false, message: 'Failed to apply bulk update.' });
  }
};

// Bulk Renew: Extends ALL fire extinguishers by +1 Year from today
exports.replaceAllExtinguishers = async (req, res) => {
  try {
    const newExpiry = new Date();
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);

    const result = await prisma.device.updateMany({
      where: { category: 'FIRE_EXTINGUISHER' },
      data: {
        expiryDate: newExpiry,
        lastService: new Date()
      }
    });

    const formattedDate = newExpiry.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    return res.status(200).json({
      success: true,
      message: `All ${result.count} fire extinguishers certified & renewed until ${formattedDate} (+1 Year).`,
      newExpiryDate: newExpiry,
      count: result.count
    });
  } catch (error) {
    console.error('Error replacing all extinguishers:', error);
    return res.status(500).json({ success: false, message: 'Failed to renew all extinguishers.' });
  }
};

// 4. One-Click Replacement Confirmation from Reminder Email
// Adds +1 year from today, marks certified, and stops reminders
exports.confirmReplacedFromEmail = async (req, res) => {
  try {
    const { deviceCode } = req.query;

    if (!deviceCode) {
      return res.status(400).send('<h3>Invalid Request: Missing Device Code</h3>');
    }

    const device = await prisma.device.findUnique({
      where: { deviceCode: String(deviceCode) }
    });

    if (!device) {
      return res.status(404).send('<h3>Device Not Found</h3>');
    }

    // Set new expiry date to +1 year from today
    const newExpiry = new Date();
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);

    await prisma.device.update({
      where: { id: device.id },
      data: {
        expiryDate: newExpiry,
        lastService: new Date()
      }
    });

    const formattedNewExpiry = newExpiry.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    // Clean confirmation HTML page
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <title>Admonitio — Certification Confirmed</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>
              body { font-family: 'Inter', sans-serif; background: #F1F5F9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: #FFFFFF; border-radius: 16px; padding: 40px; max-width: 500px; text-align: center; box-shadow: 0 20px 40px -8px rgba(15,23,42,0.12); }
              .icon { font-size: 54px; margin-bottom: 16px; }
              h1 { font-size: 22px; font-weight: 800; color: #0F172A; margin-bottom: 8px; }
              p { font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 24px; }
              .badge { background: #F0FDF4; border: 1px solid #86EFAC; color: #166534; font-weight: 700; padding: 10px 16px; border-radius: 9999px; display: inline-block; margin-bottom: 24px; font-size: 13px; }
              .btn { display: inline-block; background: #2563EB; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="card">
              <div class="icon">✅</div>
              <h1>Replacement Certified!</h1>
              <p>Fire Extinguisher <strong>${device.name} (${device.deviceCode})</strong> has been verified as replaced/refilled on ground.</p>
              <div class="badge">Next Expiry Date: ${formattedNewExpiry} (+1 Year)</div>
              <p style="font-size: 12px; color: #94A3B8;">All automated reminder emails for this unit have been halted.</p>
              <a href="/extinguisher-dashboard" class="btn">Go to Extinguisher Dashboard &rarr;</a>
          </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error confirming replacement:', error);
    return res.status(500).send('<h3>Internal error confirming replacement.</h3>');
  }
};

// 5. Public Inspection Status (Student / Staff QR Scan)
exports.getPublicExtinguisherStatus = async (req, res) => {
  try {
    const { deviceCode } = req.params;

    const device = await prisma.device.findUnique({
      where: { deviceCode: String(deviceCode) }
    });

    if (!device) {
      return res.status(404).json({ success: false, message: 'Extinguisher not found.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let isCertified = true;
    let daysRemaining = null;

    if (device.expiryDate) {
      const expDate = new Date(device.expiryDate);
      expDate.setHours(0, 0, 0, 0);
      daysRemaining = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
      isCertified = daysRemaining > 0;
    }

    return res.status(200).json({
      success: true,
      extinguisher: {
        deviceCode: device.deviceCode,
        name: device.name,
        location: device.location,
        model: device.model,
        capacity: device.capacity,
        extinguisherType: device.extinguisherType,
        expiryDate: device.expiryDate,
        isCertified,
        daysRemaining
      }
    });
  } catch (error) {
    console.error('Error fetching public status:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch status.' });
  }
};

// 6. Generate QR codes for all extinguishers
exports.getExtinguisherQRCodes = async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      where: { category: 'FIRE_EXTINGUISHER' },
      orderBy: { deviceCode: 'asc' },
    });

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const qrData = await Promise.all(
      devices.map(async (device) => {
        const targetUrl = `${baseUrl}/extinguisher-status.html?code=${device.deviceCode}`;
        const qrImage = await QRCode.toDataURL(targetUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#0F172A',
            light: '#FFFFFF',
          },
        });

        return {
          ...device,
          targetUrl,
          qrImage,
        };
      })
    );

    return res.status(200).json({ success: true, devices: qrData });
  } catch (error) {
    console.error('Error generating extinguisher QR codes:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate QR codes.' });
  }
};