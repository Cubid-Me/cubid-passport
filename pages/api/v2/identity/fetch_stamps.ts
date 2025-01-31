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
        .match({ apikey: apikey })

    const dappId = dataForApp?.find((item) => item.apikey === apikey)?.id
    if (!dappId) {
        log("Invalid API key or dapp_id", 50)
        return res.status(400).json({ error: "Invalid API key" })
    }

    const { data: dapp_users } = await supabase
        .from("dapp_users")
        .select("*,users:user_id(*),dapps:dapp_id(*)")
        .match({ uuid: user_id })

    if (!dapp_users?.length) {
        return res.status(404).json({ error: "User not found" })
    }

    const { error, data: stampData } = await supabase
        .from("stamps")
        .select("*")
        .match({ created_by_user_id: dapp_users[0]?.users.id })

    if (error) {
        return res.status(500).json({ error: "Error fetching stamps" })
    }

    // Using Promise.all to handle concurrent stamp permission checks
    const stampPromises = stampData.map(async (item) => {
        const { data: permissionData } = await supabase
            .from("stamp_dappuser_permissions")
            .select("*")
            .match({
                dappuser_id: user_id,
                stamp_id: item.id,
            })

        if (item.stamptype === 3) {
            console.log({ permissionData })

        }

        return {
            ...item,
            stamptype: stampsWithId[item.stamptype],
            emailForVerification: dapp_users[0]?.users.email,
            permAvailable: Boolean(permissionData?.[0]),
        }
    })

    try {
        const stampDataToSend = await Promise.all(stampPromises)
        res.status(200).json({
            all_stamps: stampDataToSend,
            email: dapp_users[0]?.users.email
        })
    } catch (err) {
        log("Error processing stamps", 80)
        res.status(500).json({ error: "Error processing stamps" })
    }
}
