# Kuramanime API Documentation (Server 1)

This document provides details on the API endpoints for fetching anime data from the Kuramanime source (Server 1).

---

## 1. Get Ongoing Anime

-   **Endpoint:** `/anime/1/ongoing`
-   **Method:** `GET`
-   **Description:** Retrieves a list of anime series that are currently ongoing. Supports pagination.
-   **Query Parameters:**
    -   `page` (optional): The page number to retrieve.
    -   `limit` (optional): The number of items per page.
-   **Usage:**
    -   With pagination: `/anime/1/ongoing?page=1&limit=20`
    -   Without pagination: `/anime/1/ongoing` (returns all)
-   **Success Response (200 OK):**
    ```json
    {
    "success": true,
    "message": "Successfully retrieved ongoing anime.",
    "creator": "Nostzy",
    "data": {
        "anime": [
            {
                "title": "Egao no Taenai Shokuba desu.",
                "slug": "egao-no-taenai-shokuba-desu",
                "posterUrl": "https://r2.nyomo.my.id/images/20251020-1760965869-bb004bcd-d533-42a4-8188-b48ed8daf995.jpeg",
                "status": "Sedang Tayang",
                "score": "6.81",
                "type": "TV",
                "totalEpisodes": 11
            },
            {
                "title": "Uma Musume: Cinderella Gray Part 2",
                "slug": "uma-musume-cinderella-gray-part-2",
                "posterUrl": "https://r2.nyomo.my.id/images/20251019-1760861614-e493aef1-1f85-4348-8063-bb4afa3a1ed8.jpeg",
                "status": "Sedang Tayang",
                "score": "8.41",
                "type": "TV",
                "totalEpisodes": 9
            }
        ],
        "total": 96,
        "page": 1,
        "limit": 10,
        "totalPages": 10
    }
    }
    ```
---

## 2. Get Finished Anime

-   **Endpoint:** `/anime/1/finished`
-   **Method:** `GET`
-   **Description:** Retrieves a list of anime series that have finished airing. Supports pagination.
-   **Query Parameters:**
    -   `page` (optional): The page number.
    -   `limit` (optional): The number of items per page.
-   **Usage:** `/anime/1/finished?page=1&limit=10`
-   **Success Response (200 OK):**
    ```json
    {
    "success": true,
    "message": "Successfully retrieved finished anime.",
    "creator": "Nostzy",
    "data": {
        "anime": [
            {
                "title": "K-On!: Ura-On!",
                "slug": "k-on-ura-on",
                "posterUrl": "https://r2.nyomo.my.id/images/20251201-1764577938-a66905b8-f29f-4b61-9aae-bf70496b2263.jpeg",
                "status": "Selesai Tayang",
                "score": "6.57",
                "type": "Special",
                "totalEpisodes": 9
            },
            {
                "title": "K-On! Movie",
                "slug": "k-on-movie",
                "posterUrl": "https://r2.nyomo.my.id/images/20251201-1764578321-0576c1be-5eb2-4fcf-b8ea-c444fc0ffdac.",
                "status": "Selesai Tayang",
                "score": "8.36",
                "type": "Movie",
                "totalEpisodes": 1
            }
        ],
        "total": 1967,
        "page": 1,
        "limit": 10,
        "totalPages": 197
    }
    }
    ```
---

## 3. Get Movie Anime

-   **Endpoint:** `/anime/1/movies`
-   **Method:** `GET`
-   **Description:** Retrieves a list of anime of the "Movie" type. Supports pagination.
-   **Query Parameters:**
    -   `page` (optional): The page number.
    -   `limit` (optional): The number of items per page.
-   **Usage:** `/anime/1/movies?page=1&limit=10`
-   **Success Response (200 OK):**
    ```json
    {
    "success": true,
    "message": "Successfully retrieved movie anime.",
    "creator": "Nostzy",
    "data": {
        "anime": [
            {
                "title": "K-On! Movie",
                "slug": "k-on-movie",
                "posterUrl": "https://r2.nyomo.my.id/images/20251201-1764578321-0576c1be-5eb2-4fcf-b8ea-c444fc0ffdac.",
                "status": "Selesai Tayang",
                "score": "8.36",
                "type": "Movie",
                "totalEpisodes": 1
            },
            {
                "title": "i☆Ris the Movie: Full Energy!!",
                "slug": "iris-the-movie-full-energy",
                "posterUrl": "https://r2.nyomo.my.id/images/20251211-1765469971-122ceb05-7ec9-4254-a1c2-8548ac2889ff.",
                "status": "Selesai Tayang",
                "score": "6.44",
                "type": "Movie",
                "totalEpisodes": 1
            }
        ],
        "total": 197,
        "page": 1,
        "limit": 10,
        "totalPages": 20
    }
    }
    ```

