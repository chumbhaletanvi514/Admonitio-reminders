const prisma = require('../config/db');

// 1. Fetch public device information by device code (e.g., WC-A3-042)
exports.getDeviceByCode = async (req, res) => {
  try {
    const { deviceCode } = req.params;

    const device = await prisma.device.findUnique({
      where: { deviceCode },
      include: {
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found.' });
    }

    return res.status(200).json({ success: true, device });
  } catch (error) {
    console.error('Error fetching device:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve device data.' });
  }
};

// 2. Submit a new complaint ticket
exports.createTicket = async (req, res) => {
  try {
    const {
      deviceCode,
      category,
      specification,
      severity,
      reporterName,
      reporterPhone
    } = req.body;

    if (!deviceCode || !category || !specification) {
      return res.status(400).json({ success: false, message: 'Missing required ticket details.' });
    }

    const device = await prisma.device.findUnique({
      where: { deviceCode }
    });

    if (!device) {
      return res.status(404).json({ success: false, message: 'Target device not found.' });
    }

    // Generate readable Ticket ID: TKT-YYYYMMDD-XXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const ticketNumber = `TKT-${dateStr}-${randomSuffix}`;

    const newTicket = await prisma.ticket.create({
      data: {
        ticketNumber,
        category,
        specification,
        severity: severity ? severity.toUpperCase() : 'MEDIUM',
        status: 'OPEN',
        reporterName: reporterName || null,
        reporterPhone: reporterPhone || null,
        deviceId: device.id
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Ticket registered successfully',
      ticket: newTicket
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    return res.status(500).json({ success: false, message: 'Could not register ticket.' });
  }
};

// 3. Fetch detailed device & active ticket for coordinator review
exports.getCoordinatorDeviceDetail = async (req, res) => {
  try {
    const { deviceCode } = req.params;

    const device = await prisma.device.findUnique({
      where: { deviceCode },
      include: {
        tickets: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found.' });
    }

    // Find active ticket (OPEN or IN_PROGRESS), or latest resolved
    const activeTicket = device.tickets.find(t => t.status === 'OPEN' || t.status === 'UNDER_REVIEW' || t.status === 'IN_PROGRESS') || null;

    return res.status(200).json({
      success: true,
      device,
      activeTicket,
      history: device.tickets
    });
  } catch (error) {
    console.error('Error fetching coordinator detail:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch device details.' });
  }
};

// 4. Update ticket action (Assign tech, resolve, or change status)
exports.updateTicketAction = async (req, res) => {
  try {
    const { ticketId, action, status } = req.body;
    const coordinatorId = req.coordinator.id;

    if (!ticketId) {
      return res.status(400).json({ success: false, message: 'Ticket ID required.' });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: status || 'IN_PROGRESS',
        coordinatorId
      },
      include: {
        device: true
      }
    });

    // If marked resolved, update device lastService date
    if (status === 'RESOLVED') {
      await prisma.device.update({
        where: { id: updatedTicket.deviceId },
        data: { lastService: new Date() }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Action recorded: ${action}`,
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Error updating ticket action:', error);
    return res.status(500).json({ success: false, message: 'Could not update ticket.' });
  }
};