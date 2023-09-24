import { useEffect, useState } from "react"
import firebase from "lib/firebase"
import { useDispatch } from "react-redux"

import { login, logout } from "../redux/userSlice"

export const useAuth = () => {
  const [loading, setLoading] = useState(true)
  const dispatch = useDispatch()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        const setUserData = {
          id: user.uid,
          avatar: user.photoURL,
          email: user.email,
          name: user.displayName || user.email,
        }
        setUser(setUserData)
        dispatch(login(setUserData as any)) // if a user is found, set user in Redux store
      } else {
        setUser(null)
        dispatch(logout())
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [dispatch])

  return { loading, user }
}

export default useAuth
