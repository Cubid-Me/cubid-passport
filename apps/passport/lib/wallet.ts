import { Wallet } from "@/lib/nearWallet"

export const wallet = new Wallet({
  createAccessKeyFor: "registry.i-am-human.near",
})
