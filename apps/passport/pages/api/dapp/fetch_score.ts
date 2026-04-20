import NextCors from "nextjs-cors"

import { supabase } from "../utils/supabase"

const fetch_score = async (req: any, res: any) => {
  // Log the incoming request
  console.log("Incoming request:", { method: req.method, body: req.body })

  await NextCors(req, res, {
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    origin: "*", // Allow all origins
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  })

  const { uid, apikey } = req.body

  // Log API key and user ID
  console.log("Fetching data for API Key:", apikey, "and UID:", uid)

  const { data } = await supabase.from("dapps").select("*").match({ apikey })

  // Log the response from the "dapps" table
  console.log("Dapps Data:", { apikey, length: data?.length, data })

  if (data?.[0] && apikey) {
    const { data: dapp_users } = await supabase
      .from("dapp_users")
      .select("*,users:user_id(*),dapps:dapp_id(*)")
      .match({ uuid: uid })

    // Log dapp_users data
    console.log("Dapp Users Data:", dapp_users)

    const { error, data: stampData } = await supabase
      .from("dapp_stamptypes")
      .select("*,stamptypes:stamptype_id(*)")
      .match({ dapp_id: dapp_users?.[0]?.dapp_id })

    // Log stampData and any errors
    console.log("Stamp Data:", { error, stampData })

    const { data: scoreData } = await supabase
      .from("stampscore_dapps")
      .select("*,stampscore_schemas:schema_id(*)")
      .match({ dapp_id: dapp_users?.[0]?.dapp_id })

    // Log scoreData
    console.log("Score Data:", scoreData)

    const { data: stampScores } = await supabase
      .from("stampscores_available")
      .select("*")
      .match({ schema_id: scoreData?.[0]?.schema_id })

    // Log stampScores
    console.log("Stamp Scores:", stampScores)

    const { data: stampsList } = await supabase
      .from("stamps")
      .select("*")
      .match({ created_by_user_id: dapp_users?.[0]?.user_id })

    // Log stampsList
    console.log("Stamps List:", stampsList)

    const stampsToSend = stampData ?? []
    const allStampIds = (stampsList ?? []).map((item: any) => item.stamptype)

    // Calculate the score
    const stampScore = [
      ...stampsToSend.filter((item) =>
        allStampIds?.includes(item?.stamptypes?.id)
      ),
    ].reduce((curr, item) => {
      const scoreData = (stampScores ?? []).find(
        (_) => _.stamptype_id === item.stamptype_id
      )
      return (scoreData?.score ?? 0) + curr
    }, 0)

    // Log the final score and response
    console.log("Calculated Stamp Score:", stampScore)
    res.send({ score: stampScore })
  } else {
    // Log error for invalid API key
    console.log("Error: Invalid APIKEY provided:", apikey)
    res.send({ error: "Please provide a valid APIKEY" })
  }
}

export default fetch_score
