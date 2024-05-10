// @ts-nocheck
import React, { useState } from "react"

export const Score = ({
  stamps,
  setStampToAdd,
  stampsList,
  setSteps,
  stampScores,
}: any) => {
  console.log(stampScores, stampsList, setStampToAdd)
  const isStampsValid = Array.isArray(stamps) && stamps.length !== 0

  if (!isStampsValid) {
    return <></>
  }

  const allStampIds = stampsList.map((item: any) => item.stamptype)

  function sortArrayByCondition(arr: any) {
    return arr.sort((a: any, b: any) => {
      const aMeetsCondition = allStampIds?.includes(a?.stamptypes?.id) ? -1 : 1
      const bMeetsCondition = allStampIds?.includes(b?.stamptypes?.id) ? -1 : 1
      return aMeetsCondition - bMeetsCondition
    })
  }

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
            {sortArrayByCondition(stamps).map((item: any) => {
              const scoreData = stampScores.find(
                (_: any) => _.stamptype_id === item.stamptype_id
              )

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
                    {" "}
                    {!allStampIds?.includes(item?.stamptypes?.id)
                      ? ""
                      : scoreData?.score}
                  </td>
                  <td className="px-6 py-4">
                    {allStampIds?.includes(item?.stamptypes?.id)
                      ? ""
                      : scoreData?.score}
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
              )
            })}
            <tr className="border-b bg-gray-200 p-2 text-left dark:border-gray-700 dark:bg-gray-800">
              <th
                scope="row"
                className="whitespace-nowrap px-6 py-4 font-bold capitalize text-gray-900 dark:text-white"
              >
                Total Score
              </th>
              <td className="px-6 py-4 font-bold">
                {[
                  ...stamps.filter((item) =>
                    allStampIds?.includes(item?.stamptypes?.id)
                  ),
                ].reduce((curr, item) => {
                  const scoreData = stampScores.find(
                    (_) => _.stamptype_id === item.stamptype_id
                  )
                  return (scoreData?.score ?? 0) + curr
                }, 0)}
              </td>
              <td className="px-6 py-4 font-bold">
                {[
                  ...stamps.filter(
                    (item) => !allStampIds?.includes(item?.stamptypes?.id)
                  ),
                ].reduce((curr, item) => {
                  const scoreData = stampScores.find(
                    (_) => _.stamptype_id === item.stamptype_id
                  )
                  return (scoreData?.score ?? 0) + curr
                }, 0)}
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
            className="w-[100px] rounded-lg border bg-gray-100 px-5 py-2 text-sm text-black "
          >
            Next
          </button>
        </div>
      </div>
    </>
  )
}
