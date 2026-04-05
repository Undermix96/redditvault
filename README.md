# MediaVault

Bacheca media in stile Reddit per LAN. Visualizza immagini, video e GIF organizzati in "subreddit" leggendo dinamicamente una directory.

## Struttura directory media

```
media/
├── Gaming/
│   ├── images/
│   │   ├── screenshot.jpg
│   │   └── wallpaper.png
│   ├── videos/
│   │   └── clip.mp4
│   ├── gifs/
│   │   └── funny.gif
│   └── qualcosa.rat       ← ignorato automaticamente
├── Nature/
│   ├── photos/
│   │   └── landscape.webp
│   └── clips/
│       └── timelapse.mp4
└── Memes/
    └── images/
        └── meme.jpg
```

- **Primo livello**: cartelle → diventano subreddit (`r/Gaming`, `r/Nature`…)
- **Secondo livello**: sottocartelle → diventano categorie (qualunque nome)
- **Secondo livello**: file `.rat` → ignorati silenziosamente
- **Terzo livello**: i media veri e propri

### Formati supportati

| Tipo   | Estensioni                              |
|--------|-----------------------------------------|
| Image  | jpg, jpeg, png, webp, avif, bmp, tiff   |
| Video  | mp4, webm, mov, mkv, avi, m4v           |
| GIF    | gif                                     |

## Workflow: build e deploy separati

### Build (macchina di sviluppo / CI)

```bash
docker compose -f docker-compose.build.yml build
```

Produce le immagini `mediavault-backend:latest` e `mediavault-frontend:latest`.

Per esportarle e trasferirle sulla macchina LAN:

```bash
docker save mediavault-backend:latest mediavault-frontend:latest | gzip > mediavault.tar.gz
# poi trasferisci il file, es. con scp:
scp mediavault.tar.gz user@192.168.1.x:/destinazione/
```

### Deploy (macchina LAN)

```bash
# Carica le immagini (solo se trasferite come tar)
docker load < mediavault.tar.gz

# Configura l'ambiente
cp .env.example .env
# Imposta MEDIA_PATH con il percorso assoluto alla cartella media
# Es: MEDIA_PATH=/srv/media

# Avvia
docker compose up -d
```

Apri il browser su `http://IP_LAN:8080` (o la porta configurata in `.env`).

### Ferma / riavvia

```bash
docker compose down
docker compose up -d
```

## Variabili d'ambiente

| Variabile    | Default    | Descrizione                              |
|--------------|------------|------------------------------------------|
| `MEDIA_PATH` | `./media`  | Percorso host della cartella media        |
| `PORT`       | `8080`     | Porta esposta nell'host                  |

## Funzionalità

- **Feed infinito** con paginazione automatica al scroll
- **Autoplay** video e GIF quando entrano nel viewport, pause quando escono
- **Lightbox fullscreen** con navigazione frecce/tastiera
  - `←` `→` per navigare tra i media
  - `Esc` per chiudere
  - Pulsante fullscreen nativo del browser
  - Toggle audio per i video
- **Sidebar** con lista subreddit e conteggio media
- **Filtri** per tipo: All / Image / Video / GIF
- **Cache** automatica 10s lato API (aggiorna con `POST /api/refresh`)

## Stack tecnico

| Layer    | Tecnologia                              |
|----------|-----------------------------------------|
| Backend  | Node.js 22 + Fastify 4                  |
| Frontend | React 18 + Vite 6                       |
| State    | Zustand 5                               |
| Data     | TanStack Query 5 (infinite scroll)      |
| Animazioni | Motion 11                             |
| Serve    | Nginx 1.27 (Alpine)                     |
| Container | Docker + Compose                       |

## API Backend

| Metodo | Endpoint              | Descrizione                        |
|--------|-----------------------|------------------------------------|
| GET    | `/api/health`         | Health check                       |
| GET    | `/api/subreddits`     | Lista subreddit con conteggio      |
| GET    | `/api/posts`          | Lista media paginata               |
| POST   | `/api/refresh`        | Invalida cache e rilegge directory |
| GET    | `/media/**`           | Serve i file media                 |

### Parametri `/api/posts`

| Param      | Default | Descrizione                         |
|------------|---------|-------------------------------------|
| `subreddit`| `all`   | Filtra per subreddit                |
| `type`     | `all`   | `image` / `video` / `gif`           |
| `page`     | `1`     | Pagina                              |
| `limit`    | `24`    | Media per pagina                    |
