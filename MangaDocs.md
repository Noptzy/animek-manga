# Manga API Documentation

## Base URL
`/api/v1/manga/komik-indo`

## 1. Search Manga
**Endpoint:** `GET /mangas/search`

Use this endpoint to search for mangas by title, author, or other criteria with specific sort options.

### Query Parameters

| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `s` | string | Search keyword. Matches `title` OR `altTitle`. | `?s=one piece` |
| `author` | string | Filter by author name (partial match). | `?author=oda` |
| `status` | string | Filter by status (e.g., `Ongoing`, `Completed`). | `?status=Ongoing` |
| `illustrator` | string | Filter by illustrator name. | `?illustrator=oda` |
| `sort` | string | Pre-defined sort key (see options below). Default: `updated`. | `?sort=newest` |
| `page` | number | Page number. Default: `1`. | `?page=2` |
| `limit` | number | Items per page. Default: `20`. | `?limit=10` |

### Sort Options (`sort` parameter)
| Value | Description |
| :--- | :--- |
| `newest` | Sort by **Update Date** (Descending) - Terupdate |
| `oldest` | Sort by **Creation Date** (Ascending) - Terlama |
| `asc` | Sort by **Creation Date** (Ascending) |
| `desc` | Sort by **Creation Date** (Descending) |
| `updated` | Sort by **Update Date** (Descending) |
| `updated_oldest` | Sort by **Update Date** (Ascending) |
| `a-z` | Sort by **Title** (A-Z) |
| `z-a` | Sort by **Title** (Z-A) |

---

## 2. List All Mangas
**Endpoint:** `GET /mangas`

Use this endpoint to list all mangas with dynamic sorting.

### Query Parameters

| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `page` | number | Page number. Default: `1`. | `?page=1` |
| `limit` | number | Items per page. Default: `10`. | `?limit=20` |
| `sort` | string | Database field to sort by (e.g., `title`, `createdAt`, `updatedAt`). | `?sort=title` |
| `order` | string | Sort direction: `asc` or `desc`. Default: `asc`. | `?order=desc` |

---

## Response Format

Both endpoints return data in the following structure, including the `totalChapters` count.

```json
{
  "status": "success",
  "message": "Success ...",
  "data": {
    "mangas": [
      {
        "title": "Manga Title",
        "slug": "manga-slug",
        "posterUrl": "https://...",
        "status": "Ongoing",
        "author": "Author Name",
        "illustrator": "Illustrator Name",
        "totalChapters": 150
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```
