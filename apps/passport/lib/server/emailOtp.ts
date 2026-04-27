import { getOptionalNumericEnv, getRequiredEnv } from "@cubid/config"

const nodemailer = require("nodemailer")

const getTransporter = () => {
  const host = getRequiredEnv("SMTP_HOST")
  const port = getOptionalNumericEnv("SMTP_PORT") ?? 587
  const user = getRequiredEnv("SMTP_USERNAME")
  const pass = getRequiredEnv("SMTP_PASSWORD")

  return nodemailer.createTransport({
    auth: {
      pass,
      user,
    },
    host,
    port,
    secure: port === 465,
  })
}

export const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000)
}

export const sendOtpEmail = async (toEmail: string, verificationCode: number) => {
  const transporter = getTransporter()

  await transporter.sendMail({
    from: getRequiredEnv("SMTP_FROM_EMAIL"),
    subject: "Email Verification Code",
    text: `Your verification code is: ${verificationCode}`,
    to: toEmail,
  })
}
