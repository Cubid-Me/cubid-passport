"use client"

import { EthereumClient, w3mConnectors, w3mProvider } from "@web3modal/ethereum"
import { Web3Modal as Modal } from "@web3modal/react"
import { WagmiConfig, configureChains, createConfig } from "wagmi"
import { mainnet, optimism, polygon } from "wagmi/chains"

// 1. Get projectID at https://cloud.walletconnect.com
if (!process.env.NEXT_PUBLIC_PROJECT_ID) {
  throw new Error("You need to provide NEXT_PUBLIC_PROJECT_ID env variable")
}
const projectId = 'a22385802b21cd5e16bdba9cbe7c7de0'

// 2. Configure wagmi client
const chains = [mainnet, polygon, optimism]

const { publicClient } = configureChains(chains, [w3mProvider({ projectId })])
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: w3mConnectors({ chains, projectId }),
  publicClient,
})

// 3. Configure modal ethereum client
const ethereumClient = new EthereumClient(wagmiConfig, chains)

// 4. Wrap your app with WagmiProvider and add <Web3Modal /> compoennt
export function Web3Modal({ children }: any) {
  return (
    <>
      <Modal config={wagmiConfig}>{children}</Modal>

      <Web3Modal projectId={projectId} ethereumClient={ethereumClient} />
    </>
  )
}
