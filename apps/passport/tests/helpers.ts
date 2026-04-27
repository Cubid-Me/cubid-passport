import type { NextApiRequest, NextApiResponse } from "next"
import { createHmac } from "node:crypto"

type BucketRow = {
  bucket_key: string
  count: number
  window_start: string
}

type DappApiKeyRow = {
  dapp_id: number
  id: number
  key_hash: string
  key_prefix: string
  status: string
}

type EmailOtpRow = Record<string, unknown> & {
  attempt_count?: number
  consumed_at?: string | null
  created_at?: string
  email: string
  expires_at?: string
  id: number
  otp_hash?: string
}

type DappUserRow = {
  dapp_id: number
  uuid: string
}

export class MockPassportSupabase {
  readonly buckets = new Map<string, BucketRow>()
  readonly dappApiKeys = new Map<string, DappApiKeyRow>()
  readonly dappUserSecrets: Array<Record<string, unknown>> = []
  readonly dappUsers = new Map<string, DappUserRow>()
  readonly dapps = new Map<number, Record<string, unknown>>()
  readonly emailOtps = new Map<string, EmailOtpRow[]>()
  readonly eventInserts: Array<Record<string, unknown>> = []
  readonly lastUsedUpdates: number[] = []
  private nextEmailOtpId = 1

  rpc(name: string, params: Record<string, unknown>) {
    if (name === "hash_email_otp") {
      return Promise.resolve({
        data: createHmac("sha256", "test-passport-email-otp-vault-secret")
          .update(
            [
              String(params.p_email).trim().toLowerCase(),
              String(params.p_otp).trim(),
              "email_otp",
              "v1",
            ].join(":")
          )
          .digest("hex"),
        error: null,
      })
    }

    if (name === "get_dapp_user_secret_wrapping_key_v1") {
      return Promise.resolve({
        data: Buffer.from(
          "0123456789abcdef0123456789abcdef"
        ).toString("base64"),
        error: null,
      })
    }

    throw new Error(`Unexpected RPC ${name}`)
  }

  setBucket(bucketKey: string, count: number) {
    this.buckets.set(bucketKey, {
      bucket_key: bucketKey,
      count,
      window_start: new Date(0).toISOString(),
    })
  }

  setDappApiKey(row: DappApiKeyRow) {
    this.dappApiKeys.set(`${row.key_prefix}:${row.status}`, row)
  }

  setDapp(row: Record<string, unknown> & { id: number }) {
    this.dapps.set(row.id, row)
  }

  setDappUser(row: DappUserRow) {
    this.dappUsers.set(row.uuid, row)
  }

  setEmailOtp(row: EmailOtpRow) {
    const rows = this.emailOtps.get(row.email) ?? []
    rows.push({
      ...row,
      created_at: row.created_at ?? new Date().toISOString(),
      id: row.id ?? this.nextEmailOtpId++,
    })
    this.emailOtps.set(row.email, rows)
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
          eq: (_column: string, value: number) => ({
            maybeSingle: async () => ({
              data: this.dapps.get(Number(value)) ?? null,
              error: null,
            }),
          }),
        }),
      }
    }

    if (table === "dapp_users") {
      return {
        select: () => {
          const filters: Record<string, unknown> = {}
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            maybeSingle: async () => {
              const row = this.dappUsers.get(String(filters.uuid))
              if (!row || String(row.dapp_id) !== String(filters.dapp_id)) {
                return { data: null, error: null }
              }
              return { data: row, error: null }
            },
          }
          return query
        },
      }
    }

    if (table === "dapp_user_secrets") {
      return {
        select: () => ({
          eq: (_column: string, value: string) => ({
            then: (
              resolve: (value: {
                data: Record<string, unknown>[]
                error: null
              }) => unknown
            ) => {
              return Promise.resolve({
                data: this.dappUserSecrets.filter(
                  (row) => row.dapp_user_uuid === value
                ),
                error: null,
              }).then(resolve)
            },
          }),
        }),
        insert: async (row: Record<string, unknown>) => {
          this.dappUserSecrets.push(row)
          return { error: null }
        },
      }
    }

    if (table === "dapp_api_keys") {
      return {
        select: () => {
          const filters: Record<string, unknown> = {}
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            maybeSingle: async () => ({
              data:
                this.dappApiKeys.get(
                  `${filters.key_prefix}:${filters.status}`
                ) ?? null,
              error: null,
            }),
          }
          return query
        },
        update: (row: Record<string, unknown>) => ({
          eq: (_column: string, value: number) => {
            if (row.last_used_at) {
              this.lastUsedUpdates.push(Number(value))
            }
            return { error: null }
          },
        }),
      }
    }

    if (table === "email_otp") {
      return {
        delete: () => ({
          eq: (_column: string, value: string) => {
            this.emailOtps.delete(value)
            return { error: null }
          },
        }),
        insert: async (row: Record<string, unknown>) => {
          this.setEmailOtp({
            ...row,
            email: String(row.email),
            id: this.nextEmailOtpId++,
          })
          return { error: null }
        },
        select: () => {
          const filters: Record<string, unknown> = {}
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            is: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            limit: () => query,
            maybeSingle: async () => {
              const rows = [
                ...(this.emailOtps.get(String(filters.email)) ?? []),
              ].filter((row) => {
                if (
                  Object.prototype.hasOwnProperty.call(filters, "consumed_at")
                ) {
                  return row.consumed_at === filters.consumed_at
                }
                return true
              })
              rows.sort((left, right) =>
                String(right.created_at ?? "").localeCompare(
                  String(left.created_at ?? "")
                )
              )
              return { data: rows[0] ?? null, error: null }
            },
            order: () => query,
          }
          return query
        },
        update: (patch: Record<string, unknown>) => ({
          eq: (_column: string, value: number) => {
            for (const rows of this.emailOtps.values()) {
              const row = rows.find((candidate) => candidate.id === value)
              if (row) {
                Object.assign(row, patch)
              }
            }
            return { error: null }
          },
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
