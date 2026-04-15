import NextAuth from "next-auth"

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
          redirect_uri:
            process.env.WLD_REDIRECT_URI ??
            process.env.NEXT_PUBLIC_WORLDCOIN_REDIRECT_URI,
          response_type: "code",
        },
      },
      clientId: process.env.WLD_CLIENT_ID,
      clientSecret: process.env.WLD_CLIENT_SECRET,
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
