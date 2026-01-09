import nodemailer from 'nodemailer';

// Create transporter (configure in .env)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send invitation email to new user
 */
export async function sendInvitationEmail(
  email: string,
  name: string,
  invitationToken: string
): Promise<void> {
  const invitationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/register?token=${invitationToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@creatoradvisor.it',
    to: email,
    subject: 'Invitation to Chatter Sales Management System',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Account Invitation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4CAF50;">Welcome to Chatter Sales Management!</h2>
            <p>Hi ${name},</p>
            <p>You have been invited to join the Chatter Sales Management System.</p>
            <p>Please click the button below to activate your account and set your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationUrl}" 
                 style="background-color: #4CAF50; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Activate Account
              </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${invitationUrl}</p>
            <p style="margin-top: 30px; font-size: 12px; color: #999;">
              This invitation link will expire in 7 days.
            </p>
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
              If you didn't expect this invitation, please ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Welcome to Chatter Sales Management!
      
      Hi ${name},
      
      You have been invited to join the Chatter Sales Management System.
      
      Please visit the following link to activate your account and set your password:
      ${invitationUrl}
      
      This invitation link will expire in 7 days.
      
      If you didn't expect this invitation, please ignore this email.
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send invitation email');
  }
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
}

