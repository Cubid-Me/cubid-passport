import NextCors from "nextjs-cors"

import { supabase } from "../utils/supabase"

const save_secret = async (req: any, res: any) => {
    await NextCors(req, res, {
        // Options
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        origin: "*", // Allow all origins
        optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    })
    const { user_id, api_key, secret } = typeof req.body === "string" ? JSON.parse(req.body) : req.body
    const { data: dataForApp } = await supabase
        .from("dapp_user_secrets")
        .select("*")
        .match({ dapp_user_uuid: user_id })
    const dappIdLength = (dataForApp ?? []).length
    await supabase
        .from("dapp_user_secrets")
        .insert({
            dapp_user_uuid: user_id,
            secret,
            secret_sequential_id: dappIdLength + 1
        })
    res.send({
        success: true
    })
}

export default save_secret
