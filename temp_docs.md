
---

# User Management

## Get All Users
- **URL**: `/api/v1/admin/users`
- **Method**: `GET`
- **Query Params**:
  - `page` (default: 1)
  - `limit` (default: 10)
  - `q` (search query for name/email)
- **Success Response (200)**:
  ```json
  {
      "success": true,
      "message": "Successfully retrieved users",
      "data": [ ...users... ],
      "total": 100,
      "page": 1,
      "limit": 10,
      "totalPages": 10
  }
  ```
- **Error Response**:
  - `401 Unauthorized`: Token missing or invalid.
  - `403 Forbidden`: Not an Admin.

## Update User Status (Ban/Unban)
- **URL**: `/api/v1/admin/users/:id`
- **Method**: `PUT`
- **Body**:
  ```json
  {
      "isActive": false // or true
  }
  ```
- **Success Response (200)**:
  ```json
  {
      "success": true,
      "message": "Successfully updated user status",
      "data": { ...user... }
  }
  ```
- **Error Response**:
  - `400 Bad Request`: Validation error (e.g., trying to change role).
  - `404 Not Found`: User ID not found.

## Delete User
- **URL**: `/api/v1/admin/users/:id`
- **Method**: `DELETE`
- **Success Response (200)**:
  ```json
  {
      "success": true,
      "message": "Successfully deleted user",
      "data": { "id": "..." }
  }
  ```
- **Error Response**:
  - `404 Not Found`: User ID not found.

---

# Scrape Logs

## Get Logs
- **URL**: `/api/v1/admin/logs`
- **Method**: `GET`
- **Query Params**:
  - `page`, `limit`
  - `source` (e.g., 'Oploverz')
  - `status` (e.g., 'SUCCESS', 'FAILED')
  - `search` (filter by slug or error message)
- **Success Response (200)**:
  ```json
  {
      "success": true,
      "message": "Successfully retrieved logs",
      "data": [ ...logs... ]
  }
  ```

---

# Content Deletion

## Delete Anime
- **URL**: `/api/v1/admin/anime/oploverz/:slug`
- **Method**: `DELETE`
- **Success Response (200)**:
  ```json
  {
      "success": true,
      "message": "Successfully deleted anime"
  }
  ```
- **Error Response**:
  - `404 Not Found`: Anime not found.

## Delete Manga
- **URL**: `/api/v1/admin/manga/komikIndo/:slug`
- **Method**: `DELETE`
- **Success Response (200)**:
  ```json
  {
      "success": true,
      "message": "Successfully deleted manga"
  }
  ```
- **Error Response**:
  - `404 Not Found`: Manga not found.
