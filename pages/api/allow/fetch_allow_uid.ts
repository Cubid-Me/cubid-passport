import { supabase } from "../utils/supabase"

const fetchAllowUid = async (req: any, res: any) => {
  const { uid } = req.body
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

  const stampsToSend = stampData?.filter(
    (item) => item.info_sharing_type_id !== 1
  )

  res.send({ error, dapp_users, stampsToSend })
}

export default fetchAllowUid
