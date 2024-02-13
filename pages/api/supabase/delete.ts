import { supabase } from "../utils/supabase"

const deleteTable = async (req: any, res: any) => {
  const { match, table } = req.body
  const { error, data } = await supabase.from(table).delete().match(match)
  res.send({ error, data })
}

export default deleteTable
