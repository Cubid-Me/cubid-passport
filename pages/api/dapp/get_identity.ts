import NextCors from "nextjs-cors"

import { supabase } from "../utils/supabase"

const keysToUse: any = {
  1: "facebook",
  2: "github",
  3: "google",
  4: "twitter",
  5: "discord",
  6: "poh",
  13: "email",
  7: "near-wallet",
  8: "brightid",
  9: "gitcoin",
  10: "instagram",
  11: "phone",
  12: "gooddollar",
  17: "fractal",
  22: "linkedin",
  26: "worldcoin",
  27: "telegram",
  14: "evm",
}

const fetch_score = async (req: any, res: any) => {
  await NextCors(req, res, {
    // Options
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    origin: "*", // Allow all origins
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  })
  const { uid, apikey } = req.body
  const { data } = await supabase.from("dapps").select("*").match({ apikey })
  if (data?.[0] && apikey) {
    console.log(req.body)
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
    console.log(dapp_users?.[0])
    const { data: stampsList } = await supabase
      .from("stamps")
      .select("*,stamptypes:stamptype(*)")
      .match({
        created_by_user_id: dapp_users?.[0]?.user_id,
      })

    const dataToSend: any = []

    stampsList?.map((item) => {
      const stampType = keysToUse?.[item.stamptype]
      dataToSend.push({ [stampType]: item.uniquevalue })
    })

    res.send({ score_details: dataToSend, user: dapp_users?.[0].users })
  } else {
    res.send({ error: "Please provide a valid APIKEY" })
  }
}

export default fetch_score
