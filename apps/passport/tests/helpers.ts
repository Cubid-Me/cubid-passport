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
  user_id?: number
  uuid: string
}

export class MockPassportSupabase {
  readonly appScopedSubjects: Array<Record<string, unknown>> = []
  readonly actorProfiles = new Map<string, Record<string, unknown>>()
  readonly buckets = new Map<string, BucketRow>()
  readonly dappApiKeys = new Map<string, DappApiKeyRow>()
  readonly apiIdempotencyKeys: Array<Record<string, unknown>> = []
  readonly clearPassVerificationSessions: Array<Record<string, unknown>> = []
  readonly dappUserAccounts: Array<Record<string, unknown>> = []
  readonly dappUserSecrets: Array<Record<string, unknown>> = []
  readonly privateDappUserSecrets: Array<Record<string, unknown>> = []
  readonly dappUsers = new Map<string, DappUserRow>()
  readonly dappPages = new Map<number, Record<string, unknown>>()
  readonly dapps = new Map<number, Record<string, unknown>>()
  readonly emailOtps = new Map<string, EmailOtpRow[]>()
  readonly eventInserts: Array<Record<string, unknown>> = []
  readonly lastUsedUpdates: number[] = []
  readonly oidcHumanSubjects: Array<Record<string, unknown>> = []
  readonly privateKeys: Array<Record<string, unknown>> = []
  readonly selectiveDisclosureGrants: Array<Record<string, unknown>> = []
  readonly siwcSigningRequests: Array<Record<string, unknown>> = []
  readonly siwcSigningPolicies: Array<Record<string, unknown>> = []
  readonly oidcSessions: Array<Record<string, unknown>> = []
  readonly stampPermissions: Array<Record<string, unknown>> = []
  readonly stamps: Array<Record<string, unknown>> = []
  readonly userAccounts: Array<Record<string, unknown>> = []
  readonly users = new Map<number, Record<string, unknown>>()
  readonly webhookEventDeliveries: Array<Record<string, unknown>> = []
  readonly webhookEvents: Array<Record<string, unknown>> = []
  readonly webhookSubscriptions: Array<Record<string, unknown>> = []
  failNextPrivateKeyInsert = false
  private nextEmailOtpId = 1

