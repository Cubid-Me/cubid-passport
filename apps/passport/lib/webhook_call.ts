// types of webhook to call here 
// credential_blacklisted
// credential whitelisted 
// score_increase 
// credential_added
import axios from "axios"
import { supabase } from "./supabase"

export const webhook_call = async ({ type_and_uniquehash }: any) => {
    let { data: all_blacklisted_stamps } = await supabase
        .from('all_blacklisted_stamps')
        .select("*").eq("type_and_uniquehash", type_and_uniquehash)
    if (all_blacklisted_stamps?.[0]) {
        const isProd = process.env.VERCEL_ENV === "production"
        await axios.post('https://passport.cubid.me/api/cubid-webhook/trigger-url', {
            stamparray: all_blacklisted_stamps?.[0]?.stamp_ids,
            webhook: "credential_blacklisted"
        })
    }
    let { data: all_whitelisted_stamps } = await supabase
        .from('all_blacklisted_stamps')
        .select("*").eq("type_and_uniquehash", type_and_uniquehash)
    if (all_whitelisted_stamps?.[0]) {
        await axios.post('https://passport.cubid.me/api/cubid-webhook/trigger-url', {
            stamparray: all_whitelisted_stamps?.[0]?.stanp_ids,
            webhook: "credential_whitelisted"
        })
    }
    // score increase
    await axios.post('https://passport.cubid.me/api/cubid-webhook/trigger-url', {
        stamparray: [...all_whitelisted_stamps?.[0]?.stanp_ids, ...all_blacklisted_stamps?.[0]?.stamp_ids],
        webhook: "score_increase"
    })
    // credential added
    await axios.post('https://passport.cubid.me/api/cubid-webhook/trigger-url', {
        stamparray: [...all_whitelisted_stamps?.[0]?.stanp_ids, ...all_blacklisted_stamps?.[0]?.stamp_ids],
        webhook: "credential_added"
    })

}

export const removeStamp = async ({ stampid }: any) => {
    await axios.post('https://passport.cubid.me/api/cubid-webhook/trigger-url', {
        stamparray: [stampid],
        webhook: "score_decrease"
    })
    await axios.post('https://passport.cubid.me/api/cubid-webhook/trigger-url', {
        stamparray: [stampid],
        webhook: "credential_removed"
    })
}