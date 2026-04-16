import NextAuth from "next-auth"

const worldcoinClientId = process.env.WLD_CLIENT_ID
const worldcoinClientSecret = process.env.WLD_CLIENT_SECRET
const worldcoinRedirectUri = process.env.WLD_REDIRECT_URI ?? process.env.NEXT_PUBLIC_WORLDCOIN_REDIRECT_URI

if (!worldcoinClientId || !worldcoinClientSecret || !worldcoinRedirectUri) {
  throw new Error("Missing Worldcoin environment configuration for NextAuth")
}

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
