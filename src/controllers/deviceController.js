const prisma = require('../config/db');

exports.getDashboardData = async (req, res) => {
  try {
    const category = req.coordinator.category; // Scoped to WATER_COOLER

    // 1. Fetch all devices belonging to coordinator's category
    const devices = await prisma.device.findMany({
      where: { category },
      include: {
        tickets: {
          select: {
            id: true,
            status: true,
            category: true,
            severity: true,
            createdAt: true,
          },
        },
      },
      orderBy: { deviceCode: 'asc' },
    });

    // 2. Calculate summary statistics
    const totalDevices = devices.length;
    let activeTicketsCount = 0;
    let inMaintenanceCount = 0;
    let resolvedTicketsCount = 0;

    devices.forEach(device => {
      device.tickets.forEach(ticket => {
        if (ticket.status === 'OPEN' || ticket.status === 'UNDER_REVIEW') {
          activeTicketsCount++;
        } else if (ticket.status === 'IN_PROGRESS') {
          inMaintenanceCount++;
        } else if (ticket.status === 'RESOLVED') {
          resolvedTicketsCount++;
        }
      });
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalDevices,
        activeTicketsCount,
        inMaintenanceCount,
        resolvedTicketsCount,
      },
      devices,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({ success: false, message: 'Could not load dashboard data.' });
  }
};

const QRCode = require('qrcode');

// Append to src/controllers/deviceController.js
exports.getDeviceQRCodes = async (req, res) => {
  try {
    const category = req.coordinator.category;
    const devices = await prisma.device.findMany({
      where: { category },
      orderBy: { deviceCode: 'asc' },
    });

    // Base URL where students access the reporting portal
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const qrData = await Promise.all(
      devices.map(async (device) => {
        const targetUrl = `${baseUrl}/?device=${device.deviceCode}`;
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
    console.error('Error generating QR codes:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate QR codes.' });
  }
};