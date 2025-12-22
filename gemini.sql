-- Pastikan ekstensi UUID aktif
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. SERVERS
-- ==========================================
CREATE TABLE "servers"(
    "id" SERIAL PRIMARY KEY, -- Pakai SERIAL biar auto increment (1,2,3)
    "title" VARCHAR(50) NOT NULL UNIQUE,
    "base_url" TEXT NULL,
    "is_active" BOOLEAN DEFAULT TRUE, -- Syntax yang benar
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. ANIME (Data Utama)
-- ==========================================
CREATE TABLE "anime"(
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "alt_title" TEXT NULL,
    "poster_url" TEXT NULL,
    "banner_url" TEXT NULL,
    "synopsis" TEXT NULL,
    "status" VARCHAR(50) NULL,
    "season" VARCHAR(50) NULL,
    "release_date" DATE NULL,
    "duration" VARCHAR(50) NULL,
    "rating" VARCHAR(50) NULL,
    "score" DECIMAL(3, 2) NULL,
    "studio" VARCHAR(255) NULL,
    "total_episodes" INTEGER NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. ANIME SOURCES (Relasi Anime ke Server)
-- ==========================================
CREATE TABLE "anime_sources"(
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "anime_id" UUID NOT NULL,
    "server_id" INTEGER NOT NULL,
    "source_url" TEXT NULL,
    "scraped_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "fk_anime_sources_anime" FOREIGN KEY("anime_id") REFERENCES "anime"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_anime_sources_server" FOREIGN KEY("server_id") REFERENCES "servers"("id") ON DELETE CASCADE
);

-- ==========================================
-- 4. SERVER GENRES (Genre Spesifik per Server)
-- ==========================================
-- Tabel ini menyimpan definisi genre milik masing-masing server
CREATE TABLE "server_genres"(
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "server_id" INTEGER NOT NULL, -- Relasi ke Server (Integer)
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    
    -- Constraint PENTING: Nama genre boleh sama asalkan beda server
    CONSTRAINT "unique_genre_per_server" UNIQUE("server_id", "name"),
    CONSTRAINT "unique_slug_per_server" UNIQUE("server_id", "slug"),
    
    CONSTRAINT "fk_server_genres_server" FOREIGN KEY("server_id") REFERENCES "servers"("id") ON DELETE CASCADE
);

-- ==========================================
-- 5. ANIME SERVER GENRES (Tabel Pivot)
-- ==========================================
-- Ini menghubungkan Anime ke Genre spesifik server
CREATE TABLE "anime_server_genres"(
    "anime_id" UUID NOT NULL,
    "server_genre_id" UUID NOT NULL,
    
    PRIMARY KEY ("anime_id", "server_genre_id"),
    
    CONSTRAINT "fk_asg_anime" FOREIGN KEY("anime_id") REFERENCES "anime"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_asg_genre" FOREIGN KEY("server_genre_id") REFERENCES "server_genres"("id") ON DELETE CASCADE
);

-- ==========================================
-- 6. EPISODES
-- ==========================================
CREATE TABLE "episodes"(
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "anime_id" UUID NOT NULL,
    "episode_number" FLOAT NOT NULL,
    "title" TEXT NULL,
    "slug" TEXT NULL,
    "source_url" TEXT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "fk_episodes_anime" FOREIGN KEY("anime_id") REFERENCES "anime"("id") ON DELETE CASCADE,
    CONSTRAINT "unique_episode_per_anime" UNIQUE("anime_id", "episode_number")
);
CREATE INDEX "idx_episodes_anime" ON "episodes"("anime_id");

-- ==========================================
-- 7. EPISODE STREAMS
-- ==========================================
CREATE TABLE "episode_streams"(
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "episode_id" UUID NOT NULL,
    "server_id" INTEGER NULL, -- Boleh null
    "provider" VARCHAR(50) NULL,
    "quality" VARCHAR(100) DEFAULT 'SD',
    "url" TEXT NOT NULL,
    "is_embed" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "fk_streams_episode" FOREIGN KEY("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_streams_server" FOREIGN KEY("server_id") REFERENCES "servers"("id") ON DELETE SET NULL
);
CREATE INDEX "idx_streams_episode" ON "episode_streams"("episode_id");

-- ==========================================
-- 8. EPISODE DOWNLOADS
-- ==========================================
CREATE TABLE "episode_downloads"(
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "episode_id" UUID NOT NULL,
    "format" VARCHAR(50) NOT NULL,
    "quality" VARCHAR(50) NOT NULL,
    "host" VARCHAR(50) NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "fk_downloads_episode" FOREIGN KEY("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE
);
CREATE INDEX "idx_downloads_episode" ON "episode_downloads"("episode_id");