/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */

import React, { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { Stepper } from "react-form-stepper"

import useAuth from "@/hooks/useAuth"

export const NearFlow = () => {
  const [stepFlow, setStepFlow] = useState(0)
  const [nearAcc, setNearAcc] = useState([])
  const { supabaseUser } = useAuth({})
  const [formState, setFormState] = useState({
    chain: "",
    passport: "",
    wallet: "",
  })
  const [loading, setLoading] = useState(false)

  const fetchNearStamps = useCallback(async () => {
    if (supabaseUser?.id) {
      const {
        data: { data },
      } = await axios.post("/api/supabase/select", {
        match: {
          created_by_user_id: supabaseUser.id,
          stamptype: 15,
        },
        table: "stamps",
      })
      const allNearAcc = data.map((item: any) => item.uniquevalue)
      setNearAcc(allNearAcc)
    }
  }, [supabaseUser])

  useEffect(() => {
    fetchNearStamps()
  }, [fetchNearStamps])

  const switchUI = () => {
    return (
      <div className="space-y-4">
        <div>
          <p className="p-2 text-xl font-semibold">Choose Chain</p>
          <button
            onClick={() => {
              setStepFlow(1)
              setFormState((d) => ({ ...d, chain: "near" }))
            }}
            className={`rounded-lg p-2 ${
              formState.chain === "near"
                ? "border-4 border-blue-500"
                : "border-2 border-gray-700 "
            }`}
          >
            <img
              className="h-[100px] w-[250px] rounded-md object-cover"
              src="data:image/png;base64,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"
            />
          </button>
        </div>
        <div className={stepFlow >= 1 ? "" : "pointer-events-none opacity-20"}>
          <p className="p-2 text-xl font-semibold">Choose Passport</p>
          <button
            onClick={() => {
              setStepFlow(2)
              setFormState((d) => ({ ...d, passport: "gitcoin" }))
            }}
            className={`rounded-lg p-2 ${
              formState.passport === "gitcoin"
                ? "border-4 border-blue-500"
                : "border-2 border-gray-700 "
            }`}
          >
            <img
              className="h-[100px] w-[250px] rounded-md object-cover"
              src="https://images.mirror-media.xyz/nft/7XcbbnpLqNd0w-Qeh7xB8.png"
            />
          </button>
        </div>
        <div
          className={
            stepFlow === 2
              ? "space-y-2"
              : "pointer-events-none space-y-2 opacity-20"
          }
        >
          <p className="text-xl font-medium">
            Choose the near account you want to mint Humanity SBT with{" "}
          </p>
          {nearAcc.map((item: string) => (
            <div className="rounded border px-3 py-2" key={item}>
              <p className="">{item}</p>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={async () => {
                if (!loading) {
                  try {
                    setLoading(true)
                    await axios.post("/api/create-new-near-acc", {
                      userId: supabaseUser?.id,
                    })
                    await fetchNearStamps()
                  } finally {
                    setLoading(false)
                  }
                }
              }}
              className="w-full rounded border border-gray-800 bg-gray-800 py-2 text-white"
            >
              {loading ? (
                <>
                  <div role="status">
                    <svg
                      aria-hidden="true"
                      className="inline h-8 w-8 animate-spin fill-gray-300 text-gray-600"
                      viewBox="0 0 100 101"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="currentColor"
                      />
                      <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                        fill="currentFill"
                      />
                    </svg>
                  </div>
                </>
              ) : (
                "Create New Account"
              )}
            </button>
            <button className="w-full rounded bg-blue-500 py-2 text-white">
              Mint SBT
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <div className="p-2">{switchUI()}</div>
}
