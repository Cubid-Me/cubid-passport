// @ts-nocheck
import axios from "axios"
import { encode_data } from "./encode_data"
import { insertStampPerm } from "./insert_stamp_perm"
import { supabase } from "./supabase"
import { webhook_call } from "./webhook_call"

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
    "lens-protocol": 66,
    'farcaster': 68,
    'address': 70
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
    webhook_call({
        type_and_uniquehash: `${stampsWithId[stamp_type]} ${await encode_data(
            JSON.stringify(stampData)
        )}`
    })
}

const log = (message: string, data = {}) => {
    console.log(message, JSON.stringify(data, null, 2)); // Pretty-print the data
};

export const server_insertStamp = async ({ stampData, user_data, stamp_type, app_id }: { app_id: number, stampData: any, user_data: { user_id: number, uuid: string }, stamp_type: keyof typeof stampsWithId }) => {
    console.log({ stampData, user_data, stamp_type, app_id }, 'stamp defense')
    const stampID = stampsWithId[stamp_type];
    const { data, error: fetchError } = await supabase.from("stamptypes").select("*").match({ id: stampID });

    if (fetchError) {
        log('Error fetching stamptypes:', fetchError);
    }

    if (data?.[0]) {
        const { fields_to_use } = data?.[0];

        log('Stamp data retrieved:', { fields_to_use });

        if (fields_to_use?.make_child_email_stamp && stampData?.email) {
            const dataToSet_stamp = {
                created_by_user_id: user_data?.user_id,
                created_by_app: app_id,
                stamptype: stampsWithId.email,
                uniquevalue: stampData.email,
                user_id_and_uniqueval: `${user_data?.user_id} ${stampsWithId.email} ${stampData.email}`,
                unique_hash: await encode_data(JSON.stringify(stampData)),
                stamp_json: { stampData },
                type_and_uniquehash: `${stampsWithId.email} ${await encode_data(JSON.stringify(stampData))}`,
                identity: stampData?.email,
            };

            log('Inserting email stamp:', dataToSet_stamp);
            const { data: emailStampData, error: emailInsertError } = await supabase.from("stamps").insert(dataToSet_stamp);
            if (emailInsertError) {
                log('Error inserting email stamp:', emailInsertError);
            }
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
                type_and_uniquehash: `${stampsWithId.phone} ${await encode_data(JSON.stringify(stampData))}`,
                identity: stampData?.phone,
            };

            log('Inserting phone stamp:', dataToSet_stamp);
            const { data: phoneStampData, error: phoneInsertError } = await supabase.from("stamps").insert(dataToSet_stamp);
            if (phoneInsertError) {
                log('Error inserting phone stamp:', phoneInsertError);
            }
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
        type_and_uniquehash: `${stampsWithId[stamp_type]} ${await encode_data(JSON.stringify(stampData))}`,
        identity: stampData?.identity,
    };

    log('Inserting main stamp:', dataToSet_stamp);
    const { data: stampInsertData, error: stampInsertError } = await supabase.from("stamps").insert(dataToSet_stamp);
    if (stampInsertError) {
        log('Error inserting main stamp:', stampInsertError);
    }

    if (user_data?.uuid) {
        log('User has UUID, inserting permissions for user:', user_data.uuid);
        const { error: permissionsError } = await supabase.from("stamp_dappuser_permissions").insert({
            stamp_id: stampInsertData?.[0]?.id,
            dappuser_id: user_data.uuid,
            can_write: true,
            can_delete: true,
            can_read: true,
        });
        if (permissionsError) {
            log('Error inserting user permissions:', permissionsError);
        }
    } else {
        log('User does not have UUID, checking dapp_users table.');
        const { data: dapp_data, error: dappError } = await supabase.from("dapp_users").select("*").match({
            user_id: user_data?.user_id,
            dapp_id: process.env.NEXT_PUBLIC_DAPP_ID,
        });

        if (dappError) {
            log('Error fetching dapp_users:', dappError);
        }

        if (dapp_data?.[0]) {
            log('Dapp user found, inserting permissions:', dapp_data[0].uuid);
            const { error: dappPermissionsError } = await supabase.from("stamp_dappuser_permissions").insert({
                stamp_id: stampInsertData?.[0]?.id,
                dappuser_id: dapp_data?.[0]?.uuid,
                can_write: true,
                can_delete: true,
                can_read: true,
            });
            if (dappPermissionsError) {
                log('Error inserting dapp user permissions:', dappPermissionsError);
            }
        } else {
            log('No existing dapp user found, creating new user.');
            const { data: newDappUser, error: newDappUserError } = await supabase
                .from("dapp_users")
                .insert({ user_id: user_data?.user_id, dapp_id: process.env.NEXT_PUBLIC_DAPP_ID })
                .select("*");

            if (newDappUserError) {
                log('Error creating new dapp user:', newDappUserError);
            } else {
                log('New dapp user created:', newDappUser[0].uuid);
                const { error: newDappPermissionsError } = await supabase.from("stamp_dappuser_permissions").insert({
                    stamp_id: stampInsertData?.[0]?.id,
                    dappuser_id: newDappUser?.[0]?.uuid,
                    can_write: true,
                    can_delete: true,
                    can_read: true,
                });
                if (newDappPermissionsError) {
                    log('Error inserting new dapp user permissions:', newDappPermissionsError);
                }
            }
        }
    }
    webhook_call({
        type_and_uniquehash: `${stampsWithId[stamp_type]} ${await encode_data(JSON.stringify(stampData))}`
    })
}