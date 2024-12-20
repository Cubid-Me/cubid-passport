// @ts-nocheck

"use client"

import "@/styles/globals.css"
import { useEffect, useLayoutEffect, useState } from "react"
import { OwnIDInit } from "@ownid/react"
import { ToastContainer } from "react-toastify"
import { LensConfig, production, LensProvider } from "@lens-protocol/react-web";
import { bindings } from "@lens-protocol/wagmi";

import "react-phone-input-2/lib/style.css"
import "react-toastify/dist/ReactToastify.css"
import '@farcaster/auth-kit/styles.css';
import { usePathname, useRouter } from "next/navigation"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createWeb3Modal } from "@web3modal/wagmi/react"
import { defaultWagmiConfig } from "@web3modal/wagmi/react/config"
import { getAuth, getIdToken, signInWithCustomToken } from "firebase/auth"
import { SessionProvider } from "next-auth/react"
import { Provider } from "react-redux"
import { WagmiProvider, createConfig, http } from "wagmi"
import { mainnet, sepolia } from "wagmi/chains"
import { AuthKitProvider } from '@farcaster/auth-kit';

import { cn } from "@/lib/utils"
import { SiteHeader } from "@/components/site-header"
import { TailwindIndicator } from "@/components/tailwind-indicator"
import { ThemeProvider } from "@/components/theme-provider"

import { config } from "../config/web3Config"
import { Wallet } from "../lib/nearWallet"
import { store } from "../redux/store"
import { SolanaAppWalletProvider } from "@/components/walletProvider"

const lensConfig: LensConfig = {
  environment: production,
  bindings: bindings(config),
};



export const wallet = new Wallet({
  createAccessKeyFor: "registry.i-am-human.near",
})

wallet.startUp()

function removeQueryParam(url, paramToRemove) {
  // Parse the URL
  const urlObj = new URL(url)

  // Get the search parameters
  const searchParams = new URLSearchParams(urlObj.search)

  // Remove the specified parameter
  searchParams.delete(paramToRemove)

  // Return the remaining query string without the leading "?"
  return searchParams.toString()
}

export default function RootLayout(props: any) {
  const queryClient = new QueryClient()


  const { pageProps } = props
  const pathName = usePathname()
  const { push } = useRouter()

  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      if (
        localStorage.getItem("allow-uuid") &&
        !window?.location?.href?.contains?.("/allow") &&
        !window?.location?.href?.contains?.("/pii") &&
        !window?.location?.href?.contains?.("/uid=")
      ) {
        const queryStringURL = removeQueryParam(window.location.href, "uid")
        push(
          `${window.location.origin}/allow?uid=${localStorage.getItem(
            "allow-uuid"
          )}&${Boolean(localStorage.getItem(
            "page_id"
          )) ? `page_id=${localStorage.getItem(
            "page_id"
          )}&` : ''}${queryStringURL}`
        )
        localStorage.removeItem("allow-uuid")
        localStorage.removeItem("page_id")
      }
    }
  }, [push])
  const [configSet, setConfigSet] = useState(false)

  if (process.env.NODE_ENV === "development") {
    return (

      <SessionProvider session={props?.pageProps?.session}>
        <SolanaAppWalletProvider>
          <WagmiProvider config={config as any}>
            <QueryClientProvider client={queryClient}>
              <LensProvider config={lensConfig}>
                <AuthKitProvider config={config}>
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
                      className={cn(
                        `min-h-screen ${pathName?.includes("allow")
                          ? "bg-[#F2F2F2] text-black"
                          : "bg-background"
                        }  !antialiased`
                      )}
                      style={{ fontFamily: "'Open Sans', sans-serif" }}
                    >
                      <ThemeProvider
                        attribute="class"
                        defaultTheme="system"
                        enableSystem
                      >
                        <div>
                          <SiteHeader />

                          <Provider store={store}>
                            <div>{props.children}</div>
                            <ToastContainer />
                          </Provider>
                        </div>
                      </ThemeProvider>
                    </body>
                  </html>
                </AuthKitProvider>
              </LensProvider>
            </QueryClientProvider>
          </WagmiProvider>
        </SolanaAppWalletProvider>
      </SessionProvider>

    )
  }

  if (typeof window !== "undefined") {
    // Client-side-only code

    return (

      <SessionProvider session={props?.pageProps?.session}>
        <SolanaAppWalletProvider>
          <WagmiProvider config={config as any}>
            <QueryClientProvider client={queryClient}>
              <LensProvider config={lensConfig}>
                <AuthKitProvider config={config}>
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
                      <ThemeProvider
                        attribute="class"
                        defaultTheme="system"
                        enableSystem
                      >
                        <div>
                          {!(window as any)?.location?.href?.includes("/allow") && (
                            <SiteHeader />
                          )}
                          <Provider store={store}>
                            <div>{props.children}</div>
                            <ToastContainer />
                          </Provider>
                        </div>
                      </ThemeProvider>
                    </body>
                  </html>
                </AuthKitProvider>
              </LensProvider>
            </QueryClientProvider>
          </WagmiProvider>
        </SolanaAppWalletProvider>
      </SessionProvider>

    )
  } else {
    return <></>
  }
}
