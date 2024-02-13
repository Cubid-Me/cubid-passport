import { NextApiRequest, NextApiResponse } from "next"
import axios from "axios"
import FormData from "form-data"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  let code = req.body.code
  let redirectUri = req.body.redirectUri
  // send form based request to Instagram API
  const formData = new FormData()

  // Append your data
  formData.append("client_id", "328555189879651")
  formData.append("client_secret", "6a567d49fb0d7a3500f12dec14423945")
  formData.append("grant_type", "authorization_code")
  formData.append("redirect_uri", redirectUri) // replace with your value
  formData.append("code", code) // replace with your value

  // Make the request
  axios
    .post("https://api.instagram.com/oauth/access_token", formData, {
      headers: formData.getHeaders(),
    })
    .then(async (response) => {
      const { access_token, user_id } = response.data;
      res.send({
        user_id,
        access_token,
        data: (await axios.get(`https://graph.instagram.com/${user_id}?fields=id,username&access_token=${access_token}`)).data,
      })
    })
    .catch((error) => {
      console.log(error, "err 2")
      res.send({
        error: error,
        message: "v2 error",
        msg: error?.response?.data?.error_message ?? "",
      })
    })
}
