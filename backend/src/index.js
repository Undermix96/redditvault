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
function extractTitle(filename) {
  const name = basename(filename, extname(filename))
  const parts = name.split('-')
  if (parts.length > 7) {
    return parts.slice(7).join('-').replace(/_/g, ' ').trim() || name
  }
  return name.replace(/[_-]+/g, ' ').trim()
}

// Extract the post ID (field index 4) used to group album images
function extractPostId(filename) {
  const name = basename(filename, extname(filename))
  const parts = name.split('-')
  return parts.length > 4 ? parts[4] : null
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
            postId: extractPostId(file),
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

// Group raw image items by postId into album posts.
// Non-image media and single images remain as individual posts.
function groupIntoAlbums(rawPosts) {
  // Separate images from other media
  const images = rawPosts.filter(p => p.type === 'image')
  const others = rawPosts.filter(p => p.type !== 'image')

  // Group images by postId
  const byPostId = new Map()
  const noPostId = []

  for (const img of images) {
    if (img.postId) {
      if (!byPostId.has(img.postId)) byPostId.set(img.postId, [])
      byPostId.get(img.postId).push(img)
    } else {
      noPostId.push(img)
    }
  }

  const result = [...others, ...noPostId]

  for (const [, group] of byPostId) {
    // Sort group by filename (rank field ensures natural order)
    group.sort((a, b) => a.filename.localeCompare(b.filename))

    if (group.length === 1) {
      // Single image — keep as normal image post
      result.push(group[0])
    } else {
      // Multiple images with same postId → album
      const first = group[0]
      result.push({
        id:        first.postId,
        subreddit: first.subreddit,
        category:  first.category,
        title:     first.title,
        type:      'album',
        // Representative thumbnail = first image
        url:       first.url,
        // All images in the album
        images:    group.map(img => ({ id: img.id, url: img.url, title: img.title })),
        mtime:     Math.max(...group.map(g => g.mtime))
      })
    }
  }

  return result
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

    const rawPosts = await scanSubreddit(entryPath, entry)
    const grouped  = groupIntoAlbums(rawPosts)

    if (grouped.length > 0) {
      subreddits.push({
        name: entry,
        postCount: grouped.length
      })
      allPosts.push(...grouped)
    }
  }

  // Sort by mtime descending (newest first)
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
    // When filtering for 'image', also include albums (which are groups of images)
    if (type === 'image') {
      posts = posts.filter(p => p.type === 'image' || p.type === 'album')
    } else {
      posts = posts.filter(p => p.type === type)
    }
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
