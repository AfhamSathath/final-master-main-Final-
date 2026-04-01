import nodemailer from "nodemailer";
import crypto from "crypto";

// Create transporter
console.log("Initializing SMTP Transporter...");
console.log("Host:", process.env.SMTP_HOST || "DEFAULT: smtp.gmail.com");
console.log("User:", process.env.SMTP_USER || "DEFAULT: dddummy296@gmail.com");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "dddummy296@gmail.com",
    pass: process.env.SMTP_PASS || "ttfc gjxe utgb fywc",
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
      from: process.env.SMTP_FROM || "dddummy296@gmail.com",
      to: toEmail,
      subject: "🔒 Your Secure OTP Code - Qualification Job Finder",
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 0; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); padding: 30px 20px; text-align: center; color: white;">
            <div style="background: white; color: #007bff; width: 60px; height: 60px; border-radius: 50%; line-height: 60px; font-size: 28px; margin: 0 auto 15px; font-weight: 800; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">QJC</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">Qualification Based Job Finder</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; font-weight: 400;">Career Guidance & Development - Sri Lanka</p>
          </div>
          <div style="padding: 40px 30px; background: white;">
            <h2 style="color: #333; text-align: center; margin-top: 0; font-size: 22px;">OTP Verification</h2>
            <p style="font-size: 16px; color: #555; line-height: 1.5;">Hello,</p>
            <p style="font-size: 16px; color: #555; line-height: 1.5;">Your One-Time Password for secure access to your account is:</p>
            <div style="background: #f8f9fa; padding: 25px; text-align: center; border-radius: 12px; margin: 30px 0; border: 2px dashed #007bff;">
              <h1 style="letter-spacing: 8px; font-size: 42px; color: #007bff; margin: 0; font-family: monospace; font-weight: 700;">${otp}</h1>
            </div>
            <p style="font-size: 14px; color: #666; background: #fff3cd; padding: 10px; border-radius: 6px; border-left: 4px solid #ffc107;">
              <strong>Note:</strong> This OTP is valid for 5 minutes. For security reasons, do not share this code with anyone.
            </p>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #888; margin: 0;">© ${new Date().getFullYear()} Qualification Job Finder. All rights reserved.</p>
            <p style="font-size: 11px; color: #aaa; margin: 5px 0 0 0;">Colombo, Sri Lanka | info@qualificationjobfinder.lk</p>
          </div>
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
      from: process.env.SMTP_FROM || "dddummy296@gmail.com",
      to: toEmail,
      subject: `🔔 QJC Alert: ${subject}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 0; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
          <div style="background: #007bff; padding: 25px 20px; text-align: center; color: white;">
            <div style="background: white; color: #007bff; width: 50px; height: 50px; border-radius: 50%; line-height: 50px; font-size: 24px; margin: 0 auto 10px; font-weight: 800;">QJC</div>
            <h2 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">Qualification Job Finder</h2>
          </div>
          <div style="padding: 30px; background: white;">
            <p style="font-size: 16px; color: #333; margin-top: 0;">Dear <strong>${recipientName}</strong>,</p>
            <div style="font-size: 16px; color: #444; line-height: 1.6; border-left: 4px solid #007bff; padding-left: 15px; margin: 20px 0;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/login" 
                 style="background: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(0,123,255,0.2);">
                View Details in Dashboard
              </a>
            </div>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #999; margin: 0;">This is an automated notification. Please do not reply directly.</p>
            <p style="font-size: 11px; color: #bbb; margin: 10px 0 0 0;">© ${new Date().getFullYear()} Qualification Job Finder. Colombo, Sri Lanka.</p>
          </div>
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
 * Send interactive Alert/News email to users.
 */
export async function sendAlertEmail(toEmail, recipientName, title, newsContent, actionLink = null) {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || "dddummy296@gmail.com",
      to: toEmail,
      subject: `🚨 Important Alert: ${title}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 0; border: 1px solid #ffeded; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(255,0,0,0.05);">
          <div style="background: #dc3545; padding: 25px 20px; text-align: center; color: white;">
            <div style="font-size: 40px; margin-bottom: 10px;">📢</div>
            <h2 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">System Alert & News</h2>
          </div>
          <div style="padding: 35px 30px; background: white;">
            <p style="font-size: 16px; color: #333; margin-top: 0;">Dear ${recipientName},</p>
            <h3 style="color: #dc3545; font-size: 18px; border-bottom: 1px solid #f8d7da; padding-bottom: 10px;">${title}</h3>
            <div style="font-size: 16px; color: #555; line-height: 1.7; margin: 20px 0;">
              ${newsContent.replace(/\n/g, '<br>')}
            </div>
            ${actionLink ? `
            <div style="margin-top: 35px; text-align: center;">
              <a href="${actionLink}" 
                 style="background: #dc3545; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; text-transform: uppercase; font-size: 14px; letter-spacing: 1px;">
                Take Action Now
              </a>
            </div>` : ''}
          </div>
          <div style="background: #fff5f5; padding: 20px; text-align: center; border-top: 1px solid #f8d7da;">
            <p style="font-size: 12px; color: #721c24; margin: 0;">This is an important broadcast from Qualification Job Finder System.</p>
            <p style="font-size: 11px; color: #721c24; margin: 8px 0 0 0; opacity: 0.7;">© ${new Date().getFullYear()} QJC Administration. Sri Lanka.</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Alert Email send error:", error);
    return { success: false };
  }
}

