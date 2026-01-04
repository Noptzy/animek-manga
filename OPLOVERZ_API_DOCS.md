# Oploverz API Documentation (Server 2)

This document provides details on the API endpoints for fetching anime data from the Oploverz source (Server 2).

**Base URL**: `http://localhost:4000/api/v1`

---

## 1. Get All Anime (Filter & Sort)

-   **Endpoint:** `/anime/2`
-   **Method:** `GET`
-   **Description:** Retrieves a list of anime with support for advanced filtering (Genre, Type, Status) and sorting (Release Date, A-Z).
-   **Query Parameters:**
    -   `page` (optional): The page number to retrieve (default: 1).
    -   `limit` (optional): The number of items per page (default: 10).
    -   `genre` (optional): Filter by genre slug (e.g., `action`, `isekai`).
    -   `status` (optional): Filter by status (e.g., `Ongoing`, `Completed`).
    -   `type` (optional): Filter by type (e.g., `Movie`, `TV`).
    -   `order` (optional): Sort order.
        -   `newest`: Latest Update (default).
        -   `oldest`: Oldest Update.
        -   `release_newest`: Newest Release (Created Date).
        -   `release_oldest`: Oldest Release (Created Date).
        -   `a-z`: Title A-Z.
        -   `z-a`: Title Z-A.
-   **Usage Examples:**
    -   **Filter by Genre:** `/anime/2?genre=action`
    -   **Filter Movie:** `/anime/2?type=Movie`
    -   **Sort by Release Date:** `/anime/2?order=release_newest`
    -   **Combine Filters:** `/anime/2?genre=isekai&status=Ongoing&order=newest`
-   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Successfully get all anime",
      "data": {
        "data": [
          {
            "title": "One Piece",
            "slug": "one-piece",
            "posterUrl": "https://example.com/one-piece.jpg",
            "status": "Ongoing",
            "type": "TV",
            "totalEpisodes": 1000,
            "score": "9.0"
          },
          {
            "title": "Naruto",
            "slug": "naruto",
            "posterUrl": "https://example.com/naruto.jpg",
            "status": "Completed",
            "type": "TV",
            "totalEpisodes": 220,
            "score": "8.5"
          }
        ],
        "total": 150,
        "page": 1,
        "limit": 10,
        "totalPages": 15
      }
    }
    ```

---

## 2. Search Anime

-   **Endpoint:** `/anime/2/search`
-   **Method:** `GET`
-   **Description:** Search for anime by title keyword.
-   **Query Parameters:**
    -   `q` (required): Search keyword (e.g., `naruto`).
    -   `page` (optional): Page number (default: 1).
    -   `limit` (optional): Items per page (default: 10).
-   **Usage:** `/anime/2/search?q=one piece`
-   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Successfully search anime",
      "data": {
        "data": [
          {
            "title": "One Piece",
            "slug": "one-piece",
            "posterUrl": "https://example.com/one-piece.jpg",
            "totalEpisodes": 1000,
            "type": "TV",
            "score": "9.0",
            "status": "Ongoing"
          }
        ],
        "total": 1,
        "page": 1,
        "limit": 10
      }
    }
    ```
-   **Error Response (500 Internal Server Error):**
    ```json
    {
        "success": false,
        "message": "Failed to search anime",
        "data": null
    }
    ```

---

## 3. Get Genres

-   **Endpoint:** `/anime/2/genres`
-   **Method:** `GET`
-   **Description:** Retrieve a list of all available genres on Oploverz (Server 2). Use the `slug` from this list for filtering in the "Get All Anime" endpoint.
-   **Usage:** `/anime/2/genres`
-   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Successfully get genres",
      "data": [
        {
          "name": "Action",
          "slug": "action"
        },
        {
          "name": "Adventure",
          "slug": "adventure"
        },
        {
          "name": "Comedy",
          "slug": "comedy"
        }
      ]
    }
    ```
-   **Error Response (500 Internal Server Error):**
    ```json
    {
        "success": false,
        "message": "Failed to retrieve genres",
        "data": null
    }
    ```
