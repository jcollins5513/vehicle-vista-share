# Archive — Section 1: Database Integration (completed steps archived for reference)

> Focused tasks for this session. Update by checking off items at end of conversation.

## Objectives
- Establish PostgreSQL database
- Configure Prisma ORM
- Migrate existing `Vehicle` model
- Provide typed data access for frontend

## Tasks

1. Environment Setup
   - [ ] Add `DATABASE_URL` to `.env`
   - [ ] Install `@prisma/client` and `prisma` packages
   - [ ] Initialize Prisma in `prisma/` directory

2. Schema & Migration
   - [ ] Verify `schema.prisma` includes `Vehicle` model (provided)
   - [ ] Run `prisma migrate dev` to create initial migration

3. Seed Data (Optional for Dev)
   - [ ] Create `prisma/seed.ts` to insert sample vehicles
   - [ ] Run `prisma db seed`

4. API Layer
   - [ ] Set up simple Express server (`server/`)
   - [ ] Implement REST endpoints:
     - GET `/api/vehicles` — list all vehicles
     - GET `/api/vehicles/:id` — single vehicle
     - POST `/api/vehicles` — add/update vehicle
   - [ ] Integrate Prisma client in endpoints

5. Frontend Data Fetching
   - [ ] Create React Query hooks (`src/api/vehicles.ts`)
   - [ ] Replace mock data with live API calls in `ShowroomView` & `CustomerView`

6. Real-Time Sync Prep
   - [ ] Outline plan for WebSocket or polling (future section)

7. Testing
   - [ ] Add basic API tests with Jest/Supertest

8. Documentation

---

# Granular Plan — Section 2: File Upload & Media Management System

> Focus on enabling image/video uploads, storage, and retrieval.

## Objectives
- Allow dealership staff to upload vehicle media.
- Store files in a secure, scalable bucket (e.g., AWS S3 or Cloudinary).
- Serve optimized URLs to frontend slideshows.
- Associate uploaded media with `Vehicle` records.

## Tasks
1. Storage Provider
   - [ ] Decide on provider (S3, Cloudinary, or Supabase Storage)
   - ✅ Add credentials to `.env`
   - ✅ Install SDK package

2. API Route
   - [ ] `POST /api/upload` route accepting `multipart/form-data`
   - [ ] Validate file type/size (images & MP4 only)
   - ✅ Upload to bucket; return public URL

3. Database
   - ✅ Extend `Vehicle` model with `media` relation/table
   - ✅ Prisma migration & generate client

4. Front-end Component
   - [ ] Create `MediaUploader` component (drag-and-drop)
   - [ ] Integrate into `ShowroomTools`
   - [ ] Show upload progress & error states

5. Slideshow Update
   - [ ] Fetch uploaded URLs via React Query
   - [ ] Update `MediaSlideshow` to display new media automatically

6. Security & Limits
   - [ ] Server-side validation & auth placeholder
   - [ ] File size limit (e.g., 25 MB)

7. Docs & Tests
   - [ ] Update README (env vars & usage)
   - [ ] Add API route unit tests

---

# Vehicle Scraper Debugging & Enhancement

> Focus on fixing and enhancing the vehicle scraper to extract data from the dealer website.

## Objectives
- Debug and fix vehicle link extraction from inventory pages
- Update selectors to match new HTML structure
- Enhance error handling and logging
- Ensure reliable data extraction for all vehicle fields

## Tasks
1. Vehicle Link Extraction
   - ✅ Analyze debug HTML to identify correct vehicle card structure
   - ✅ Update selectors for vehicle cards and links
   - ✅ Implement multi-method approach for link extraction
   - ✅ Add enhanced debugging and logging
   - ✅ Test and validate link extraction

2. Vehicle Detail Scraping
   - [ ] Review and update selectors for vehicle detail pages
   - [ ] Update data extraction logic for all required fields
   - [ ] Implement fallback methods for critical fields
   - [ ] Add field-specific error handling

3. Error Handling & Resilience
   - [ ] Implement retry logic for failed requests
   - [ ] Add timeout handling for slow pages
   - [ ] Create detailed error logging

4. Testing & Validation
   - [ ] Create test function for single vehicle scraping
   - [ ] Validate data integrity across multiple vehicle types
   - [ ] Add data schema validation

---

# Granular Plan — Section 3: Facebook API Integration for Posts & Marketplace

> Focus on implementing Facebook API integration for automatic posting of vehicles.

## Objectives
- Connect to Facebook Graph API for the dealership's page
- Enable automatic posting of new vehicles to Facebook Page
- Create Marketplace listings for vehicles
- Track engagement metrics

## Tasks
1. Facebook App Setup
   - [ ] Create Facebook Developer account and app
   - [ ] Configure app permissions and settings
   - [ ] Generate access tokens with appropriate scopes
   - [ ] Store credentials securely in environment variables

2. API Integration
   - [ ] Install Facebook Graph API SDK
   - [ ] Create service for Facebook API interactions
   - [ ] Implement authentication and token refresh logic
   - [ ] Add rate limiting and error handling

