import React from "react"

export const RequiredInfo = ({ stamps, stampsList, setStampToAdd }: any) => {
  const requiredStamps = stamps.filter(
    (item: any) => item.is_infosharing_required
  )
  const isStampsValid = Array.isArray(stamps) && stamps.length !== 0
  if (!isStampsValid) {
    return <></>
  }
  const allStampIds = stampsList.map((item: any) => item.stamptype)
  return (
    <>
      <div className="mx-auto mt-2 w-[700px] rounded-md border p-2">
        <p className="mb-2 text-xl">Required Stamps</p>
        <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400 rtl:text-right">
          <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3"></th>
              <th scope="col" className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {requiredStamps.map((item: any) => {
              const relevant_stamp = stampsList.find(
                (_: any) => _.stamptype === item?.stamptypes?.id
              )
              console.log({ relevant_stamp })
              return (
                <tr
                  key={item.id}
                  className="border-b bg-white dark:border-gray-700 dark:bg-gray-800"
                >
                  <th
                    scope="row"
                    className="whitespace-nowrap px-6 py-4 font-medium capitalize text-gray-900 dark:text-white"
                  >
                    {item?.stamptypes?.stamptype}
                  </th>
                  <td className="px-6 py-4">
                    {!allStampIds?.includes(item?.stamptypes?.id) ? (
                      <p className="text-red-500 text-sm">Missing</p>
                    ) : (
                      <p>{relevant_stamp.uniquevalue}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {!allStampIds?.includes(item?.stamptypes?.id) ? (
                      <button
                        onClick={() => {
                          setStampToAdd(item?.stamptypes?.stamptype)
                        }}
                        className="h-[24px] w-[60px] rounded-md bg-blue-500 text-white"
                      >
                        Add
                      </button>
                    ) : (
                      <></>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
