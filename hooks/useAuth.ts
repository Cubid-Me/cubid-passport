import { useCallback, useEffect, useState } from "react"
import axios from "axios"
import firebase from "lib/firebase"
import { useDispatch } from "react-redux"

import { login, logout } from "../redux/userSlice"

export const useAuth = () => {
  const [loading, setLoading] = useState(true)
  const dispatch = useDispatch()
  const [user, setUser] = useState<any>(null)
  const [supabaseUser, setSupabaseUser] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        const setUserData = {
          id: user.uid,
          avatar: user.photoURL,
          email: user.email,
          name: user.displayName || user.email,
        }
        localStorage.setItem("email", user.email ?? "")
        setUser(setUserData)
        dispatch(login(setUserData as any)) // if a user is found, set user in Redux store
      } else {
        setUser(null)
        localStorage.removeItem("email")
        dispatch(logout())
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [dispatch])

  useEffect(() => {
    ;(async () => {
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
    })()
  }, [user])

  const getUser = useCallback(async () => {
    const {
      data: { data: dbData },
    } = await axios.post("/api/supabase/select", {
      table: "users",
      match: {
        email: localStorage.getItem("email"),
      },
    })
    return dbData?.[0]
  }, [])

  return { loading, user, supabaseUser, getUser }
}

export default useAuth