---

## 4. Search Anime

-   **Endpoint:** `/anime/1/search`
-   **Method:** `GET`
-   **Description:** Searches for anime based on various filters. Pagination is supported.
-   **Query Parameters:**
    -   `q` (optional): The search query string for the title.
    -   `genre` (optional): The slug of the genre to filter by (e.g., `action`, `comedy`).
    -   `status` (optional): The status to filter by (e.g., `Ongoing`, `Selesai Tayang`).
    -   `type` (optional): The type to filter by (e.g., `TV`, `Movie`).
    -   `page` (optional): Page number (defaults to 1).
    -   `limit` (optional): Items per page (defaults to 20).
-   **Usage:** `/anime/1/search?q=spirit&genre=fantasy&page=1`
-   **Success Response (200 OK):**
    ```json
    {
    "success": true,
    "message": "Successfully retrieved search results.",
    "creator": "Nostzy",
    "data": {
        "anime": [
            {
                "title": "Chichi wa Eiyuu, Haha wa Seirei, Musume no Watashi wa Tenseisha.",
                "slug": "chichi-wa-eiyuu-haha-wa-seirei-musume-no-watashi-wa-tenseisha",
                "posterUrl": "https://r2.nyomo.my.id/images/20251019-1760884277-6f6429ac-1524-4e32-9ab2-8317542dd5a1.jpeg",
                "status": "Sedang Tayang",
                "score": "7.02",
                "type": "TV",
                "totalEpisodes": 11
            },
            {
                "title": "Seirei Gensouki 2",
                "slug": "seirei-gensouki-2",
                "posterUrl": "https://r2.nyomo.my.id/images/20250730-1753862174-752a882f-c2d3-42a2-a5b7-dcc9efbee629.jpeg",
                "status": "Selesai Tayang",
                "score": "6.87",
                "type": "TV",
                "totalEpisodes": 12
            }
        ],
        "total": 2,
        "page": 1,
        "limit": 20,
        "totalPages": 1
    }
    }
    ```
---

## 5. Get Anime by Slug

-   **Endpoint:** `/anime/1/{slug}`
-   **Method:** `GET`
-   **Description:** Retrieves detailed information for a single anime by its slug. This includes a list of all episodes, but **not** their streaming links. To get stream links, use the "Scrape Episode Streams" endpoint.
-   **URL Parameters:**
    -   `slug` (required): The unique slug of the anime.
-   **Usage:** `/anime/1/egao-no-taenai-shokuba-desu`
-   **Success Response (200 OK):**
    ```json
    {
    "success": true,
    "message": "Successfully retrieved anime details.",
    "creator": "Nostzy",
    "data": {
        "title": "Egao no Taenai Shokuba desu.",
        "slug": "egao-no-taenai-shokuba-desu",
        "posterUrl": "https://r2.nyomo.my.id/images/20251020-1760965869-bb004bcd-d533-42a4-8188-b48ed8daf995.jpeg",
        "synopsis": "Seniman manga shoujo baru, Nana Futami, bekerja keras setiap hari dengan dukungan dari Kaede Satou, editor perempuannya yang lebih tua darinya, dan Mizuki Hazama, asistennya. Menurut gadis itu sendiri, kadang-kadang dia membayangkan hal-hal yang intens tentang penyakit akibat pekerjaan! Sebuah komedi tentang gadis-gadis pekerja di industri hiburan, disajikan oleh seorang penulis yang selalu menggambar berbagai gadis.(Sumber: Kodansha, diterjemahkan)",
        "status": "Sedang Tayang",
        "type": "TV",
        "season": "Fall 2025",
        "duration": "23 menit per episode",
        "quality": "HD",
        "rating": "PG-13 - Remaja berusia 13 tahun ke atas",
        "score": "6.81",
        "country": "JP",
        "server": {
            "id": 1,
            "name": "Kuramanime",
            "url": "https://v8.kuramanime.tel/",
            "type": "Anime",
            "isActive": true
        },
        "episodes": [
            {
                "episodeNumber": 1,
                "title": "Episode 1",
                "url": "https://v8.kuramanime.tel/anime/4108/egao-no-taenai-shokuba-desu/episode/1"
            },
            {
                "episodeNumber": 2,
                "title": "Episode 2",
                "url": "https://v8.kuramanime.tel/anime/4108/egao-no-taenai-shokuba-desu/episode/2"
            }
        ],
        "genres": [
            "Comedy",
            "Slice of Life"
        ],
        "anime": {
            "altTitle": "A Mangaka's Weirdly Wonderful Workplace, 笑顔のたえない職場です。, Egatae, A Workplace Where You Can't Help But Smile",
            "totalEpisodes": 11
        }
    }
    }
    ```