/**
 * Generic notification email function (Compatibility layer).
 */
export async function sendNotificationEmail(toEmail, subject, message) {
  return await sendWorkflowEmail(toEmail, "User", subject, message);
}

/**
 * Bulk notification handler
 */
export async function sendBulkNotification(users, subject, message, type = 'workflow') {
  const results = await Promise.all(users.map(user => {
    if (type === 'alert') {
      return sendAlertEmail(user.email, user.name, subject, message);
    }
    return sendWorkflowEmail(user.email, user.name, subject, message);
  }));
  return results;
}

/**
 * Send a magic login link (Magic Link) to a user for one-click login.
 */
export async function sendMagicLink(toEmail, recipientName, magicLink) {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || "dddummy296@gmail.com",
      to: toEmail,
      subject: `✨ One-Click Login - QJC`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 0; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          <div style="background: #007bff; padding: 30px 20px; text-align: center; color: white;">
             <div style="background: white; color: #007bff; width: 60px; height: 60px; border-radius: 50%; line-height: 60px; font-size: 28px; margin: 0 auto 15px; font-weight: 800; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">Creeer Lk</div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">Security Verification</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Secure Access to your Dashboard</p>
          </div>
          <div style="padding: 40px 30px; background: white; text-align: center;">
            <p style="font-size: 18px; color: #333; margin-top: 0;">Hello <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 20px 0;">
              We received a request to log in to your account. For your security, please verify your identity by clicking the "It's Me" button below.
            </p>
            <div style="margin: 35px 0;">
              <a href="${magicLink}" 
                 style="background: #28a745; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 18px; box-shadow: 0 4px 10px rgba(40,167,69,0.3); transition: all 0.3s ease;">
                ✅ It's Me - Log In Now
              </a>
            </div>
            <p style="font-size: 14px; color: #888; background: #f8f9fa; padding: 12px; border-radius: 6px; display: inline-block;">
              <strong>Note:</strong> This link is valid for 15 minutes and can only be used once.
            </p>
            <p style="font-size: 13px; color: #bbbbbb; margin-top: 25px;">
              If you did not request this login, please ignore this email or contact support.
            </p>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #999; margin: 0;">© ${new Date().getFullYear()} Qualification Job Finder. Sri Lanka.</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Magic Link send error:", error);
    return { success: false };
  }
}

/**
 * Send specialized Job alert (Create, Update, Delete).
 */
export async function sendJobAlert(toEmail, recipientName, action, jobTitle, companyName, openDate, closeDate) {
  const themes = {
    Created: { color: "#28a745", icon: "🚀", title: "New Job Opportunity" },
    Updated: { color: "#007bff", icon: "📝", title: "Job Update Alert" },
    Deleted: { color: "#dc3545", icon: "🗑️", title: "Job Removed" }
  };
  const theme = themes[action] || themes.Updated;

  const formatDate = (date) => date ? new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Not Specified";

  let message = "";
  if (action === "Deleted") {
    message = `The job vacancy **"${jobTitle}"** at **${companyName}** has been removed from the platform and is no longer available.`;
  } else if (action === "Updated") {
    message = `A job vacancy matching your profile, **"${jobTitle}"** at **${companyName}**, has been updated.<br><br>`;
    message += `**Opening Date:** ${formatDate(openDate)}<br>`;
    message += `**Closing Date:** ${formatDate(closeDate)}<br><br>`;
    message += `Log in to the platform for the latest details and application instructions.`;
  } else {
    // action === "Created"
    message = `A new job opportunity, **"${jobTitle}"** at **${companyName}**, has been posted to the platform.<br><br>`;
    message += `**Opening Date:** ${formatDate(openDate)}<br>`;
    message += `**Closing Date:** ${formatDate(closeDate)}<br><br>`;
    message += `Log in to the platform for details and application instructions before the deadline.`;
  }

  return await sendWorkflowEmail(toEmail, recipientName, theme.title, message);
}

