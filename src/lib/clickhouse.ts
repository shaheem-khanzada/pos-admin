import { getClickHouseClient } from '@/services/clickhouse'

type ClickhouseQueryArgs = {
  query: string
  query_params?: Record<string, unknown>
}

/**
 * Thin wrapper around {@link getClickHouseClient} for route handlers.
 * `query()` returns a Promise of `{ json() }` so callers can `Promise.all` several queries;
 * `json()` resolves to `{ data: rows }` (JSONEachRow rows).
 */
export const clickhouse = {
  async query({ query, query_params }: ClickhouseQueryArgs) {
    const client = getClickHouseClient()
    const resultSet = await client.query({
      format: 'JSONEachRow',
      query,
      query_params,
    })

    return {
      async json(): Promise<{ data: Record<string, unknown>[] }> {
        const rows = (await resultSet.json()) as Record<string, unknown>[]
        return { data: rows }
      },
    }
  },
}
