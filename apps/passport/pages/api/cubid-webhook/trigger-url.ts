import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { ethers } from "ethers";
import NextCors from "nextjs-cors";
import crypto from 'crypto';

import { supabase } from "@/lib/supabase";
import { server_insertStamp } from "@/lib/stampInsertion";

function createSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Enable CORS
        await NextCors(req, res, {
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
            origin: "*",
            optionsSuccessStatus: 200,
        });

        // Log incoming request body
        console.log("Incoming Request Body:", req.body);

        const { stamparray, webhook } = req.body;

        if (["credential_blacklisted", "credential_whitelisted", "score_increase", "credential_added", "score_decrease", "credential_removed"].includes(webhook)) {
            console.log("Processing webhook event:", webhook);

            const promises = stamparray.map(async (stampid: any) => {
                try {
                    console.log("Processing stamp ID:", stampid);

                    // Fetch stamp data
                    const { data, error } = await supabase.from("stamps").select("*").match({ id: stampid });
                    if (error) {
                        console.error("Error fetching stamp data:", error);
                        return;
                    }

                    const { data: dapp_user_list } = await supabase.from("dapp_users").select("*").match({ user_id: data?.[0]?.created_by_user_id });
                    const dapp_list: any = dapp_user_list?.map((item) => item.dapp_id);

                    await Promise.all(dapp_list.map(async (item: any) => {
                        let inserted_data;
                        try {
                            console.log("Processing dapp ID:", item);

                            const { data: webhook_data } = await supabase.from("dapp_webhook_subscriptions").select("*").match({
                                dapp: item,
                                webhook,
                            });

                            if (!webhook_data?.length) {
                                console.warn("No webhook data found for dapp ID:", item);
                                return;
                            }

                            const { secret, webhook_url } = webhook_data[0];
                            const signature = createSignature(JSON.stringify({ stampid }), secret);


                            const { data: webhook_events_data } = await supabase.from("webhook_events").select("*").match({
                                event_type: webhook,
                                payload: { stampid },
                            });

                            if (webhook_events_data?.length) {
                                // Update existing webhook event
                                const { data: inserted_webhook_1 } = await supabase.from("webhook_events").update({
                                    event_type: webhook,
                                    dapp_id: item,
                                    retries: webhook_events_data.length,
                                }).match({ id: webhook_events_data[0].id }).select("*");
                                inserted_data = inserted_webhook_1?.[0];
                                console.log("Updated webhook event:", inserted_data);
                            } else {
                                // Insert new webhook event
                                const { data: inserted_webhook_2 } = await supabase.from("webhook_events").insert({
                                    event_type: webhook,
                                    payload: { stampid },
                                    retries: 0,
                                    dapp_id: item
                                }).select("*");
                                inserted_data = inserted_webhook_2?.[0];
                                console.log("Inserted new webhook event:", inserted_data);
                            }

                            // Send the webhook request
                            const response = await axios.post(webhook_url, { stampid }, {
                                headers: { 'X-Cubid-Signature': signature },
                            });

                            // Log response data
                            console.log("Webhook response status:", response.status);
                            console.log("Webhook response data:", response.data);

                            // Record the successful delivery
                            await supabase.from("webhook_event_deliveries").insert({
                                webhook_event_id: inserted_data.id,
                                dapp_id: item,
                                attempt_number: inserted_data?.retries + 1,
                                response_status_code: response.status,
                                response_body: response.data,
                                delivery_status: "succeeded",
                            });
                        } catch (error: any) {
                            // Handle errors and log them
                            console.error("Error during webhook delivery:", error);

                            // Insert error details into webhook_event_deliveries
                            await supabase.from("webhook_event_deliveries").insert({
                                webhook_event_id: inserted_data?.id,
                                dapp_id: item,
                                attempt_number: inserted_data?.retries + 1,
                                response_status_code: error.response?.status || 500,
                                response_body: error.response?.data || error.message,
                                delivery_status: "failed",
                                error_category: error.response ? "client_error" : "network_error",
                            });

                            if (error.response) {
                                console.error("Error response status:", error.response.status);
                                console.error("Error response data:", error.response.data);
                            } else if (error.request) {
                                console.error("No response received:", error.request);
                            } else {
                                console.error("Error message:", error.message);
                            }
                        }
                    }));
                } catch (err) {
                    console.error("Error processing stamp ID:", stampid, err);
                }
            });

            // Wait for all promises to complete
            await Promise.all(promises);
        }

        // Return success response
        res.status(200).json({ success: true });
    } catch (err: any) {
        // Catch and log any unexpected errors
        console.error("Unexpected error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
}
