// Download the helper library from https://www.twilio.com/docs/node/install
// Set environment variables for your credentials
// Read more at http://twil.io/secure
const accountSid = 'AC9b65bde6e517e7a18b6c01e11a7c5493';
const authToken = '4dc7b7da80691a59c004921e13359edd';
const verifySid = 'VA3962dac32f8eac1dd4766972bda7af84';
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
