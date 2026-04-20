import { Wallet } from "@/lib/nearWallet"

export const wallet =
  typeof window === "undefined"
    ? null
    : new Wallet({
        createAccessKeyFor: "registry.i-am-human.near",
      })
