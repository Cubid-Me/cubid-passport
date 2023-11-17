const accountSid = 'AC0538942dd5b48da11fba435d978ce1e3';
const authToken = '7f03c212de40eb899a138f1a06a4e0df';
const verifySid = 'VAa595d7ff7fd50809e9c8f3cc72a310d8';
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
