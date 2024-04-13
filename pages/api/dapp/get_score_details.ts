import NextCors from "nextjs-cors"

import { supabase } from "../utils/supabase"

const fetch_score = async (req: any, res: any) => {
  await NextCors(req, res, {
    // Options
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    origin: "*", // Allow all origins
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  })
  const { uid, apikey } = req.body
  console.log(req.body)
  const { data } =await supabase.from("dapps").select("*").match({ apikey })
  if (data?.[0]  && apikey) {
    const { data: dapp_users } = await supabase
      .from("dapp_users")
      .select("*,users:user_id(*),dapps:dapp_id(*)")
      .match({
        uuid: uid,
      })
    const { error, data: stampData } = await supabase
      .from("dapp_stamptypes")
      .select("*,stamptypes:stamptype_id(*)")
      .match({
        dapp_id: dapp_users?.[0]?.dapp_id,
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

    const { data: stampsList } = await supabase
      .from("stamps")
      .select("*")
      .match({
        created_by_user_id: dapp_users?.[0]?.user_id,
      })

    const stampsToSend = stampData ?? []

    const allStampIds = (stampsList ?? []).map((item: any) => item.stamptype)

    const stampScore = [
      ...stampsToSend.filter((item) =>
        allStampIds?.includes(item?.stamptypes?.id)
      ),
    ].map((item) => {
      const stampScoresToAppend = stampScores?.find(
        (_) => _.stamptype_id === item.stamptype_id
      )
      return { [item.stamptypes.stamptype]: stampScoresToAppend.score }
    })

    res.send({ score: stampScore })
  } else {
    res.send({ error: "Please provide a valid APIKEY" })
  }
}

export default fetch_score
