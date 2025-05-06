require('dotenv').config();
const nodemailer = require('nodemailer');

// Debug logs
console.log("EMAIL:", process.env.EMAIL);
console.log("PASSWORD:", process.env.PASSWORD ? "Loaded ✅" : "Missing ❌");

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD
  }
});

// Send a test email
const mailOptions = {
  from: process.env.EMAIL,
  to: process.env.EMAIL, // Send to yourself
  subject: 'Nodemailer Test ✔️',
  text: 'If you got this, Nodemailer is working!'
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.log("❌ Error sending email:", error);
  }
  console.log("✅ Email sent successfully:", info.response);
});