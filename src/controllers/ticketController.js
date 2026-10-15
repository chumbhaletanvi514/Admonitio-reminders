const prisma = require('../config/db');
const bcrypt = require('bcryptjs');

// 1. Fetch public device information by device code (for students)
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

// 2. Submit a new complaint ticket (student endpoint)
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
        completedSteps: [],
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

// 3. Fetch detailed device & tickets for coordinator review
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

    const allActiveTickets = device.tickets.filter(t => t.status !== 'RESOLVED');
    const activeTicket = allActiveTickets[0] || null;

    return res.status(200).json({
      success: true,
      device,
      activeTicket,
      allActiveTickets,
      historyTickets: device.tickets
    });
  } catch (error) {
    console.error('Error in getCoordinatorDeviceDetail:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch device details.' });
  }
};

// 4. Update Step Completion (Step 1, 2, 3, or 4)
exports.completeStepAction = async (req, res) => {
  try {
    const { ticketId, stepNumber, deviceCode } = req.body;
    const coordinatorId = req.coordinator ? req.coordinator.id : null;

    if (!stepNumber) {
      return res.status(400).json({ success: false, message: 'Step number is required.' });
    }

    let ticket = null;

    // Direct UUID String lookup
    if (ticketId && typeof ticketId === 'string' && ticketId.trim() !== '') {
      ticket = await prisma.ticket.findUnique({
        where: { id: ticketId.trim() }
      }).catch(() => null);
    }

    // Fallback: If ticketId was missing or not found, locate active ticket by deviceCode
    if (!ticket && deviceCode) {
      const device = await prisma.device.findUnique({
        where: { deviceCode: String(deviceCode) },
        include: {
          tickets: {
            where: { status: { not: 'RESOLVED' } },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      if (device && device.tickets && device.tickets.length > 0) {
        ticket = device.tickets[0];
      }
    }

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Target active ticket not found.' });
    }

    const stepNum = parseInt(stepNumber, 10);
    let steps = Array.isArray(ticket.completedSteps) ? [...ticket.completedSteps] : [];

    if (!steps.includes(stepNum)) {
      steps.push(stepNum);
      steps.sort((a, b) => a - b);
    }

    const newStatus = steps.length >= 4 ? 'STEPS_COMPLETED' : 'IN_PROGRESS';

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        completedSteps: steps,
        status: newStatus,
        lastStepTimestamp: new Date(),
        coordinatorId: coordinatorId || ticket.coordinatorId
      }
    });

    return res.status(200).json({
      success: true,
      completedSteps: updated.completedSteps,
      status: updated.status,
      ticketId: updated.id,
      message: `Step ${stepNum} completed successfully.`
    });
  } catch (error) {
    console.error('Error updating step action:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Final Ground Resolution Check
exports.verifyFinalResolution = async (req, res) => {
  try {
    const { ticketId, resolved } = req.body;

    const ticket = await prisma.ticket.findUnique({
      where: { id: String(ticketId) }
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: resolved ? 'RESOLVED' : 'IN_PROGRESS',
        verifiedResolved: !!resolved
      },
      include: { device: true }
    });

    if (resolved && updated.deviceId) {
      await prisma.device.update({
        where: { id: updated.deviceId },
        data: { lastService: new Date() }
      });
    }

    return res.status(200).json({
      success: true,
      message: resolved ? 'Issue verified resolved on ground.' : 'Pending maintenance revisit.',
      ticket: updated
    });
  } catch (error) {
    console.error('Resolution verification error:', error);
    return res.status(500).json({ success: false, message: 'Could not verify ticket resolution.' });
  }
};

// 6. Coordinator Profile Update (Email & Password change)
exports.updateCoordinatorProfile = async (req, res) => {
  try {
    const coordinatorId = req.coordinator.id;
    const { notificationEmail, newPassword } = req.body;

    const updateData = {};
    if (notificationEmail) {
      updateData.notificationEmail = notificationEmail.trim();
    }
    if (newPassword && newPassword.length >= 6) {
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.coordinator.update({
      where: { id: coordinatorId },
      data: updateData
    });

    return res.status(200).json({
      success: true,
      message: 'Profile settings updated.',
      coordinator: {
        id: updated.id,
        username: updated.username,
        notificationEmail: updated.notificationEmail,
        name: updated.name,
        roleTitle: updated.roleTitle
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ success: false, message: 'Could not update profile.' });
  }
};