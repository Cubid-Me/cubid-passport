import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import axios from "axios"
import firebase from "lib/firebase"
import { useDispatch } from "react-redux"

import { findPassportUserByIdentity } from "@/lib/passportDataApi"

import { login, logout } from "../redux/userSlice"

type hookProps =
  | {
    appId?: number
  }
  | undefined

export const useAuth = (appHookProps: hookProps) => {
  const [loading, setLoading] = useState(true)
  const dispatch = useDispatch()
  const searchParams: any = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [supabaseUser, setSupabaseUser] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        const setUserData = {
          id: user.uid,
          avatar: user.photoURL,
          email: user.email,
          phone: user.phoneNumber,
          name: user.displayName || user.email,
        }
        localStorage.setItem("email", user.email ?? "")
        localStorage.setItem("phone", user.phoneNumber ?? "")
        localStorage.removeItem("unauthenticated_user")
        setUser(setUserData)
        dispatch(login(setUserData as any)) // if a user is found, set user in Redux store
      } else {
        setUser(null)
        localStorage.setItem("unauthenticated_user", "true")
        localStorage.removeItem("email")
        localStorage.removeItem("phone")
        dispatch(logout())
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [dispatch])

  useEffect(() => {
    ; (async () => {
      if (user?.email) {
        const dbData = await findPassportUserByIdentity({
          email: localStorage.getItem("email") ?? user?.email ?? undefined,
        })
        setSupabaseUser(dbData)
      }
      if (user?.phone) {
        const dbData = await findPassportUserByIdentity({
          phone: localStorage.getItem("phone") ?? user?.phone ?? undefined,
        })
        setSupabaseUser(dbData ? { ...dbData, phone: user?.phone } : null)
      }
    })()
  }, [user])

  const getUser = useCallback(async () => {
    if (!localStorage.getItem("unauthenticated_user")) {
      const storedEmail = localStorage.getItem("email") ?? undefined
      const storedPhone = localStorage.getItem("phone") ?? undefined
      return findPassportUserByIdentity({
        email: storedEmail,
        phone: storedEmail ? undefined : storedPhone,
      })
    } else {
      if (
        typeof localStorage.getItem("unauthenticated_user") === "string" &&
        localStorage.getItem("unauthenticated_user") !== "undefined"
      ) {
        const { data } = await axios.post("/api/allow/fetch_allow_uid", {
          uid: searchParams.get("uid"),
          page_id: searchParams.get("page_id")
        })
        return { ...data?.dapp_users[0].users, ...data }
      }

    }
  }, [searchParams])

  return { loading, user, supabaseUser, getUser }
}

export default useAuth
