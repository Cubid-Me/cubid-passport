import axios from "axios"

export const insertStampPerm = async (stampId: any, dapp_user_id: any) => {
  await axios.post("/api/supabase/insert", {
    body: {
      stamp_id: stampId,
      dappuser_id: dapp_user_id,
      can_write: true,
      can_delete: true,
      can_read: true,
    },
    table: "stamp_dappuser_permissions"
  })
}

export const selectStampPerm = async (dapp_user_id: any) => {
  await axios.post("/api/supabase/select", {
    table: "stamp_dappuser_permissions",
    match: {
      dappuser_id: dapp_user_id,
    }
  })
}

