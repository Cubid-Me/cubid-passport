import axios from "axios"

const apiKeyForGoogle = "AIzaSyCW7A2LY_XIQtmNym9t0hs17nPYO7O7A0A"

export const getCountryFromPlusCode = async (plusCode: any) => {
  try {
    // Make request to Google Geocoding API with the Plus Code
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      {
        params: {
          address: plusCode,
          key: apiKeyForGoogle,
        },
      }
    )

    const results = response.data.results
    if (results.length > 0) {
      // Loop through the results to find the country
      for (const component of results[0].address_components) {
        if (component.types.includes("country")) {
          return component.long_name
        }
      }
    } else {
      console.log("No results found for the given Plus Code.")
    }
  } catch (error) {
    console.error("Error fetching country from Plus Code:", error)
  }
}

export const getLocationDetailsFromPlusCode = async (plusCode: any) => {
  try {
    // Make request to Google Geocoding API with the Plus Code
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      {
        params: {
          address: plusCode,
          key: apiKeyForGoogle,
        },
      }
    )

    const results = response.data.results

    if (results.length > 0) {
      const formattedAddress = results[0].formatted_address // Get formatted address
      let postalCode = null
      let country = null

      // Loop through the address components to find postal code and country
      for (const component of results[0].address_components) {
        if (component.types.includes("postal_code")) {
          postalCode = component.long_name // Get postal code
        }
        if (component.types.includes("country")) {
          country = component.long_name // Get country
        }
      }
      return { formattedAddress, postalCode, country }
    } else {
      console.log("No results found for the given Plus Code.")
    }
  } catch (error) {
    console.error("Error fetching data from Plus Code:", error)
  }
}
