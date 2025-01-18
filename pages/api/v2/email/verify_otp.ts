import { supabase } from "@/lib/supabase";
import NextCors from "nextjs-cors";

const nodemailer = require('nodemailer');

// Set up Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'smtp-pulse.com', // or any SMTP service
    auth: {
      user: 'noak@chaincrew.xyz',
      pass: 'HKgCdfG5atGsj',
    },
  });

async function sendVerificationEmail(toEmail: string, verificationCode: number): Promise<void> {
    const mailOptions = {
        from: 'noak@chaincrew.xyz',
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



const verifyOTP = async (req: any, res: any) => {
    await NextCors(req, res, {
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        origin: "*", // Allow all origins
        optionsSuccessStatus: 200,
    })
    const { apikey, email, otp } = typeof req.body === "string" ? JSON.parse(req.body) : req.body

    const { data: dataForApp } = await supabase
        .from("dapps")
        .select("*")
        .match({ apikey })

    const dappId = dataForApp?.find((item: any) => item.apikey === apikey)?.id
    if (!dappId) {
        return res.status(400).json({ error: "Invalid API key or dapp_id" })
    }
    const { data: emailData } = await supabase.from("email_otp").select("*").match({ email })
    if (otp === emailData?.[0]?.otp) {
        await supabase.from("email_otp").delete().match({ email })
        res.send({ is_verified: true });
    } else {
        res.send({ is_verified: false });
    }
};
export default verifyOTP;

