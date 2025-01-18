import { supabase } from "@/lib/supabase";
import NextCors from "nextjs-cors";

const nodemailer = require('nodemailer');

// Set up Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // or any SMTP service
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-email-password',
  },
});

async function sendVerificationEmail(toEmail: string, verificationCode: number): Promise<void> {
  const mailOptions = {
    from: 'your-email@gmail.com',
    to: toEmail,
    subject: 'Email Verification Code',
    text: `Your verification code is: ${verificationCode}`,
  };

  return new Promise<void>((resolve, reject) => {
    transporter.sendMail(mailOptions, (err: any, info: any) => {
      if (err) {
        reject(new Error('Error sending email: ' + err));
      } else {
        resolve();
        console.log('Email sent:', info.response);
      }
    });
  });
}



const sendOtp = async (req: any, res: any) => {
  await NextCors(req, res, {
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    origin: "*", // Allow all origins
    optionsSuccessStatus: 200,
  })
  const { apikey, email } = typeof req.body === "string" ? JSON.parse(req.body) : req.body

  const { data: dataForApp } = await supabase
    .from("dapps")
    .select("*")
    .match({ apikey })

  const dappId = dataForApp?.find((item) => item.apikey === apikey)?.id
  if (!dappId) {
    return res.status(400).json({ error: "Invalid API key or dapp_id" })
  }

  function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000);
  }

  const otp = generateOTP()

  await supabase.from("email_otp").insert({
    email,
    otp: otp
  })

  await sendVerificationEmail(email, otp)

  res.send({ otp });
};
export default sendOtp;

