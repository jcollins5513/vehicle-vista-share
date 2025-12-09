# Web Companion Capture Pipeline

- **Routes:**  
  - `/web-companion` – enter a stock number to create a session  
  - `/web-companion/{stockNumber}` – live workspace that watches for uploads, runs browser background removal, and saves processed assets into inventory
- **iOS endpoint:** `POST /api/web-companion/uploads` (multipart/form-data)
  - `stockNumber` (string, required)
  - `file` (image/*, required)
- **Processing flow:**
  1) iOS posts captures with the stock number; originals land in S3 at `web-companion/{stockNumber}/original/**` and are indexed in Redis.  
  2) The browser workspace polls the queue, fetches each original, and runs `@imgly/background-removal` client-side.  
  3) Processed images are saved to S3 at `processed/{stockNumber}/**` via `/api/vehicles/{stockNumber}/processed-images`, which also updates Redis inventory (`processedImages` with the originalUrl preserved).  
  4) The first/original capture URL is kept alongside the processed entry so you always have an unedited source.
- **Editor hand-off:** From the session page, “Launch editor” opens `/content-creation?stockNumber={stockNumber}` and auto-selects the vehicle so the new processed shots show up in the Visual Editor tab.
- **Notes:** Upload limit is 25MB per image; only image types are accepted. Queue state (pending/processed/failed) is stored in Redis keys under `web-companion:stock:{stockNumber}:*`.
