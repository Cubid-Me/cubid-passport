import axios from "axios"

export default async function handler(req: any, res: any) {
  const { code } = req.body
  try {
    const { data } = await axios.post(
      "https://auth.fractal.id/oauth/token",
      {
        client_id: "Zh7_RqOPeQoV1lZJ_ZUF1b88VGyJwaxzQVQbpvxq4S4",
        client_secret: "vmS0iHz95domUcD8Lo7E0mt1axdU16rR4XYUTWngY1o",
        code: code,
        grant_type: "authorization_code",
        redirect_uri: "https://passport.cubid.me/",
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
