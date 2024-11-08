import NextCors from "nextjs-cors"

import { supabase } from "../utils/supabase"

const addStampPerm = async (req: any, res: any) => {
    await NextCors(req, res, {
        // Options
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        origin: "*", // Allow all origins
        optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    })
    const { apikey, stamp_id_array, user_id } = typeof req.body === "string" ? JSON.parse(req.body) : req.body
   const { data: dataForApp } = await supabase
        .from("dapps")
        .select("*")
        .match({ apikey })
    const dappId = dataForApp?.[0]?.id

    if (!dappId) {
        return res.status(400).json({ error: "Invalid API key" })
    }

    const allPromises = stamp_id_array.map(async (item: string) => {
        await supabase.from("stamp_dappuser_permissions").insert({
            dappuser_id: user_id,
            stamp_id: item,
            can_write: true,
            can_delete: true,
            can_read: true,
        })
    })

    await Promise.all(allPromises)

    res.send({
        success: true,
    })
}

export default addStampPerm
