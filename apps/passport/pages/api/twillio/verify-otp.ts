const accountSid = process.env.twilio_sid;
const authToken = process.env.authToken;
const verifySid = 'VA627c33ab3023aa319bf6351a0367d2c8';
const client = require('twilio')(accountSid, authToken);

const verifyOtp = (req:any, res:any) => {
  const { otpCode, phone } = req.body;
  client.verify.v2
    .services(verifySid)
    .verificationChecks.create({ to: phone, code: otpCode })
    .then((verification_check:any) => {
      res.send(verification_check);
    });
};
export default verifyOtp;
