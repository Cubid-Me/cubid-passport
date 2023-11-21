"use client"

import { useState } from "react"
import { logout } from "@/redux/userSlice"
import { About } from "components/about"
import { Authenticated } from "components/auth/authenticated"
import { Profile } from "components/profile"
import { Stamps } from "components/stamps"
import { useDispatch } from "react-redux"


import { buttonVariants } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


export default function IndexPage() {
  const dispatch = useDispatch()
  const [tab, setTab] = useState("stamps")

  const profile = () => (
    <>
      <div className="flex gap-4">
        <button
          onClick={() => {
            dispatch(logout())
          }}
          className={buttonVariants()}
        >
          Logout
        </button>
      </div>
    </>
  )

  return (
      <Authenticated>
        <Tabs
          value={tab}
          onValueChange={(val) => {
            setTab(val)
          }}
        >
          <TabsContent style={{ height: "100vh" }} value="profile">
            <div>
              <Profile />
            </div>
          </TabsContent>
          <TabsContent style={{ height: "100vh" }} value="stamps">
            <div>
              <Stamps />
            </div>
          </TabsContent>
          <TabsContent style={{ height: "100vh" }} value="settings">
            <div>
              <About />
            </div>
          </TabsContent>
          <TabsList
            style={{ width: "100%", position: "fixed", bottom: 10, left: 0 }}
          >
            <TabsTrigger style={{ width: "33.33%" }} value="profile">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </TabsTrigger>
            <TabsTrigger style={{ width: "33.33%" }} value="stamps">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"
                />
              </svg>
            </TabsTrigger>
            <TabsTrigger style={{ width: "33.33%" }} value="settings">
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                className="w-6 h-6"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7.49991 0.876892C3.84222 0.876892 0.877075 3.84204 0.877075 7.49972C0.877075 11.1574 3.84222 14.1226 7.49991 14.1226C11.1576 14.1226 14.1227 11.1574 14.1227 7.49972C14.1227 3.84204 11.1576 0.876892 7.49991 0.876892ZM1.82707 7.49972C1.82707 4.36671 4.36689 1.82689 7.49991 1.82689C10.6329 1.82689 13.1727 4.36671 13.1727 7.49972C13.1727 10.6327 10.6329 13.1726 7.49991 13.1726C4.36689 13.1726 1.82707 10.6327 1.82707 7.49972ZM8.24992 4.49999C8.24992 4.9142 7.91413 5.24999 7.49992 5.24999C7.08571 5.24999 6.74992 4.9142 6.74992 4.49999C6.74992 4.08577 7.08571 3.74999 7.49992 3.74999C7.91413 3.74999 8.24992 4.08577 8.24992 4.49999ZM6.00003 5.99999H6.50003H7.50003C7.77618 5.99999 8.00003 6.22384 8.00003 6.49999V9.99999H8.50003H9.00003V11H8.50003H7.50003H6.50003H6.00003V9.99999H6.50003H7.00003V6.99999H6.50003H6.00003V5.99999Z"
                  fill="currentColor"
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                ></path>
              </svg>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Authenticated>
  )
}
