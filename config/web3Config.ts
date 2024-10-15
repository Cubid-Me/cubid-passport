import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
const projectId = "6833ed2c1539b9d27e8840c51f53bd0c"
import { injected, metaMask, safe, walletConnect } from 'wagmi/connectors'
import { polygon } from "wagmi/chains";

export const config = createConfig({
    chains: [mainnet,polygon],
    connectors: [
        injected(),
        walletConnect({ projectId }),
        metaMask(),
        safe(),
    ],
    transports: {
        [polygon.id]:http(),
        [mainnet.id]: http(),
    },
})