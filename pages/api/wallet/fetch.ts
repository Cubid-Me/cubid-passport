import { supabase } from "@/lib/supabase"
import axios from "axios"
import NextCors from "nextjs-cors";

export default async function handler(req: any, res: any) {
    try {
        await NextCors(req, res, {
            // Options
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
            origin: "*", // Allow all origins
            optionsSuccessStatus: 200, // Some legacy browsers choke on 204
          })
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
