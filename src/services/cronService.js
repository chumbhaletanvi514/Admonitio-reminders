const cron = require('node-cron');
const prisma = require('../config/db');
const emailService = require('./emailService');

// 1. Core function to check and send daily incomplete reminders
async function runDailyIncompleteCheck() {
  console.log('⏰ Running daily incomplete step reminder scan...');
  try {
    // Find all tickets that are not RESOLVED and have not completed all 4 steps
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
        // Find assigned coordinator, or fallback to first coordinator
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
    console.error('Error during daily reminder check:', error);
  }
}

// 2. Core function to check 7-day post-completion verification
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

// Start automated schedules:
// • Daily check at 09:00 AM every day: '0 9 * * *'
// • Weekly check at 09:30 AM every Monday: '30 9 * * 1'
function startSchedulers() {
  cron.schedule('0 9 * * *', () => {
    runDailyIncompleteCheck();
  });

  cron.schedule('30 9 * * 1', () => {
    runSevenDayVerificationCheck();
  });

  console.log('🕒 Automated Reminder Cron Schedulers registered.');
}

module.exports = {
  startSchedulers,
  runDailyIncompleteCheck,       // Exported so we can trigger manually via test button
  runSevenDayVerificationCheck,  // Exported so we can trigger manually via test button
};