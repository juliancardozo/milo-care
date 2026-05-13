'use strict';

const { Resend } = require('resend');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@milocura.com';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWithRetry(payload, attempt = 1) {
  try {
    const { error } = await resend.emails.send(payload);
    if (error) throw new Error(error.message);
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS * attempt);
      return sendWithRetry(payload, attempt + 1);
    }
    throw err;
  }
}

const EmailService = {
  /**
   * Send a vaccination due-date reminder.
   */
  async sendVaccinationReminder({ to, userName, dogName, vaccineName, nextDueDate }) {
    const dueDateStr = new Date(nextDueDate).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    await sendWithRetry({
      from: FROM,
      to,
      subject: `Reminder: ${dogName}'s ${vaccineName} vaccination is due soon`,
      html: `<p>Hi ${userName},</p>
<p>This is a reminder that <strong>${dogName}</strong>'s <strong>${vaccineName}</strong> vaccination is due on <strong>${dueDateStr}</strong>.</p>
<p>Please schedule an appointment with your veterinarian.</p>
<p>— The Milo Care Team</p>`,
    });
  },

  /**
   * Send a medication dosage reminder.
   */
  async sendMedicationReminder({ to, userName, dogName, medicationName, dosage }) {
    await sendWithRetry({
      from: FROM,
      to,
      subject: `Reminder: ${dogName}'s medication dose`,
      html: `<p>Hi ${userName},</p>
<p>Time to give <strong>${dogName}</strong> their dose of <strong>${medicationName}</strong> (${dosage}).</p>
<p>— The Milo Care Team</p>`,
    });
  },

  /**
   * Send a vet appointment reminder.
   */
  async sendAppointmentReminder({ to, userName, dogName, clinicName, appointmentDate }) {
    const dateStr = new Date(appointmentDate).toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    await sendWithRetry({
      from: FROM,
      to,
      subject: `Reminder: ${dogName}'s vet appointment tomorrow`,
      html: `<p>Hi ${userName},</p>
<p>Reminder: <strong>${dogName}</strong> has a vet appointment at <strong>${clinicName}</strong> on <strong>${dateStr}</strong>.</p>
<p>— The Milo Care Team</p>`,
    });
  },

  /**
   * Send a password reset email.
   */
  async sendPasswordReset({ to, resetUrl }) {
    await sendWithRetry({
      from: FROM,
      to,
      subject: 'Reset your Milo Care password',
      html: `<p>You requested a password reset. Click the link below to set a new password. This link expires in 1 hour.</p>
<p><a href="${resetUrl}">${resetUrl}</a></p>
<p>If you did not request this, you can safely ignore this email.</p>
<p>— The Milo Care Team</p>`,
    });
  },
};

module.exports = EmailService;
