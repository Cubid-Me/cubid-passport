// @ts-nocheck
"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useLoadScript } from "@react-google-maps/api"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import axios from "axios"
import debounce from "lodash.debounce"
import { useForm } from "react-hook-form"
import { useDispatch } from "react-redux"
import { createConfig, http } from "wagmi"
import { mainnet, sepolia } from "wagmi/chains"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { Stamps } from "../allow/stamps"

const libraries = ["places"]

const countries = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo, Democratic Republic of the",
  "Congo, Republic of the",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "East Timor (Timor-Leste)",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Ivory Coast",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Korea, North",
  "Korea, South",
  "Kosovo",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar (Burma)",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
]

export default function IndexPage() {
  const searchParams = useSearchParams()
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm()
  const onSubmit = (data) => {
    console.log(data)
  }
  const [stampToAdd, setStampToAdd] = useState("")
  const [userData, setUserData] = useState({})
  const [manualLocation, setManualLocation] = useState(false)
  const [allLocations, setAllLocations] = useState([])

  const fetchUserUidData = useCallback(async () => {
    const { data } = await axios.post("/api/allow/fetch_allow_uid", {
      uid: searchParams.get("uid"),
    })
    setUserData(data)
  }, [searchParams])

  const fetchCurrentAppIdStamps = useCallback(async () => {
    const { data } = await axios.post("/api/allow/fetch_uid_data", {
      uid: searchParams.get("uid"),
    })
    fetchUserUidData()
    setUserData(data)
    const {
      data: { score_details },
    } = await axios.post("/api/dapp/get_score_details_cubid", {
      uid: searchParams.get("uid"),
    })
    if (score_details) {
      score_details?.map((item) => {
        if (item?.email) {
          setValue("email", item?.email)
        }
        if (item?.phone) {
          setValue("phone", item?.phone)
        }
      })
    }
  }, [fetchUserUidData, searchParams, setValue])

  useEffect(() => {
    fetchCurrentAppIdStamps()
  }, [fetchCurrentAppIdStamps])

  const handleLocationSearch = debounce(async (input) => {
    if (input) {
      const response = await axios.post(`/api/search-location`, {
        input,
      })
      setAllLocations(response.data)
      // Handle the autocomplete response
    }
  }, 500)

  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center py-2">
        <form className="w-full max-w-sm" onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label
              className="mb-2 block text-sm font-bold text-gray-700"
              htmlFor="location"
            >
              Location
            </label>
            {!manualLocation ? (
              <>
                <input
                  className="focus:shadow-outline w-full dark:text-white appearance-none rounded-lg px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
                  id="location"
                  type="text"
                  placeholder="Search and select home or work address"
                  {...register("location", { required: true })}
                  onChange={(e) => {
                    setValue("location",e.target.value)
                    handleLocationSearch(e.target.value)
                  }}
                />
                <button
                  type="button"
                  className="mt-2 text-xs text-blue-500"
                  onClick={() => setManualLocation(true)}
                >
                  Enter location manually
                </button>
                {allLocations.map((item) => (
                  <div>{item.name}</div>
                ))}
              </>
            ) : (
              <>
                <select
                  className="focus:shadow-outline w-full dark:text-white appearance-none rounded-lg px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
                  id="country"
                  {...register("country", { required: true })}
                >
                  <option value="">Select Country</option>
                  {countries.map((country, index) => (
                    <option key={index} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
                <input
                  className="focus:shadow-outline w-full dark:text-white appearance-none rounded-lg px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none mt-2"
                  id="postcode"
                  type="text"
                  placeholder="Postcode"
                  {...register("postcode", { required: true })}
                />
                <button
                  type="button"
                  className="mt-2 text-blue-500"
                  onClick={() => setManualLocation(false)}
                >
                  Search and select address
                </button>
              </>
            )}
            {errors.location && (
              <span className="text-xs italic text-red-500">
                Location is required.
              </span>
            )}
            {errors.country && manualLocation && (
              <span className="text-xs italic text-red-500">
                Country is required.
              </span>
            )}
            {errors.postcode && manualLocation && (
              <span className="text-xs italic text-red-500">
                Postcode is required.
              </span>
            )}
          </div>
          <div className="mb-4">
            <label
              className="mb-2 block text-sm font-bold text-gray-700"
              htmlFor="phone"
            >
              Phone
            </label>
            <div className="flex items-center justify-between">
              <p className="text-lg">{watch("phone") ?? "Phone Number"}</p>
              <button
                type="button"
                onClick={() => {
                  setStampToAdd("phone")
                }}
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
              >
                Add
              </button>
            </div>

            {Boolean(stampToAdd) && (
              <Sheet
                open={Boolean(stampToAdd)}
                onOpenChange={(value) => {
                  if (value === false) {
                    setStampToAdd("")
                  }
                }}
              >
                <SheetContent>
                  <Stamps
                    supabaseUser={userData?.dapp_users?.[0].users}
                    isOpen={Boolean(stampToAdd)}
                    refreshUser={fetchUserUidData}
                    onMainPanelClose={() => {
                      fetchCurrentAppIdStamps()
                      setStampToAdd("")
                      fetchUserUidData()
                    }}
                    stampToRender={stampToAdd}
                  />
                </SheetContent>
              </Sheet>
            )}
            {errors.phone && (
              <span className="text-xs italic text-red-500">
                Valid phone number is required.
              </span>
            )}
          </div>
          <div className="mb-6">
            <label
              className="mb-2 block text-sm font-bold text-gray-700"
              htmlFor="email"
            >
              Email
            </label>
            <div className="flex items-center justify-between">
              <p className="text-lg">{watch("email") ?? "Email"}</p>
              <button
                type="button"
                onClick={() => {
                  setStampToAdd("email")
                }}
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
              >
                Add
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button
              className="focus:shadow-outline w-full rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 focus:outline-none"
              type="submit"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </>
  )
}