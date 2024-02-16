import axios from "axios"

export default async function handler(req: any, res: any) {
  try {
    await axios.post("https://threeoc-a8915caf5aa3.herokuapp.com/cron-job-dates")
    res.send(true)
  } catch (err: any) {
    res.send({ err })
  }
}
