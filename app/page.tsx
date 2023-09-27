import Link from "next/link"

import { siteConfig } from "@/config/site"
import { buttonVariants } from "@/components/ui/button"

export default function IndexPage() {
  return (
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
            <Link
              target="_blank"
              rel="noreferrer"
              href={"https://app.cubid.me"}
              className={buttonVariants({ variant: "outline" })}
            >
              Cubid App
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
