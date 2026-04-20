import React, { useCallback, useEffect, useState } from "react"
import axios from "axios"

import useAuth from "@/hooks/useAuth"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export const BrightIdConnectSheet = ({
  modalOpen,
  closeModal,
  email,
  supabaseUser,
}: {
  modalOpen: boolean
  closeModal: () => void
  email: string
  supabaseUser: any
}) => {
  const [brightIdData, setBrightIdData] = useState()
  const { getUser } = useAuth({})

  const fetchUserData = useCallback(async () => {
    const user = supabaseUser
    if (user?.id) {
      const {
        data: { data },
      } = await axios.post("/api/supabase/select", {
        match: { created_by_user_id: user.id, stamptype: 8 },
        table: "stamps",
      })
      if (data?.[0]) {
        setBrightIdData?.(data[0])
      }
      return data?.[0]
    }

  }, [email, getUser, supabaseUser])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  useEffect(() => {
    let interval: any
    if (modalOpen) {
      interval = setInterval(async () => {
        const allUserData = await fetchUserData()
        if (allUserData) {
          closeModal()
            ; (window as any).location.reload()
        }
      }, 1000)
    } else {
      clearInterval(interval)
    }
    return () => {
      clearInterval(interval)
    }
  }, [modalOpen, fetchUserData, closeModal])

  return (
    <>
      <Sheet
        open={modalOpen}
        onOpenChange={(value) => {
          if (value === false) {
            closeModal()
          }
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Connect to BrightId</SheetTitle>
            <div>
              {modalOpen && (
                <iframe
                  style={{
                    width: "100%",
                    height: 1000,
                    borderRadius: 10,
                    marginTop: 10,
                  }}
                  src={`https://aura-new-beta.vercel.app/?email=${email}`}
                />
              )}
            </div>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </>
  )
}
