import React, { useState } from "react"

export const Score = ({ stamps, setStampToAdd, stampsList, setSteps }: any) => {
  const isStampsValid = Array.isArray(stamps) && stamps.length !== 0

  if (!isStampsValid) {
    return <></>
  }

  const allStampIds = stampsList.map((item: any) => item.stamptype)

  return (
    <>
      <div className="mx-auto mt-2 w-[700px] rounded-md border p-2">
        <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400 rtl:text-right">
          <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3"></th>
              <th scope="col" className="px-6 py-3">
                My Scores
              </th>
              <th scope="col" className="px-6 py-3">
                Available
              </th>
              <th scope="col" className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {stamps.map((item: any) => (
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
                  {" "}
                  {!allStampIds?.includes(item?.stamptypes?.id)
                    ? ""
                    : item?.stamptypes?.stamp_score}
                </td>
                <td className="px-6 py-4">
                  {allStampIds?.includes(item?.stamptypes?.id)
                    ? ""
                    : item?.stamptypes?.stamp_score}
                </td>
                <td className="px-6 py-4">
                  {!allStampIds?.includes(item?.stamptypes?.id) && (
                    <button
                      onClick={() => {
                        setStampToAdd(item?.stamptypes?.stamptype)
                      }}
                      className="h-[24px] w-[60px] rounded-md bg-blue-500 text-white"
                    >
                      Add
                    </button>
                  )}
                </td>
              </tr>
            ))}
            <tr className="border-b text-left bg-white p-2 dark:border-gray-700 dark:bg-gray-800">
              <th
                scope="row"
                className="whitespace-nowrap px-6 py-4 font-medium capitalize text-gray-900 dark:text-white"
              >
                Total Score
              </th>
              <td className="px-6 py-4">
                {[
                  ...stamps.filter((item) =>
                    allStampIds?.includes(item?.stamptypes?.id)
                  ),
                ].reduce(
                  (curr, item) => item?.stamptypes?.stamp_score + curr,
                  0
                )}
              </td>
              <td className="px-6 py-4">
                {[
                  ...stamps.filter(
                    (item) => !allStampIds?.includes(item?.stamptypes?.id)
                  ),
                ].reduce(
                  (curr, item) => item?.stamptypes?.stamp_score + curr,
                  0
                )}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <div className="mt-2 flex items-center justify-center space-x-2">
          <button
            onClick={() => {
              setSteps(1)
            }}
            className="w-[80px] rounded-lg border bg-blue-500 py-2 text-white "
          >
            Next
          </button>
        </div>
      </div>
    </>
  )
}
