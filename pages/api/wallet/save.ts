import { supabase } from "@/lib/supabase"
import axios from "axios"
import NextCors from "nextjs-cors";

export default async function handler(req: any, res: any) {
    try {
        await NextCors(req, res, {
            // Options
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
            origin: "*", // Allow all origins
            optionsSuccessStatus: 200, // Some legacy browsers choke on 204
        })
        const { dapp_uid, chain, public_key, is_generated_via_lib } = req.body;
        const { data, error } = await supabase.from("wallet_list").insert({
            dapp_user: dapp_uid,
            chain: chain,
            public_key,
            is_generated_via_lib
        }).select("*")
        console.log({ data, error })
        res.send({ data, error })
    } catch (err: any) {
        res.send({ err })
    }
}