  rpc(name: string, params: Record<string, unknown>) {
    if (name === "increment_api_rate_limit_bucket") {
      const bucketKey = String(params.p_bucket_key)
      const existing = this.buckets.get(bucketKey)
      const count = (existing?.count ?? 0) + 1
      this.buckets.set(bucketKey, {
        bucket_key: bucketKey,
        count,
        window_start: String(params.p_window_start ?? ""),
      })
      return Promise.resolve({ data: count, error: null })
    }

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

    if (name === "get_webhook_signing_secret_wrapping_key_v1") {
      return Promise.resolve({
        data: Buffer.from(
          "abcdef0123456789abcdef0123456789"
        ).toString("base64"),
        error: null,
      })
    }

    if (name === "get_blockchain_private_key_wrapping_key_v1") {
      return Promise.resolve({
        data: Buffer.from(
          "fedcba9876543210fedcba9876543210"
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

  setDappPage(row: Record<string, unknown> & { id: number }) {
    this.dappPages.set(row.id, row)
  }

  setDappUser(row: DappUserRow) {
    this.dappUsers.set(row.uuid, row)
  }

  setStamp(row: Record<string, unknown> & { id: number }) {
    this.stamps.push(row)
  }

  setUser(row: Record<string, unknown> & { id: number }) {
    this.users.set(row.id, row)
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

  setSiwcSigningPolicy(row: Record<string, unknown>) {
    this.siwcSigningPolicies.push(row)
  }

  setOidcSession(row: Record<string, unknown>) {
    this.oidcSessions.push(row)
  }

  setOidcHumanSubject(row: Record<string, unknown>) {
    this.oidcHumanSubjects.push(row)
  }

  setWebhookSubscription(row: Record<string, unknown>) {
    this.webhookSubscriptions.push({
      id: this.webhookSubscriptions.length + 1,
      secret_reference_id: `webhook_secret_${this.webhookSubscriptions.length + 1}`,
      ...row,
    })
  }

  schema(name: string) {
    return {
      from: (table: string) => this.from(`${name}.${table}`),
    }
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

    if (table === "api_idempotency_keys") {
      const createFilteredQuery = () => {
        const filters: Record<string, unknown> = {}
        const resolve = () =>
          this.apiIdempotencyKeys.filter((row) =>
            Object.entries(filters).every(
              ([column, value]) => String(row[column]) === String(value)
            )
          )
        const query = {
          eq: (column: string, value: unknown) => {
            filters[column] = value
            return query
          },
          maybeSingle: async () => ({
            data: resolve()[0] ?? null,
            error: null,
          }),
          then: (
            resolveThen: (value: {
              data: Record<string, unknown>[]
              error: null
            }) => unknown
          ) => Promise.resolve({ data: resolve(), error: null }).then(resolveThen),
        }
        return query
      }

      return {
        insert: async (row: Record<string, unknown>) => {
          const existing = this.apiIdempotencyKeys.find(
            (candidate) =>
              candidate.route === row.route &&
              candidate.actor_type === row.actor_type &&
              candidate.actor_identifier === row.actor_identifier &&
              candidate.idempotency_key === row.idempotency_key
          )

          if (existing) {
            return { error: { code: "23505", message: "duplicate key" } }
          }

          this.apiIdempotencyKeys.push({
            created_at: new Date().toISOString(),
            id: this.apiIdempotencyKeys.length + 1,
            updated_at: new Date().toISOString(),
            ...row,
          })
          return { error: null }
        },
        select: createFilteredQuery,
        update: (patch: Record<string, unknown>) => {
          const filters: Record<string, unknown> = {}
          const updateRows = () => {
            const updatedRows: Record<string, unknown>[] = []
            for (const row of this.apiIdempotencyKeys) {
              if (
                Object.entries(filters).every(
                  ([filterColumn, filterValue]) =>
                    String(row[filterColumn]) === String(filterValue)
                )
              ) {
                Object.assign(row, patch)
                updatedRows.push(row)
              }
            }
            return updatedRows
          }
          const updateQuery = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return updateQuery
            },
            then: (resolveThen: (value: { error: null }) => unknown) => {
              updateRows()
              return Promise.resolve({ error: null }).then(resolveThen)
            },
            select: () => ({
              maybeSingle: async () => {
                const updatedRows = updateRows()
                return { data: updatedRows[0] ?? null, error: null }
              },
            }),
          }
          return updateQuery
        },
      }
    }

    if (table === "app_scoped_subjects") {
      return {
        insert: (row: Record<string, unknown>) => {
          const inserted = {
            created_at: new Date().toISOString(),
            id: `app_scoped_subject_${this.appScopedSubjects.length + 1}`,
            status: "active",
            ...row,
          }
          this.appScopedSubjects.push(inserted)
          return {
            select: () => ({
              maybeSingle: async () => ({ data: inserted, error: null }),
            }),
          }
        },
        select: () => {
          const filters: Record<string, unknown> = {}
          const resolve = () => {
            const rows = this.appScopedSubjects.filter((row) =>
              Object.entries(filters).every(([column, value]) => {
                if (Array.isArray(value)) {
                  return value.includes(String(row[column]))
                }
                return String(row[column]) === String(value)
              })
            )
            return { data: rows, error: null }
          }
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            in: (column: string, values: unknown[]) => {
              filters[column] = values.map(String)
              return query
            },
            maybeSingle: async () => {
              const result = resolve()
              return { data: result.data[0] ?? null, error: null }
            },
            then: (
              resolveThen: (value: {
                data: Record<string, unknown>[]
                error: null
              }) => unknown
            ) => Promise.resolve(resolve()).then(resolveThen),
          }
          return query
        },
        upsert: (row: Record<string, unknown>) => {
          const existing = this.appScopedSubjects.find(
            (candidate) =>
              candidate.app_identifier === row.app_identifier &&
              candidate.app_scoped_subject === row.app_scoped_subject
          )
          const stored = existing
            ? Object.assign(existing, row)
            : {
                created_at: new Date().toISOString(),
                id: `app_scoped_subject_${this.appScopedSubjects.length + 1}`,
                status: "active",
                ...row,
              }
          if (!existing) {
            this.appScopedSubjects.push(stored)
          }
          return {
            select: () => ({
              maybeSingle: async () => ({ data: stored, error: null }),
            }),
          }
        },
      }
    }

    if (table === "clearpass_verification_sessions") {
      const createQuery = () => {
        const filters: Record<string, unknown> = {}
        const resolve = () => {
          const rows = this.clearPassVerificationSessions.filter((row) =>
            Object.entries(filters).every(
              ([column, value]) => String(row[column]) === String(value)
            )
          )
          return { data: rows, error: null }
        }
        const query = {
          eq: (column: string, value: unknown) => {
            filters[column] = value
            return query
          },
          maybeSingle: async () => {
            const result = resolve()
            return { data: result.data[0] ?? null, error: null }
          },
        }
        return query
      }

      return {
        insert: (row: Record<string, unknown>) => {
          const inserted = {
            created_at: new Date().toISOString(),
            id: `00000000-0000-4000-8000-${String(this.clearPassVerificationSessions.length + 1).padStart(12, "0")}`,
            status: "pending",
            updated_at: new Date().toISOString(),
            ...row,
          }
          this.clearPassVerificationSessions.push(inserted)
          return {
            select: () => ({
              maybeSingle: async () => ({ data: inserted, error: null }),
            }),
          }
        },
        select: createQuery,
        update: (patch: Record<string, unknown>) => {
          const filters: Record<string, unknown> = {}
          const updateRows = () => {
            const updatedRows: Array<Record<string, unknown>> = []
            for (const row of this.clearPassVerificationSessions) {
              if (
                Object.entries(filters).every(
                  ([column, value]) => String(row[column]) === String(value)
                )
              ) {
                Object.assign(row, patch)
                updatedRows.push(row)
              }
            }
            return updatedRows
          }
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            select: () => ({
              maybeSingle: async () => {
                const updatedRows = updateRows()
                return { data: updatedRows[0] ?? null, error: null }
              },
            }),
            then: (resolveThen: (value: { error: null }) => unknown) => {
              updateRows()
              return Promise.resolve({ error: null }).then(resolveThen)
            },
          }
          return query
        },
      }
    }

    if (table === "selective_disclosure_grants") {
      return {
        insert: (row: Record<string, unknown>) => {
          const inserted = {
            created_at: new Date().toISOString(),
            id: `selective_disclosure_grant_${this.selectiveDisclosureGrants.length + 1}`,
            status: "active",
            ...row,
          }
          this.selectiveDisclosureGrants.push(inserted)
          return {
            select: () => ({
              maybeSingle: async () => ({ data: inserted, error: null }),
            }),
          }
        },
        select: () => {
          const filters: Record<string, unknown> = {}
          const resolve = () => {
            const rows = this.selectiveDisclosureGrants.filter((row) =>
              Object.entries(filters).every(([column, value]) => {
                if (Array.isArray(value)) {
                  return value.includes(String(row[column]))
                }
                return String(row[column]) === String(value)
              })
            )
            return { data: rows, error: null }
          }
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            in: (column: string, values: unknown[]) => {
              filters[column] = values.map(String)
              return query
            },
            maybeSingle: async () => {
              const result = resolve()
              return { data: result.data[0] ?? null, error: null }
            },
            then: (
              resolveThen: (value: {
                data: Record<string, unknown>[]
                error: null
              }) => unknown
            ) => Promise.resolve(resolve()).then(resolveThen),
          }
          return query
        },
        update: (patch: Record<string, unknown>) => {
          const filters: Record<string, unknown> = {}
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            then: (resolveThen: (value: { error: null }) => unknown) => {
              for (const row of this.selectiveDisclosureGrants) {
                if (
                  Object.entries(filters).every(
                    ([column, value]) => String(row[column]) === String(value)
                  )
                ) {
                  Object.assign(row, patch)
                }
              }
              return Promise.resolve({ error: null }).then(resolveThen)
            },
          }
          return query
        },
      }
    }

    if (table === "stamp_dappuser_permissions") {
      return {
        delete: () => {
          const filters: Record<string, unknown> = {}
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            then: (
              resolveThen: (value: { error: null }) => unknown
            ) => {
              for (let index = this.stampPermissions.length - 1; index >= 0; index -= 1) {
                const row = this.stampPermissions[index]
                if (
                  Object.entries(filters).every(
                    ([column, value]) => String(row[column]) === String(value)
                  )
                ) {
                  this.stampPermissions.splice(index, 1)
                }
              }
              return Promise.resolve({ error: null }).then(resolveThen)
            },
          }
          return query
        },
        insert: (row: Record<string, unknown>) => {
          const inserted = {
            id: this.stampPermissions.length + 1,
            ...row,
          }
          this.stampPermissions.push(inserted)
          return {
            select: () => ({
              maybeSingle: async () => ({ data: inserted, error: null }),
            }),
          }
        },
        select: () => {
          const filters: Record<string, unknown> = {}
          const resolve = () => {
            const rows = this.stampPermissions.filter((row) =>
              Object.entries(filters).every(([column, value]) => {
                if (Array.isArray(value)) {
                  return value.includes(String(row[column]))
                }
                return String(row[column]) === String(value)
              })
            )
            return { data: rows, error: null }
          }
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            in: (column: string, values: unknown[]) => {
              filters[column] = values.map(String)
              return query
            },
            match: (criteria: Record<string, unknown>) => {
              Object.assign(filters, criteria)
              return query
            },
            then: (
              resolveThen: (value: {
                data: Record<string, unknown>[]
                error: null
              }) => unknown
            ) => Promise.resolve(resolve()).then(resolveThen),
          }
          return query
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

    if (table === "all_blacklisted_stamps") {
      return {
        select: () => ({
          eq: () => ({
            then: (
              resolveThen: (value: {
                data: Record<string, unknown>[]
                error: null
              }) => unknown
            ) => Promise.resolve({ data: [], error: null }).then(resolveThen),
          }),
        }),
      }
    }

    if (table === "dapp_webhook_subscriptions") {
      return {
        select: () => {
          const filters: Record<string, unknown> = {}
          const resolve = () => {
            const rows = this.webhookSubscriptions.filter((row) =>
              Object.entries(filters).every(
                ([column, value]) => String(row[column]) === String(value)
              )
            )
            return { data: rows, error: null }
          }
          const query = {
            match: (criteria: Record<string, unknown>) => {
              Object.assign(filters, criteria)
              return query
            },
            then: (
              resolveThen: (value: {
                data: Record<string, unknown>[]
                error: null
              }) => unknown
            ) => Promise.resolve(resolve()).then(resolveThen),
          }
          return query
        },
      }
    }

    if (table === "webhook_events") {
      return {
        insert: (row: Record<string, unknown>) => {
          const inserted = {
            created_at: new Date().toISOString(),
            id: this.webhookEvents.length + 1,
            ...row,
          }
          this.webhookEvents.push(inserted)
          return {
            select: () => ({
              then: (
                resolveThen: (value: {
                  data: Record<string, unknown>[]
                  error: null
                }) => unknown
              ) => Promise.resolve({ data: [inserted], error: null }).then(resolveThen),
            }),
          }
        },
        select: () => {
          const filters: Record<string, unknown> = {}
          const resolve = () => {
            const rows = this.webhookEvents.filter((row) =>
              Object.entries(filters).every(
                ([column, value]) => String(row[column]) === String(value)
              )
            )
            return { data: rows, error: null }
          }
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            match: (criteria: Record<string, unknown>) => {
              Object.assign(filters, criteria)
              return query
            },
            then: (
              resolveThen: (value: {
                data: Record<string, unknown>[]
                error: null
              }) => unknown
            ) => Promise.resolve(resolve()).then(resolveThen),
          }
          return query
        },
        update: (patch: Record<string, unknown>) => {
          const filters: Record<string, unknown> = {}
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            select: () => ({
              then: (
                resolveThen: (value: {
                  data: Record<string, unknown>[]
                  error: null
                }) => unknown
              ) => {
                const updatedRows: Record<string, unknown>[] = []
                for (const row of this.webhookEvents) {
                  if (
                    Object.entries(filters).every(
                      ([column, value]) => String(row[column]) === String(value)
                    )
                  ) {
                    Object.assign(row, patch)
                    updatedRows.push(row)
                  }
                }
                return Promise.resolve({
                  data: updatedRows,
                  error: null,
                }).then(resolveThen)
              },
            }),
          }
          return query
        },
      }
    }

