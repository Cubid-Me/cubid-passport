// @ts-nocheck
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Metadata } from "next"
import Image from "next/image"
import { OwnID } from "@ownid/react"
import axios from "axios"
import { Guest } from "components/auth/guest"
import firebase from "lib/firebase"
import { toast } from "react-toastify"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function debounce(func: any, delay: any) {
  let timeoutId: any
  return (...args: any) => {
    clearTimeout(timeoutId as any)
    timeoutId = setTimeout(() => {
      func.apply(this as any, args)
    }, delay)
  }
}

export default function AuthenticationPage() {
  const emailField = useRef(null)
  const [emailVal, setEmailVal] = useState("")
  const passwordField = useRef(null)
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const submit = async (values: any) => {
    try {
      await firebase.auth().signInWithCustomToken(values.idToken)
      // axios.post('/api/login-create-user',{
      //   email
      // })
      toast.success("Successfully logged into cubid")
    } catch (err) {
      console.error(err)
      toast.error("An error while authenticating user")
    }
  }

  const checkIfEmailExists = useCallback(
    debounce(async (userEmail: string) => {
      const { data } = await axios.post("/api/supabase/select", {
        match: {
          email: userEmail,
        },
        table: "users",
      })
      if (Boolean(data?.data?.[0])) {
        setIsEnabled(true)
      } else {
        setIsEnabled(false)
      }
      setLoading(false)
    }, 1000),
    []
  )

  return (
    <Guest>
      <div
        className="container relative mt-20 h-[100vh] flex-col items-center
       justify-center md:mt-0 md:grid lg:max-w-none lg:grid-cols-2 lg:px-0"
      >
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
          <div className="absolute inset-0 bg-zinc-900" />
          <div className="relative z-20 flex items-center text-lg font-medium">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-6 w-6"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            Cubid Passport Inc
          </div>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg">
                {`"Welcome to the cubid passort, proof of humanity on web3 and the new internet"`}
              </p>
              <footer className="text-sm">Noak</footer>
            </blockquote>
          </div>
        </div>
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
              <p className="text-sm text-muted-foreground">
                Enter your email below to authenticate
              </p>
            </div>
            <Input
              type="email"
              onChange={(e) => {
                setLoading(true)
                setEmailVal(e.target.value)
                checkIfEmailExists(e.target.value)
              }}
              ref={emailField}
              placeholder="Email"
            />
            <Input
              type="password"
              style={{ display: "none" }}
              ref={passwordField}
              placeholder="password"
            />
            <div style={{ width: 30, textAlign: "center", paddingLeft: "4px" }}>
              {loading && (
                <div>
                  <svg
                    aria-hidden="true"
                    className="mr-2 h-8 w-8 animate-spin fill-blue-600 text-gray-200 dark:text-gray-600"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="currentFill"
                    />
                  </svg>
                </div>
              )}
            </div>
            {!isEnabled && (
              <button
                style={{
                  backgroundColor: "#0070f2",
                  color: "white",
                  padding: 10,
                  paddingTop: 5,
                  height: 40,
                  fontSize:14,
                  paddingBottom: 5,
                  opacity: 0.4,
                  borderRadius: 5,
                  width: 90,
                  border: "1px solid #fff",
                }}
              >
                Continue
              </button>
            )}
            {!loading && isEnabled && (
              <div
                style={
                  !loading && isEnabled
                    ? {}
                    : { opacity: 0.4, pointerEvents: "none" }
                }
              >
                <OwnID
                  type="login"
                  options={{
                    appId: "p0zfroqndmvm30",
                    variant: "ownid-auth-button",
                    infoTooltip: true,
                    widgetPosition: "start",
                  }}
                  onLogin={submit}
                  infoTooltip={true}
                  passwordField={passwordField}
                  loginIdField={emailField}
                  onError={(error) => console.log(error, "error")}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Guest>
  )
}
