// Download the helper library from https://www.twilio.com/docs/node/install
// Set environment variables for your credentials
// Read more at http://twil.io/secure
const accountSid = 'AC697a3b060885140a1a1dadf44860fe2b';
const authToken = '2b91916d152b08812d8b29351ae37b52';
const verifySid = 'VA24f2c59eb7ca71fcf2529cd8e0686eee';
const client = require('twilio')(accountSid, authToken);

const sendOtp = (req:any, res:any) => {
  const { phone } = req.body;
  client.verify.v2
    .services(verifySid)
    .verifications.create({ to: phone, channel: 'sms' })
    .then(() => {
      res.send('otp sent');
    });
};
export default sendOtp;
