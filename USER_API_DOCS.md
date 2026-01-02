# User & Auth API Documentation

This document outlines the API endpoints accessible via `userController` and `authController`.

**Base URL**: `http://localhost:4000/api/v1`

---

## 1. Authentication (Public)

### Login
**Endpoint**: `POST /auth/login`

**Request Body**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | String | Yes | User email |
| `password` | String | Yes | User password |

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

**Error Response (403 Forbidden - Banned)**
```json
{
  "success": false,
  "message": "Your account has been banned. Please contact support."
}
```

**Error Response (400 Bad Request)**
```json
{
  "success": false,
  "message": "User Not Found" // or "Invalid Credentials"
}
```

### Register
**Endpoint**: `POST /auth/register`

**Request Body**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | Yes | Full name |
| `email` | String | Yes | Email address |
| `password` | String | Yes | Password |

**Success Response (201 Created)**
```json
{
  "success": true,
  "message": "Register successful, Please Login",
  "data": { "newUser": { ... } }
}
```

---

## 2. User Management (Admin/Users)

### Get List of Users
**Endpoint**: `GET /users`
**Access**: Admin / Member (Depending on middleware)

**Query Parameters**
| Field | Type | Description |
| :--- | :--- | :--- |
| `page` | Integer | Page number (default: 1) |
| `limit` | Integer | Items per page (default: 10) |
| `q` | String | **Search Query** (Matches Name or Email, case-insensitive) |

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "data": [
      {
        "id": "uuid...",
        "name": "Noptzy",
        "email": "noptzy@example.com",
        "isActive": true,
        "photoUrl": "..."
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 10
  }
}
```

### Get User Profile (Self)
**Endpoint**: `GET /users/profile`
**Access**: Authenticated

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "uuid...",
    "name": "My Name",
    "email": "my@example.com",
    "isActive": true
  }
}
```

### Update User Profile (Self)
**Endpoint**: `PUT /users/profile`
**Access**: Authenticated

**Request Body**
| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | Update name |
| `email` | String | Update email |
| `password` | String | Update password |

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

### Delete Profile (Self)
**Endpoint**: `DELETE /users/profile`
**Access**: Authenticated

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Profile deleted successfully"
}
```

---

## 3. User Administration (Admin Only)

### Create User (Admin)
**Endpoint**: `POST /users`
**Access**: Admin

**Request Body**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | Yes | Full name |
| `email` | String | Yes | Email |
| `password` | String | Yes | Password |

### Update User (Admin)
**Endpoint**: `PUT /users/:id`
**Access**: Admin

**URL Parameters**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Yes | Target User ID |

**Request Body**
| Field | Type | Description |
| :--- | :--- | :--- |
| `isActive` | Boolean | **True** (Unban) or **False** (Ban) |
| `name` | String | Update name |
| `roleId` | Integer | Update role |

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "...",
    "isActive": false // Banned
  }
}
```

### Delete User (Admin)
**Endpoint**: `DELETE /users/:id`
**Access**: Admin

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### Get Specific User
**Endpoint**: `GET /users/:id`
**Access**: Admin / Member

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": { ... }
}
```
