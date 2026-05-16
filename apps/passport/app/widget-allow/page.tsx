/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
"use client"

import React, { useCallback, useEffect } from "react"

import "@near-wallet-selector/modal-ui/styles.css"
import { useSearchParams } from "next/navigation"

import useAuth from "@/hooks/useAuth"
import { useCreatedByAppId } from "@/hooks/useCreatedByApp"
import { findPassportDappPageById } from "@/lib/passportDataApi"


import { encode_data } from "../../lib/encode_data"
import { supabase } from "../../lib/supabase"
import { insertStamp, stampsWithId } from "@/lib/stampInsertion"
import axios from "axios"


const Stamps = ({
    stampToRender,
}: any) => {
    const searchParams: any = useSearchParams()

    const signInWithSocial = useCallback(async (socialName: any) => {
        localStorage.clear()
        await supabase.auth.signOut()
        localStorage.setItem("socialName", socialName)
        await supabase.auth.signInWithOAuth({
            provider: socialName,
            options: {
                redirectTo: `${window.location.href}&success=true`,

            },
        })
    }, [])
    const successParamter = searchParams.get("success")

    useEffect(() => {
        if (!successParamter) {
            const social_provider_to_trigger = searchParams.get("social_provider")
            signInWithSocial(social_provider_to_trigger)
        }
    }, [searchParams, signInWithSocial, successParamter])

    const { getUser } = useAuth({})
    const { getIdForApp } = useCreatedByAppId()

    const uuid = searchParams.get("uid")

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                const { user_metadata } = session?.user
                const providerKey: any = localStorage.getItem("socialName") ?? ""
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

                const data = await findPassportDappPageById(parseInt(page_id))
                supabase.auth.signOut()
                window.location.href = data?.redirect_url;
            }
        })
        return () => authListener.subscription.unsubscribe()

    }, [
        getUser,
        getIdForApp,
        searchParams,
        uuid,
    ])

    if (successParamter) {
        return <>
            <div className="h-screen bg-black p-5">
                <div className="text-center">
                    <div
                        className="mx-auto size-16 animate-spin rounded-full border-4 border-dashed border-blue-500"
                    ></div>
                    <h2 className="mt-4 animate-pulse text-zinc-900 dark:text-white ">Loading...</h2>
                    <p className="animate-pulse text-zinc-600 dark:text-zinc-400">
                        Initializing your credentials and redirecting you back
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
