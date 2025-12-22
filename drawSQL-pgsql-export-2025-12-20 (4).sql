CREATE TABLE "servers"(
    "id" UUID NOT NULL,
    "title" VARCHAR(50) NOT NULL,
    "base_url" TEXT NULL,
    "is_active" BOOLEAN NULL DEFAULT 'DEFAULT TRUE',
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE
    "servers" ADD PRIMARY KEY("id");
ALTER TABLE
    "servers" ADD CONSTRAINT "servers_title_unique" UNIQUE("title");
CREATE TABLE "anime"(
    "id" UUID NOT NULL DEFAULT 'DEFAULT GEN_RANDOM_UUID ( )',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "alt_title" TEXT NULL,
    "poster_url" TEXT NULL,
    "synopsis" TEXT NULL,
    "status" VARCHAR(50) NULL,
    "season" VARCHAR(50) NULL,
    "duration" VARCHAR(50) NULL,
    "rating" VARCHAR(50) NULL,
    "score" DECIMAL(3, 2) NULL,
    "studio" VARCHAR(255) NULL,
    "total_episodes" INTEGER NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE
    "anime" ADD PRIMARY KEY("id");
ALTER TABLE
    "anime" ADD CONSTRAINT "anime_slug_unique" UNIQUE("slug");
CREATE TABLE "anime_sources"(
    "id" UUID NOT NULL DEFAULT 'DEFAULT GEN_RANDOM_UUID ( )',
    "anime_id" UUID NOT NULL,
    "server_id" INTEGER NOT NULL,
    "source_url" TEXT NULL,
    "scraped_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE
    "anime_sources" ADD PRIMARY KEY("id");
CREATE TABLE "server_genres"(
    "id" UUID NOT NULL DEFAULT 'DEFAULT GEN_RANDOM_UUID ( )',
    "server_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL
);
ALTER TABLE
    "server_genres" ADD CONSTRAINT "server_genres_server_id_name_unique" UNIQUE("server_id", "name");
ALTER TABLE
    "server_genres" ADD CONSTRAINT "server_genres_server_id_slug_unique" UNIQUE("server_id", "slug");
ALTER TABLE
    "server_genres" ADD PRIMARY KEY("id");
CREATE TABLE "anime_server_genres"(
    "anime_id" UUID NOT NULL,
    "server_genre_id" UUID NOT NULL
);
ALTER TABLE
    "anime_server_genres" ADD PRIMARY KEY("anime_id");
ALTER TABLE
    "anime_server_genres" ADD PRIMARY KEY("server_genre_id");
CREATE TABLE "episodes"(
    "id" UUID NOT NULL DEFAULT 'DEFAULT GEN_RANDOM_UUID ( )',
    "anime_id" UUID NOT NULL,
    "episode_number" DOUBLE PRECISION NOT NULL,
    "title" TEXT NULL,
    "source_url" TEXT NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE
    "episodes" ADD CONSTRAINT "episodes_anime_id_episode_number_unique" UNIQUE("anime_id", "episode_number");
ALTER TABLE
    "episodes" ADD PRIMARY KEY("id");
CREATE INDEX "episodes_anime_id_index" ON
    "episodes"("anime_id");
CREATE TABLE "episode_streams"(
    "id" UUID NOT NULL DEFAULT 'DEFAULT GEN_RANDOM_UUID ( )',
    "episode_id" UUID NOT NULL,
    "server_id" INTEGER NULL,
    "host" VARCHAR(50) NULL,
    "quality" VARCHAR(100) NULL DEFAULT 'SD',
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE
    "episode_streams" ADD PRIMARY KEY("id");
CREATE INDEX "episode_streams_episode_id_index" ON
    "episode_streams"("episode_id");
CREATE TABLE "episode_downloads"(
    "id" UUID NOT NULL DEFAULT 'DEFAULT GEN_RANDOM_UUID ( )',
    "episode_id" UUID NOT NULL,
    "format" VARCHAR(50) NOT NULL,
    "resolutions" VARCHAR(50) NOT NULL,
    "host" VARCHAR(50) NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE
    "episode_downloads" ADD PRIMARY KEY("id");
CREATE INDEX "episode_downloads_episode_id_index" ON
    "episode_downloads"("episode_id");
ALTER TABLE
    "anime_sources" ADD CONSTRAINT "anime_sources_server_id_foreign" FOREIGN KEY("server_id") REFERENCES "servers"("id");
ALTER TABLE
    "server_genres" ADD CONSTRAINT "server_genres_server_id_foreign" FOREIGN KEY("server_id") REFERENCES "servers"("id");
ALTER TABLE
    "episode_downloads" ADD CONSTRAINT "episode_downloads_episode_id_foreign" FOREIGN KEY("episode_id") REFERENCES "episodes"("id");
ALTER TABLE
    "episode_streams" ADD CONSTRAINT "episode_streams_episode_id_foreign" FOREIGN KEY("episode_id") REFERENCES "episodes"("id");
ALTER TABLE
    "anime" ADD CONSTRAINT "anime_id_foreign" FOREIGN KEY("id") REFERENCES "anime_server_genres"("anime_id");
ALTER TABLE
    "server_genres" ADD CONSTRAINT "server_genres_id_foreign" FOREIGN KEY("id") REFERENCES "anime_server_genres"("server_genre_id");
ALTER TABLE
    "anime_sources" ADD CONSTRAINT "anime_sources_anime_id_foreign" FOREIGN KEY("anime_id") REFERENCES "anime"("id");
ALTER TABLE
    "episode_streams" ADD CONSTRAINT "episode_streams_server_id_foreign" FOREIGN KEY("server_id") REFERENCES "servers"("id");
ALTER TABLE
    "episodes" ADD CONSTRAINT "episodes_anime_id_foreign" FOREIGN KEY("anime_id") REFERENCES "anime"("id");