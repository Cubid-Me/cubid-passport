import axios from "axios"

export default async function handler(req: any, res: any) {
  const { code } = req.body
  const fractalClientId = process.env.FRACTAL_CLIENT_ID
  const fractalClientSecret = process.env.FRACTAL_CLIENT_SECRET
  const fractalRedirectUri = process.env.FRACTAL_REDIRECT_URI

  if (!fractalClientId || !fractalClientSecret || !fractalRedirectUri) {
    return res.status(500).send({ error: "Missing Fractal environment configuration" })
  }

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
