import React from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const About = () => {
  return (
    <div className="p-3">
      <h1 className="mb-2 text-3xl font-semibold">About</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cubid</CardTitle>
            <CardDescription>
              Your gateway to a decentralized future
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card Content</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Passport and Stamps</CardTitle>
            <CardDescription>A way to verify yourself online</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card Content</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Differences from Gitcoin passport</CardTitle>
            <CardDescription>
              How we&apos;re different and mutli chain compatible
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card Content</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Links to Documentation</CardTitle>
            <CardDescription>
              Everything you need to know about us
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card Content</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Terms and conditions</CardTitle>
            <CardDescription>All terms and conditions we need</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card Content</p>
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
