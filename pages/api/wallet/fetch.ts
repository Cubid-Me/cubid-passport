import { supabase } from "@/lib/supabase"
import axios from "axios"

export default async function handler(req: any, res: any) {
    try {
        const { dapp_uid, chain } = req.body;
        const { data } = await supabase.from("wallet_list").select("*").match({
            dapp_user: dapp_uid,
            chain: chain
        })
        res.send({ data })
    } catch (err: any) {
        res.send({ err })
    }
}
