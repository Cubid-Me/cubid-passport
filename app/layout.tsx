"use client"

import "@/styles/globals.css"
import { Metadata } from "next"
import { OwnIDInit } from "@ownid/react"
import { ToastContainer } from "react-toastify"

import "react-toastify/dist/ReactToastify.css"
import { getAuth, getIdToken, signInWithCustomToken } from "firebase/auth"
import auth from "firebase/compat/auth"
import { SessionProvider } from "next-auth/react"
import { Provider } from "react-redux"

import { fontSans } from "@/lib/fonts"
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

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout(props: any) {
  const { pageProps } = props

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
        <head />
        <body
          className={cn(
            "min-h-screen bg-background font-sans antialiased",
            fontSans.variable
          )}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <div>
              <SiteHeader />
              <Provider store={store}>
                <div>{props.children}</div>
                <ToastContainer />
              </Provider>
            </div>
            <TailwindIndicator />
          </ThemeProvider>
        </body>
      </html>
    </SessionProvider>
  )
}
