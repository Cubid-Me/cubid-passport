import NextCors from "nextjs-cors"

import { supabase } from "../../utils/supabase"
import { server_insertStamp } from "@/lib/stampInsertion"

const add_stamp = async (req: any, res: any) => {
    await NextCors(req, res, {
        // Options
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        origin: "*", // Allow all origins
        optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    })
    const { page_id, stamp_type, stampData, user_data } = typeof req.body === "string" ? JSON.parse(req.body) : req.body
    const { data } = await supabase.from("dapp_users").select("*").match({ uuid: user_data?.uuid })
    const { data:dapp_page_data } = await supabase.from("dapp_pages").select("*").match({ id: page_id })

    server_insertStamp({
        app_id: dapp_page_data?.[0]?.id,
        stampData: stampData, user_data: { user_id: data?.[0]?.user_id, uuid: user_data?.uuid }, stamp_type: stamp_type
    })
    res.send({
        success: true
    })
}

export default add_stamp
