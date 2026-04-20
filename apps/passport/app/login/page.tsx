// @ts-nocheck
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { OwnID } from "@ownid/react"
import axios from "axios"
import { Guest } from "components/auth/guest"
import firebase from "lib/firebase"
import PhoneInput from "react-phone-input-2"
import { toast } from "react-toastify"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import "react-phone-input-2/lib/style.css"
import {
  authenticateLoginChallengeWithPasskey,
  browserSupportsWebAuthn,
  registerOidcPasskey,
} from "@/lib/oidcPasskeys"
import { insertStamp } from "@/lib/stampInsertion"

export default function AuthenticationPage() {
  const searchParams = useSearchParams()
  const emailField = useRef(null)
  const [emailVal, setEmailVal] = useState("")
  const passwordField = useRef(null)
  const [isEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [oidcChallenge, setOidcChallenge] = useState<any>(null)
  const [oidcLoading, setOidcLoading] = useState(false)
  const [passkeySupported, setPasskeySupported] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [passkeyRegistrationLoading, setPasskeyRegistrationLoading] =
    useState(false)
  const [passkeyLabel, setPasskeyLabel] = useState("My passkey")
  const [pendingOidcRedirect, setPendingOidcRedirect] = useState<any>(null)

  // New states for phone authentication
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOtp] = useState("")
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [verificationId, setVerificationId] = useState(null)
  const recaptchaVerifier = useRef(null)
  const [isPhoneOpen, setIsPhoneOpen] = useState(false)
  const loginChallengeId = searchParams.get("login_challenge")

  useEffect(() => {
    setPasskeySupported(browserSupportsWebAuthn())
  }, [])

  const loadOidcChallenge = useCallback(async () => {
    if (!loginChallengeId) {
      setOidcChallenge(null)
      return
    }

    setOidcLoading(true)
    try {
      const { data } = await axios.get(
        `/api/oidc/interactions/login/${loginChallengeId}`
      )
      setOidcChallenge(data)
    } catch (error) {
      console.error(error)
      toast.error("Unable to load the login challenge")
    } finally {
      setOidcLoading(false)
    }
  }, [loginChallengeId])

  useEffect(() => {
    loadOidcChallenge()
  }, [loadOidcChallenge])

  const getOidcErrorMessage = (error: any, fallback: string) => {
    return (
      error?.response?.data?.error_description ??
      error?.response?.data?.message ??
      fallback
    )
  }

  const completeOidcLogin = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!loginChallengeId) {
        return false
      }

      const { data } = await axios.post(
        `/api/oidc/interactions/login/${loginChallengeId}/complete`,
        payload
      )
      const redirectTo = data?.redirect_to

      if (!redirectTo) {
        throw new Error(
          "OIDC login completion did not return a redirect target"
        )
      }

      if (!data?.session_id) {
        window.location.href = redirectTo
        return true
      }

      setPendingOidcRedirect({
        redirectTo,
        sessionId: data.session_id,
        next: data?.next,
        clientName: oidcChallenge?.client?.client_name,
      })
      return true
    },
    [loginChallengeId, oidcChallenge]
  )

  const continueOidcRedirect = useCallback(() => {
    if (pendingOidcRedirect?.redirectTo) {
      window.location.href = pendingOidcRedirect.redirectTo
    }
  }, [pendingOidcRedirect])

  const registerPasskey = useCallback(async () => {
    setPasskeyRegistrationLoading(true)
    try {
      await registerOidcPasskey({ credentialLabel: passkeyLabel })
      toast.success("Passkey added to your Cubid account")
      continueOidcRedirect()
    } catch (error) {
      console.error(error)
      toast.error(getOidcErrorMessage(error, "Unable to register a passkey"))
    } finally {
      setPasskeyRegistrationLoading(false)
    }
  }, [continueOidcRedirect, passkeyLabel])

  const signInWithPasskey = useCallback(async () => {
    if (!loginChallengeId) {
      toast.info("Passkey sign-in starts from a Login with Cubid request")
      return
    }

    setPasskeyLoading(true)
    try {
      const loginHint =
        emailVal || oidcChallenge?.authorizationRequest?.loginHint
      const data = await authenticateLoginChallengeWithPasskey({
        loginChallengeId,
        loginHint,
      })

      if (!data?.redirect_to) {
        throw new Error(
          "Passkey authentication did not return a redirect target"
        )
      }

      toast.success("Passkey verified")
      window.location.href = data.redirect_to
    } catch (error) {
      console.error(error)
      toast.error(
        getOidcErrorMessage(error, "Unable to sign in with a passkey")
      )
    } finally {
      setPasskeyLoading(false)
    }
  }, [emailVal, loginChallengeId, oidcChallenge])

  const submit = async (values: any) => {
    try {
      const email = emailField.current?.value ?? emailVal
      const {
        data: { data },
      } = await axios.post("/api/supabase/select", {
        match: { email },
        table: "users",
      })
      const credential = await firebase
        .auth()
        .signInWithCustomToken(values.idToken)
      const firebaseIdToken = await credential.user?.getIdToken()

      if (!firebaseIdToken) {
        throw new Error("Unable to create a Firebase login assertion")
      }

      if (!data?.[0]) {
        await axios.post(`/api/supabase/insert`, {
          table: "users",
          body: { email },
        })
        const {
          data: { data: newData },
        } = await axios.post("/api/supabase/select", {
          match: { email },
          table: "users",
        })
        insertStamp({
          stamp_type: "email",
          user_data: { user_id: newData?.[0]?.id, uuid: "" },
          stampData: {
            identity: email,
            uniquevalue: email,
          },
          app_id: parseInt(process.env.NEXT_PUBLIC_DAPP_ID ?? "0"),
          is_auth: true,
        })
      }

      if (
        await completeOidcLogin({
          firebase_id_token: firebaseIdToken,
          verified_email: email,
          authentication_methods: ["email_ownid"],
        })
      ) {
        return
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
        recaptchaVerifier.current.reset()
      },
    })
    try {
      const confirmationResult = await firebase
        .auth()
        .signInWithPhoneNumber(phoneNumber, appVerifier)
      const {
        data: { data },
      } = await axios.post("/api/supabase/select", {
        match: { phone: phoneNumber },
        table: "users",
      })
      if (!data?.[0]) {
        await axios.post(`/api/supabase/insert`, {
          table: "users",
          body: { phone: phoneNumber },
        })
        const {
          data: { data: newData },
        } = await axios.post("/api/supabase/select", {
          match: { phone: phoneNumber },
          table: "users",
        })
        insertStamp({
          stamp_type: "phone",
          user_data: { user_id: newData?.[0]?.id, uuid: "" },
          stampData: {
            identity: phoneNumber,
            uniquevalue: phoneNumber,
          },
          app_id: 33,
          is_auth: true,
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
      const credential = firebase.auth.PhoneAuthProvider.credential(
        verificationId,
        otp
      )
      try {
        const result = await firebase.auth().signInWithCredential(credential)
        const firebaseIdToken = await result.user?.getIdToken()

        if (!firebaseIdToken) {
          throw new Error("Unable to create a Firebase login assertion")
        }

        if (
          await completeOidcLogin({
            firebase_id_token: firebaseIdToken,
            verified_phone: phoneNumber,
            authentication_methods: ["phone_otp", "firebase_phone"],
          })
        ) {
          return
        }

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
              className="mr-2 size-6"
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
                {oidcChallenge?.client?.client_name
                  ? `Continue to ${oidcChallenge.client.client_name}`
                  : "Authenticate"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {oidcChallenge?.requested_scopes?.length
                  ? `Verify your email or phone to continue the OIDC sign-in request for scopes: ${oidcChallenge.requested_scopes.join(
                      ", "
                    )}`
                  : "Enter your email below to authenticate"}
              </p>
              {oidcLoading && (
                <p className="text-xs text-muted-foreground">
                  Loading sign-in challenge...
                </p>
              )}
            </div>
            {pendingOidcRedirect ? (
              <div className="rounded-lg border bg-white p-4 text-left shadow-sm">
                <h2 className="text-lg font-semibold">Add a passkey?</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  You are verified for{" "}
                  {pendingOidcRedirect.clientName ?? "this app"}. Add a passkey
                  now for faster, phishing-resistant Login with Cubid next time,
                  or continue with OTP recovery available as a fallback.
                </p>
                <Input
                  className="mt-4"
                  value={passkeyLabel}
                  onChange={(event) => setPasskeyLabel(event.target.value)}
                  placeholder="Passkey label"
                />
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={registerPasskey}
                    disabled={!passkeySupported || passkeyRegistrationLoading}
                  >
                    {passkeyRegistrationLoading
                      ? "Creating passkey..."
                      : "Create passkey"}
                  </Button>
                  <Button variant="outline" onClick={continueOidcRedirect}>
                    Skip for now
                  </Button>
                </div>
                {!passkeySupported && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    This browser does not support passkeys. You can continue
                    with OTP recovery.
                  </p>
                )}
              </div>
            ) : (
              <>
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
                  </>
                )}

                <Input
                  type="password"
                  style={{ display: "none" }}
                  ref={passwordField}
                  placeholder="password"
                />

                <div
                  style={{ width: 30, textAlign: "center", paddingLeft: "4px" }}
                >
                  {loading && (
                    <div>
                      {/* Loading Spinner */}
                      <svg
                        aria-hidden="true"
                        className="mr-2 size-8 animate-spin fill-blue-600 text-gray-200 dark:text-gray-600"
                        viewBox="0 0 100 101"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {/* SVG paths */}
                      </svg>
                    </div>
                  )}
                </div>

                {loginChallengeId && (
                  <div className="rounded-lg border bg-white p-3 text-left shadow-sm">
                    <p className="text-sm font-medium">
                      Returning to Login with Cubid?
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Use your passkey first. Email or phone OTP remains
                      available for bootstrap and recovery.
                    </p>
                    <Button
                      className="mt-3 w-full"
                      variant="outline"
                      onClick={signInWithPasskey}
                      disabled={!passkeySupported || passkeyLoading}
                    >
                      {passkeyLoading
                        ? "Checking passkey..."
                        : "Continue with passkey"}
                    </Button>
                  </div>
                )}

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
                        appId: process.env.NEXT_PUBLIC_OWNID_APP_ID ?? "",
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
                        className="mt-3"
                        placeholder="Enter OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                      />
                    )}
                    {!isOtpSent && <div className="mt-2" id="catcha-id"></div>}
                    <div className="flex space-x-2 ">
                      <Button
                        id="send-otp-button"
                        onClick={sendOtp}
                        className="my-3"
                        disabled={loading || isOtpSent}
                      >
                        Send OTP
                      </Button>
                      {isOtpSent && (
                        <Button
                          className="my-3"
                          onClick={verifyOtp}
                          disabled={loading}
                        >
                          Verify OTP
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Guest>
  )
}
