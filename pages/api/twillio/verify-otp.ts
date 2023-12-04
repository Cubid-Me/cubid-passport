const accountSid = 'AC9b65bde6e517e7a18b6c01e11a7c5493';
const authToken = '4dc7b7da80691a59c004921e13359edd';
const verifySid = 'VA3962dac32f8eac1dd4766972bda7af84';
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
