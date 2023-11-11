import React from "react"

const AllowPage = () => {
  return (
    <div className="flex h-[100vh] w-[100vw] items-center justify-center">
      <div className="w-[650px] rounded border border-gray-200 p-6 text-center dark:border-gray-800">
        <p className="text-4xl font-semibold">Allow Access to APP_NAME</p>
        <p>
          Do you give me permission to APP_NAME to access the following data
          from cubid ?
        </p>
        <div className="mt-3 space-y-2">
          <div className="rounded border p-2">Facebook</div>
        </div>
        <div className="mt-3 space-y-2">
          <div className="rounded border p-2">Google</div>
        </div>
        <div className="mt-2 flex justify-end space-x-2">
          <button className="w-[180px] rounded bg-red-500 p-2 text-xs text-white">Cancel</button>
          <button className="w-[180px] rounded bg-blue-500 p-2 text-xs text-white">Allow</button>
        </div>
      </div>
    </div>
  )
}

export default AllowPage
