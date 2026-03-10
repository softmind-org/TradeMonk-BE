# Marketplace Settings API

This API manages global platform settings, specifically the `marketplaceMode` toggle.

## 1. Get Global Settings
**Endpoint:** `GET /api/v1/settings`
**Auth:** Public

**Description:**
Fetches all global settings as a key-value map. If `marketplaceMode` is not explicitly set in the database, it defaults to `'preparation'`.

### Example Response (Success)
```json
{
  "success": true,
  "data": {
    "marketplaceMode": "preparation" // or "live"
  }
}
```

## 2. Update a Global Setting
**Endpoint:** `POST /api/v1/settings`
**Auth:** Private (Admin only)

**Body Parameters:**
- `key`: string (e.g., "marketplaceMode")
- `value`: mixed (e.g., "live")

**Description:**
Creates or updates a specific setting key with the provided value.

### Example Request
```json
{
  "key": "marketplaceMode",
  "value": "live"
}
```

### Example Response (Success)
```json
{
  "success": true,
  "data": {
    "_id": "66a1b...",
    "key": "marketplaceMode",
    "value": "live",
    "createdAt": "2026-03-10T...",
    "updatedAt": "2026-03-10T..."
  }
}
```

## Mode Interstition Logic
When `marketplaceMode` is set to `'preparation'`:
- `POST /api/v1/payments/create-intent` will return `403 Forbidden`
- `POST /api/v1/orders` will return `403 Forbidden`

Only when `marketplaceMode` is `'live'` will creating orders or payments be permitted.