-   **Error Response (404 Not Found):**
    ```json
    {
        "success": false,
        "code": 404,
        "message": "Anime not found.",
        "errors": null
    }
    ```

---

## 6. Scrape Episode Streams

-   **Endpoint:** `/anime/1/scrape-episode`
-   **Method:** `POST`
-   **Description:** This endpoint triggers a manual scrape and update of a specific episode's stream links. It checks the age of the existing stream data in the database. If the data is older than 24 hours, it will perform a fresh scrape, update the database with the new streams, and return them. Otherwise, it returns the existing, up-to-date stream links from the database.
-   **Request Body:**
    ```json
    {
        "episodeUrl": "https://v8.kuramanime.tel/anime/4108/egao-no-taenai-shokuba-desu/episode/3"
    }
    ```
    -   `episodeUrl` (string, required): The full URL of the episode page to scrape for stream links.
-   **Usage:**
    -   Send a `POST` request to `/anime/1/scrape-episode` with the `episodeUrl` in the JSON body.
-   **Success Response (200 OK):**
    ```json
    {
        "success": true,
        "message": "Successfully scraped and updated episode streams.",
        "creator": "Nostzy",
        "data": [
            {
                "quality": "720p",
                "url": "https://momo.my.id/kdrive/tYa5QmbPykrk/Kuramanime-EGATAE-03-720p.mp4"
            },
            {
                "quality": "480p",
                "url": "https://momo.my.id/kdrive/tLcAJT3h0I9EX/Kuramanime-EGATAE-03-480p.mp4"
            },
            {
                "quality": "360p",
                "url": "https://momo.my.id/kdrive/x5VbHEV6mEWpnyw/Kuramanime-EGATAE-03-360p.mp4"
            }
        ]
    }
    ```
-   **Error Responses:**
    -   **400 Bad Request:** If `episodeUrl` is missing or invalid.
        ```json
        {
            "success": false,
            "code": 400,
            "message": "episodeUrl is required in the request body.",
            "errors": null
        }
        ```
    -   **404 Not Found:** If the anime or episode corresponding to the `episodeUrl` is not found in the database.
        ```json
        {
            "success": false,
            "code": 404,
            "message": "Episode not found in database.",
            "errors": null
        }
        ```
    -   **500 Internal Server Error:** For other server-side errors during scraping or updating.
        ```json
        {
            "success": false,
            "code": 500,
            "message": "Failed to scrape episode streams.",
            "errors": null
        }
        ```
---

## 7. Get Random Anime

-   **Endpoint:** `/anime/1/animes`
-   **Method:** `GET`
-   **Description:** Retrieves a shuffled list of the latest ongoing, finished, and movie animes. This endpoint is paginated. It does not perform any scraping and serves data directly from the database.
-   **Query Parameters:**
    -   `page` (optional): The page number to retrieve. Defaults to 1.
    -   `limit` (optional): The number of items per page. Defaults to 15.
-   **Usage:** `/anime/1/animes?page=1&limit=10`
-   **Success Response (200 OK):**
    ```json
    {
        "success": true,
        "message": "Successfully retrieved a random anime.",
        "creator": "Nostzy",
        "data": {
            "anime": [
                {
                    "title": "K-On! Movie",
                    "slug": "k-on-movie",
                    "posterUrl": "https://r2.nyomo.my.id/images/20251201-1764578321-0576c1be-5eb2-4fcf-b8ea-c444fc0ffdac.",
                    "status": "Selesai Tayang",
                    "score": "8.36",
                    "type": "Movie",
                    "totalEpisodes": 1
                },
                {
                    "title": "Egao no Taenai Shokuba desu.",
                    "slug": "egao-no-taenai-shokuba-desu",
                    "posterUrl": "https://r2.nyomo.my.id/images/20251020-1760965869-bb004bcd-d533-42a4-8188-b48ed8daf995.jpeg",
                    "status": "Sedang Tayang",
                    "score": "6.81",
                    "type": "TV",
                    "totalEpisodes": 11
                }
            ],
            "total": 60,
            "page": 1,
            "limit": 10,
            "totalPages": 6
        }
    }
    ```
-   **Error Response (404 Not Found):**
    ```json
    {
        "success": false,
        "code": 404,
        "message": "No random anime found.",
        "errors": null
    }
    ```