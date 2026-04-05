# AGENTS.md — RedditVault

Guida per agenti AI e LLM che lavorano su questo repository.

## Cos'è questo progetto

**RedditVault** è una bacheca media self-hosted in stile Reddit, pensata per uso LAN (nessun sistema di login/account). Visualizza immagini, video e GIF leggendo dinamicamente una directory sul filesystem e presentandole come post organizzati in "subreddit".

## Stack tecnico

| Layer      | Tecnologia                                      |
|------------|-------------------------------------------------|
| Backend    | Node.js 22 + Fastify 4 (ESM)                    |
| Frontend   | React 18 + Vite 6                               |
| State      | Zustand 5                                       |
| Data/fetch | TanStack Query 5 (infinite scroll)              |
| Animazioni | Motion 11                                       |
| Serve      | Nginx 1.27-alpine (reverse proxy + SPA)         |
| Container  | Docker + Compose (build e deploy separati)      |

## Struttura repository

```
redditvault/
├── AGENTS.md                    ← questo file
├── README.md
├── docker-compose.yml           ← SOLO deploy (usa immagini pre-buildate)
├── docker-compose.build.yml     ← SOLO build
├── .env.example
├── media/                       ← cartella media (montata come volume)
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       └── index.js             ← unico file server (Fastify)
└── frontend/
    ├── Dockerfile               ← multi-stage: Vite build → nginx
    ├── nginx.conf
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx / App.module.css
        ├── index.css            ← CSS variables globali e reset
        ├── components/
        │   ├── Header.jsx/.module.css
        │   ├── Sidebar.jsx/.module.css
        │   ├── Feed.jsx/.module.css
        │   ├── MediaCard.jsx/.module.css
        │   └── Lightbox.jsx/.module.css
        ├── hooks/
        │   └── useApi.js        ← TanStack Query hooks
        └── stores/
            └── useStore.js      ← Zustand store globale
```

## Convenzioni di codice

- **Backend**: ESM puro (`"type": "module"`), nessun TypeScript, nessun ORM. Tutto in `src/index.js`.
- **Frontend**: React con CSS Modules (nessun Tailwind, nessun styled-components). Un file `.jsx` + un `.module.css` per componente.
- **Nomi immagini Docker**: sempre prefissati con `undermix/` (es. `undermix/redditvault-backend:latest`).
- **Nomi**: il progetto si chiama **RedditVault** (PascalCase nei titoli), **redditvault** (lowercase nei nomi tecnici: package, immagini, network Docker, variabili).

## Struttura directory media attesa

```
<MEDIA_PATH>/
└── <NomeSubreddit>/           ← primo livello → nome del subreddit
    ├── <categoria>/           ← secondo livello → nome categoria (qualunque nome)
    │   ├── file.jpg
    │   ├── clip.mp4
    │   └── anim.gif
    └── config.rat             ← file .rat → ignorati silenziosamente
```

## API Backend

Base path: `http://backend:3001` (interno Docker) / `/api/` (via nginx proxy)

| Metodo | Endpoint          | Descrizione                                      |
|--------|-------------------|--------------------------------------------------|
| GET    | `/api/health`     | Health check (usato da Docker healthcheck)       |
| GET    | `/api/subreddits` | Lista subreddit `[{ name, postCount }]`          |
| GET    | `/api/posts`      | Lista media paginata, params: `subreddit`, `type`, `page`, `limit` |
| POST   | `/api/refresh`    | Invalida la cache in-memory e rilegge il disco   |
| GET    | `/media/**`       | Serve i file media (con supporto Range requests) |

La cache ha TTL di 10 secondi. I post sono ordinati per `mtime` decrescente.

## Variabili d'ambiente

| Variabile    | Default   | Usata da  | Descrizione                        |
|--------------|-----------|-----------|------------------------------------|
| `MEDIA_ROOT` | `/media`  | backend   | Path interno al container          |
| `PORT`       | `3001`    | backend   | Porta HTTP del server Fastify      |
| `MEDIA_PATH` | `./media` | compose   | Path host montato come volume      |
| `PORT`       | `8080`    | compose   | Porta host esposta dal frontend    |

## Workflow build / deploy

```bash
# BUILD (macchina di sviluppo)
docker compose -f docker-compose.build.yml build
docker compose -f docker-compose.build.yml push   # push su undermix/ su Docker Hub

# DEPLOY (macchina LAN)
docker compose pull   # oppure: docker load < redditvault.tar.gz
docker compose up -d
```

## Cosa NON fare

- Non aggiungere sistemi di autenticazione/login: il progetto è intenzionalmente pubblico in LAN.
- Non usare database: la sorgente di verità è il filesystem.
- Non rinominare le immagini Docker rimuovendo il prefisso `undermix/`.
- Non aggiungere dipendenze pesanti al backend: deve restare un singolo file leggero.
- Non usare `build:` in `docker-compose.yml` (riservato a `docker-compose.build.yml`).

## Problemi noti risolti

### nginx e media 404
Il blocco `location ~* \.(jpg|png|gif...)$` in nginx intercetta le URL dei media
prima del proxy `/media/`. La regola degli asset statici deve contenere SOLO
estensioni degli artifact del build frontend (js, css, svg, woff2, ico) e deve
trovarsi DOPO i blocchi `/media/` e `/api/`.

### Video senza controlli nel lightbox
Il `<video>` nel Lightbox deve avere l'attributo `controls` abilitato (non
`controls={false}`). Il feed card invece usa autoplay muto senza controlli
(design corretto: click apre il lightbox).

### Sidebar clipping
Non usare `overflow: hidden` su `.section` — impedisce lo scroll. Usare un
wrapper `.inner` con `min-width` fisso per evitare reflowing durante l'animazione
della larghezza.
