'use client'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createWeb3Modal } from "@web3modal/wagmi/react"
import { defaultWagmiConfig } from "@web3modal/wagmi/react/config"
import { State, WagmiProvider, cookieStorage, createStorage } from "wagmi"
import { mainnet, sepolia } from "wagmi/chains"

// Setup queryClient
const queryClient = new QueryClient()

// Get projectId at https://cloud.walletconnect.com
export const projectId = '6833ed2c1539b9d27e8840c51f53bd0c'

if (!projectId) throw new Error("Project ID is not defined")

const metadata = {
  name: "Web3Modal",
  description: "Web3Modal Example",
  url: "https://web3modal.com", // origin must match your domain & subdomain
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
}

// Create wagmiConfig
export const config = defaultWagmiConfig({
  chains: [mainnet, sepolia], // required
  projectId, // required
  metadata, // required
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  enableWalletConnect: true, // Optional - true by default
  enableInjected: true, // Optional - true by default
  enableEIP6963: true, // Optional - true by default
  enableCoinbase: true, // Optional - true by default
})

// Create modal
createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: true, // Optional - defaults to your Cloud configuration
})

export function Web3Modal({
  children,
  initialState,
}: {
  children: JSX.Element;
  initialState?: State
}) {
  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
