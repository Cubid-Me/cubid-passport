import type { NextApiRequest, NextApiResponse } from "next"

type BucketRow = {
  bucket_key: string
  count: number
  window_start: string
}

export class MockPassportSupabase {
  readonly buckets = new Map<string, BucketRow>()
  readonly eventInserts: Array<Record<string, unknown>> = []

  setBucket(bucketKey: string, count: number) {
    this.buckets.set(bucketKey, {
      bucket_key: bucketKey,
      count,
      window_start: new Date(0).toISOString(),
    })
  }

  from(table: string) {
    if (table === "api_rate_limit_buckets") {
      return {
        select: () => ({
          eq: (_column: string, value: string) => ({
            maybeSingle: async () => ({
              data: this.buckets.get(value) ?? null,
              error: null,
            }),
          }),
        }),
        upsert: async (row: Record<string, unknown>) => {
          this.buckets.set(String(row.bucket_key), {
            bucket_key: String(row.bucket_key),
            count: Number(row.count ?? 0),
            window_start: String(row.window_start ?? ""),
          })
          return { error: null }
        },
      }
    }

    if (table === "api_security_events") {
      return {
        insert: async (row: Record<string, unknown>) => {
          this.eventInserts.push(row)
          return { error: null }
        },
      }
    }

    if (table === "dapps") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: null,
              error: null,
            }),
          }),
        }),
      }
    }

    throw new Error(`Unexpected table ${table}`)
  }
}

export const createApiRequest = (
  input: Partial<NextApiRequest> & {
    body?: unknown
    headers?: Record<string, string | string[] | undefined>
    method?: string
    url?: string
  } = {}
) => {
  return {
    body: input.body ?? {},
    headers: input.headers ?? {},
    method: input.method ?? "POST",
    url: input.url ?? "/api/test",
    ...input,
  } as NextApiRequest
}

export const createApiResponse = () => {
  const headers: Record<string, string> = {}
  const response = {
    body: undefined as unknown,
    headers,
    json(payload: unknown) {
      response.body = payload
      return response
    },
    setHeader(key: string, value: string | string[]) {
      headers[key.toLowerCase()] = Array.isArray(value)
        ? value.join(", ")
        : value
      return response
    },
    status(statusCode: number) {
      response.statusCode = statusCode
      return response
    },
    end(payload?: unknown) {
      response.body = payload
      return response
    },
    statusCode: 200,
  }

  return response as unknown as NextApiResponse & {
    body?: unknown
    headers: Record<string, string>
    statusCode: number
  }
}
