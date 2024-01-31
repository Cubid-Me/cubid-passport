// 'use client'

// // import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi1/react'

// import { WagmiConfig } from 'wagmi'
// import { arbitrum, mainnet } from 'viem/chains'

// // 1. Get projectId at https://cloud.walletconnect.com
// const projectId = '6833ed2c1539b9d27e8840c51f53bd0c'

// // 2. Create wagmiConfig
// const metadata = {
//   name: 'Web3Modal',
//   description: 'Web3Modal Example',
//   url: 'https://web3modal.com',
//   icons: ['https://avatars.githubusercontent.com/u/37784886']
// }

// const chains = [mainnet, arbitrum]
// const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata })

// // 3. Create modal
// createWeb3Modal({
//   wagmiConfig,
//   projectId,
//   chains,
//   enableAnalytics: true // Optional - defaults to your Cloud configuration
// })

// export function Web3Modal({ children }:any) {
//   return <WagmiConfig config={wagmiConfig}>{children}</WagmiConfig>
// }