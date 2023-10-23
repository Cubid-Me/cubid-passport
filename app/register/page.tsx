"use client"

import { useRef, useState } from "react"
import { Metadata } from "next"
import Image from "next/image"
import { OwnID } from "@ownid/react"
import axios from "axios"
import { Guest } from "components/auth/guest"
import firebase from "lib/firebase"
import { toast } from "react-toastify"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function AuthenticationPage() {
  const emailField: any = useRef(null)
  const passwordField = useRef(null)

  const submit = async (values: any) => {
    console.log(values, "values")
    try {
      localStorage.setItem("email", emailField.current.value)

      const data: any = await axios.post("/api/supabase/select", {
        match: { email: emailField.current.value },
        table: "users",
      })
      await firebase.auth().signInWithCustomToken(values.idToken)

      if (!data?.[0]) {
        await axios.post(`/api/supabase/insert`, {
          table: "users",
          body: { email: localStorage.getItem("email") },
        })
      }
      toast.success("Successfully logged into cubid")
    } catch (err) {
      console.error(err)
      toast.error("An error while authenticating user")
    }
  }

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
              <h1 className="text-2xl font-semibold tracking-tight">
                Register
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your email below to authenticate
              </p>
            </div>
            <Input type="email" ref={emailField} placeholder="Email" />
            <Input
              type="password"
              style={{ display: "none" }}
              ref={passwordField}
              placeholder="password"
            />
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
        </div>
      </div>
    </Guest>
  )
}
