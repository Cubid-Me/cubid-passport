"use client"

import { useState } from "react"
import { logout } from "@/redux/userSlice"
import { createWeb3Modal, defaultWagmiConfig } from "@web3modal/wagmi/react"
import { About } from "components/about"
import { Authenticated } from "components/auth/authenticated"
import { MintHumanity } from "components/minthumanity"
import { Profile } from "components/profile"
import { Stamps } from "components/stamps"
import { useDispatch } from "react-redux"
import { WagmiConfig } from "wagmi"
import { arbitrum, mainnet } from "wagmi/chains"

import { buttonVariants } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function IndexPage() {
  useEffect(() => {
    // 1. Get projectId
    const projectId = "046f59ead3e8ec7acd1db6ba73cd23b7"

    // 2. Create wagmiConfig
    const metadata = {
      name: "Web3Modal",
      description: "Web3Modal Example",
      url: "https://web3modal.com",
      icons: ["https://avatars.githubusercontent.com/u/37784886"],
    }

    const chains = [mainnet, arbitrum]
    const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata })
    createWeb3Modal({ wagmiConfig, projectId, chains })
  }, [])

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
    <WagmiConfig config={wagmiConfig}>
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
          <TabsContent style={{ height: "100vh" }} value="minthumanity">
            <MintHumanity />
          </TabsContent>
          <TabsList
            style={{
              width: "95%",
              marginLeft: "2.5%",
              position: "fixed",
              bottom: 10,
              left: 0,
            }}
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
            <TabsTrigger
              style={{ width: "33.33%", height: "36px" }}
              value="minthumanity"
            >
              <div className="translate-y-[4px]">
                <svg
                  viewBox="0 0 24 30"
                  width="30"
                  height="30"
                  version="1.1"
                  x="0px"
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  stroke-linejoin="round"
                  stroke-miterlimit="2"
                >
                  <g>
                    <path
                      fill="currentColor"
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M12,1.25c5.933,0 10.75,4.817 10.75,10.75c0,5.933 -4.817,10.75 -10.75,10.75c-5.933,0 -10.75,-4.817 -10.75,-10.75c0,-5.933 4.817,-10.75 10.75,-10.75Zm4.25,8.25c0,-0.464 -0.184,-0.909 -0.513,-1.237c-0.328,-0.329 -0.773,-0.513 -1.237,-0.513l-5,0c-0.464,-0 -0.909,0.184 -1.237,0.513c-0.329,0.328 -0.513,0.773 -0.513,1.237l0,5c-0,0.464 0.184,0.909 0.513,1.237c0.328,0.329 0.773,0.513 1.237,0.513l5,0c0.464,0 0.909,-0.184 1.237,-0.513c0.329,-0.328 0.513,-0.773 0.513,-1.237l-0,-5Zm-1.5,0l0,5c0,0.066 -0.026,0.13 -0.073,0.177c-0.047,0.047 -0.111,0.073 -0.177,0.073l-5,0c-0.066,0 -0.13,-0.026 -0.177,-0.073c-0.047,-0.047 -0.073,-0.111 -0.073,-0.177l-0,-5c-0,-0.066 0.026,-0.13 0.073,-0.177c0.047,-0.047 0.111,-0.073 0.177,-0.073l5,-0c0.066,-0 0.13,0.026 0.177,0.073c0.047,0.047 0.073,0.111 0.073,0.177Z"
                    />
                  </g>
                </svg>
              </div>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Authenticated>
    </WagmiConfig>
  )
}
