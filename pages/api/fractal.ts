import axios from "axios"

export default async function handler(req: any, res: any) {
  const { code } = req.body
  try {
    const { data } = await axios.post(
      "https://auth.next.fractal.id/oauth/token",
      {
        client_id: "HiOtrTXl-1Racpv9pbRtt8hDZRlOvljVCjFP5LyWlnk",
        client_secret: "c2z_IyVbx_XrPmETdPA9jhaL8XfcyLqLHNGgzK7007s",
        code: code,
        grant_type: "authorization_code",
        redirect_uri: "https://cubid-passport.vercel.app/",
      }
    )
    const { data: data2 } = await axios.get(
      `https://resource.next.fractal.id/users/me`,
      {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      }
    )
    console.log(data2)
    res.send(data2)
  } catch (err) {
    console.log(err)
  }

  res.send(true)
}
