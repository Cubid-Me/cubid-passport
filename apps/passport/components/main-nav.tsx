import * as React from "react"
import Link from "next/link"

import { NavItem } from "@/types/nav"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { Icons } from "@/components/icons"
import {usePathname} from 'next/navigation'

interface MainNavProps {
  items?: NavItem[]
}

export function MainNav() {
  const pathName:any = usePathname()
  return (
    <div className="flex gap-6 md:gap-10">
      <Link href="/" className="flex items-center space-x-2">
        <span className={`dark:text-white inline-block font-bold`}>Cubid Passport</span>
      </Link>
    </div>
  )
}
