import { NextApiRequest, NextApiResponse } from "next";
import nacl from "tweetnacl";
import * as bip39 from "bip39"; // Use a namespace import to correctly access bip39 functions
import { supabase } from "./utils/supabase";
import { server_insertStamp } from "@/lib/stampInsertion";
import { blake2b } from "blakejs"; // Import blakejs for hashing

// Derive a SUI address from a given public key
function getSuiAddress(publicKey: Uint8Array): string {
  // Compute a 32-byte Blake2b hash of the public key
  const hash = blake2b(publicKey, null, 32);
  // Take the first 20 bytes of the hash and convert to a hex string with "0x" prefix
  const addressBytes = hash.slice(0, 20);
  return "0x" + Buffer.from(addressBytes).toString("hex");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { userId } = req.body;

  try {
    // Generate a mnemonic (backup phrase)
    const mnemonic = bip39.generateMnemonic();

    // Convert the mnemonic to a seed (synchronously)
    const seed = bip39.mnemonicToSeedSync(mnemonic);

    // Use the first 32 bytes of the seed to generate an Ed25519 keypair using tweetnacl
    const keypair = nacl.sign.keyPair.fromSeed(seed.slice(0, 32));

    // Derive the SUI address using our custom function
    const suiAddress = getSuiAddress(keypair.publicKey);

    // Export the secret key as a hex string (note: tweetnacl returns a 64-byte secret key)
    const secretKeyHex = Buffer.from(keypair.secretKey).toString("hex");

    // Save the new SUI account info in your database.
    // Caution: Storing private keys or mnemonic phrases in plain text is a security risk.
    await supabase.from("sui-api-accounts").insert({
      account_address: suiAddress,
      owner_id: userId,
      private_key: secretKeyHex,
    });

    await server_insertStamp({
      stamp_type: "sui",
      user_data: { user_id: userId, uuid: "" },
      stampData: {
        identity: suiAddress,
        uniquevalue: suiAddress,
      },
      app_id: parseInt(process.env.NEXT_PUBLIC_DAPP_ID ?? ""),
    });

    res.status(200).json({ address: suiAddress });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
}
