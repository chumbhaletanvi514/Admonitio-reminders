const nodemailer = require('nodemailer');

const hasCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASS;

const transporter = hasCredentials
  ? nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

// Send Daily Incomplete Steps Reminder
exports.sendIncompleteStepsReminder = async (toEmail, coordinatorName, ticket, missingSteps) => {
  const stepLabels = {
    1: 'Step 1: Google Sheet Record',
    2: 'Step 2: FMS Portal Form',
    3: 'Step 3: Vendor Requisition',
    4: 'Step 4: Maintenance Ledger',
  };

  const missingListText = missingSteps.map(s => `• ${stepLabels[s]}`).join('\n');
  const completedCount = ticket.completedSteps.length;
  const remainingCount = missingSteps.length;

  const subject = `⚠️ Action Required: Ticket #${ticket.ticketNumber} (${remainingCount} Steps Pending)`;
  const bodyText = `
Hello ${coordinatorName},

This is an automated reminder regarding the complaint reported on:
Device: ${ticket.device.name} (${ticket.device.location})
Issue: ${ticket.category} — ${ticket.specification}

Progress Status:
You have completed ${completedCount} of 4 administrative steps.
The following ${remainingCount} step(s) are still pending:
${missingListText}

Please visit your portal to complete the remaining steps so repairs can proceed:
http://localhost:5000/ticket-detail?code=${ticket.device.deviceCode}

— Admonitio Automated Maintenance Reminder System
  `;

  console.log(`\n======================================================`);
  console.log(`📨 [EMAIL DISPATCHED] To: ${toEmail}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${bodyText}`);
  console.log(`======================================================\n`);

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"Admonitio Maintenance" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject,
        text: bodyText,
      });
    } catch (err) {
      console.error('SMTP Send error:', err.message);
    }
  }
};

// Send 7-Day Resolution Verification Reminder
exports.sendSevenDayVerificationReminder = async (toEmail, coordinatorName, ticket) => {
  const subject = `🔍 7-Day Ground Check: Has #${ticket.ticketNumber} Been Physically Repaired?`;
  const bodyText = `
Hello ${coordinatorName},

It has been 7 days since all 4 administrative forms were submitted for:
Device: ${ticket.device.name} (${ticket.device.location})
Reported Issue: ${ticket.category} — ${ticket.specification}

Please verify if the unit is now functioning on campus:
• If working: Mark as Verified Resolved in your dashboard.
• If still broken: Revisit the technician dispatch.

Review and confirm here:
http://localhost:5000/ticket-detail?code=${ticket.device.deviceCode}

— Admonitio Automated Maintenance Reminder System
  `;

  console.log(`\n======================================================`);
  console.log(`📨 [7-DAY VERIFICATION DISPATCHED] To: ${toEmail}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${bodyText}`);
  console.log(`======================================================\n`);

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"Admonitio Maintenance" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject,
        text: bodyText,
      });
    } catch (err) {
      console.error('SMTP Send error:', err.message);
    }
  }
};