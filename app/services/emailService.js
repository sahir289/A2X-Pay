import { createTransport } from 'nodemailer';

// Create a transporter object using SMTP transport
const transporter = createTransport({
  service: 'gmail', // Use your email service (Gmail, SendGrid, etc.)
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password or app-specific password
  },
});

// Function to send OTP email
const sendOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for password reset',
    text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully');
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error; // Rethrow the error for further handling
  }
};

export default {
  sendOtpEmail,
};
