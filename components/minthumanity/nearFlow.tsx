/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
import React, { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import useAuth from "@/hooks/useAuth"

export const NearFlow = () => {
  const [stepFlow, setStepFlow] = useState(0)
  const [formState, setFormState] = useState({
    chain: "", // "near" | "evm" | "sui"
    passport: "",
    wallet: "",
  })
  const [mintingSBT, setMintingSBT] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sbtMintSuccess, setSbtMintSuccess] = useState(false)
  const [accounts, setAccounts] = useState<string[]>([])
  const { supabaseUser } = useAuth({})
  const [gitcoinScore, setGitcoinScore] = useState(0)
  const [gitcoinAddress, setGitcoinAddress] = useState("")
  console.log({ supabaseUser })
  // This function fetches the current wallet accounts for the chosen chain
  // and also retrieves Gitcoin stamp data.
  const fetchAccountsAndGitcoinStamps = useCallback(async () => {
    if (supabaseUser?.id && formState.chain) {
      // Define different stamp types per chain.
      const stampType =
        formState.chain === "near"
          ? 15
          : formState.chain === "evm"
            ? 14
            : formState.chain === "sui"
              ? 72
              : 15

      try {
        const {
          data: { data: accountsData },
        } = await axios.post("/api/supabase/select", {
          match: {
            created_by_user_id: supabaseUser.id,
            stamptype: stampType,
          },
          table: "stamps",
        })
        const allAccounts = accountsData.map((item: any) => item.uniquevalue)
        setAccounts(allAccounts)
      } catch (error) {
        console.error("Error fetching accounts", error)
      }
    }

    // Retrieve Gitcoin Passport stamp data.
    try {
      const {
        data: { data: gitcoin_data },
      } = await axios.post("/api/supabase/select", {
        match: {
          created_by_user_id: supabaseUser?.id,
          stamptype: 9,
        },
        table: "stamps",
      })
      const score = gitcoin_data[0]?.stamp_json?.scores?.score || 0
      const address = gitcoin_data[0]?.uniquevalue || ""
      setGitcoinScore(score)
      setGitcoinAddress(address)
    } catch (error) {
      console.error("Error fetching Gitcoin stamps", error)
    }
  }, [supabaseUser, formState.chain])

  // Run the fetch function when the chain or user changes.
  useEffect(() => {
    fetchAccountsAndGitcoinStamps()
  }, [fetchAccountsAndGitcoinStamps])

  // If minting was successful, display the minted SBT information.
  if (sbtMintSuccess) {
    return (
      <div className="p-4">
        <p className="text-md font-semibold">
          Your SBT was successfully minted
        </p>
        <p className="text-md">New SBT ID : {JSON.stringify(sbtMintSuccess)}</p>
        <p className="text-sm">
          From now on we will keep your Passport score updated. Any changes to
          your Gitcoin Passport score will be reflected within 24h.
        </p>
        <a
          className="text-blue-500 text-md"
          href="https://nearblocks.io/address/issuer.cubidme.near"
          rel="noreferrer"
          target="_blank"
        >
          Inspect On Chain
        </a>
        <pre className="break-all">
          <code className="break-all">
            Data minted:
            <br />
            {JSON.stringify(
              {
                receiver: formState.wallet,
                metadata: {
                  class: 1,
                  passportScore: gitcoinScore,
                },
              },
              null,
              2
            )}
          </code>
        </pre>
      </div>
    )
  }

  // Main UI: chain selection, account selection (listing current wallets),
  // passport selection, and minting button.
  const switchUI = () => {
    return (
      <div className="space-y-4 p-4">
        {/* Chain Selection */}
        <div>
          <p className="p-2 text-xl font-semibold">Choose Chain</p>
          <div className="flex flex-wrap md:space-x-2 space-y-2 md:space-y-0">
            {/* NEAR Option */}
            <button
              onClick={() => {
                setStepFlow(1)
                setFormState((prev) => ({ ...prev, chain: "near" }))
              }}
              className={`h-[fit-content] rounded-lg p-2 ${formState.chain === "near"
                  ? "border-4 border-blue-500"
                  : "border-2 border-gray-700"
                }`}
            >
              <img
                className="h-[100px] w-[250px] rounded-md object-cover"
                src="data:image/jpeg;base64,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"
              />
              <p className="text-center text-sm mt-1">NEAR</p>
            </button>
            {/* EVM Option */}
            <button
              onClick={() => {
                setStepFlow(1)
                setFormState((prev) => ({ ...prev, chain: "evm" }))
              }}
              className={`h-[fit-content] rounded-lg p-2 ${formState.chain === "evm"
                  ? "border-4 border-blue-500"
                  : "border-2 border-gray-700"
                }`}
            >
              <div className="rounded-lg border-2 border-gray-700 p-2">
                <img
                  className="object-fit h-[100px] w-[250px] rounded-md"
                  src="data:image/png;base64,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"
                />
              </div>
              <p className="mt-1 text-xs font-bold">EVM</p>
            </button>
            {/* SUI Option */}
            <button
              onClick={() => {
                setStepFlow(1)
                setFormState((prev) => ({ ...prev, chain: "sui" }))
              }}
              className={`h-[fit-content] rounded-lg p-2 ${formState.chain === "sui"
                  ? "border-4 border-blue-500"
                  : "border-2 border-gray-700"
                }`}
            >
              <div className="rounded-lg border-2 border-gray-700 p-2">
                <img
                  className="object-fit h-[100px] w-[250px] rounded-md"
                  src="https://cggycnbvljcdptzyjpju.supabase.co/storage/v1/object/public/images/sui.jpeg"
                />
              </div>
              <p className="mt-1 text-xs font-bold">SUI</p>
            </button>
          </div>
        </div>
        {/* Account Selection */}
        <div
          className={`${stepFlow >= 1 ? "space-y-2" : "pointer-events-none opacity-20 space-y-2"
            }`}
        >
          <p className="text-xl font-medium">
            Choose the wallet you want to mint Humanity SBT with
          </p>
          {accounts.length === 0 && <p>No accounts found</p>}
          {accounts.map((item: string) => (
            <div
              key={item}
              onClick={() => {
                setStepFlow(2)
                setFormState((prev) => ({ ...prev, wallet: item }))
              }}
              className={`rounded border-2 px-3 py-2 cursor-pointer ${item === formState.wallet ? "border-blue-500" : "border-gray-700"
                }`}
            >
              <p>{item}</p>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={async () => {
                if (!loading) {
                  try {
                    setLoading(true)
                    // Create a new wallet based on the selected chain.
                    if (formState.chain === "near") {
                      await axios.post("/api/createnewnearacc", {
                        userId: supabaseUser?.id,
                      })
                    } else if (formState.chain === "evm") {
                      await axios.post("/api/createnewevmacc", {
                        userId: supabaseUser?.id,
                      })
                    } else if (formState.chain === "sui") {
                      await axios.post("/api/createnewsuiacc", {
                        userId: supabaseUser?.id,
                      })
                    }
                    // Refresh the account list after creation.
                    await fetchAccountsAndGitcoinStamps()
                  } catch (err) {
                    console.error("Error creating account:", err)
                  } finally {
                    setLoading(false)
                  }
                }
              }}
              className="w-full rounded border border-gray-800 bg-gray-800 py-2 text-white"
            >
              {loading ? (
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
              ) : (
                "Create New Account"
              )}
            </button>
          </div>
        </div>
        {/* Passport Selection */}
        <p
          className="pointer-events-none flex flex-wrap p-2 text-xl font-semibold opacity-20"
        >
          Choose Passport
        </p>
        <div
          className={
            stepFlow === 2
              ? "flex flex-wrap space-x-2"
              : "pointer-events-none flex flex-wrap space-x-2 opacity-20"
          }
        >
          <button
            className={`h-[fit-content] rounded-lg p-2 ${formState.passport === "gitcoin"
                ? "border-4 border-blue-500"
                : "border-2 border-gray-700"
              }`}
            onClick={() => {
              setFormState((prev) => ({ ...prev, passport: "gitcoin" }))
            }}
          >
            <img
              className="h-[100px] w-[250px] rounded-md object-cover"
              src="https://images.mirror-media.xyz/nft/7XcbbnpLqNd0w-Qeh7xB8.png"
            />
          </button>
          <button
            className={`h-[fit-content] rounded-lg p-2 opacity-20 ${formState.passport === "kyc"
                ? "border-4 border-blue-500"
                : "border-2 border-gray-700"
              }`}
          >
            <img
              className="h-[100px] w-[250px] rounded-md object-cover"
              src="https://www.atworthy.com/wp-content/uploads/2022/10/kyc-know-your-customer-with-business-verifying-identity-its-clients.png"
            />
          </button>
          <div className="opacity-20">
            <button
              className={`rounded-lg p-2 ${formState.passport === "gitcoinStamps"
                  ? "border-4 border-blue-500"
                  : "border-2 border-gray-700"
                }`}
            >
              <img
                className="h-[100px] w-[250px] rounded-md object-cover"
                src="https://www.lifespan.io/wp-content/uploads/2021/12/Gitcoin.png"
              />
            </button>
            <p>Gitcoin Passport With Stamps</p>
          </div>
        </div>
        {Boolean(formState.passport) && (
          <div className="pb-2">
            <p className="text-sm font-semibold">
              We will mint an SBT (soul bound token) for you indicating your
              passport score
            </p>
            <pre>
              <code>
                Passport Score : {gitcoinScore}
                <br />
                Wallet : {formState.wallet}
              </code>
            </pre>
          </div>
        )}
        <button
          onClick={async () => {
            if (!mintingSBT) {
              try {
                setMintingSBT(true)
                const { data } = await axios.post("/api/mint-sbt", {
                  // Pass along the selected chain so your API can mint on the correct network.
                  chain: formState.chain,
                  wallet: formState.wallet,
                  web3Address: gitcoinAddress,
                  score: gitcoinScore,
                  user_id: supabaseUser?.id,
                })
                toast.success("SBT minted successfully")
                setSbtMintSuccess(data)
              } catch (error) {
                console.error("Error minting SBT:", error)
                toast.error("Error minting SBT")
              } finally {
                setMintingSBT(false)
              }
            }
          }}
          disabled={!Boolean(formState.passport)}
          className={`w-full rounded bg-blue-500 py-2 text-white ${!formState.passport && "opacity-25"
            }`}
        >
          {mintingSBT ? (
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
          ) : (
            "Mint SBT"
          )}
        </button>
        <div className="h-[100px]" />
      </div>
    )
  }

  return <div className="p-2">{switchUI()}</div>
}
