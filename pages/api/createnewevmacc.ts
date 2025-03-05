import path from "path"
import { NextApiRequest, NextApiResponse } from "next"
import { ethers } from "ethers"
import { supabase } from "./utils/supabase"
import { server_insertStamp } from "@/lib/stampInsertion"


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { userId } = req.body

    try {
        // Create a new random wallet using ethers.js.
        const wallet = ethers.Wallet.createRandom()

        // Optionally, connect to a provider and interact with your SBT contract.
        // For example:
        // const provider = new ethers.providers.JsonRpcProvider(process.env.ETH_NODE_URL);
        // const contract = new ethers.Contract(process.env.SBT_CONTRACT_ADDRESS, abi, wallet.connect(provider));
        // const tx = await contract.mintSBT(userId, wallet.address, ...);
        // await tx.wait();

        // Save the new wallet address in your database.
        const { error } = await supabase.from("eth-api-accounts").insert({
            account_address: wallet.address,
            owner_id: userId,
            private_key: wallet.privateKey
        })

        console.log({ error })

        await server_insertStamp({
            stamp_type: "evm",
            user_data: { user_id: userId, uuid: "" },
            stampData: {
                identity: wallet.address,
                uniquevalue: wallet.address,
            },
            app_id: parseInt(process.env.NEXT_PUBLIC_DAPP_ID ?? ""),
        })

        res.status(200).json({ address: wallet.address })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.toString() })
    }
}