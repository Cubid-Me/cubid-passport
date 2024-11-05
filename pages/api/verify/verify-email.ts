import NextCors from "nextjs-cors"

import { supabase } from "../utils/supabase"

const verifyEmail = async (req: any, res: any) => {
    await NextCors(req, res, {
        // Options
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        origin: "*", // Allow all origins
        optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    })
    const { apikey, email, otp, allStamps, dappuser_id } = typeof req.body === "string" ? JSON.parse(req.body) : req.body
    const { data: dataForApp } = await supabase
        .from("dapps")
        .select("*")
        .match({ apikey })
    const dappId = dataForApp?.[0]?.id
    console.log({ dappId,dataForApp })
    if (!dappId) {
        return res.status(400).json({ error: "Invalid API key" })
    }

    const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email"
    })
    console.log({
        email,
        token: otp,
        type: "email"
    })
    res.send({
        success: Boolean(data?.user?.id),
        error
    })

}

export default verifyEmail
