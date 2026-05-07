import NextAuth from "next-auth"

import { getOptionalEnv, getRequiredSecret } from "@cubid/config"

const worldcoinClientId = getRequiredSecret("WLD_CLIENT_ID")
const worldcoinClientSecret = getRequiredSecret("WLD_CLIENT_SECRET")
const worldcoinRedirectUri =
  getOptionalEnv("WLD_REDIRECT_URI") ??
  getRequiredSecret("NEXT_PUBLIC_WORLDCOIN_REDIRECT_URI")

export const authOptions = {
  providers: [
    {
      id: "worldcoin",
      name: "Worldcoin",
      type: "oauth",
      wellKnown: "https://id.worldcoin.org/.well-known/openid-configuration",
      authorization: {
        params: {
          scope: "openid",
          redirect_uri: worldcoinRedirectUri,
          response_type: "code",
        },
      },
      clientId: worldcoinClientId,
      clientSecret: worldcoinClientSecret,
    },
  ],
  callbacks: {
    async jwt({ token }: any) {
      token.userRole = "admin"
      return token
    },
  },
  debug: true,
}

export default (NextAuth as any)(authOptions as any)
