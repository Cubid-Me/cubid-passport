import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import axios from "axios"
import firebase from "lib/firebase"
import { useDispatch } from "react-redux"

import { login, logout } from "../redux/userSlice"

type hookProps =
  | {
    appId?: number
  }
  | undefined

export const useAuth = (appHookProps: hookProps) => {
  const appId = appHookProps?.appId
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
        const {
          data: { data: dbData },
        } = await axios.post("/api/supabase/select", {
          table: "users",
          match: {
            email: localStorage.getItem("email") ?? user?.email,
          },
        })
        setSupabaseUser(dbData?.[0])
      }
      if (user?.phone) {
        const {
          data: { data: dbData },
        } = await axios.post("/api/supabase/select", {
          table: "users",
          match: {
            phone: localStorage.getItem("phone") ?? user?.phone,
          },
        })
        setSupabaseUser({ ...dbData?.[0], phone: user?.phone })
      }
    })()
  }, [user])

  const getUser = useCallback(async () => {
    if (!localStorage.getItem("unauthenticated_user")) {
      const {
        data: { data: dbData },
      } = await axios.post("/api/supabase/select", {
        table: "users",
        match: {
          email: localStorage.getItem("email") ?? localStorage.getItem("phone"),
        },
      })
      return dbData?.[0]
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
  }, [appId, searchParams])

  return { loading, user, supabaseUser, getUser }
}

export default useAuth
