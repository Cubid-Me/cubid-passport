import {
  createContext,
  startTransition,
  useContext,
  useId,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react"

export { createCubidApiClient, CubidApiError } from "@cubid/core"
export type {
  CubidApiClient,
  CubidSendPhoneOtpResponse,
  CubidVerifyPhoneOtpResponse,
} from "@cubid/core"

import type {
  CubidApiClient,
  CubidSendPhoneOtpResponse,
  CubidVerifyPhoneOtpResponse,
} from "@cubid/core"

export const CUBID_PROFILE_PROVIDERS = [
  "discord",
  "github",
  "google",
  "instagram",
  "linkedin",
  "twitter",
  "worldcoin",
] as const

export type CubidProfileProvider = (typeof CUBID_PROFILE_PROVIDERS)[number]
export type CubidCredentialType = CubidProfileProvider | "email" | "phone"

export type CubidCredentialSummaryInput = {
  availableStampTypes?: readonly string[]
  recommendedStampTypes?: readonly string[]
  verifiedStampTypes?: readonly string[]
}

export type CubidCredentialSummary = {
  availableStampTypes: string[]
  missingRecommendedStampTypes: string[]
  recommendedStampTypes: string[]
  verifiedStampTypes: string[]
}

export type CubidAllowPageUrlInput = {
  colorMode?: string
  extras?: Record<string, boolean | number | string | undefined>
  pageId?: number | string
  passportOrigin: string
  path?: "/allow" | "/widget-allow"
  socialProvider?: CubidProfileProvider
  success?: boolean
  userId?: string
}

export type CubidCallbackState = {
  metadata?: Record<string, string>
  nonce?: string
  pageId?: string
  provider: CubidProfileProvider
  returnTo?: string
  userId?: string
}

export type CubidProviderConnectDetails = {
  provider: CubidProfileProvider
  state?: CubidCallbackState | string
  url?: string
}

export type CubidAuthorizationRequest = {
  authorizationUrl: string
  clientId: string
  extraParams?: Record<string, boolean | number | string | undefined>
  redirectUri: string
  responseType?: string
  scope?: string | string[]
  state?: CubidCallbackState | string
}

const CubidContext = createContext<CubidApiClient | null>(null)

export type CubidProviderProps = {
  children: ReactNode
  client: CubidApiClient
}

export function CubidProvider({ children, client }: CubidProviderProps) {
  return <CubidContext.Provider value={client}>{children}</CubidContext.Provider>
}

export function useOptionalCubidClient() {
  return useContext(CubidContext)
}

export function useCubidClient() {
  const client = useOptionalCubidClient()

  if (!client) {
    throw new Error("A Cubid API client was not found in context.")
  }

  return client
}

export function summarizeCredentials(
  input: CubidCredentialSummaryInput
): CubidCredentialSummary {
  const availableStampTypes = [...new Set(input.availableStampTypes ?? [])].sort()
  const recommendedStampTypes = [
    ...new Set(input.recommendedStampTypes ?? []),
  ].sort()
  const verifiedStampTypes = [...new Set(input.verifiedStampTypes ?? [])].sort()
  const verified = new Set(verifiedStampTypes)

  return {
    availableStampTypes,
    missingRecommendedStampTypes: recommendedStampTypes.filter(
      (stampType) => !verified.has(stampType)
    ),
    recommendedStampTypes,
    verifiedStampTypes,
  }
}

export function createAllowPageUrl(input: CubidAllowPageUrlInput): string {
  const url = new URL(input.path ?? "/allow", input.passportOrigin)
  if (input.userId) {
    url.searchParams.set("uid", input.userId)
  }
  if (input.pageId !== undefined) {
    url.searchParams.set("page_id", String(input.pageId))
  }
  if (input.colorMode) {
    url.searchParams.set("colormode", input.colorMode)
  }
  if (input.socialProvider) {
    url.searchParams.set("social_provider", input.socialProvider)
  }
  if (input.success !== undefined) {
    url.searchParams.set("success", String(input.success))
  }
  for (const [key, value] of Object.entries(input.extras ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4 || 4)) % 4)}`
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function createCubidCallbackState(state: CubidCallbackState): string {
  return encodeBase64Url(JSON.stringify(state))
}

export function parseCubidCallbackState(encodedState: string): CubidCallbackState {
  const parsed = JSON.parse(decodeBase64Url(encodedState)) as unknown

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Malformed Cubid callback state.")
  }

  const state = parsed as Record<string, unknown>
  if (typeof state.provider !== "string") {
    throw new Error("Cubid callback state is missing the provider.")
  }

  return {
    metadata:
      typeof state.metadata === "object" &&
      state.metadata !== null &&
      !Array.isArray(state.metadata)
        ? Object.fromEntries(
            Object.entries(state.metadata).filter(
              (entry): entry is [string, string] => typeof entry[1] === "string"
            )
          )
        : undefined,
    nonce: typeof state.nonce === "string" ? state.nonce : undefined,
    pageId: typeof state.pageId === "string" ? state.pageId : undefined,
    provider: state.provider as CubidProfileProvider,
    returnTo: typeof state.returnTo === "string" ? state.returnTo : undefined,
    userId: typeof state.userId === "string" ? state.userId : undefined,
  }
}

export function buildCubidAuthorizationUrl(
  request: CubidAuthorizationRequest
): string {
  const url = new URL(request.authorizationUrl)
  url.searchParams.set("client_id", request.clientId)
  url.searchParams.set("redirect_uri", request.redirectUri)
  url.searchParams.set("response_type", request.responseType ?? "code")
  if (request.scope) {
    url.searchParams.set(
      "scope",
      Array.isArray(request.scope) ? request.scope.join(" ") : request.scope
    )
  }
  if (request.state) {
    url.searchParams.set(
      "state",
      typeof request.state === "string"
        ? request.state
        : createCubidCallbackState(request.state)
    )
  }
  for (const [key, value] of Object.entries(request.extraParams ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

export type PhoneOtpFormProps = Omit<
  ComponentPropsWithoutRef<"form">,
  "onSubmit"
> & {
  client?: CubidApiClient
  defaultPhone?: string
  onError?: (error: unknown) => void
  onStarted?: (result: CubidSendPhoneOtpResponse) => Promise<void> | void
  onVerified?: (result: CubidVerifyPhoneOtpResponse) => Promise<void> | void
}

export function PhoneOtpForm({
  client,
  defaultPhone = "",
  onError,
  onStarted,
  onVerified,
  ...formProps
}: PhoneOtpFormProps) {
  const contextualClient = useOptionalCubidClient()
  const resolvedClient = client ?? contextualClient ?? undefined
  const phoneId = useId()
  const otpId = useId()
  const [phone, setPhone] = useState(defaultPhone)
  const [otp, setOtp] = useState("")
  const [step, setStep] = useState<"collect" | "verified" | "verify">("collect")
  const [isBusy, setIsBusy] = useState(false)
  const [status, setStatus] = useState<string>()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsBusy(true)

    try {
      if (!resolvedClient) {
        throw new Error("PhoneOtpForm requires a Cubid API client.")
      }

      if (step === "collect") {
        const result = await resolvedClient.sendPhoneOtp({ phone })
        await onStarted?.(result)
        startTransition(() => {
          setStatus(result.status ?? "Code sent.")
          setStep("verify")
        })
      } else if (step === "verify") {
        const result = await resolvedClient.verifyPhoneOtp({ otp, phone })
        await onVerified?.(result)
        startTransition(() => {
          setStatus(result.isVerified ? "Phone verified." : "Verification failed.")
          setStep(result.isVerified ? "verified" : "verify")
        })
      }
    } catch (error) {
      startTransition(() => setStatus("Unable to complete phone verification."))
      onError?.(error)
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <form {...formProps} onSubmit={handleSubmit}>
      <label htmlFor={phoneId}>Phone</label>
      <input
        autoComplete="tel"
        disabled={isBusy || step === "verified"}
        id={phoneId}
        onChange={(event) => setPhone(event.target.value)}
        type="tel"
        value={phone}
      />
      {step !== "collect" ? (
        <>
          <label htmlFor={otpId}>Code</label>
          <input
            autoComplete="one-time-code"
            disabled={isBusy || step === "verified"}
            id={otpId}
            inputMode="numeric"
            onChange={(event) => setOtp(event.target.value)}
            value={otp}
          />
        </>
      ) : null}
      <button disabled={isBusy} type="submit">
        {step === "collect"
          ? "Send phone code"
          : step === "verify"
            ? "Verify phone code"
            : "Phone verified"}
      </button>
      <p aria-live="polite">{status}</p>
    </form>
  )
}

export type ProviderConnectButtonProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "onClick"
> & {
  authorizationRequest?: CubidAuthorizationRequest
  authorizationUrl?: string
  navigate?: boolean
  onConnect?: (details: CubidProviderConnectDetails) => Promise<void> | void
  provider: CubidProfileProvider
}

export function ProviderConnectButton({
  authorizationRequest,
  authorizationUrl,
  children,
  navigate = false,
  onConnect,
  provider,
  type = "button",
  ...buttonProps
}: ProviderConnectButtonProps) {
  async function handleClick() {
    const url =
      authorizationUrl ??
      (authorizationRequest
        ? buildCubidAuthorizationUrl(authorizationRequest)
        : undefined)

    await onConnect?.({
      provider,
      state: authorizationRequest?.state,
      url,
    })

    if (navigate && url && typeof window !== "undefined") {
      window.location.assign(url)
    }
  }

  return (
    <button {...buttonProps} onClick={handleClick} type={type}>
      {children ?? `Connect ${provider}`}
    </button>
  )
}

export type ProfileCompletionPanelProps = ComponentPropsWithoutRef<"section"> & {
  client?: CubidApiClient
  phone?: false | { defaultPhone?: string }
  providers?: Array<{
    authorizationRequest?: CubidAuthorizationRequest
    authorizationUrl?: string
    provider: CubidProfileProvider
  }>
}

export function ProfileCompletionPanel({
  client,
  phone = {},
  providers = [],
  ...sectionProps
}: ProfileCompletionPanelProps) {
  return (
    <section {...sectionProps}>
      {phone !== false ? (
        <PhoneOtpForm client={client} defaultPhone={phone.defaultPhone} />
      ) : null}
      {providers.length > 0 ? (
        <div>
          {providers.map((providerConfig) => (
            <ProviderConnectButton
              authorizationRequest={providerConfig.authorizationRequest}
              authorizationUrl={providerConfig.authorizationUrl}
              key={providerConfig.provider}
              provider={providerConfig.provider}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
