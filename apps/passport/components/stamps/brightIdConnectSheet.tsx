import React, { useCallback, useEffect, useState } from "react"

import useAuth from "@/hooks/useAuth"
import { listPassportStampsByUser } from "@/lib/passportDataApi"
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
}: {
  modalOpen: boolean
  closeModal: () => void
  email: string
}) => {
  const [brightIdData, setBrightIdData] = useState()
  const { getUser } = useAuth({})

  const fetchUserData = useCallback(async () => {
    if (email) {
      const user = await getUser()
      if (user?.id) {
        const data = await listPassportStampsByUser({
          stampTypeIds: [8],
          userId: user.id,
        })
        if (data?.[0]) {
          setBrightIdData?.(data[0])
        }
        return data?.[0]
      }
    }
  }, [email, getUser])

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
          ;(window as any).location.reload()
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
