// @ts-nocheck

"use client"
import "@/styles/globals.css"
import { OwnIDInit } from "@ownid/react"
import { ToastContainer } from "react-toastify"
import 'react-phone-input-2/lib/style.css'

import "react-toastify/dist/ReactToastify.css"
import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react'
import { getAuth, getIdToken, signInWithCustomToken } from "firebase/auth"
import { SessionProvider } from "next-auth/react"
import { Provider } from "react-redux"
import { WagmiConfig } from "wagmi"
import { arbitrum, mainnet } from 'viem/chains'

import { cn } from "@/lib/utils"
import { SiteHeader } from "@/components/site-header"
import { TailwindIndicator } from "@/components/tailwind-indicator"
import { ThemeProvider } from "@/components/theme-provider"

import { Wallet } from "../lib/nearWallet"
import { store } from "../redux/store"

export const wallet = new Wallet({
  createAccessKeyFor: "registry.i-am-human.near",
})

wallet.startUp()

// 1. Get projectId
const projectId = "6833ed2c1539b9d27e8840c51f53bd0c"

// 2. Create wagmiConfig
const metadata = {
  name: "Web3Modal",
  description: "Web3Modal Example",
  url: "https://web3modal.com",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
}

const chains = [mainnet]
const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata })
createWeb3Modal({ wagmiConfig, projectId, chains })

export default function RootLayout(props: any) {
  const { pageProps } = props
  if (process.env.NODE_ENV === "development") {
    return (
      <SessionProvider session={pageProps?.session}>
        <OwnIDInit
          config={{
            appId: "p0zfroqndmvm30",
            firebaseAuth: {
              getAuth,
              getIdToken,
              signInWithCustomToken,
            },
          }}
        />
        <html lang="en" suppressHydrationWarning>
          <head>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" />
            <link
              href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&family=Satisfy&display=swap"
              rel="stylesheet"
            />
          </head>
          <body
            className={cn("min-h-screen bg-background !antialiased")}
            style={{ fontFamily: "'Open Sans', sans-serif" }}
          >
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <div>
                {!(window as any).location.href.includes("/allow") && (
                  <SiteHeader />
                )}
                <Provider store={store}>
                  <WagmiConfig config={wagmiConfig}>
                    <div>{props.children}</div>
                  </WagmiConfig>
                  <ToastContainer />
                </Provider>
              </div>
            </ThemeProvider>
          </body>
        </html>
      </SessionProvider>
    )
  }

  if (typeof window !== "undefined") {
    // Client-side-only code

    return (
      <SessionProvider session={pageProps?.session}>
        <OwnIDInit
          config={{
            appId: "p0zfroqndmvm30",
            firebaseAuth: {
              getAuth,
              getIdToken,
              signInWithCustomToken,
            },
          }}
        />
        <html lang="en" suppressHydrationWarning>
          <head>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" />
            <link
              href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&family=Satisfy&display=swap"
              rel="stylesheet"
            />
          </head>
          <body
            className={cn("min-h-screen bg-background !antialiased")}
            style={{ fontFamily: "'Open Sans', sans-serif" }}
          >
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <div>
                {!(window as any).location.href.includes("/allow") && (
                  <SiteHeader />
                )}
                <Provider store={store}>
                  <WagmiConfig config={wagmiConfig}>
                    <div>{props.children}</div>
                  </WagmiConfig>
                  <ToastContainer />
                </Provider>
              </div>
            </ThemeProvider>
          </body>
        </html>
      </SessionProvider>
    )
  } else {
    return <></>
  }
}
