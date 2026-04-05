import { useQuery, useInfiniteQuery } from '@tanstack/react-query'

const API = '/api'

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function useSubreddits() {
  return useQuery({
    queryKey: ['subreddits'],
    queryFn: () => fetchJSON(`${API}/subreddits`),
    staleTime: 30_000,
  })
}

export function usePosts({ subreddit = 'all', type = 'all' }) {
  return useInfiniteQuery({
    queryKey: ['posts', subreddit, type],
    queryFn: ({ pageParam = 1 }) =>
      fetchJSON(`${API}/posts?subreddit=${subreddit}&type=${type}&page=${pageParam}&limit=24`),
    getNextPageParam: (last) => last.page < last.pages ? last.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 10_000,
  })
}
