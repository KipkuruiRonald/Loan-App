import emailjs from '@emailjs/browser';

// Initialize EmailJS with public key
const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || 'your_public_key';
emailjs.init(publicKey);

// Service ID
const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'your_service_id';

export const emailService = {
  // Send welcome email
  sendWelcomeEmail: async (toEmail: string, name: string) => {
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_WELCOME || 'template_welcome';
    
    const templateParams = {
      to_email: toEmail,
      name: name,
      dashboard_url: 'https://okolea.com/dashboard'
    };
    
    try {
      const response = await emailjs.send(serviceId, templateId, templateParams);
      console.log('Welcome email sent:', response);
      return response;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw error;
    }
  },

  // Send KYC verification email
  sendKycEmail: async (toEmail: string, name: string, status: string, reason?: string) => {
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_KYC || 'template_kyc';
    
    const templateParams = {
      to_email: toEmail,
      full_name: name,
      kyc_status: status,
      rejection_reason: reason || '',
      dashboard_url: 'https://okolea.com/settings'
    };
    
    try {
      const response = await emailjs.send(serviceId, templateId, templateParams);
      console.log('KYC email sent:', response);
      return response;
    } catch (error) {
      console.error('Failed to send KYC email:', error);
      throw error;
    }
  },

  // Send loan approval email
  sendLoanApprovedEmail: async (toEmail: string, name: string, loanId: string, amount: number) => {
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_LOAN_APPROVED || 'template_loan_approved';
    
    const templateParams = {
      to_email: toEmail,
      full_name: name,
      loan_id: loanId,
      loan_amount: amount.toLocaleString(),
      dashboard_url: 'https://okolea.com/myloans'
    };
    
    try {
      const response = await emailjs.send(serviceId, templateId, templateParams);
      console.log('Loan approval email sent:', response);
      return response;
    } catch (error) {
      console.error('Failed to send loan approval email:', error);
      throw error;
    }
  },

  // Send password reset email
  sendPasswordResetEmail: async (toEmail: string, name: string, resetToken: string) => {
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_PASSWORD_RESET || 'template_password_reset';
    
    const resetUrl = `https://okolea.com/reset-password?token=${resetToken}`;
    
    const templateParams = {
      to_email: toEmail,
      full_name: name,
      reset_url: resetUrl,
      expiry_time: '1 hour'
    };
    
    try {
      const response = await emailjs.send(serviceId, templateId, templateParams);
      console.log('Password reset email sent:', response);
      return response;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw error;
    }
  },

  // Send contact form notification (admin)
  sendContactNotification: async (name: string, email: string, message: string) => {
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_CONTACT || 'template_contact';
    
    const templateParams = {
      name: name,
      email: email,
      message: message,
      time: new Date().toLocaleString()
    };
    
    try {
      const response = await emailjs.send(serviceId, templateId, templateParams);
      console.log('Contact notification sent:', response);
      return response;
    } catch (error) {
      console.error('Failed to send contact notification:', error);
      throw error;
    }
  }
};
