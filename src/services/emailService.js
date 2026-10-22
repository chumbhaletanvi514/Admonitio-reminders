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

// Existing Water Cooler Incomplete Steps Reminder
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
  console.log(`📨 [WATER COOLER REMINDER DISPATCHED] To: ${toEmail}`);
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

// Existing Water Cooler 7-Day Verification Reminder
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

// ============================================================
// NEW: Fire Extinguisher Expiry Escalation Reminder
// Escalation intervals: 15, 10, 5, 4, 3, 2, 1 days
// ============================================================
exports.sendExtinguisherExpiryReminder = async (toEmail, coordinatorName, extinguisher, daysRemaining) => {
  const expiryFormatted = new Date(extinguisher.expiryDate).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const confirmUrl = `http://localhost:5000/api/extinguishers/confirm-replaced?deviceCode=${extinguisher.deviceCode}`;

  const urgencyTag = daysRemaining <= 3 ? '🚨 CRITICAL SAFETY ALERT' : '⚠️ URGENT REMINDER';
  const subject = `${urgencyTag}: Fire Extinguisher ${extinguisher.name} (${extinguisher.deviceCode}) Expires in ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'}!`;

  const bodyText = `
Hello ${coordinatorName},

This is an automated safety compliance alert from Admonitio.

Unit Details:
• Cylinder Name: ${extinguisher.name} (${extinguisher.deviceCode})
• Location: ${extinguisher.location}
• Type: ${extinguisher.extinguisherType || 'ABC Dry Powder'} (${extinguisher.capacity || '6 KG'})
• Current Expiry Date: ${expiryFormatted}
• Countdown: ONLY ${daysRemaining} DAY(S) REMAINING!

ACTION REQUIRED:
Please verify physical inspection and cylinder replacement / refill with the campus safety agency.

If this extinguisher has ALREADY been replaced/certified, click the confirmation link below to renew certification (+1 year) and immediately halt all reminder emails:

👉 One-Click Confirmation: ${confirmUrl}

To inspect all campus fire extinguishers or modify dates manually:
http://localhost:5000/extinguisher-dashboard

— Admonitio Campus Safety & Compliance System
  `;

  console.log(`\n======================================================`);
  console.log(`🧯 [FIRE EXTINGUISHER REMINDER DISPATCHED] To: ${toEmail}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${bodyText}`);
  console.log(`======================================================\n`);

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"Admonitio Safety Compliance" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject,
        text: bodyText,
      });
    } catch (err) {
      console.error('SMTP Send error:', err.message);
    }
  }
};