import { useState } from "react"

import { NearFlow } from "./nearFlow"

export const MintHumanity = () => {
  const [sbtFlow, setSbtFlow] = useState(0)
  return (
    <>
      {/* <div className="border-b border-gray-200 text-center text-sm font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
        <ul className="-mb-px flex flex-wrap">
          <li className="me-2">
            <button
              className={
                sbtFlow === 0
                  ? "active inline-block rounded-t-lg border-b-2 border-blue-600 p-4 text-blue-600 dark:border-blue-500 dark:text-blue-500"
                  : "inline-block rounded-t-lg border-b-2 border-transparent p-4 hover:border-gray-300 hover:text-gray-600 dark:hover:text-gray-300"
              }
              onClick={() => {
                setSbtFlow(0)
              }}
            >
              Mint SBT
            </button>
          </li>
          <li className="me-2">
            <button
              className={
                sbtFlow === 1
                  ? "active inline-block rounded-t-lg border-b-2 border-blue-600 p-4 text-blue-600 dark:border-blue-500 dark:text-blue-500"
                  : "inline-block rounded-t-lg border-b-2 border-transparent p-4 hover:border-gray-300 hover:text-gray-600 dark:hover:text-gray-300"
              }
              onClick={() => {
                setSbtFlow(1)
              }}
            >
              SBT LIST
            </button>
          </li>
        </ul>
      </div> */}
      {sbtFlow === 0 && (
        <div className="h-screen p-2">
          <p className="text-xl font-semibold text-white">
            Mint Humanity On-Chain
          </p>
          <NearFlow />
        </div>
      )}
      {/* {sbtFlow === 1 && (
        <div className="h-screen p-2">
          <p className="text-xl font-semibold text-white">SBT LIST</p>
          <div></div>
        </div>
      )} */}
    </>
  )
}
