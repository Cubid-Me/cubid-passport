// @ts-nocheck
"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useLoadScript } from "@react-google-maps/api"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import axios from "axios"
import debounce from "lodash.debounce"
import { useFieldArray, useForm } from "react-hook-form"
import { useDispatch } from "react-redux"
import { createConfig, http } from "wagmi"
import { mainnet, sepolia } from "wagmi/chains"

import { insertStampPerm } from "@/lib/insert_stamp_perm"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { Stamps } from "../allow/stamps"
import useGeolocation from "./useGeolocation"

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

const emailTypes = ["Personal", "Work"]
const phoneTypes = ["Home", "Work", "Mobile"]

export default function IndexPage() {
  const searchParams = useSearchParams()
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
    getValues,
    unregister,
  } = useForm()
  const [userData, setUserData] = useState({})

  const { coordinates, error } = useGeolocation()
  const [stampToAdd, setStampToAdd] = useState("")


  const [manualLocation, setManualLocation] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState()
  const [allLocations, setAllLocations] = useState([])

  const [locationDetailsJSON, setLocationDetailsJSON] = useState(null)

  const { fields: emailFields, append: appendEmail } = useFieldArray({
    control,
    name: "emails",
  })
  const { fields: phoneFields, append: appendPhone } = useFieldArray({
    control,
    name: "phones",
  })

  useEffect(() => {
    if (coordinates?.lat) {
      (async () => {
        await axios.post("/api/supabase/update", {
          body: {
            address: {
              coordinates,
            },
          },
          table: "users",
          match: {
            id: userData?.dapp_users?.[0].users?.id,
          },
        })
        const { data } = await axios.post(
          "/api/v2/identity/fetch_approx_location",
          {
            user_id: searchParams.get("uid"),
            apikey: "bb345ead-ee52-4a83-ab4d-6958ae6fe622",
          }
        )
        setLocationDetailsJSON(data)
      })()
    }
  }, [userData, coordinates])

  const onSubmit = async (data) => {
    await axios.post("/api/supabase/update", {
      body: {
        address: {
          address: data.location,
          country: data.country,
          postcode: data.postcode,
          locationDetails: selectedLocation,
          coordinates,
        },
        cubid_postalcode: data.postcode,
        cubid_country: data.country,
        phone: data.phone,
      },
      table: "users",
      match: {
        id: userData?.dapp_users?.[0].users?.id,
      },
    })
    const { data: uid_data } = await axios.post("/api/allow/fetch_uid_data", {
      uid: searchParams.get("uid"),
    })
    const { data: stamps } = await axios.post("/api/supabase/select", {
      table: "stamps",
      match: {
        created_by_user_id: uid_data?.dapp_users[0].users.id,
      },
    })

    const dapp_id = uid_data?.dapp_users[0]?.dapp_id
    const filteredStamps = stamps.data.filter(
      (item) =>
        item.uniquevalue === data.phone || item.uniquevalue === data.email
    )
    const allPromises = filteredStamps.map((item) =>
      insertStampPerm(item.id, dapp_id)
    )
    await Promise.all(allPromises)
    window.location.href = searchParams.get("redirect_ui")
  }

  useEffect(() => {
    if (manualLocation) {
      unregister("location")
    } else {
      unregister("postcode")
      unregister("country")
    }
  }, [manualLocation, unregister])

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
    if (!watch('location')) {
      setValue(
        "location",
        data?.dapp_users[0].users.address?.locationDetails?.formatted_address ??
        ""
      )
    }
    setValue("postcode", data?.dapp_users[0].users.address?.postcode ?? "")
    fetchUserUidData()
    setUserData(data)
    const {
      data: { score_details },
    } = await axios.post("/api/dapp/get_score_details_cubid", {
      uid: searchParams.get("uid"),
    })
    console.log({ score_details }, 'scoreeee')
    if (score_details) {
      score_details?.map((item) => {
        // if (item?.email) {
        //   setValue(
        //     "emails",
        //     item?.email
        //       ?.map((_) => (_ ? { email: _, type: "personal" } : null))
        //       ?.filter((item) => item?.email)
        //   )
        //   console.log({
        //     email: [
        //       ...item?.email
        //         ?.map((_) => (_ ? { email: _, type: "personal" } : null))
        //         ?.filter((item) => item?.email),
        //     ][0]?.email,
        //   })
        // }
        if (item?.phone) {
          setValue(
            "phones",
            item?.phone
              ?.map((_) => (_ ? { phone: _, type: "personal" } : null))
              ?.filter((item) => item?.phone)
          )
          if (item?.phone[item?.phone?.length - 1]) {
            setValue(
              "phone",
              item?.phone[item?.phone?.length - 1]
            )
          }
        }
      })
    }
  }, [watch])

  useEffect(() => {
    fetchCurrentAppIdStamps()
  }, [fetchCurrentAppIdStamps, stampToAdd])

  const handleLocationSearch = debounce(async (input) => {
    setSelectedLocation(null)
    if (input.length >= 2) {
      const response = await axios.post(`/api/search-location`, {
        input,
      })
      setAllLocations(response.data)
      // Handle the autocomplete response
    }
  }, 500)

  console.log('phone is here', watch("phone"))

  function roundToTwoDecimals(num) {
    return Math.round(num * 100) / 100;
  }

  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center py-2">
        <form className="w-full max-w-sm" onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <p className="text-xl">Welcome to Toronto DAO</p>
            <p className="text-md">
              Step 2 of 2: Create a Private profile for TDAO
            </p>
            <p className="text-sm">TDAO uses CUBID to capture, store and anonymize private data like your address. CUBID is a protocol for self-sovereign identity management</p>
            <label
              className="mb-2 mt-4 block text-sm font-bold text-gray-700"
              htmlFor="location"
            >
              Where do you live?
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
                    setValue("location", e.target.value)
                    handleLocationSearch(e.target.value)
                  }}
                />
                {!Boolean(selectedLocation?.name) &&
                  allLocations.map((item) => (
                    <>
                      <div
                        key={item.name}
                        onClick={() => {
                          setValue("location", item.formatted_address)
                          setSelectedLocation(item)
                        }}
                        className={
                          selectedLocation?.name === item.name
                            ? "font-bold pb-2"
                            : "cursor-pointer pb-2"
                        }
                      >
                        {item.formatted_address}
                      </div>
                    </>
                  ))}
                <button
                  type="button"
                  className="mt-2 text-xs text-blue-500"
                  onClick={() => setManualLocation(true)}
                >
                  Enter location manually
                </button>
              </>
            ) : (
              <>
                <select
                  className="focus:shadow-outline w-full dark:text-white appearance-none rounded-lg px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
                  id="country"
                  {...register("country", { required: manualLocation })}
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
                  {...register("postcode", { required: manualLocation })}
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
              <span className="pl-3 text-xs text-red-500">
                Location is required.
              </span>
            )}
            {errors.country && manualLocation && (
              <span className="pl-3 text-xs text-red-500">
                Country is required.
              </span>
            )}
            {errors.postcode && manualLocation && (
              <span className="pl-3 text-xs text-red-500">
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
            <label
              htmlFor="phone"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Select an option
            </label>
            <select
              id="phone"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              {...register("phone", { required: true })}
              value={watch("phone")}
            >
              <option value="">Choose a Phone</option>
              {phoneFields.map((field, index) => (
                <option value={field.phone} key={field.phone}>
                  {field.phone}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="text-white mt-2 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
              onClick={() => {
                setStampToAdd("phone")
              }}
            >
              Add Phone
            </button>
            {errors.phone && (
              <span className="pl-3 text-xs text-red-500">
                Valid phone number is required.
              </span>
            )}
          </div>
          {/* <div className="mb-6">
            <label
              className="mb-2 block text-sm font-bold text-gray-700"
              htmlFor="email"
            >
              Email
            </label>
            <label
              htmlFor="email"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Select an option
            </label>
            <select
              id="email"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              {...register("email", { required: true })}
              value={watch("email")}
            >
              <option value="">Choose an Email</option>
              {emailFields.map((field, index) => (
                <option value={field.email} key={field.email}>
                  {field.email}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="text-white mt-2 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
              onClick={() => {
                setStampToAdd("email")
              }}
            >
              Add Email
            </button>
            {errors.email && (
              <span className="pl-3 text-xs text-red-500">
                Valid email address is required.
              </span>
            )}
          </div> */}
          {console.log({ selectedLocation })}
          {Boolean(selectedLocation) && Boolean(watch("phone")) ? (
            <div className="text-xs mb-2">
              <p className="text-xs">
                After clicking submit you agree to share this location data with
                the APP
              </p>
              <div className="p-5 rounded-lg shadow-md">
                {Boolean(selectedLocation?.formatted_address) && (
                  <div className="mb-2">
                    <strong>Place Name:</strong> <span>{selectedLocation.formatted_address}</span>
                  </div>
                )}
                {Boolean(locationDetailsJSON?.pluscode) && (
                  <div className="mb-2">
                    <strong>Plus Code:</strong> <span>{locationDetailsJSON.pluscode}</span>
                  </div>
                )}
                {Boolean(locationDetailsJSON?.coordinates) && (
                  <div className="mb-2">
                    <strong>Coordinates:</strong> <span>Latitude: {roundToTwoDecimals(selectedLocation.geometry.location.lat)}, Longitude: {roundToTwoDecimals(selectedLocation.geometry.location.lng)}</span>
                  </div>
                )}
                {Boolean(locationDetailsJSON?.error) && (
                  <div className="mb-2">
                    <strong>Error:</strong> <span>{locationDetailsJSON?.error}</span>
                  </div>
                )}
                {Boolean(watch("phone")) && (
                  <div className="mb-2">
                    <strong>Phone:</strong> <span>{watch("phone")}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>

            </>
          )}
          <button
            className="focus:shadow-outline w-full rounded bg-blue-500 py-2 px-4 font-bold text-white hover:bg-blue-700 focus:outline-none"
            type="submit"
          >
            Submit
          </button>
        </form>
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
                refreshUser={fetchCurrentAppIdStamps}
                onMainPanelClose={() => {
                  fetchCurrentAppIdStamps()
                  setStampToAdd("")
                }}
                stampToRender={stampToAdd}
              />
            </SheetContent>
          </Sheet>
        )}
      </div>
    </>
  )
}
