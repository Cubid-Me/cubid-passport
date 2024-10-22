// @ts-nocheck
import NextCors from "nextjs-cors"

import { stampsWithId } from "../../utils/stampKey"
import { supabase } from "../../utils/supabase"

const log = (message: any, lineNumber: any) => {
    console.log(`Line ${lineNumber}: ${message}`)
}
export default async function handler(req: any, res: any) {
    await NextCors(req, res, {
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        origin: "*", // Allow all origins
        optionsSuccessStatus: 200,
    })
    const { apikey, user_id } = typeof req.body === "string" ? JSON.parse(req.body) : req.body
    const { data: dataForApp } = await supabase
        .from("dapps")
        .select("*")
        .match({ apikey: apikey });

    const dappId = dataForApp?.find((item) => item.apikey === apikey)?.id
    if (!dappId) {
        log("Invalid API key or dapp_id", 50)
        return res.status(400).json({ error: "Invalid API key" })
    }
    const { data: dapp_users } = await supabase
        .from("dapp_users")
        .select("*,users:user_id(*),dapps:dapp_id(*)")
        .match({
            uuid: user_id,
        })
    const { error, data: stampData } = await supabase
        .from("stamps")
        .select("*")
        .match({
            created_by_user_id: dapp_users?.[0]?.users.id,
        })


    res.send({
        error,
        all_stamps: stampData,
    })
}
