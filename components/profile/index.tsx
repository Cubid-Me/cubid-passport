/* eslint-disable @next/next/no-img-element */
import React from "react"
import { useSelector } from "react-redux"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const Profile = () => {
  const { email } = useSelector((state: any) => state.user)
  return (
    <div className="p-3">
      <h1 className="mb-2 text-3xl font-semibold">Profile</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card style={{ height: "auto" }}>
          <CardHeader>
            <CardTitle>My Trust Score</CardTitle>
            <CardDescription>
              Trust score in cubid is a proof of trust
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl">87%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>My Wallets</CardTitle>
            <CardDescription>
              List of wallets you have connected to cubid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button className="block" variant="outline">
                NEAR : harrydhillon.near
              </Button>
              <Button className="block" variant="outline">
                ENS : 0x3uv9ns03c9wcos0afi
              </Button>
              <Button className="block" variant="outline">
                G$ : 0xcacC3DC102112d2EcFF5e037276E5c93D56812d5
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card style={{ height: "auto" }}>
          <CardHeader>
            <CardTitle>Language Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="gm">German</SelectItem>
                <SelectItem value="sp">Spanish</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Login & Security</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p>Email : {email} </p>
              <div className="mt-2 flex items-center gap-2">
                <img
                  alt="image"
                  className="h-20 w-20 rounded"
                  src="https://media.licdn.com/dms/image/C4D0BAQF0BbRWBLibVQ/company-logo_200_200/0/1622628086077?e=2147483647&v=beta&t=z_LYy9iZWArzniYy0I2aWqRgyK6kMTLcRsSuW7dZfq0"
                />
                <p>Enabled Login</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card style={{ height: "fit-content" }}>
          <CardHeader>
            <CardTitle>Cubid Super App</CardTitle>
            <CardDescription>
              Head on the cubid app for a much more detailed view for your
              profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              target="_blank"
              className={`${buttonVariants({ variant: "link" })} text-blue-500`}
              rel="noopener noreferrer"
              href="https://app.cubid.me/"
            >
              Link to Cubid App
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
