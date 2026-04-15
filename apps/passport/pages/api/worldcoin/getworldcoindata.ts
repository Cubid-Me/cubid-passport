// @ts-nocheck
import axios from "axios";
import { encode_data } from "@/lib/encode_data";
import { supabase } from "../utils/supabase";
import { insertStamp } from "@/lib/stampInsertion";

export default async function handler(req, res) {
  const { code, userid } = req.body;

  try {
    const data = new URLSearchParams();
    data.append("code", code);
    data.append("grant_type", "authorization_code");
    data.append("redirect_uri", "https://passport.cubid.me/worldcoin");
    data.append("client_id", process.env.WLD_CLIENT_ID ?? "");

    const { data: dta } = await axios.post(
      "https://id.worldcoin.org/token",
      data,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.WLD_CLIENT_ID}:${process.env.WLD_CLIENT_SECRET}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, ...all_data } = dta;

    const user_data_raw = await fetch("https://id.worldcoin.org/userinfo", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const user_data = await user_data_raw?.json();

    const stampId = 26;
    const dbUser = userid;
    await insertStamp({
      stamp_type: 'worldcoin',
      user_data: { user_id: userid, uuid: '' },
      stampData: {
        identity: user_data.sub,
        uniquevalue: user_data.sub,
      },
      app_id: process.env.NEXT_PUBLIC_DAPP_ID,
    })

    res.send({ user_data });

  } catch (err) {
    console.error("Error occurred:", err);
    res.status(500).send({ error: err.message });
  }
}