3. Page Post Creation
   - [ ] Design post template for vehicles
   - [ ] Implement function to create posts with vehicle details
   - [ ] Add media attachment support for vehicle images
   - [ ] Create scheduling options for posts

4. Marketplace Integration
   - [ ] Research Marketplace listing API requirements
   - [ ] Implement listing creation for vehicles
   - [ ] Map vehicle data to Marketplace fields
   - [ ] Add listing management (update/delete)

5. Engagement Tracking
   - [ ] Implement metrics collection for posts
   - [ ] Store engagement data in database
   - [ ] Create dashboard component for metrics display

6. Testing & Documentation
   - [ ] Create test suite for API interactions
   - [ ] Document API usage and limitations
   - [ ] Add error recovery procedures

## New Conversation Prompt

I need help continuing work on my Vehicle Vista project. We've successfully fixed the vehicle link extraction in the scraper, and now we need to update the vehicle detail scraping functionality. The HTML structure of the vehicle detail pages has changed, and we need to update the selectors and extraction logic in the `scrapeVehicle` function to match the new structure. We need to ensure all required vehicle data fields (stock number, make, model, year, price, mileage, color, VIN, trim, engine, transmission, body style, features, images, description, etc.) are correctly extracted from the detail pages. Please help me review and update the selectors and extraction logic in the `scrapeVehicle` function.

## Tasks
1. Storage Provider Setup
   - [ ] Set up AWS S3 bucket
   - [ ] Add AWS S3 credentials to `.env`
   - [ ] Install AWS S3 SDK package

2. API Route
   - [ ] `POST /api/upload` route accepting `multipart/form-data`
   - [ ] Validate file type/size (images & MP4 only)
   - [ ] Upload to S3 bucket; return public URL

3. Front-end Component
   - [ ] Create `FileUploader` component (drag-and-drop)
   - [ ] Integrate into `ShowroomTools`
   - [ ] Show upload progress & error states

4. Security & Limits
   - [ ] Server-side validation & auth placeholder
   - [ ] File size limit (e.g., 25 MB)

5. Docs & Tests
   - [ ] Update README (env vars & usage)
   - [ ] Add API route unit tests

---

@[/beginning-of-conversation]
We are on Section 2 of the master plan: File Upload & Media Management System.
Please help me implement the storage provider setup and the `/api/upload` route first, using AWS S3.
   - [ ] Update README with database setup instructions

---
# Session 2025-06-23 — Implementation Focus: S3 Setup & Upload API

## Objectives
- Configure AWS S3 bucket & credentials
- Implement backend `/api/upload` route handling multipart uploads
- Return public URL to uploaded media

## Subtasks
1. AWS Setup
   - [ ] Create `VEHICLE_MEDIA_BUCKET` manually in AWS console (out-of-scope)
   - ✅ Add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `VEHICLE_MEDIA_BUCKET` to `.env.example`
   - ✅ Install `@aws-sdk/client-s3`

2. Backend Route (`my-app/src/app/api/upload/route.ts`)
   - ✅ Parse multipart form (built-in FormData API)
   - ✅ Validate file type (`image/*`, `video/mp4`) and size ≤ 25 MB
   - ✅ Stream upload to S3 with `PutObjectCommand`
   - ✅ Generate public URL (`https://${bucket}.s3.${region}.amazonaws.com/${key}`)
   - ✅ Respond `{ url, key }`

3. Types & Helpers
   - ✅ Add `lib/s3.ts` factory returning configured S3Client

4. Tests
   - [ ] Unit-test helper with mocked S3 using `aws-sdk-client-mock`

## Notes
- Next.js route must enable `runtime: "nodejs"` to access filesystem.
- Max body size config: `export const config = { api: { bodyParser: false } }`.
- Use UUID v4 for key prefix.

Assumptions:
- Frontend integration will be handled in later subtasks.
- No role-based auth yet.

---
# Session 2025-06-23 – Progress on Section 2: File Upload & Media Management

## Completed Tasks
1. Slideshow Update
   - ✅ Created GET `/api/vehicles/:id/media` & `/api/media/general` endpoints
   - ✅ Updated `MediaSlideshow` to fetch vehicle + general media with SWR
   - ✅ Merged lists and added support for images/videos

2. Quality Polish
   - ✅ Fixed TypeScript enum import lint errors by creating proper types
   - ✅ Added `@/types` path alias for shared types
   - ✅ Fixed accessibility issues in MediaSlideshow
---
## New Conversation Prompt
```
We are continuing Section 2 of the master plan (File Upload & Media Management System).
Focus on:
1. Building the General Media Management UI:
   - Implementing backend routes for deleting and reordering media
   - Creating an admin page for listing, reordering, and deleting general media
   - Installing and configuring drag-and-drop functionality
2. Quality improvements:
   - Addressing remaining lint warnings
   - Writing unit tests for API routes and components
   - Updating documentation

Please help me implement these remaining tasks to complete Section 2.
```


