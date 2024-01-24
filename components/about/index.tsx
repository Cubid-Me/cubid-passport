import React from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { buttonVariants } from "../ui/button"

export const About = () => {
  return (
    <div className="p-3">
      <h1 className="mb-2 text-3xl font-semibold">About</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>About Cubid</CardTitle>
            <CardDescription>Your gateway to a decentralized future</CardDescription>
          </CardHeader>
          <CardContent>
            <p>CUBID is an ecosystem of apps, all designed to build your own personal proof-of-personhood. We do this by sharing data between the apps and awarding points for all the activities you do and verifications you collect. The more you interact with the various apps, the stronger your "human score" will be. Why is this importat? Some apps, such as voting, need to know that you are a real human. In a world of bots and AI, we are fighting the good fight for humanity.</p>
          </CardContent>
        </Card>
        <Card style={{ height: "fit-content" }}>
          <CardHeader>
            <CardTitle>Other Cubid Apps</CardTitle>
            <CardDescription>Explore the Cubid ecosystem of apps, all with a shared view of your identity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              target="_blank"
              className={`${buttonVariants({ variant: "link" })} text-blue-500`}
              rel="noopener noreferrer"
              href="https://app.3oc.world/"
            >
              Three of Cups, trust and safety before meeting IRL
            </a>
            <a
              target="_blank"
              className={`${buttonVariants({ variant: "link" })} text-blue-500`}
              rel="noopener noreferrer"
              href="https://app.shoppingbuddy.org/"
            >
              ShoppingBuddy, verify each other before buying & selling online
            </a>
            <a
              target="_blank"
              className={`${buttonVariants({ variant: "link" })} text-blue-500`}
              rel="noopener noreferrer"
              href="https://app.ubifinder.org/"
            >
              Find UBI projects and sign up to receive Universal Basic Income
            </a>
            <a
              target="_blank"
              className={`${buttonVariants({ variant: "link" })} text-blue-500`}
              rel="noopener noreferrer"
              href="https://app.cubid.me/"
            >
              The Cubid SuperApp
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Passport and Stamps</CardTitle>
            <CardDescription>A new way to verify yourself online</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Stamps in your physical passport shows where you've been, which becomes part of your identity. With CUBID you collect "digital stamps" in a similar way, to build your identity and use it to verify yourself as a real human online. Different stamps carry different weight. Your Facebook account for example carries a low score, since it's easy for one person to create multiple Facebook accounts. If you proove youre national identification number (e.g. SSN, SIN, etc.) on the other hand, then this carries a high score since it's close to impossible for one person to have more than one such ID.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Differences from Gitcoin passport</CardTitle>
            <CardDescription>How we&apos;re different and mutli-chain compatible</CardDescription>
          </CardHeader>
          <CardContent>
            <p>We toook inspiration from another protocol called Gitcoin Passport (GP) when we built CUBID. We are different in a few ways: GP is a "web3" protocol that require you to set up a wallet and a private key before you can use it. With Cubid you can sign in with email or social accounts. GP is limited to anonymized data, whereas Cubid also collects more personal information about you, such as your name, profile picture and government issued ID. Wtih GP it's all about your own accounts, but with Cubid you can also tell us who your friends are, and you can validate each other. Because as humans we are not only defined by our accounts, we are also defined by who we know and who knows us. We are very similar to GP in how we collect stamps. We both keep your data in two places: a central database and a copy on a public ledger (IPFS). We also both allow you an option to "mint" your credentials to various blockchains in the form of Soulbound Tokens. Cubid is compatible with all chains, where GP is limited to only EVM-chains.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Links to Documentation</CardTitle>
            <CardDescription>Everything you need to know about us.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>(GitBook coming soon)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Terms and conditions</CardTitle>
            <CardDescription>All terms and conditions we need</CardDescription>
          </CardHeader>
          <CardContent>
            <p>(Legalese coming soon)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// about Cubid
// - about Passport and Stamps
// - differences compared to GitCoin Pasport
// - link to GitBook Documentation
// - terms and conditions
