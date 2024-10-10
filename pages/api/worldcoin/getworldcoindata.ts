// @ts-nocheck
import axios from "axios";
import { encode_data } from "@/lib/encode_data";
import { supabase } from "../utils/supabase";

export default async function handler(req, res) {
  const { code, userid } = req.body;
  console.log("Received request with body:", req.body);

  try {
    const data = new URLSearchParams();
    data.append("code", code);
    data.append("grant_type", "authorization_code");
    data.append("redirect_uri", "https://passport.cubid.me/worldcoin");
    data.append("client_id", process.env.WLD_CLIENT_ID ?? "");

    console.log("Sending request to Worldcoin API for token exchange.");
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
    console.log("Token received from Worldcoin:", { access_token, ...all_data });

    const user_data_raw = await fetch("https://id.worldcoin.org/userinfo", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const user_data = await user_data_raw?.json();
    console.log("User data retrieved:", user_data);

    const stampId = 26;
    const dbUser = userid;
    const database = {
      uniquehash: await encode_data(user_data.sub),
      stamptype: stampId,
      created_by_user_id: userid,
      unencrypted_unique_data: JSON.stringify(user_data),
      type_and_hash: `${stampId} ${await encode_data(user_data.sub)}`,
    };
    const dataToSet = {
      created_by_user_id: userid,
      created_by_app: process.env.NEXT_PUBLIC_DAPP_ID,
      stamptype: stampId,
      uniquevalue: user_data.sub,
      user_id_and_uniqueval: `${userid} ${stampId} ${user_data.sub}`,
      unique_hash: await encode_data(user_data?.sub),
      stamp_json: { user_data },
      type_and_uniquehash: `${stampId} ${await encode_data(user_data.sub)}`,
    };
    
    console.log("Inserting data into uniquestamps table.");
    await supabase.from("uniquestamps").insert({
      ...database,
    });

    console.log("Inserting data into stamps table.");
    const { error, data: stampData } = await supabase
      .from("stamps")
      .insert({
        ...dataToSet,
      })
      .select("*");

    if (error) {
      console.error("Error inserting data into stamps table:", error);
      throw error;
    }

    if (stampData?.[0]?.id) {
      console.log("Stamp inserted with ID:", stampData[0].id);
      await supabase.from("authorized_dapps").insert({
        dapp_id: process.env.NEXT_PUBLIC_DAPP_ID,
        dapp_and_stamp_id: `${process.env.NEXT_PUBLIC_DAPP_ID} ${stampData?.[0]?.id}`,
        stamp_id: stampData?.[0]?.id,
        can_read: true,
        can_update: true,
        can_delete: true,
      });
      console.log("Data inserted into authorized_dapps table.");
    }

    res.send({ user_data });
    console.log("Response sent successfully.");

  } catch (err) {
    console.error("Error occurred:", err);
    res.status(500).send({ error: err.message });
  }
}