/**
 * Send specialized Course alert (Create, Update, Delete).
 */
export async function sendCourseAlert(toEmail, recipientName, action, courseName, institutionName, closeDate) {
  const themes = {
    Created: { color: "#28a745", icon: "🎓", title: "New Course Available" },
    Updated: { color: "#007bff", icon: "📚", title: "Course Update Alert" },
    Deleted: { color: "#dc3545", icon: "❌", title: "Course Removed" }
  };
  const theme = themes[action] || themes.Updated;

  const formatDate = (date) => date ? new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Not Specified";

  let message = "";
  if (action === "Deleted") {
    message = `The course **"${courseName}"** at **${institutionName}** is no longer available.`;
  } else if (action === "Updated") {
    message = `A course matching your profile, **"${courseName}"** at **${institutionName}**, has been updated.<br><br>`;
    message += `**Enrollment Deadline:** ${formatDate(closeDate)}<br><br>`;
    message += `Review the updated curriculum and log in to enroll.`;
  } else {
    // action === "Created"
    message = `A new course, **"${courseName}"** at **${institutionName}**, has been added to the platform.<br><br>`;
    message += `**Enrollment Deadline:** ${formatDate(closeDate)}<br><br>`;
    message += `Review the curriculum and log in to enroll before spots fill up.`;
  }

  return await sendWorkflowEmail(toEmail, recipientName, theme.title, message);
}

/**
 * Send company-specific action alert (Job/Course Created/Updated/Deleted).
 */
export async function sendCompanyActionAlert(toEmail, companyName, entityType, action, entityName, openDate = null, closeDate = null) {
  const themes = {
    Created: "been successfully created",
    Updated: "been successfully updated",
    Deleted: "been removed"
  };
  const verbPhrase = themes[action] || "been processed";

  const formatDate = (date) => date ? new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Not Specified";

  let message = `Your ${entityType.toLowerCase()} listing for **${entityName}** has ${verbPhrase} in the Qualification Based Job Finder System.<br><br>`;
  
  if (action !== "Deleted") {
      if (openDate) { message += `**Opening Date:** ${formatDate(openDate)}<br>`; }
      if (closeDate) { message += `**Closing Date:** ${formatDate(closeDate)}<br><br>`; }
  } else {
      message += `<br>`;
  }
  
  message += `You can access your dashboard to review changes.`;

  return await sendWorkflowEmail(toEmail, companyName, `${entityType} ${action} - Qualification Job Finder`, message);
}

/**
 * Send specialized Account Creation alert based on role.
 */
export async function sendAccountCreatedAlert(toEmail, recipientName, role) {
  let roleDisplayName = role;
  let nextSteps = "You can now access the dashboard to explore the platform.";

  if (role === "company" || role === "employer") {
    roleDisplayName = "Employer/Recruiter";
    nextSteps = "You can now log in to post job openings and manage candidates.";
  } else if (role === "admin") {
    roleDisplayName = "System Administrator";
    nextSteps = "You can now log in to manage users and platform settings.";
  } else {
    roleDisplayName = "Job Seeker / Student";
    nextSteps = "You can now log in to manage your qualifications, explore job opportunities, and find the best education paths.";
  }

  const message = `Your account for **${recipientName}** has been successfully created in the Qualification Based Job Finder System. You have been assigned the role of **${roleDisplayName}**.\n\n${nextSteps}`;

  return await sendWorkflowEmail(toEmail, recipientName, "Account Created - Qualification Job Finder", message);
}

/**
 * Send specialized Login alert.
 */
export async function sendLoginAlert(toEmail, recipientName) {
  const message = `A successful login to your account was just detected.\n\nIf this was you, no further action is needed. If you don't recognize this activity, please secure your account immediately.`;
  return await sendWorkflowEmail(toEmail, recipientName, "New Login Detected", message);
}

/**
 * Send high-priority Deadline Alert News (Scenario Based).
 */
