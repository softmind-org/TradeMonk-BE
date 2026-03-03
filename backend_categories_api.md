# Backend Categories API Reference

This document describes the API endpoints needed for the Admin Categories management feature.

---

## Model: `Category`

```javascript
// src/models/category.model.js
const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        unique: true,
        trim: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    description: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['enabled', 'disabled'],
        default: 'enabled',
    },
}, {
    timestamps: true,
});
```

---

## Endpoints

All endpoints are prefixed with `/api/categories`.

### 1. Get All Categories

```
GET /api/categories
```

**Auth:** Public (no auth needed – buyers/sellers also fetch categories)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "abc123",
      "name": "Pokémon",
      "slug": "pokemon",
      "description": "The world-renowned trading card game.",
      "status": "enabled",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Create Category (Admin Only)

```
POST /api/categories
```

**Auth:** `protect` + `authorize('admin')`

**Body:**
```json
{
  "name": "Pokémon",
  "slug": "pokemon",
  "description": "The world-renowned trading card game featuring Pocket Monsters."
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "abc123",
    "name": "Pokémon",
    "slug": "pokemon",
    "description": "The world-renowned trading card game.",
    "status": "enabled",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### 3. Update Category (Admin Only)

```
PUT /api/categories/:id
```

**Auth:** `protect` + `authorize('admin')`

**Body (partial updates allowed):**
```json
{
  "name": "Pokémon TCG",
  "slug": "pokemon-tcg",
  "description": "Updated description."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "...updated category..." }
}
```

---

### 4. Toggle Category Status (Admin Only)

```
PATCH /api/categories/:id/status
```

**Auth:** `protect` + `authorize('admin')`

**Body:**
```json
{
  "status": "disabled"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "...updated category with new status..." }
}
```

---

### 5. Delete Category (Admin Only)

```
DELETE /api/categories/:id
```

**Auth:** `protect` + `authorize('admin')`

**Response (200):**
```json
{
  "success": true,
  "message": "Category deleted successfully."
}
```

---

## Route File Structure

```javascript
// src/routes/category.routes.js
import express from 'express';
import categoryController from '../controllers/category.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.route('/')
    .get(categoryController.getAll)                          // Public
    .post(protect, authorize('admin'), categoryController.create);  // Admin

router.route('/:id')
    .put(protect, authorize('admin'), categoryController.update)   // Admin
    .delete(protect, authorize('admin'), categoryController.remove); // Admin

router.patch('/:id/status', protect, authorize('admin'), categoryController.toggleStatus); // Admin

export default router;
```

> **Note:** The `authorize` middleware checks `req.user.role` against the allowed roles and returns a 403 if the user is not authorized. If you don't have this middleware yet, create it in `src/middlewares/auth.middleware.js`:
>
> ```javascript
> export const authorize = (...roles) => (req, res, next) => {
>   if (!roles.includes(req.user.role)) {
>     return res.status(403).json({
>       success: false,
>       message: `Role '${req.user.role}' is not authorized to access this route.`,
>     });
>   }
>   next();
> };
> ```

## Registration in Server

```javascript
// In src/app.js or wherever routes are mounted
import categoryRoutes from './routes/category.routes.js';

app.use('/api/categories', categoryRoutes);
```
