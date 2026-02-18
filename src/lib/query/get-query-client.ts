import { cache } from 'react'
import { QueryClient } from '@tanstack/react-query'

/**
 * Server-side QueryClient singleton (per-request via React cache).
 * Used in RSC pages for prefetching data that gets dehydrated to client.
 */
const getQueryClient = cache(() => new QueryClient())

export default getQueryClient
