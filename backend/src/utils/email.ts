import nodemailer from 'nodemailer';

// Create transporter (configure in .env)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
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
  const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173';
  const invitationUrl = `${frontendUrl}/register?token=${invitationToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@creatoradvisor.it',
    to: email,
    subject: 'Benvenuto in Creator Advisor – Imposta la password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Attivazione Account</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4CAF50;">Ciao${name ? ` ${name}` : ''}!</h2>
            <p>Benvenuto/a in Creator Advisor.</p>
            <p>Per iniziare a lavorare sulla piattaforma è necessario completare l'attivazione dell'account.</p>
            
            <div style="margin: 30px 0;">
              <h3 style="color: #333; margin-bottom: 10px;">1. Imposta la tua password</h3>
              <p>Utilizza questo link per creare la password di accesso:</p>
              <div style="text-align: center; margin: 20px 0;">
                <a href="${invitationUrl}" 
                   style="background-color: #4CAF50; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                  Imposta Password
                </a>
              </div>
              <p style="font-size: 12px; color: #666; margin-top: 10px;">
                Il link è personale e valido solo per il primo accesso.
              </p>
            </div>

            <div style="margin: 30px 0;">
              <h3 style="color: #333; margin-bottom: 10px;">2. Salva il link di accesso alla piattaforma</h3>
              <p>Aggiungi questo URL ai preferiti del browser:</p>
              <p style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all; color: #333; font-weight: bold;">
                https://app.creatoradvisor.it
              </p>
              <p style="font-size: 12px; color: #666; margin-top: 10px;">
                È l'unico accesso ufficiale al pannello di lavoro.
              </p>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              Dopo aver impostato la password, puoi accedere immediatamente alla piattaforma.
            </p>
            
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
              Se non hai richiesto questo invito, ignora questa email.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Ciao${name ? ` ${name}` : ''}!
Benvenuto/a in Creator Advisor.
Per iniziare a lavorare sulla piattaforma è necessario completare l'attivazione dell'account.

1. Imposta la tua password
Utilizza questo link per creare la password di accesso:
${invitationUrl}
Il link è personale e valido solo per il primo accesso.

2. Salva il link di accesso alla piattaforma
Aggiungi questo URL ai preferiti del browser:
https://app.creatoradvisor.it
È l'unico accesso ufficiale al pannello di lavoro.

Dopo aver impostato la password, puoi accedere immediatamente alla piattaforma.

Se non hai richiesto questo invito, ignora questa email.
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

