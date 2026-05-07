import { createCubidApiClient, CubidApiError } from "../src/index.ts"

type EnvReader = {
  get(name: string): string | undefined
}

const envOrThrow = (env: EnvReader, name: string): string => {
  const value = env.get(name)
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

export const createCubidEdgeHandler = (env: EnvReader = Deno.env) => {
  const cubid = createCubidApiClient({
    apiKey: envOrThrow(env, "CUBID_API_KEY"),
    baseUrl: env.get("CUBID_API_BASE_URL") ?? "https://passport.cubid.me",
    dappId: envOrThrow(env, "CUBID_DAPP_ID"),
    fetch,
  })

  return async (request: Request): Promise<Response> => {
    const body = (await request.json()) as { email?: string }
    if (!body.email) {
      return Response.json({ error: "email is required" }, { status: 400 })
    }

    try {
      const user = await cubid.ensureUserByEmail({ email: body.email })
      const snapshot = await cubid.syncIdentitySnapshot({ userId: user.userId })

      return Response.json({
        score: snapshot.score.cubidScore,
        stamps: snapshot.stamps.allStamps.map((stamp) => stamp.stampType),
        userId: user.userId,
      })
    } catch (error) {
      if (error instanceof CubidApiError) {
        return Response.json(
          {
            category: error.category,
            code: error.code,
            error: error.message,
            requestId: error.requestId,
          },
          { status: error.status ?? 502 }
        )
      }

      throw error
    }
  }
}

