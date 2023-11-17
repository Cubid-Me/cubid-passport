import React,{useEffect,useCallback,useState} from "react"
import axios from 'axios'
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

  const [brightIdData,setBrightIdData] = useState()

  const fetchUserData = useCallback(async () => {
    if (email) {
      const {
        data: { data }
      } = await axios.post('/api/supabase/select', {
        match: { email },
        table: 'brightid-data'
      });
      if (data?.[0]) {
        setBrightIdData(data[0]);
      }
      return data?.[0];
    }
  }, [email]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    let interval:any;
    if (modalOpen) {
      interval = setInterval(async () => {
        const allUserData = await fetchUserData();
        console.log(allUserData);
        if (allUserData) {
          closeModal()
          window.location.reload();
        }
      }, 1000);
    }
    return () => {
      clearInterval(interval);
    };
  }, [modalOpen, fetchUserData,closeModal]);

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
