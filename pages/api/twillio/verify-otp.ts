const accountSid = 'AC9b65bde6e517e7a18b6c01e11a7c5493';
const authToken = '87d4a51cd3e208ab1f68e2988d628045';
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
