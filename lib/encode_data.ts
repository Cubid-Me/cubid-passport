import axios from "axios"

export const encode_data = async (string: string) => {
  const { data } = await axios.post(`/api/encode-data`, {
    dataKey: string,
  })
  return data
}
