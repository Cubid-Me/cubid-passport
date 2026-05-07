// types of webhook to call here 
// credential_blacklisted
// credential whitelisted 
// score_increase 
// credential_added
import axios from "axios"
import { supabase } from "./supabase"

const getPassportInternalHeaders = () => ({
    Authorization: `Bearer ${process.env.PASSPORT_INTERNAL_API_TOKEN ?? ""}`,
})

const getPassportWebhookUrl = () =>
    `${process.env.PASSPORT_PUBLIC_ORIGIN ?? "https://passport.cubid.me"}/api/cubid-webhook/trigger-url`

export const webhook_call = async ({ type_and_uniquehash }: any) => {
    let { data: all_blacklisted_stamps } = await supabase
        .from('all_blacklisted_stamps')
        .select("*").eq("type_and_uniquehash", type_and_uniquehash)
    if (all_blacklisted_stamps?.[0]) {
        await axios.post(getPassportWebhookUrl(), {
            stamparray: all_blacklisted_stamps?.[0]?.stamp_ids,
            webhook: "credential_blacklisted"
        }, {
            headers: getPassportInternalHeaders(),
        })
    }
    let { data: all_whitelisted_stamps } = await supabase
        .from('all_blacklisted_stamps')
        .select("*").eq("type_and_uniquehash", type_and_uniquehash)
    if (all_whitelisted_stamps?.[0]) {
        await axios.post(getPassportWebhookUrl(), {
            stamparray: all_whitelisted_stamps?.[0]?.stanp_ids,
            webhook: "credential_whitelisted"
        }, {
            headers: getPassportInternalHeaders(),
        })
    }
    // score increase
    await axios.post(getPassportWebhookUrl(), {
        stamparray: [...all_whitelisted_stamps?.[0]?.stanp_ids, ...all_blacklisted_stamps?.[0]?.stamp_ids],
        webhook: "score_increase"
    }, {
        headers: getPassportInternalHeaders(),
    })
    // credential added
    await axios.post(getPassportWebhookUrl(), {
        stamparray: [...all_whitelisted_stamps?.[0]?.stanp_ids, ...all_blacklisted_stamps?.[0]?.stamp_ids],
        webhook: "credential_added"
    }, {
        headers: getPassportInternalHeaders(),
    })

}

export const removeStamp = async ({ stampid }: any) => {
    await axios.post(getPassportWebhookUrl(), {
        stamparray: [stampid],
        webhook: "score_decrease"
    }, {
        headers: getPassportInternalHeaders(),
    })
    await axios.post(getPassportWebhookUrl(), {
        stamparray: [stampid],
        webhook: "credential_removed"
    }, {
        headers: getPassportInternalHeaders(),
    })
}
