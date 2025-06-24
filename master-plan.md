# Vehicle-Vista-Share Master Plan

This document outlines the high-level roadmap for the Vehicle Vista Share project.

---

### ✅ Section 1: Core Backend Setup & Media Management
- [x] Set up Next.js project structure.
- [x] Configure Prisma and connect to the database.
- [x] Implement AWS S3 integration for media storage.
- [x] Create `/api/upload` endpoint for handling file uploads to S3 and database record creation.
- [x] Create `/api/media` endpoints for reordering and deleting media.
- [x] Set up environment variables for AWS credentials and bucket configuration.

### ✅ Section 2: Robust Testing Environment
- [x] Install and configure Jest for a Next.js project.
- [x] Create a stable and reliable testing setup for S3 helper functions using manual mocks.
- [x] Successfully write and pass unit tests for `uploadBufferToS3` and `deleteObjectFromS3`.

### ✅ Section 3: API Endpoint Testing
- [x] Write unit/integration tests for the `/api/upload` endpoint.
- [x] Write unit/integration tests for the `/api/media/:id` (delete) endpoint.
- [x] Write unit/integration tests for the `/api/media/reorder` endpoint.
- [x] Mock Prisma and S3 dependencies for isolated API tests.

### ✅ Section 4: Frontend Development & UI/UX
- [x] Fix slideshow and vehicle display UI, including image scaling and data synchronization.
- [x] Resolve all type and hydration errors for a stable showroom view.
- [ ] Enhance `MediaUploader` component with better user feedback (e.g., progress bars, error messages).
- [ ] Develop a gallery view to display all media associated with a vehicle.
- [ ] Implement drag-and-drop reordering on the frontend.
- [ ] Write frontend component tests using React Testing Library.

### Section 5: Data Pipeline & Scraper Refinement (DEPRECATED)
> Note: This section was based on a misunderstanding. The scraper correctly saves image URLs to the `Vehicle.images` array. The `Media` table is only for manually uploaded content.
- [ ] Investigate and fix the scraper script to ensure it saves all vehicle images to the `Media` table.
- [ ] Verify that scraped media is correctly associated with the corresponding vehicle.
- [ ] Ensure the scraper handles new, existing, and sold vehicles gracefully without data loss.
