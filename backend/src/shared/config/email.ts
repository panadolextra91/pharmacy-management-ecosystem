import nodemailer from 'nodemailer';
import env from './env';
import logger from '../utils/logger';

// Create reusable transporter using system email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.SYSTEM_EMAIL,
    pass: env.SYSTEM_EMAIL_PASSWORD,
  },
});

// Verify connection
transporter.verify((error) => {
  if (error) {
    logger.error('Email transporter error:', error);
  } else {
    logger.info('✅ Email transporter ready');
  }
});

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using system email
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const mailOptions = {
      from: `Pharmacy Management System <${env.SYSTEM_EMAIL}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
}

export default transporter;

