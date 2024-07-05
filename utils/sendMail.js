const nodemailer = require("nodemailer");
const catchAsync = require("./catchAsync");

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

const sendEmail = catchAsync(async (To, subject, message) => {
  const mailOptions = {
    from: {
      name: "Social Server",
      address: process.env.EMAIL,
    },
    to: To,
    subject: subject,
    text: message,
    // html:
  };
  // Actually send the email
  await transporter.sendMail(mailOptions);
  console.log("Mail Sent");
  return;
});

module.exports = sendEmail;
