import NextCors from "nextjs-cors"

import { supabase } from "../utils/supabase"

const fetch_blacklisted_creds = async (req: any, res: any) => {
    await NextCors(req, res, {
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        origin: "*", // Allow all origins
        optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    })
    const { cred, apikey } = typeof req.body === "string" ? JSON.parse(req.body) : req.body
    const { data: dataForApp } = await supabase
        .from("dapps")
        .select("*")
        .match({ apikey })
    const dappId = dataForApp?.[0]?.id
    if (!dappId) {
        return res.status(400).json({ error: "Invalid API key" })
    }

    const { data: all_blacklisted_stamps_raw } = await supabase
        .from('all_blacklisted_stamps_raw')
        .select("*").match({ uniquevalue: cred })

    res.send({
        success: true,
        is_blacklisted: Boolean(all_blacklisted_stamps_raw)
    })
}

export default fetch_blacklisted_creds
