import React, { useEffect, useState } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import useAuth from "@/hooks/useAuth"
// Import shadcn UI table components
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table"

export const Secret = () => {
    const [secrets, setSecrets] = useState<any[]>([])
    // Keep track of which secret is revealed (by secret id)
    const [revealedSecrets, setRevealedSecrets] = useState<{ [key: string]: boolean }>({})
    const { supabaseUser } = useAuth({})

    // Fetch secrets from the dapp_secrets table
    useEffect(() => {
        const fetchSecrets = async () => {
            try {
                const { data: { data: supabaseData } } = await axios.post("/api/supabase/select", {
                    table: "dapp_users",
                    match: { user_id: supabaseUser?.id }
                })

                const allPromises = supabaseData.map(async (item: any) => {
                    const { data } = await axios.post("/api/supabase/select", {
                        table: "dapp_user_secrets",
                        match: { dapp_user_uuid: item.uuid }
                    })
                    const { data: { data: dapp_user_data } } = await axios.post("/api/supabase/select", {
                        table: "dapps",
                        match: { id: item.dapp_id }
                    })

                    return data.data.map((_: any) => ({ ..._, uuid: item, appname: dapp_user_data?.[0]?.appname }))
                })
                const response = await Promise.all(allPromises)
                // Assuming the response structure has data.data as the rows
                const allData: any = []
                response.map((item) => (
                    item.map((_: any) => {
                        allData.push(_)
                    })
                ))
                setSecrets(allData)
            } catch (error) {
                console.error("Error fetching dapp secrets", error)
                toast.error("Failed to fetch secrets")
            }
        }
        if (supabaseUser?.id)
            fetchSecrets()
    }, [supabaseUser])

    // Toggle secret visibility for a given row id
    const toggleSecretReveal = (id: string) => {
        setRevealedSecrets((prev) => ({ ...prev, [id]: !prev[id] }))
    }

    return (
        <div className="p-2">
            <p className="text-2xl font-bold mb-4">Archived Secrets Recovery</p>
            <p>
                This tab contains encrypted secrets that were securely archived by third-party apps you previously used elsewhere in the Cubid ecosystem. These secrets were saved here as a backup in case you ever lost access to them. While we don’t know their exact scope or contents, we do know which app stored them.
                <br />
                If you recognize an app listed below and need to recover your stored secret, follow the retrieval steps provided. If you don’t recall saving anything here, you can safely ignore this section.
            </p>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Dapp Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Secret</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {secrets.length === 0 && <p className="p-3">No User Secrets Available</p>}
                    {secrets.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>{item.appname}</TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <span>{revealedSecrets[item.id] ? item.secret : "••••••••"}</span>
                                    <button
                                        className="px-2 py-1 text-sm bg-blue-500 text-white rounded"
                                        onClick={() => toggleSecretReveal(item.id)}
                                    >
                                        {revealedSecrets[item.id] ? "Hide Secret" : "Reveal Secret"}
                                    </button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}