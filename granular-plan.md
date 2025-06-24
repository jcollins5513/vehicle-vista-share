# Granular Plan

---
### ✅ COMPLETED: Showroom UI Overhaul
- [x] Fixed all slideshow and vehicle display UI bugs.
- [x] Resolved all outstanding type and hydration errors.
- [x] Implemented a robust, centralized type system.
- [x] Enhanced slideshow to filter stock photos and sync with vehicle details.
---

### CURRENT: Section 4 - Frontend Development & UI/UX (Continued)

This plan details the remaining subtasks for implementing the frontend components and user experience for media management.

#### Subtasks:

1.  **Enhance `MediaUploader` Component:**
    -   [ ] Add a visual progress bar to show upload progress.
    -   [ ] Display clear success messages upon completion.
    -   [ ] Show informative error messages if an upload fails.

2.  **Develop `MediaGallery` View:**
    -   [ ] Implement logic to display all media (scraped images and custom uploads) associated with a vehicle.
    -   [ ] Implement drag-and-drop reordering for custom media using a library like `react-beautiful-dnd`.
    -   [ ] Call the `/api/media/reorder` endpoint to persist the new order.

3.  **Write Frontend Component Tests:**
    -   [ ] Set up React Testing Library with Jest.
    -   [ ] Write tests for the `MediaUploader` component.
    -   [ ] Write tests for the `MediaGallery` component.

---

### New Conversation Prompt

Hello! Let's continue with the project.

We have successfully fixed the main showroom UI. According to our `master-plan.md`, the next step is to continue with frontend development. Please start by enhancing the `MediaUploader` component with better user feedback, as outlined in the new `granular-plan.md`.
