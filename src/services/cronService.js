const cron = require('node-cron');
const prisma = require('../config/db');
const emailService = require('./emailService');

// 1. Water Cooler: Check and send daily incomplete reminders
async function runDailyIncompleteCheck() {
  console.log('⏰ Running daily water cooler incomplete step reminder scan...');
  try {
    const pendingTickets = await prisma.ticket.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      include: {
        device: true,
        coordinator: true,
      },
    });

    for (const ticket of pendingTickets) {
      const allSteps = [1, 2, 3, 4];
      const done = ticket.completedSteps || [];
      const missing = allSteps.filter(s => !done.includes(s));

      if (missing.length > 0) {
        let coordinator = ticket.coordinator;
        if (!coordinator) {
          coordinator = await prisma.coordinator.findFirst();
        }

        if (coordinator) {
          const targetEmail = coordinator.notificationEmail || coordinator.username;
          await emailService.sendIncompleteStepsReminder(
            targetEmail,
            coordinator.name,
            ticket,
            missing
          );
        }
      }
    }
  } catch (error) {
    console.error('Error during daily cooler reminder check:', error);
  }
}

// 2. Water Cooler: 7-day post-completion verification
async function runSevenDayVerificationCheck() {
  console.log('⏰ Running 7-day verification scan...');
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const completedTickets = await prisma.ticket.findMany({
      where: {
        status: 'STEPS_COMPLETED',
        verifiedResolved: false,
        lastStepTimestamp: { lte: sevenDaysAgo },
      },
      include: {
        device: true,
        coordinator: true,
      },
    });

    for (const ticket of completedTickets) {
      let coordinator = ticket.coordinator;
      if (!coordinator) {
        coordinator = await prisma.coordinator.findFirst();
      }

      if (coordinator) {
        const targetEmail = coordinator.notificationEmail || coordinator.username;
        await emailService.sendSevenDayVerificationReminder(
          targetEmail,
          coordinator.name,
          ticket
        );
      }
    }
  } catch (error) {
    console.error('Error during 7-day verification check:', error);
  }
}

// 3. Fire Extinguisher: Daily Expiry Countdown Sweep (15, 10, 5, 4, 3, 2, 1 days)
async function runExtinguisherExpiryCheck() {
  console.log('⏰ Running fire extinguisher expiry reminder scan...');
  try {
    const extinguishers = await prisma.device.findMany({
      where: {
        category: 'FIRE_EXTINGUISHER',
        expiryDate: { not: null }
      }
    });

    // Find coordinators managing FIRE_EXTINGUISHER
    const coordinators = await prisma.coordinator.findMany({
      where: {
        categories: { has: 'FIRE_EXTINGUISHER' }
      }
    });

    const fallbackCoordinator = coordinators[0] || (await prisma.coordinator.findFirst());
    if (!fallbackCoordinator) {
      console.log('No coordinator found to receive extinguisher alerts.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const TARGET_REMINDER_DAYS = [15, 10, 5, 4, 3, 2, 1];

    for (const fe of extinguishers) {
      const expDate = new Date(fe.expiryDate);
      expDate.setHours(0, 0, 0, 0);

      const diffTime = expDate - today;
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Trigger if today hits exact reminder thresholds or if already overdue (<= 0)
      if (TARGET_REMINDER_DAYS.includes(daysRemaining) || (daysRemaining <= 0 && daysRemaining >= -3)) {
        const targetEmail = fallbackCoordinator.notificationEmail || fallbackCoordinator.username;
        await emailService.sendExtinguisherExpiryReminder(
          targetEmail,
          fallbackCoordinator.name,
          fe,
          daysRemaining
        );
      }
    }
  } catch (error) {
    console.error('Error during extinguisher reminder check:', error);
  }
}

// Start automated background schedules
function startSchedulers() {
  // Daily check at 09:00 AM every day
  cron.schedule('0 9 * * *', () => {
    runDailyIncompleteCheck();
    runExtinguisherExpiryCheck();
  });

  // Weekly check at 09:30 AM every Monday
  cron.schedule('30 9 * * 1', () => {
    runSevenDayVerificationCheck();
  });

  console.log('🕒 Automated Reminder Cron Schedulers registered.');
}

module.exports = {
  startSchedulers,
  runDailyIncompleteCheck,
  runSevenDayVerificationCheck,
  runExtinguisherExpiryCheck, // Exported for immediate demo trigger
};