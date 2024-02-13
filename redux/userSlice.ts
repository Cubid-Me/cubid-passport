import { createSlice } from "@reduxjs/toolkit"
import { signOut } from "firebase/auth"
import firebase from "lib/firebase"

export const userSlice = createSlice({
  name: "user",
  initialState: null, // initial state is null indicating no user
  reducers: {
    login: (state: any, action: any) => action.payload,
    logout: () => {
      signOut(firebase.auth())
      return null
    },
  },
})

export const { login, logout } = userSlice.actions
export const selectUser = (state: any) => state.user
export default userSlice.reducer
