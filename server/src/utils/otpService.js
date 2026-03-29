import nodemailer from "nodemailer";
import crypto from "crypto";

// Create transporter
console.log("Initializing SMTP Transporter...");
console.log("Host:", process.env.SMTP_HOST || "DEFAULT: smtp.gmail.com");
console.log("User:", process.env.SMTP_USER || "DEFAULT: afhamsathath2002@gmail.com");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "afhamsathath2002@gmail.com",
    pass: process.env.SMTP_PASS || "xyff tdvh fubn daia",
  },
});




// Generate secure 6-digit OTP
export function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Send OTP via email using Nodemailer.
 * @param {string} toEmail - Recipient email address.
 * @returns {Promise<Object>} - An object with {success, otp, messageId}.
 */
export async function sendOTP(toEmail, manualOtp = null) {
  try {
    const otp = manualOtp || generateOTP();


    const mailOptions = {
      from: process.env.SMTP_FROM || "afhamsathath2002@gmail.com",
      to: toEmail,
      subject: "Your Secure OTP Code",
      html: `
        <div style="font-family:sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 25px;">
            <img src="blob:https://gemini.google.com/1634291e-e5ab-4d77-b822-12229c103136" alt="Career LK Logo" style="width: 120px; height: auto; margin-bottom: 15px;">
            <h1 style="color: #333; margin: 0; font-size: 22px; font-weight: 700;">Career LK Guidance Portal</h1>
          
          </div>
          <h2 style="color: #333; text-align: center;">OTP Verification</h2>
          <p style="font-size: 16px; color: #555;">Hello,</p>
          <p style="font-size: 16px; color: #555;">Your One-Time Password for secure access is:</p>
          <div style="background: #f4f4f4; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
            <h1 style="letter-spacing: 5px; font-size: 32px; color: #007bff; margin: 0;">${otp}</h1>
          </div>
          <p style="font-size: 14px; color: #888;">This OTP is valid for 5 minutes. Do not share this code with anyone.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #aaa; text-align: center;">© ${new Date().getFullYear()} Exam Manager Pro. All rights reserved.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      otp,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("OTP send error:", error);
    return {
      success: false,
      otp: null,
    };
  }
}

/**
 * Send branded workflow notification email.
 */
export async function sendWorkflowEmail(toEmail, recipientName, subject, message) {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || "afhamsathath6@gmail.com",
      to: toEmail,
      subject: `Exam System: ${subject}`,
      html: `
        <div style="font-family:sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 25px;">
            <img src="https://upload.wikimedia.org/wikipedia/en/a/a0/Creeer Lk Job Portal_logo2.png" alt="Creeer Lk Job Portal Logo" style="width: 120px; height: auto; margin-bottom: 15px;">
            <h1 style="color: #333; margin: 0; font-size: 22px; font-weight: 700;">Exam Paper Moderation System</h1>
            <p style="color: #666; font-size: 16px; margin: 5px 0 0 0; font-weight: 500;">Creeer Lk Job Portalty of Applied Sciences</p>
          </div>
          <div style="padding: 20px; background: #fbfbfb; border-radius: 8px;">
            <p style="font-size: 16px; color: #333;">Dear ${recipientName},</p>
            <p style="font-size: 16px; color: #555; line-height: 1.6;">${message}</p>
            <div style="margin-top: 25px; text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/login" 
                 style="background: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Access Dashboard
              </a>
            </div>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
          <p style="font-size: 12px; color: #aaa; text-align: center;">This is an automated notification. Please do not reply directly to this email.</p>
          <p style="font-size: 11px; color: #bbb; text-align: center;">© ${new Date().getFullYear()} Exam Manager Pro - Creeer Lk Job Portal. All rights reserved.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Workflow Email send error:", error);
    return { success: false };
  }
}

/**
 * Generic notification email function (Compatibility layer).
 */
export async function sendNotificationEmail(toEmail, subject, message) {
  return await sendWorkflowEmail(toEmail, "User", subject, message);
}

export { transporter };
export default sendOTP;
