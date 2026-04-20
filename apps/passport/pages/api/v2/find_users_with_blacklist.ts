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
    const { data: stamp_data } = await supabase.from("stamps").select("*").match({ uniquevalue: cred }).order("created_at", {
        ascending: true
    })
    // @ts-ignore
    const [userId1, userId2] = stamp_data?.map((item) => item.created_by_user_id)
    const { data: user1Data } = await supabase.from("users").select("*").match({ id: userId1 })
    const { data: user2Data } = await supabase.from("users").select("*").match({ id: userId2 })
    const email1 = user1Data?.[0]?.email || user1Data?.[0]?.phone;
    const email2 = user2Data?.[0]?.email || user1Data?.[0]?.phone;;
    res.send({
        success: true,
        all_email: { email1, email2 }
    })
}

export default fetch_blacklisted_creds
