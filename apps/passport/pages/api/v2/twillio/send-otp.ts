// Download the helper library from https://www.twilio.com/docs/node/install
// Set environment variables for your credentials
// Read more at http://twil.io/secure
const accountSid = process.env.twilio_sid;
const authToken = process.env.authToken;
const verifySid = 'VA627c33ab3023aa319bf6351a0367d2c8';
const client = require('twilio')(accountSid, authToken);
import { supabase } from "@/lib/supabase"
import NextCors from "nextjs-cors"

const log = (message: any, lineNumber: any) => {
  console.log(`Line ${lineNumber}: ${message}`)
}

const sendOtp = async (req: any, res: any) => {
  await NextCors(req, res, {
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    origin: "*", // Allow all origins
    optionsSuccessStatus: 200,
  })
  const { apikey, phone } = typeof req.body === "string" ? JSON.parse(req.body) : req.body
  if (!apikey || !phone) {
    log("Missing required parameters", 37)
    return res.status(400).json({ error: "Missing required parameters" })
  }

  const { data: dataForApp } = await supabase
    .from("dapps")
    .select("*")
    .match({ apikey })
  const dappId = dataForApp?.find((item) => item.apikey === apikey)?.id
  if (!dappId) {
    log("Invalid API key or dapp_id", 50)
    return res.status(400).json({ error: "Invalid API key or dapp_id" })
  }

  client.verify.v2
    .services(verifySid)
    .verifications.create({ to: phone, channel: 'sms' })
    .then(() => {
      res.send('otp sent');
    });
};
export default sendOtp;
