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
import PhoneInput from "react-phone-input-2"
import "react-phone-input-2/lib/style.css"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

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
  const [isEnabled, setIsEnabled] = useState(true)
  const [loading, setLoading] = useState(false)

  // New states for phone authentication
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOtp] = useState("")
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [verificationId, setVerificationId] = useState(null)
  const recaptchaVerifier = useRef(null);
  const [isPhoneOpen, setIsPhoneOpen] = useState(false)

  const submit = async (values: any) => {
    try {
      localStorage.setItem("email", emailField.current.value)
      const { data: { data } } = await axios.post("/api/supabase/select", {
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
      toast.error("An error occurred while authenticating user")
    }
  }




  const sendOtp = async () => {
    setLoading(true)
    let appVerifier = new firebase.auth.RecaptchaVerifier("catcha-id", {
      size: "normal", // Set to 'normal' for testing purposes to see the widget
      callback: (response) => {
        console.log(response)
        // reCAPTCHA solved - allow OTP to be sent
      },
      "expired-callback": () => {
        // Handle reCAPTCHA expiration
        recaptchaVerifier.current.reset();
      },
    });
    try {
      const confirmationResult = await firebase.auth().signInWithPhoneNumber(
        phoneNumber,
        appVerifier
      );
      const { data: { data } } = await axios.post("/api/supabase/select", {
        match: { unique_phone: phoneNumber },
        table: "users",
      })
      if (!data?.[0]) {
        await axios.post(`/api/supabase/insert`, {
          table: "users",
          body: { unique_phone: phoneNumber },
        })
      }
      setVerificationId(confirmationResult.verificationId)
      setIsOtpSent(true)
      toast.success("OTP sent successfully")
    } catch (err) {
      console.error(err)
      toast.error("Error sending OTP")
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    if (verificationId && otp) {
      const credential = firebase.auth.PhoneAuthProvider.credential(verificationId, otp)
      try {
        await firebase.auth().signInWithCredential(credential)
        toast.success("Successfully logged into cubid")
      } catch (err) {
        console.error(err)
        toast.error("Invalid OTP")
      }
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
                {`"Welcome to the cubid passport, proof of humanity on web3 and the new internet"`}
              </p>
              <footer className="text-sm">Noak</footer>
            </blockquote>
          </div>
        </div>
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Authenticate
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your email below to authenticate
              </p>
            </div>
            {!isPhoneOpen && (
              <>
                <Input
                  type="email"
                  onChange={(e) => {
                    setEmailVal(e.target.value)
                  }}
                  ref={emailField}
                  placeholder="Email"
                />
                {!isEnabled && (
                  <button
                    style={{
                      backgroundColor: "#0070f2",
                      color: "white",
                      padding: 10,
                      paddingTop: 5,
                      height: 40,
                      fontSize: 14,
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
              </>
            )}

            <Input
              type="password"
              style={{ display: "none" }}
              ref={passwordField}
              placeholder="password"
            />

            <div style={{ width: 30, textAlign: "center", paddingLeft: "4px" }}>
              {loading && (
                <div>
                  {/* Loading Spinner */}
                  <svg
                    aria-hidden="true"
                    className="mr-2 h-8 w-8 animate-spin fill-blue-600 text-gray-200 dark:text-gray-600"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* SVG paths */}
                  </svg>
                </div>
              )}
            </div>


            <Button
              id="send-otp-button"
              onClick={() => {
                setIsPhoneOpen(!isPhoneOpen)
              }}
            >
              Use {isPhoneOpen ? "Email" : "Phone"}
            </Button>

            {!loading && isEnabled && !isPhoneOpen && (
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
            {isPhoneOpen && (
              <div>
                {/* Phone Authentication Fields with react-phone-input-2 */}
                <PhoneInput
                  country={"us"}

                  inputClass="!text-black"
                  value={phoneNumber}
                  onChange={(phone) => setPhoneNumber(`+${phone}`)}
                  inputProps={{
                    name: "phone",
                    required: true,
                    autoFocus: true,
                  }}
                  placeholder="Phone Number"
                />
                {isOtpSent && (
                  <Input
                    type="text"
                    id="OTPID"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                )}
                {!isOtpSent && (
                  <div className="mt-2" id="catcha-id"></div>
                )}
                <Button
                  id="send-otp-button"
                  onClick={sendOtp}
                  className="my-3"
                  disabled={loading || isOtpSent}
                >
                  Send OTP
                </Button>
                {isOtpSent && (
                  <Button onClick={verifyOtp} disabled={loading}>
                    Verify OTP
                  </Button>
                )}

              </div>
            )}
          </div>
        </div>

      </div>
    </Guest>
  )
}
