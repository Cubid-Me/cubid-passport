/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
"use client"

import React, { useEffect } from "react"

import "@near-wallet-selector/modal-ui/styles.css"
import { useSearchParams } from "next/navigation"

import useAuth from "@/hooks/useAuth"
import { useCreatedByAppId } from "@/hooks/useCreatedByApp"


import { encode_data } from "../../lib/encode_data"
import { supabase } from "../../lib/supabase"
import { insertStamp } from "@/lib/stampInsertion"
import axios from "axios"

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
    solana: 53
}

const Stamps = ({
    stampToRender,
}: any) => {
    console.log({ stampToRender })
    const searchParams: any = useSearchParams()

    const signInWithSocial = async (socialName: any) => {
        await supabase.auth.signOut()
        localStorage.setItem("socialName", socialName)
        const { data: d, error: e } = await supabase.auth.signInWithOAuth({
            provider: socialName,
            options: {
                redirectTo: `${window.location.href}&success=true`,

            },
        })
    }
    const successParamter = searchParams.get("success")

    useEffect(() => {
        if (!successParamter) {
            const social_provider_to_trigger = searchParams.get("social_provider")
            signInWithSocial(social_provider_to_trigger)
        }
    }, [])

    const { getUser } = useAuth({})
    const { getIdForApp } = useCreatedByAppId()

    const uuid = searchParams.get("uid")

    useEffect(() => {
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                const { user_metadata } = session?.user
                const providerKey: any = localStorage.getItem("socialName") ?? ""
                console.log(providerKey, session?.user, 'stamp defense')
                const stampId = (stampsWithId as any)[providerKey]
                const dbUser = await getUser()
                await insertStamp({
                    stamp_type: providerKey,
                    user_data: { user_id: dbUser?.id, uuid: uuid },
                    stampData: {
                        identity: providerKey === "discord" ? user_metadata?.name : providerKey === "twitter" ? user_metadata?.user_name : user_metadata?.sub,
                        uniquevalue: user_metadata?.sub,
                        email: user_metadata?.email,
                        phone: user_metadata?.phone,
                    },
                    app_id: await getIdForApp()
                })
                const page_id = searchParams.get("page_id")

                const { data: { data } } = await await axios.post("/api/supabase/select", {
                    match: { id: page_id },
                    table: "dapp_pages",
                })
                supabase.auth.signOut()
                window.location.href = data?.[0]?.redirect_url;
            }
        })

    }, [
        getUser,
        getIdForApp,
        uuid,
    ])

    if (successParamter) {
        return <>
            <div className="h-screen bg-black p-5">
                <div className="text-center">
                    <div
                        className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-500 mx-auto"
                    ></div>
                    <h2 className="text-zinc-900 dark:text-white mt-4 animate-pulse ">Loading...</h2>
                    <p className="text-zinc-600 dark:text-zinc-400 animate-pulse">
                        Initializing your stamps and redirecting you back
                    </p>
                </div>
            </div>
        </>
    }


    return (
        <div className="h-screen bg-black"></div>
    )
}

export default Stamps