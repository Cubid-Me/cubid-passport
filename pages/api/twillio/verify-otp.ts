const accountSid = 'AC697a3b060885140a1a1dadf44860fe2b';
const authToken = '2b91916d152b08812d8b29351ae37b52';
const verifySid = 'VA24f2c59eb7ca71fcf2529cd8e0686eee';
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
