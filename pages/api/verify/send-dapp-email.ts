import NextCors from "nextjs-cors"

import { supabase } from "../utils/supabase"

const sendDappEmail = async (req: any, res: any) => {
    await NextCors(req, res, {
        // Options
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        origin: "*", // Allow all origins
        optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    })
    const { apikey, email } = typeof req.body === "string" ? JSON.parse(req.body) : req.body
    const { data: dataForApp } = await supabase
        .from("dapps")
        .select("*")
        .match({ apikey })
    const dappId = dataForApp?.[0]?.id
    if (!dappId) {
        return res.status(400).json({ error: "Invalid API key" })
    }
    const { error,data } = await supabase.auth.signInWithOtp({
        email,

    })

    res.send({
        success: true,
        error,
        data
    })
}

export default sendDappEmail
