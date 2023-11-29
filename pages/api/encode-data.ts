// @ts-nocheck

import { NextApiRequest, NextApiResponse } from "next"
import CryptoJS from "crypto-js";

import { secretKey } from "./utils/secretKey"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { dataKey } = req.body
  var ciphertext = CryptoJS.AES.encrypt(dataKey, secretKey).toString()

  res.status(200).json(ciphertext)
}
