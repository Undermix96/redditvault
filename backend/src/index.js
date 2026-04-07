import Fastify from 'fastify'
import cors from '@fastify/cors'
import staticFiles from '@fastify/static'
import { readdir, stat } from 'fs/promises'
import { join, extname, basename } from 'path'
import { existsSync } from 'fs'

const MEDIA_ROOT = process.env.MEDIA_ROOT || '/media'

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp', '.tiff'])
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v'])
const GIF_EXTS = new Set(['.gif'])

function getMediaType(filename) {
  const ext = extname(filename).toLowerCase()
  if (GIF_EXTS.has(ext)) return 'gif'
  if (VIDEO_EXTS.has(ext)) return 'video'
  if (IMAGE_EXTS.has(ext)) return 'image'
  return null
}

function isIgnored(filename) {
  const ext = extname(filename).toLowerCase()
  return ext === '.rat'
}

async function safeStat(path) {
  try {
    return await stat(path)
  } catch {
    return null
  }
}


// Filename format: <source>-<YYYY>-<MM>-<DD>-<postid>-<rank>-<filehash>-<post title>.<ext>
// The post title starts after the 7th dash-separated field.
function extractTitle(filename) {
  const name = basename(filename, extname(filename))
  const parts = name.split('-')
  if (parts.length > 7) {
    return parts.slice(7).join('-').replace(/_/g, ' ').trim() || name
  }
  // Fallback for non-standard filenames
  return name.replace(/[_-]+/g, ' ').trim()
}

async function scanSubreddit(subredditPath, subredditName) {
  const posts = []
  let entries = []

  try {
    entries = await readdir(subredditPath)
  } catch {
    return posts
  }

  for (const categoryDir of entries) {
    const categoryPath = join(subredditPath, categoryDir)
    const s = await safeStat(categoryPath)
    if (!s || !s.isDirectory()) continue

    let files = []
    try {
      files = await readdir(categoryPath)
    } catch {
      continue
    }

    for (const file of files) {
      if (isIgnored(file)) continue

      const filePath = join(categoryPath, file)
      const fs = await safeStat(filePath)
      if (!fs || !fs.isDirectory()) {
        const mediaType = getMediaType(file)
        if (mediaType) {
          // URL path relative to MEDIA_ROOT
          const urlPath = `/media/${encodeURIComponent(subredditName)}/${encodeURIComponent(categoryDir)}/${encodeURIComponent(file)}`
          posts.push({
            id: `${subredditName}__${categoryDir}__${file}`,
            subreddit: subredditName,
            category: categoryDir,
            filename: file,
            title: extractTitle(file),
            type: mediaType,
            url: urlPath,
            size: fs.size,
            mtime: fs.mtimeMs
          })
        }
      }
    }
  }

  return posts
}

async function buildIndex() {
  if (!existsSync(MEDIA_ROOT)) {
    return { subreddits: [], posts: [] }
  }

  let topLevel = []
  try {
    topLevel = await readdir(MEDIA_ROOT)
  } catch {
    return { subreddits: [], posts: [] }
  }

  const subreddits = []
  const allPosts = []

  for (const entry of topLevel) {
    const entryPath = join(MEDIA_ROOT, entry)
    const s = await safeStat(entryPath)
    if (!s || !s.isDirectory()) continue

    const posts = await scanSubreddit(entryPath, entry)
    if (posts.length > 0) {
      subreddits.push({
        name: entry,
        postCount: posts.length
      })
      allPosts.push(...posts)
    }
  }

  // Sort posts by mtime descending (newest first)
  allPosts.sort((a, b) => b.mtime - a.mtime)

  return { subreddits, posts: allPosts }
}

// Cache with TTL
let cache = null
let cacheTime = 0
const CACHE_TTL = 10_000 // 10s

async function getIndex() {
  const now = Date.now()
  if (cache && now - cacheTime < CACHE_TTL) return cache
  cache = await buildIndex()
  cacheTime = now
  return cache
}

const fastify = Fastify({ logger: false })

await fastify.register(cors, { origin: true })

await fastify.register(staticFiles, {
  root: MEDIA_ROOT,
  prefix: '/media/',
  decorateReply: false,
  setHeaders(res) {
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Cache-Control', 'public, max-age=3600')
  }
})

fastify.get('/api/subreddits', async () => {
  const { subreddits } = await getIndex()
  return subreddits
})

fastify.get('/api/posts', async (req) => {
  const { subreddit, type, page = 1, limit = 24 } = req.query
  let { posts } = await getIndex()

  if (subreddit && subreddit !== 'all') {
    posts = posts.filter(p => p.subreddit === subreddit)
  }
  if (type && type !== 'all') {
    posts = posts.filter(p => p.type === type)
  }

  const total = posts.length
  const offset = (parseInt(page) - 1) * parseInt(limit)
  const paginated = posts.slice(offset, offset + parseInt(limit))

  return {
    posts: paginated,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total / parseInt(limit))
  }
})

fastify.get('/api/health', async () => ({ ok: true }))

// Refresh cache endpoint
fastify.post('/api/refresh', async () => {
  cache = null
  const data = await getIndex()
  return { ok: true, subreddits: data.subreddits.length, posts: data.posts.length }
})

const PORT = process.env.PORT || 3001
await fastify.listen({ port: PORT, host: '0.0.0.0' })
console.log(`RedditVault API running on http://0.0.0.0:${PORT}`)
console.log(`Media root: ${MEDIA_ROOT}`)
