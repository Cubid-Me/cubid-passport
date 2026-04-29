# @cubid/react

React primitives for Cubid profile-completion flows. This package depends on
`@cubid/core` and React only; wallet, chain, and wagmi integrations live in
chain-specific packages.

```tsx
import { CubidProvider, PhoneOtpForm, createCubidApiClient } from "@cubid/react"

const client = createCubidApiClient({
  apiKey: process.env.CUBID_DAPP_API_KEY!,
  baseUrl: "https://passport.cubid.me",
})

export function ProfileCompletion() {
  return (
    <CubidProvider client={client}>
      <PhoneOtpForm onVerified={(result) => console.log(result.isVerified)} />
    </CubidProvider>
  )
}
```

The package exports:

- `CubidProvider`, `useCubidClient`, and `useOptionalCubidClient`
- `PhoneOtpForm` for inline phone collection and verification
- `ProviderConnectButton` for provider/stamp handoff buttons
- `ProfileCompletionPanel` for small composed profile-completion flows
- `createAllowPageUrl`, callback-state helpers, and credential-summary helpers

