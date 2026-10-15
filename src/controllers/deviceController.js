const prisma = require('../config/db');
const QRCode = require('qrcode');

// 1. Fetch Dashboard Stats and Assigned Devices
exports.getDashboardData = async (req, res) => {
  try {
    const category = req.coordinator.category; // 'WATER_COOLER'

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

    const totalDevices = devices.length;
    let activeTicketsCount = 0;
    let inMaintenanceCount = 0;
    let resolvedTicketsCount = 0;

    devices.forEach(device => {
      device.tickets.forEach(ticket => {
        if (ticket.status === 'OPEN') {
          activeTicketsCount++;
        } else if (ticket.status === 'IN_PROGRESS' || ticket.status === 'STEPS_COMPLETED') {
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

// 2. Generate QR Code stickers for all assigned devices
exports.getDeviceQRCodes = async (req, res) => {
  try {
    const category = req.coordinator.category;
    const devices = await prisma.device.findMany({
      where: { category },
      orderBy: { deviceCode: 'asc' },
    });

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

// 3. Reset Cooler: Mark ALL active complaints resolved and clear the cooler cycle
exports.resetCoolerTickets = async (req, res) => {
  try {
    const { deviceCode } = req.body;

    if (!deviceCode) {
      return res.status(400).json({ success: false, message: 'Device code is required.' });
    }

    const device = await prisma.device.findUnique({
      where: { deviceCode: String(deviceCode) },
      include: { tickets: true }
    });

    if (!device) {
      return res.status(404).json({ success: false, message: `Device ${deviceCode} not found.` });
    }

    // Only uses enum values present in TicketStatus: OPEN, IN_PROGRESS, STEPS_COMPLETED
    await prisma.ticket.updateMany({
      where: {
        deviceId: device.id,
        status: { in: ['OPEN', 'IN_PROGRESS', 'STEPS_COMPLETED'] }
      },
      data: {
        status: 'RESOLVED',
        verifiedResolved: true,
      }
    });

    await prisma.device.update({
      where: { id: device.id },
      data: { lastService: new Date() }
    });

    return res.status(200).json({
      success: true,
      message: `Cooler ${deviceCode} has been reset. All active complaints are resolved.`
    });
  } catch (error) {
    console.error('Error resetting cooler tickets:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Direct complaint creation by Coordinator (no QR scan needed)
exports.createDirectComplaint = async (req, res) => {
  try {
    const { deviceCode, category, specification, severity } = req.body;

    const device = await prisma.device.findUnique({
      where: { deviceCode: String(deviceCode) }
    });

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found.' });
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.ticket.count();
    const ticketNumber = `TKT-${todayStr}-${String(count + 1).padStart(3, '0')}`;

    const newTicket = await prisma.ticket.create({
      data: {
        ticketNumber,
        deviceId: device.id,
        category: category || 'Coordinator Inspection Fault',
        specification: specification || 'Coordinator logged maintenance issue',
        severity: severity ? severity.toUpperCase() : 'MEDIUM',
        status: 'OPEN',
        completedSteps: []
      }
    });

    return res.status(201).json({ success: true, ticket: newTicket });
  } catch (error) {
    console.error('Error creating direct complaint:', error);
    return res.status(500).json({ success: false, message: 'Failed to log direct complaint.' });
  }
};