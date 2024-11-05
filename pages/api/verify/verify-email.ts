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
    if (!dappId) {
        return res.status(400).json({ error: "Invalid API key" })
    }

    const { data } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email"
    })

    const allPromises = allStamps.map((item: any) =>
        supabase
            .from("stamp_dappuser_permissions")
            .insert({
                dappuser_id: dappuser_id,
                stamp_id: item.id,
                can_write: true,
                can_delete: true,
                can_read: true,
            })
    );
    await Promise.all(allPromises);


    res.send({
        success: Boolean(data?.user?.id),
    })

}

export default verifyEmail