    if (table === "webhook_event_deliveries") {
      return {
        insert: async (row: Record<string, unknown>) => {
          this.webhookEventDeliveries.push({
            delivered_at: new Date().toISOString(),
            id: this.webhookEventDeliveries.length + 1,
            ...row,
          })
          return { error: null }
        },
      }
    }

    if (table === "selective_disclosure_events") {
      return {
        insert: async (row: Record<string, unknown>) => {
          this.eventInserts.push(row)
          return { error: null }
        },
      }
    }

    if (table === "actor_profiles") {
      return {
        select: () => {
          const filters: Record<string, unknown> = {}
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            maybeSingle: async () => {
              const row =
                this.actorProfiles.get(String(filters.firebase_uid)) ?? null
              return { data: row, error: null }
            },
          }
          return query
        },
        upsert: (row: Record<string, unknown>) => {
          const now = new Date().toISOString()
          const firebaseUid = String(row.firebase_uid)
          const existing = this.actorProfiles.get(firebaseUid)
          const stored = {
            created_at: existing?.created_at ?? now,
            id: existing?.id ?? `actor_profile_${this.actorProfiles.size + 1}`,
            ...existing,
            ...row,
            updated_at: row.updated_at ?? now,
          }
          this.actorProfiles.set(firebaseUid, stored)
          return {
            select: () => ({
              maybeSingle: async () => ({ data: stored, error: null }),
            }),
          }
        },
      }
    }

    if (table === "dapps") {
      return {
        select: () => {
          const filters: Record<string, unknown> = {}
          const resolve = () => {
            const rows = [...this.dapps.values()].filter((row) =>
              Object.entries(filters).every(([column, value]) => {
                if (Array.isArray(value)) {
                  return value.includes(String(row[column]))
                }
                return String(row[column]) === String(value)
              })
            )
            return { data: rows, error: null }
          }
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return {
                maybeSingle: async () => ({
                  data: this.dapps.get(Number(value)) ?? null,
                  error: null,
                }),
              }
            },
            in: (column: string, values: unknown[]) => {
              filters[column] = values.map(String)
              return query
            },
            then: (
              resolveThen: (value: {
                data: Record<string, unknown>[]
                error: null
              }) => unknown
            ) => Promise.resolve(resolve()).then(resolveThen),
          }
          return query
        },
      }
    }

    if (table === "dapp_pages") {
      return {
        select: () => {
          const filters: Record<string, unknown> = {}
          const resolve = () => {
            const rows = [...this.dappPages.values()].filter((row) =>
              Object.entries(filters).every(
                ([column, value]) => String(row[column]) === String(value)
              )
            )
            return { data: rows, error: null }
          }
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            maybeSingle: async () => {
              const result = resolve()
              return { data: result.data[0] ?? null, error: null }
            },
          }
          return query
        },
      }
    }

    if (table === "users") {
      return {
        select: () => {
          const filters: Record<string, unknown> = {}
          const resolve = () => {
            const rows = [...this.users.values()].filter((row) =>
              Object.entries(filters).every(
                ([column, value]) => String(row[column]) === String(value)
              )
            )
            return { data: rows, error: null }
          }
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            maybeSingle: async () => {
              const result = resolve()
              return { data: result.data[0] ?? null, error: null }
            },
          }
          return query
        },
      }
    }

    if (table === "stamps") {
      return {
        insert: (rowOrRows: Record<string, unknown> | Array<Record<string, unknown>>) => {
          const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows]
          const insertedRows = rows.map((row) => {
            const inserted = {
              created_at: new Date().toISOString(),
              id: this.stamps.length + 1,
              ...row,
            }
            this.stamps.push(inserted)
            return inserted
          })
          return {
            error: null,
            select: () => ({
              maybeSingle: async () => ({
                data: insertedRows[0] ?? null,
                error: null,
              }),
            }),
          }
        },
        select: () => {
          const filters: Record<string, unknown> = {}
          const resolve = () => {
            const rows = this.stamps.filter((row) =>
              Object.entries(filters).every(([column, value]) => {
                if (Array.isArray(value)) {
                  return value.includes(String(row[column]))
                }
                return String(row[column]) === String(value)
              })
            )
            return { data: rows, error: null }
          }
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            in: (column: string, values: unknown[]) => {
              filters[column] = values.map(String)
              return query
            },
            maybeSingle: async () => {
              const result = resolve()
              return { data: result.data[0] ?? null, error: null }
            },
            then: (
              resolveThen: (value: {
                data: Record<string, unknown>[]
                error: null
              }) => unknown
            ) => Promise.resolve(resolve()).then(resolveThen),
          }
          return query
        },
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
              if (
                !row ||
                !Object.entries(filters).every(
                  ([column, value]) =>
                    String((row as Record<string, unknown>)[column]) ===
                    String(value)
                )
              ) {
                return { data: null, error: null }
              }
              return { data: { user_id: 1234, ...row }, error: null }
            },
            then: (
              resolveThen: (value: {
                data: Record<string, unknown>[]
                error: null
              }) => unknown
            ) => {
              const rows = [...this.dappUsers.values()].filter((row) =>
                Object.entries(filters).every(
                  ([column, value]) =>
                    String((row as Record<string, unknown>)[column]) ===
                    String(value)
                )
              )
              return Promise.resolve({ data: rows, error: null }).then(resolveThen)
            },
          }
          return query
        },
      }
    }

    if (table === "stamptypes") {
      const stampTypes = new Map<number, Record<string, unknown>>([
        [13, { id: 13, fields_to_use: {}, stamptype: "email" }],
        [11, { id: 11, fields_to_use: {}, stamptype: "phone" }],
        [71, { id: 71, fields_to_use: {}, stamptype: "clearpass_verify" }],
      ])
      return {
        select: () => {
          const filters: Record<string, unknown> = {}
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            maybeSingle: async () => ({
              data: stampTypes.get(Number(filters.id)) ?? null,
              error: null,
            }),
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

    if (table === "private.dapp_user_secrets") {
      return {
        insert: async (row: Record<string, unknown>) => {
          this.privateDappUserSecrets.push(row)
          return { error: null }
        },
        select: () => {
          const filters: Record<string, unknown> = {}
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            maybeSingle: async () => {
              const row =
                this.privateDappUserSecrets.find((candidate) =>
                  Object.entries(filters).every(
                    ([column, value]) =>
                      String(candidate[column]) === String(value)
                  )
                ) ?? null
              return { data: row, error: null }
            },
            then: (
              resolve: (value: {
                data: Record<string, unknown>[]
                error: null
              }) => unknown
            ) => {
              return Promise.resolve({
                data: this.privateDappUserSecrets.filter((row) =>
                  Object.entries(filters).every(
                    ([column, value]) => String(row[column]) === String(value)
                  )
                ),
                error: null,
              }).then(resolve)
            },
          }
          return query
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

    if (table === "user_accounts") {
      return {
        delete: () => ({
          eq: (column: string, value: unknown) => {
            const index = this.userAccounts.findIndex(
              (row) => String(row[column]) === String(value)
            )
            if (index >= 0) {
              this.userAccounts.splice(index, 1)
            }
            return { error: null }
          },
        }),
        insert: (row: Record<string, unknown>) => {
          const inserted = {
            created_at: new Date().toISOString(),
            id: `account_${this.userAccounts.length + 1}`,
            updated_at: new Date().toISOString(),
            ...row,
          }
          this.userAccounts.push(inserted)
          return {
            select: () => ({
              single: async () => ({ data: inserted, error: null }),
            }),
          }
        },
        select: () => {
          const filters: Record<string, unknown> = {}
          const inFilters: Record<string, string[]> = {}
          const resolve = () => {
            let rows = [...this.userAccounts]
            for (const [column, values] of Object.entries(inFilters)) {
              rows = rows.filter((row) => values.includes(String(row[column])))
            }
            for (const [column, value] of Object.entries(filters)) {
              rows = rows.filter((row) => String(row[column]) === String(value))
            }
            return { data: rows, error: null }
          }
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            in: (column: string, values: unknown[]) => {
              inFilters[column] = values.map(String)
              return query
            },
            maybeSingle: async () => {
              const result = resolve()
              return { data: result.data[0] ?? null, error: null }
            },
            then: (
              resolveThen: (value: {
                data: Record<string, unknown>[]
                error: null
              }) => unknown
            ) => Promise.resolve(resolve()).then(resolveThen),
          }
          return query
        },
      }
    }

    if (table === "private.private_keys") {
      return {
        delete: () => ({
          eq: (column: string, value: unknown) => {
            const index = this.privateKeys.findIndex(
              (row) => String(row[column]) === String(value)
            )
            if (index >= 0) {
              this.privateKeys.splice(index, 1)
            }
            return { error: null }
          },
        }),
        insert: async (row: Record<string, unknown>) => {
          if (this.failNextPrivateKeyInsert) {
            this.failNextPrivateKeyInsert = false
            return { error: new Error("private key insert failed") }
          }

          this.privateKeys.push({
            created_at: new Date().toISOString(),
            id: `private_key_${this.privateKeys.length + 1}`,
            ...row,
          })
          return { error: null }
        },
        select: () => {
          const filters: Record<string, unknown> = {}
          const resolve = () => {
            const rows = this.privateKeys.filter((row) =>
              Object.entries(filters).every(
                ([column, value]) => String(row[column]) === String(value)
              )
            )
            return { data: rows, error: null }
          }
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            maybeSingle: async () => {
              const result = resolve()
              return { data: result.data[0] ?? null, error: null }
            },
          }
          return query
        },
      }
    }

    if (table === "dapp_user_accounts") {
      return {
        delete: () => ({
          eq: (column: string, value: unknown) => {
            for (
              let index = this.dappUserAccounts.length - 1;
              index >= 0;
              index -= 1
            ) {
              if (
                String(this.dappUserAccounts[index]?.[column]) ===
                String(value)
              ) {
                this.dappUserAccounts.splice(index, 1)
              }
            }
            return { error: null }
          },
        }),
        insert: (row: Record<string, unknown>) => {
          const inserted = {
            created_at: new Date().toISOString(),
            id: `dapp_user_account_${this.dappUserAccounts.length + 1}`,
            updated_at: new Date().toISOString(),
            ...row,
          }
          this.dappUserAccounts.push(inserted)
          return {
            select: () => ({
              single: async () => ({ data: inserted, error: null }),
            }),
          }
        },
        select: () => {
          const filters: Record<string, unknown> = {}
          const inFilters: Record<string, string[]> = {}
          const resolve = () => {
            const rows = this.dappUserAccounts.filter((row) => {
              const matchesEq = Object.entries(filters).every(
                ([column, value]) => String(row[column]) === String(value)
              )
              const matchesIn = Object.entries(inFilters).every(
                ([column, values]) => values.includes(String(row[column]))
              )
              return matchesEq && matchesIn
            })
            return { data: rows, error: null }
          }
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            in: (column: string, values: unknown[]) => {
              inFilters[column] = values.map(String)
              return query
            },
            maybeSingle: async () => {
              const result = resolve()
              return { data: result.data[0] ?? null, error: null }
            },
            then: (
              resolveThen: (value: {
                data: Record<string, unknown>[]
                error: null
              }) => unknown
            ) => Promise.resolve(resolve()).then(resolveThen),
          }
          return query
        },
      }
    }

    if (table === "siwc_signing_policies") {
      return {
        select: () => {
          const filters: Record<string, unknown> = {}
          const inFilters: Record<string, string[]> = {}
          const resolve = () => {
            let rows = [...this.siwcSigningPolicies]
            for (const [column, values] of Object.entries(inFilters)) {
              rows = rows.filter((row) => values.includes(String(row[column])))
            }
            for (const [column, value] of Object.entries(filters)) {
              rows = rows.filter((row) => String(row[column]) === String(value))
            }
            return { data: rows, error: null }
          }
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            in: (column: string, values: unknown[]) => {
              inFilters[column] = values.map(String)
              return query
            },
            maybeSingle: async () => {
              const result = resolve()
              return { data: result.data[0] ?? null, error: null }
            },
            then: (
              resolveThen: (value: {
                data: Record<string, unknown>[]
                error: null
              }) => unknown
            ) => Promise.resolve(resolve()).then(resolveThen),
          }
          return query
        },
      }
    }

    if (table === "oidc_sessions") {
      return {
        select: () => {
          const filters: Record<string, unknown> = {}
          const resolve = () => {
            const rows = this.oidcSessions.filter((row) =>
              Object.entries(filters).every(
                ([column, value]) => String(row[column]) === String(value)
              )
            )
            return { data: rows, error: null }
          }
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            maybeSingle: async () => {
              const result = resolve()
              return { data: result.data[0] ?? null, error: null }
            },
          }
          return query
        },
      }
    }

    if (table === "oidc_human_subjects") {
      return {
        select: () => {
          const filters: Record<string, unknown> = {}
          const inFilters: Record<string, string[]> = {}
          const resolve = () => {
            let rows = [...this.oidcHumanSubjects]
            for (const [column, values] of Object.entries(inFilters)) {
              rows = rows.filter((row) => values.includes(String(row[column])))
            }
            for (const [column, value] of Object.entries(filters)) {
              rows = rows.filter((row) => String(row[column]) === String(value))
            }
            return { data: rows, error: null }
          }
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            in: (column: string, values: unknown[]) => {
              inFilters[column] = values.map(String)
              return query
            },
            then: (
              resolveThen: (value: {
                data: Record<string, unknown>[]
                error: null
              }) => unknown
            ) => Promise.resolve(resolve()).then(resolveThen),
          }
          return query
        },
      }
    }

    if (table === "siwc_signing_requests") {
      const createQuery = () => {
        const filters: Record<string, unknown> = {}
        const inFilters: Record<string, string[]> = {}
        let limitValue: number | null = null
        const resolve = () => {
          let rows = [...this.siwcSigningRequests]
          for (const [column, values] of Object.entries(inFilters)) {
            rows = rows.filter((row) => values.includes(String(row[column])))
          }
          for (const [column, value] of Object.entries(filters)) {
            rows = rows.filter((row) => String(row[column]) === String(value))
          }
          rows.sort((left, right) =>
            String(right.created_at ?? "").localeCompare(
              String(left.created_at ?? "")
            )
          )
          if (limitValue !== null) {
            rows = rows.slice(0, limitValue)
          }
          return { data: rows, error: null }
        }
        const query = {
          eq: (column: string, value: unknown) => {
            filters[column] = value
            return query
          },
          in: (column: string, values: unknown[]) => {
            inFilters[column] = values.map(String)
            return query
          },
          limit: (value: number) => {
            limitValue = value
            return query
          },
          maybeSingle: async () => {
            const result = resolve()
            return { data: result.data[0] ?? null, error: null }
          },
          order: () => query,
          single: async () => {
            const result = resolve()
            return { data: result.data[0] ?? null, error: null }
          },
          then: (
            resolveThen: (value: {
              data: Record<string, unknown>[]
              error: null
            }) => unknown
          ) => Promise.resolve(resolve()).then(resolveThen),
        }
        return query
      }

      return {
        insert: (row: Record<string, unknown>) => {
          const inserted = {
            approved_at: null,
            completed_at: null,
            created_at: new Date().toISOString(),
            id: `siwc_signing_request_${this.siwcSigningRequests.length + 1}`,
            rejected_at: null,
            result: null,
            updated_at: new Date().toISOString(),
            ...row,
          }
          this.siwcSigningRequests.push(inserted)
          return {
            select: () => ({
              single: async () => ({ data: inserted, error: null }),
            }),
          }
        },
        select: createQuery,
        update: (patch: Record<string, unknown>) => {
          const filters: Record<string, unknown> = {}
          const updateRows = () => {
            const updatedRows: Record<string, unknown>[] = []
            for (const row of this.siwcSigningRequests) {
              if (
                Object.entries(filters).every(
                  ([column, value]) => String(row[column]) === String(value)
                )
              ) {
                Object.assign(row, patch)
                updatedRows.push(row)
              }
            }
            return updatedRows
          }
          const query = {
            eq: (column: string, value: unknown) => {
              filters[column] = value
              return query
            },
            select: () => ({
              single: async () => ({
                data: updateRows()[0] ?? null,
                error: null,
              }),
            }),
          }
          return query
        },
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
