import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables based on NODE_ENV
const env = process.env.NODE_ENV || 'development';
if (env === 'production') {
  dotenv.config({ path: '.env.production' });
} else if (env === 'stage') {
  dotenv.config({ path: '.env.stage' });
} else {
  dotenv.config();
}

// Configure email transporter
const createTransporter = async () => {
  try {
    // Check if email credentials are available
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_APP_PASSWORD;
    
    if (!emailUser || !emailPassword) {
      if (env === 'production') {
        console.error('Email credentials missing in production environment');
        throw new Error('Email service configuration failed');
      } else {
        console.warn('Email credentials missing. Using mock transporter for development.');
        return {
          verify: () => Promise.resolve(true),
          sendMail: (options) => {
            console.log('MOCK TRIAL EMAIL SENT:', {
              to: options.to,
              subject: options.subject,
              type: 'trial_notification'
            });
            return Promise.resolve({ messageId: 'mock-message-id' });
          }
        } as any;
      }
    }
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPassword
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify transporter
    await transporter.verify();
    console.log('Trial email transporter is ready to send emails');
    return transporter;
  } catch (error) {
    console.error('Failed to create trial email transporter:', error);
    if (env === 'production') {
      throw new Error('Email service configuration failed');
    } else {
      console.warn('Using mock transporter in development...');
      return {
        verify: () => Promise.resolve(true),
        sendMail: (options) => {
          console.log('MOCK TRIAL EMAIL SENT:', {
            to: options.to,
            subject: options.subject,
            type: 'trial_notification'
          });
          return Promise.resolve({ messageId: 'mock-message-id' });
        }
      } as any;
    }
  }
};

let transporter: nodemailer.Transporter | null = null;

// Initialize transporter
(async () => {
  try {
    transporter = await createTransporter();
  } catch (error) {
    console.error('Failed to initialize trial email transporter:', error);
  }
})();

// Send trial expiry warning email
export const sendTrialExpiryWarning = async (email: string, userName: string, daysRemaining: number): Promise<boolean> => {
  console.log(`Sending trial expiry warning to ${email} - ${daysRemaining} days remaining`);
  
  if (!transporter) {
    console.log('Attempting to recreate transporter...');
    try {
      transporter = await createTransporter();
      console.log('Transporter recreated successfully');
    } catch (error) {
      console.error('Failed to recreate transporter:', error);
      if (env === 'production') {
        throw new Error('Email service is not available');
      } else {
        console.warn('Using mock email in development');
        console.log(`MOCK TRIAL WARNING for ${email}: ${daysRemaining} days remaining`);
        return true;
      }
    }
  }

  const mailOptions = {
    from: `"PatentsBrowser" <noreply@patentsbrowser.com>`,
    to: email,
    subject: `Your PatentsBrowser trial expires in ${daysRemaining} days`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 5px; background-color: #f9f9f9;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-block; padding: 15px; background-color: #1a365d; border-radius: 8px; color: #fff;">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px; color: #fff;">PATENTS</div>
            <div style="font-size: 24px; font-weight: bold; color: #fff;">BROWSER</div>
          </div>
        </div>
        
        <h2 style="color: #1a365d; text-align: center;">Trial Expiry Reminder</h2>
        
        <p>Hello ${userName},</p>
        
        <p>This is a friendly reminder that your PatentsBrowser trial will expire in <strong>${daysRemaining} days</strong>.</p>
        
        <p>To continue enjoying uninterrupted access to our patent search and analysis tools, please consider upgrading to one of our subscription plans.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://patentsbrowser.com'}/pricing" 
             style="background-color: #1a365d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Pricing Plans
          </a>
        </div>
        
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        
        <p>Thank you for using PatentsBrowser!</p>
        
        <div style="font-size: 12px; color: #666; margin-top: 20px; text-align: center;">
          <p><strong>DISCLAIMER:</strong> This email is from PatentsBrowser's automated system. The information contained in this email is confidential and may be legally privileged. It is intended solely for the addressee.</p>
          <p>&copy; ${new Date().getFullYear()} PatentsBrowser. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    console.log('Sending trial warning email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Trial warning email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send trial warning email:', error);
    // Try to recreate transporter on failure
    transporter = null;
    if (env === 'production') {
      throw new Error('Failed to send trial warning email. Please try again.');
    } else {
      console.warn('Using mock email in development after send failure');
      console.log(`MOCK TRIAL WARNING for ${email}: ${daysRemaining} days remaining`);
      return true;
    }
  }
};

