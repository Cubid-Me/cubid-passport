import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
const projectId = "6833ed2c1539b9d27e8840c51f53bd0c"
import { injected, metaMask, safe, walletConnect } from 'wagmi/connectors'

export const config = createConfig({
    chains: [mainnet],
    connectors: [
        injected(),
        walletConnect({ projectId }),
        metaMask(),
        safe(),
    ],
    transports: {
        [mainnet.id]: http(),
    },
})