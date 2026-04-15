"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import axios from "axios"
import { Guest } from "components/auth/guest"

import { buttonVariants } from "@/components/ui/button"

export default function IndexPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const code = searchParams?.get("code")
    if (code) {
      ;(async () => {
        let data
        const { data: data_1st } = await axios.post("/api/fractal", {
          code,
        })
        data = data_1st

        if (
          localStorage.getItem("unauthenticated_user") &&
          typeof data === "object"
        ) {
          localStorage.setItem("kyc_fractal", JSON.stringify(data))
          router.push(`/allow?${localStorage.getItem("allow_url")}`)
          localStorage.removeItem("allow_url")
        }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Guest>
      <div className="flex h-[85vh] items-center">
        <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
          <div className="mx-auto flex max-w-[980px] flex-col items-center gap-2 text-center">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
              Cubid Passport - Your New Identity to web3
            </h1>
            <p className="max-w-[700px] text-lg text-muted-foreground">
              Add Stamps , verify yourself and step into a secure world of web3
              where every app is protected with a proof of personhood
            </p>
            <div className="flex gap-4">
              <Link href={"/login"} className={buttonVariants()}>
                Login
              </Link>
              {/* <Link href={"/register"} className={buttonVariants()}>
                Register
              </Link> */}
            </div>
          </div>
        </section>
      </div>
    </Guest>
  )
}