// Send trial expired email
export const sendTrialExpiredEmail = async (email: string, userName: string): Promise<boolean> => {
  console.log(`Sending trial expired email to ${email}`);
  
  if (!transporter) {
    console.log('Attempting to recreate transporter...');
    try {
      transporter = await createTransporter();
      console.log('Transporter recreated successfully');
    } catch (error) {
      console.error('Failed to recreate transporter:', error);
      if (env === 'production') {
        throw new Error('Email service is not available');
      } else {
        console.warn('Using mock email in development');
        console.log(`MOCK TRIAL EXPIRED for ${email}`);
        return true;
      }
    }
  }

  const mailOptions = {
    from: `"PatentsBrowser" <noreply@patentsbrowser.com>`,
    to: email,
    subject: 'Your PatentsBrowser trial has expired',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 5px; background-color: #f9f9f9;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-block; padding: 15px; background-color: #1a365d; border-radius: 8px; color: #fff;">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px; color: #fff;">PATENTS</div>
            <div style="font-size: 24px; font-weight: bold; color: #fff;">BROWSER</div>
          </div>
        </div>
        
        <h2 style="color: #1a365d; text-align: center;">Trial Expired</h2>
        
        <p>Hello ${userName},</p>
        
        <p>Your PatentsBrowser trial has expired. Thank you for trying our patent search and analysis platform!</p>
        
        <p>To continue accessing our comprehensive patent database and advanced search features, please upgrade to one of our subscription plans.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://patentsbrowser.com'}/pricing" 
             style="background-color: #1a365d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Upgrade Now
          </a>
        </div>
        
        <p>Your account remains active, and you can upgrade at any time to restore full access to all features.</p>
        
        <p>If you have any questions or need assistance, please contact our support team.</p>
        
        <p>Thank you for your interest in PatentsBrowser!</p>
        
        <div style="font-size: 12px; color: #666; margin-top: 20px; text-align: center;">
          <p><strong>DISCLAIMER:</strong> This email is from PatentsBrowser's automated system. The information contained in this email is confidential and may be legally privileged. It is intended solely for the addressee.</p>
          <p>&copy; ${new Date().getFullYear()} PatentsBrowser. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    console.log('Sending trial expired email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Trial expired email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send trial expired email:', error);
    // Try to recreate transporter on failure
    transporter = null;
    if (env === 'production') {
      throw new Error('Failed to send trial expired email. Please try again.');
    } else {
      console.warn('Using mock email in development after send failure');
      console.log(`MOCK TRIAL EXPIRED for ${email}`);
      return true;
    }
  }
};

// Send trial final reminder email
export const sendTrialFinalReminder = async (email: string, userName: string): Promise<boolean> => {
  console.log(`Sending trial final reminder to ${email}`);
  
  if (!transporter) {
    console.log('Attempting to recreate transporter...');
    try {
      transporter = await createTransporter();
      console.log('Transporter recreated successfully');
    } catch (error) {
      console.error('Failed to recreate transporter:', error);
      if (env === 'production') {
        throw new Error('Email service is not available');
      } else {
        console.warn('Using mock email in development');
        console.log(`MOCK TRIAL FINAL REMINDER for ${email}`);
        return true;
      }
    }
  }

  const mailOptions = {
    from: `"PatentsBrowser" <noreply@patentsbrowser.com>`,
    to: email,
    subject: 'Final reminder: Your PatentsBrowser trial expires tomorrow',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 5px; background-color: #f9f9f9;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-block; padding: 15px; background-color: #1a365d; border-radius: 8px; color: #fff;">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px; color: #fff;">PATENTS</div>
            <div style="font-size: 24px; font-weight: bold; color: #fff;">BROWSER</div>
          </div>
        </div>
        
        <h2 style="color: #d69e2e; text-align: center;">⚠️ Final Reminder: Trial Expires Tomorrow</h2>
        
        <p>Hello ${userName},</p>
        
        <p><strong>This is your final reminder</strong> that your PatentsBrowser trial will expire <strong>tomorrow</strong>.</p>
        
        <p>Don't lose access to our powerful patent search and analysis tools! Upgrade now to continue your research without interruption.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://patentsbrowser.com'}/pricing" 
             style="background-color: #d69e2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Upgrade Before It's Too Late
          </a>
        </div>
        
        <p>Benefits of upgrading:</p>
        <ul>
          <li>Unlimited patent searches</li>
          <li>Advanced filtering and analysis tools</li>
          <li>Export capabilities</li>
          <li>Priority customer support</li>
        </ul>
        
        <p>If you have any questions or need assistance with upgrading, please contact our support team immediately.</p>
        
        <p>Thank you for using PatentsBrowser!</p>
        
        <div style="font-size: 12px; color: #666; margin-top: 20px; text-align: center;">
          <p><strong>DISCLAIMER:</strong> This email is from PatentsBrowser's automated system. The information contained in this email is confidential and may be legally privileged. It is intended solely for the addressee.</p>
          <p>&copy; ${new Date().getFullYear()} PatentsBrowser. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    console.log('Sending trial final reminder email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Trial final reminder email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send trial final reminder email:', error);
    // Try to recreate transporter on failure
    transporter = null;
    if (env === 'production') {
      throw new Error('Failed to send trial final reminder email. Please try again.');
    } else {
      console.warn('Using mock email in development after send failure');
      console.log(`MOCK TRIAL FINAL REMINDER for ${email}`);
      return true;
    }
  }
};
