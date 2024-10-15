import axios from "axios"
import { encode_data } from "./encode_data"
import { insertStampPerm } from "./insert_stamp_perm"
import { supabase } from "./supabase"

export const stampsWithId = {
    facebook: 1,
    github: 2,
    google: 3,
    twitter: 4,
    discord: 5,
    poh: 6,
    iah: 7,
    brightid: 8,
    gitcoin: 9,
    instagram: 10,
    phone: 11,
    gooddollar: 12,
    "near-wallet": 15,
    fractal: 17,
    evm: 14,
    email: 13,
    solana: 53,
    telegram: 27,
    worldcoin: 26,
    near: 15,
    "lens-protocol":66,
    'farcaster': 68
}


export const insertStamp = async ({ stampData, user_data, stamp_type, app_id }: { app_id: number, stampData: any, user_data: { user_id: number, uuid: string }, stamp_type: keyof typeof stampsWithId }) => {
    console.log({ stampData, user_data, stamp_type, app_id }, 'stamp defense')
    const stampID = stampsWithId[stamp_type]
    const { data } = await supabase.from("stamptypes").select("*").match({ id: stampID })

    if (data?.[0]) {
        const { fields_to_use } = data?.[0];
        if (fields_to_use?.make_child_email_stamp && stampData?.email) {
            const dataToSet_stamp = {
                created_by_user_id: user_data?.user_id,
                created_by_app: app_id,
                stamptype: stampsWithId.email,
                uniquevalue: stampData.email,
                user_id_and_uniqueval: `${user_data?.user_id} ${stampsWithId.email} ${stampData.email}`,
                unique_hash: await encode_data(JSON.stringify(stampData)),
                stamp_json: { stampData },
                type_and_uniquehash: `${stampsWithId.email} ${await encode_data(
                    JSON.stringify(stampData)
                )}`,
                identity: stampData?.email
            };
            const {
                data: { data: evmData },
            } = await axios.post("/api/supabase/insert", {
                table: "stamps",
                body: dataToSet_stamp,
            })
        }
        if (fields_to_use?.make_child_phone_stamp && stampData?.phone) {
            const dataToSet_stamp = {
                created_by_user_id: user_data?.user_id,
                created_by_app: app_id,
                stamptype: stampsWithId.phone,
                uniquevalue: stampData.phone,
                user_id_and_uniqueval: `${user_data?.user_id} ${stampsWithId.phone} ${stampData.phone}`,
                unique_hash: await encode_data(JSON.stringify(stampData)),
                stamp_json: { stampData },
                type_and_uniquehash: `${stampsWithId.phone} ${await encode_data(
                    JSON.stringify(stampData)
                )}`,
                identity: stampData?.phone
            };
            const {
                data: { data: evmData },
            } = await axios.post("/api/supabase/insert", {
                table: "stamps",
                body: dataToSet_stamp,
            })
        }
    }

    const dataToSet_stamp = {
        created_by_user_id: user_data?.user_id,
        created_by_app: app_id,
        stamptype: stampsWithId[stamp_type],
        uniquevalue: stampData.uniquevalue,
        user_id_and_uniqueval: `${user_data?.user_id} ${stampsWithId[stamp_type]} ${stampData.uniquevalue}`,
        unique_hash: await encode_data(JSON.stringify(stampData)),
        stamp_json: { stampData },
        type_and_uniquehash: `${stampsWithId[stamp_type]} ${await encode_data(
            JSON.stringify(stampData)
        )}`,
        identity: stampData?.identity
    };
    const {
        data: { data: stampInsertData },
    } = await axios.post("/api/supabase/insert", {
        table: "stamps",
        body: dataToSet_stamp,
    })
    if (user_data?.uuid) {
        await insertStampPerm(stampInsertData?.[0]?.id, user_data.uuid)
    } else {
        const { data: dapp_data } = await supabase.from("dapp_users")?.select("*").match({ user_id: user_data?.user_id, dapp_id: process.env.NEXT_PUBLIC_DAPP_ID })
        if (dapp_data?.[0]) {
            await insertStampPerm(stampInsertData?.[0]?.id, dapp_data?.[0]?.uuid)
        } else {
            const { data: newDappUser, error } = await supabase
                .from("dapp_users")
                .insert({ user_id: user_data?.user_id, dapp_id: process.env.NEXT_PUBLIC_DAPP_ID })
                .select("*")
            await insertStampPerm(stampInsertData?.[0]?.id, newDappUser?.[0]?.uuid)
        }
    }
}