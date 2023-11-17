// Download the helper library from https://www.twilio.com/docs/node/install
// Set environment variables for your credentials
// Read more at http://twil.io/secure
const accountSid = 'AC0538942dd5b48da11fba435d978ce1e3';
const authToken = '7f03c212de40eb899a138f1a06a4e0df';
const verifySid = 'VAa595d7ff7fd50809e9c8f3cc72a310d8';
const client = require('twilio')(accountSid, authToken);

const sendOtp = (req:any, res:any) => {
  const { phone } = req.body;
  client.verify.v2
    .services(verifySid)
    .verifications.create({ to: phone, channel: 'sms' })
    .then((verification) => {
      res.send('otp sent');
    });
};
export default sendOtp;
