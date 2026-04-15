import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ""
import { injected, metaMask, safe, walletConnect } from 'wagmi/connectors'
import { polygon } from "wagmi/chains";

const connectors = [injected(), metaMask(), safe()]

if (typeof window !== 'undefined' && projectId) {
    connectors.splice(1, 0, walletConnect({ projectId }))
}

export const config = createConfig({
    chains: [mainnet,polygon],
    connectors,
    transports: {
        [polygon.id]:http(),
        [mainnet.id]: http(),
    },
})