import { supabase } from "../utils/supabase"

const fetchAllowUid = async (req: any, res: any) => {
  const { uid, page_id } = req.body
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
      page_id: parseInt(page_id),
    })
  console.log(
    { stampData },
    { dapp_id: dapp_users?.[0]?.dapp_id, page_id: parseInt(page_id) }
  )
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
      schema_id: 2,
    })

  const stampsToSend = stampData

  res.send({ error, dapp_users, stampsToSend, scoreData, stampScores })
}

export default fetchAllowUid