export async function sendDeadlineAlertEmail(toEmail, recipientName, summary) {
  try {
    const mailOptions = {
        from: process.env.SMTP_FROM || "dddummy296@gmail.com",
        to: toEmail,
        subject: `🚨 Action Required: Deadlines Approaching!`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #dc3545; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(220, 53, 69, 0.1);">
            <div style="background: #dc3545; padding: 25px 20px; text-align: center; color: white;">
              <div style="font-size: 40px; margin-bottom: 5px;">⚠️</div>
              <h2 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">URGENT DEADLINE NEWS</h2>
            </div>
            <div style="padding: 30px; background: white;">
              <p style="font-size: 16px; color: #333; margin-top: 0;">Hello <strong>${recipientName}</strong>,</p>
              <p style="font-size: 15px; color: #555; line-height: 1.6;">
                This is a critical update regarding your active career opportunities. Several items matching your qualifications are <strong>expiring within the next 5 days (120 hours)</strong>.
              </p>
              <div style="background: #fff5f5; border-left: 4px solid #dc3545; padding: 20px; margin: 25px 0;">
                <div style="font-size: 14px; color: #444; line-height: 1.7;">
                  ${summary.replace(/\n/g, '<br>')}
                </div>
              </div>
              <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
                Our real-world data indicates that completing your application now significantly improves your chances of being considered by the reviewing committee.
              </p>
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/login" 
                   style="background: #dc3545; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 700; display: inline-block;">
                  TAKE ACTION NOW
                </a>
              </div>
            </div>
            <div style="background: #f8f9fa; padding: 15px; text-align: center; border-top: 1px solid #eee;">
              <p style="font-size: 11px; color: #999; margin: 0;">Automated System Broadcast - QJC Sri Lanka</p>
            </div>
          </div>
        `
    };
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Deadline Alert Email Error:", error);
    return { success: false };
  }
}

/**
 * Send specialized "Closing Soon" Scenario Alert News.
 * Uses a real-world high-urgency scenario template for QJC.
 */
export async function sendClosingSoonScenarioAlert(toEmail, recipientName, entityType, entityName, providerName, closeDate, isUpdate = false) {
  try {
    const cDate = closeDate ? new Date(closeDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Not Specified";
    
    const mailOptions = {
      from: process.env.SMTP_FROM || "dddummy296@gmail.com",
      to: toEmail,
      subject: `🕒 URGENT: ${isUpdate ? 'Details Updated & ' : ''}${entityType} Closing Soon - ${entityName}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ff4d4d; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #ff4d4d 0%, #b30000 100%); padding: 30px 20px; text-align: center; color: white;">
            <div style="font-size: 45px; margin-bottom: 10px;">⏳</div>
            <h2 style="margin: 0; font-size: 22px; font-weight: 700; text-transform: uppercase;">Closing Soon Alert</h2>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Qualification Based Career News</p>
          </div>
          <div style="padding: 35px 30px; background: white;">
            <p style="font-size: 16px; color: #333; margin-top: 0;">Dear <strong>${recipientName}</strong>,</p>
            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              ${isUpdate 
                ? `Some details for an opportunity matching your profile have been <strong>updated</strong>, and the <strong>critical deadline</strong> is approaching. Review the changes now and secure your spot!` 
                : `Our real-world matching system has identified a <strong>critical deadline</strong> for an opportunity matching your profile. Don't let this chance slip away!`}
            </p>
            <div style="background: #fff8f8; border-left: 4px solid #ff4d4d; padding: 20px; margin: 25px 0; border-radius: 4px;">
              <h3 style="margin: 0; color: #b30000; font-size: 18px;">${entityName}</h3>
              <p style="margin: 5px 0; color: #666; font-size: 14px;">Provider: <strong>${providerName}</strong></p>
              <p style="margin: 15px 0 0 0; font-size: 16px; color: #333;"><strong>Closing Date:</strong> <span style="color: #ff4d4d; font-weight: 700;">${cDate}</span></p>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
              <p style="margin: 0; font-size: 13px; color: #777; font-style: italic;">
                <strong>Scenario Update:</strong> High volume of applications detected. Early submission ensures better visibility to recruiters.
              </p>
            </div>
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/login" 
                 style="background: #b30000; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px; box-shadow: 0 4px 8px rgba(179,0,0,0.2);">
                SECURE YOUR SPOT NOW
              </a>
            </div>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="font-size: 11px; color: #bbb; margin: 0;">© ${new Date().getFullYear()} Qualification Job Finder System. Colombo, Sri Lanka.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Scenario News Alert Error:", error);
    return { success: false };
  }
}

export { transporter };
export default sendOTP;
