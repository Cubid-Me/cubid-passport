import NextCors from "nextjs-cors"

import { supabase } from "../../utils/supabase"

const fetchAllowUid = async (req: any, res: any) => {
  await NextCors(req, res, {
    // Options
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    origin: "*", // Allow all origins
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  })
  const { apikey, user_id } = typeof req.body === "string" ? JSON.parse(req.body) : req.body
  const { data: dataForApp } = await supabase
    .from("dapps")
    .select("*")
    .match({ apikey })
  const dappId = dataForApp?.[0]?.id
  if (!dappId) {
    return res.status(400).json({ error: "Invalid API key" })
  }
  const { data: dapp_users } = await supabase
    .from("dapp_users")
    .select("*,users:user_id(*),dapps:dapp_id(*)")
    .match({
      uuid: user_id,
      dapp_id: dappId,
    })
  const { error, data: stampData } = await supabase
    .from("stamps")
    .select("*")
    .match({
      created_by_user_id: dapp_users?.[0]?.users.id,
    })
  const { data: scoreData } = await supabase
    .from("stampscore_dapps")
    .select("*,stampscore_schemas:schema_id(*)")
    .match({
      dapp_id: dapp_users?.[0]?.dapp_id,
    })
  const { data: stampScores } = await supabase
    .from("stampscores_available")
    .select("*")
    .match({
      schema_id: scoreData?.[0]?.schema_id,
    })
  let totalScore = 0
  stampData?.map((item) => {
    const findObj = stampScores?.find((_) => _.stamptype_id === item.stamptype)
    console.log(findObj)
    totalScore = totalScore + (findObj?.score ?? 0)
  })

  res.send({
    error,
    scoring_schema: scoreData?.[0]?.schema_id,
    cubid_score: totalScore,
  })
}

export default fetchAllowUid
