import CoinbaseWalletSDK from "@coinbase/wallet-sdk"
import WalletConnect from "@walletconnect/web3-provider"
import { InjectedConnector } from "@web3-react/injected-connector";

const infuraKey = "6f111f744ee54510a941cfee4716c3db"

export const providerOptions = {
  coinbasewallet: {
    package: CoinbaseWalletSDK,
    options: {
      appName: "Web 3 Modal Demo",
      infuraId: infuraKey,
    },
  },
  walletconnect: {
    package: WalletConnect,
    options: {
      infuraId: infuraKey,
    },
  },
//   metamask: {
//     package: InjectedConnector,
//     options: {
//       infuraId: infuraKey,
//     },
//   },
}
