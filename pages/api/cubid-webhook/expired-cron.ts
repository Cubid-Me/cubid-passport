import { supabase } from "@/lib/supabase"
import axios from "axios"
import crypto from 'crypto';


async function fetchOldStamps() {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data, error } = await supabase
        .from('stamps')
        .select('*')
        .lt('updated_at', oneYearAgo.toISOString());

    if (error) {
        console.error('Error fetching old stamps:', error);
    } else {
        console.log('Old stamps:', data);
    }

    return data;
}

function createSignature(payload: string, secret: string): string {
    return crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
}

export default async function handler(req: any, res: any) {
    try {

        const allStampsToFetch: any = await fetchOldStamps()
        const webhook = 'credential_expired'
        allStampsToFetch.map(async ({ id: stampid }: any) => {
            const { data } = await supabase.from("stamps").select("*").match({ id: stampid })
            const { data: dapp_user_list } = await supabase.from("dapp_users").select("*").match({ user_id: data?.[0]?.created_by_user_id })
            const dapp_list = dapp_user_list?.map((item) => item.dapp_id)
            dapp_list?.map(async (item) => {
                const { data: webhook_data } = await supabase.from("dapp_webhook_subscriptions").select("*").match({
                    dapp: item.dapp_id,
                    webhook
                })
                const { secret, url } = webhook_data?.[0];
                const signature = createSignature(JSON.stringify({ stampid }), secret);
                let inserted_data;
                try {

                    const { data: webhook_events_data } = await supabase.from("webhook_events").select("*").match({
                        event_type: webhook,
                        payload: {
                            stampid
                        },
                    })

                    if ((webhook_data ?? [])?.length !== 0) {
                        const { data: inserted_webhook_1 } = await supabase.from("webhook_events").update({
                            event_type: webhook,
                            payload: {
                                stampid
                            },
                            retires: (webhook_events_data ?? []).length,
                        }).match({
                            id: webhook_events_data?.[0]?.id
                        }).select("*")
                        inserted_data = inserted_webhook_1?.[0]
                    } else {
                        const { data: inserted_webhook_2 } = await supabase.from("webhook_events").insert({
                            event_type: webhook,
                            payload: {
                                stampid
                            },
                            retires: (webhook_events_data ?? []).length,
                        })
                        inserted_data = inserted_webhook_2?.[0]
                    }

                    const response = await axios.post(url, {
                        stampid
                    }, {
                        headers: {
                            'X-Cubid-Signature': signature
                        }
                    });
                    await supabase.from("webhook_event_deliveries").insert({
                        webhook_event_id: inserted_data.id,
                        dapp_id: item.dapp_id,
                        attempt_number: inserted_data?.attempt_number,
                        response_status_code: response.status,
                        response_body: response.data,
                        delivery_status: "succeeded"
                    })
                    // Log response data
                    console.log("Response Code:", response.status);
                    console.log("Response Data:", response.data);

                    // Return or handle the response data as needed
                    return response.data;

                } catch (error: any) {

                    // Handle and log API errors
                    if (error.response) {

                        await supabase.from("webhook_event_deliveries").insert({
                            webhook_event_id: inserted_data.id,
                            dapp_id: item.dapp_id,
                            attempt_number: inserted_data?.attempt_number,
                            response_status_code: error.response.status,
                            response_body: error.response.data ?? error,
                            delivery_status: "failed",
                            error_category: "client_error"
                        })
                        // The request was made and the server responded with a status code
                        // that falls out of the range of 2xx
                        console.error("Error Response Code:", error.response.status);
                        console.error("Error Response Data:", error.response.data);
                        console.error("Error Response Headers:", error.response.headers);
                    } else if (error.request) {
                        // The request was made but no response was received
                        console.error("No Response Received:", error.request);
                    } else {
                        // Something happened in setting up the request that triggered an error
                        console.error("Error Message:", error.message);
                    }

                    // You can also log the error configuration if needed
                    console.error("Error Config:", error.config);
                }
            })
        })
        res.send(true)
    } catch (err: any) {
        res.send({ err })
    }
}
