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
          redirect_uri: "https://passport.cubid.me/worldcoin",
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

const auth = "7136237295:AAGtcINhyf2S00aVoPWoj-5yh81QV62Ggok"
