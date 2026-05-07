import axios from "axios"

import { getRequiredSecret } from "@cubid/config"

export default async function handler(req: any, res: any) {
  const { code } = req.body
  const fractalClientId = getRequiredSecret("FRACTAL_CLIENT_ID")
  const fractalClientSecret = getRequiredSecret("FRACTAL_CLIENT_SECRET")
  const fractalRedirectUri = getRequiredSecret("FRACTAL_REDIRECT_URI")

  try {
    const { data } = await axios.post(
      "https://auth.fractal.id/oauth/token",
      {
        client_id: fractalClientId,
        client_secret: fractalClientSecret,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: fractalRedirectUri,
      }
    )
    const { data: data2 } = await axios.get(
      `https://resource.fractal.id/users/me`,
      {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      }
    )
    res.send(data2)
  } catch (err: any) {
    res.send({ data: err.response.data, err })
  }
}
