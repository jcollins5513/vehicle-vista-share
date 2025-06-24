# Granular Plan

---
### ✅ COMPLETED: Showroom UI Overhaul
- [x] Fixed all slideshow and vehicle display UI bugs.
- [x] Resolved all outstanding type and hydration errors.
- [x] Implemented a robust, centralized type system.
- [] Enhanced slideshow to filter stock photos and sync with vehicle details.

### ✅ COMPLETED: Section 4 - Frontend Development & UI/UX (Continued)

This plan details the remaining subtasks for implementing the frontend components and user experience for media management.

#### Subtasks:

1.  **Enhance `MediaUploader` Component:**
    -   [x] Add a visual progress bar to show upload progress.
    -   [x] Display clear success messages upon completion.
    -   [x] Show informative error messages if an upload fails.

2.  **Develop `MediaGallery` View:**
    -   [x] Implement logic to display all media (scraped images and custom uploads) associated with a vehicle.
    -   [x] Implement drag-and-drop reordering for custom media using a library like `react-beautiful-dnd`.
    -   [x] Call the `/api/media/reorder` endpoint to persist the new order.

3.  **Write Frontend Component Tests:**
    -   [ ] Set up React Testing Library with Jest.
    -   [ ] Write tests for the `MediaUploader` component.
    -   [ ] Write tests for the `MediaGallery` component.

---

### CURRENT: Customer Shareable Inventory Flow

#### Completed Work
- Customer shareable inventory flow is partially implemented

 

#### Remaining Tasks#### Next Session Focus: Customer Shareable Inventory Completion
# CUSTOMER VIEW #
- CustomerView needs to display a single-vehicle slideshow (starting with the shared vehicle) without reusing MediaSlideshow, but still allow browsing other inventory.
- SHOWROOM VIEW Vehicle selector on the showroom view needs to be able to select up to three vehicle to be included in the shareable link and share 1-3 vehicles and show remaining vehicles in the CUSTOMER VIEW as thumbnails if customer wants to select other vehicles but still only show 1 vehicle at a time in the CUSTOMER VIEW slideshow
- Created `/customer/[id]` page that needs to fetch the single vehicle that was shared from the showroom view as well as all vehicles with thumbnails
- SHOWROOM VIEW needs feature to select and share a specific vehicle
- VehicleSelector still has placeholder fallbacks that need removal
- TypeScript errors in Vehicle interface (status enum mismatch)
- Write frontend component tests using React Testing Library
- Added vehicle switching functionality in CustomerView
- CustomerView with image slideshow navigation
- Updated VehicleSelector to accept and use vehicles prop
- Enhanced slideshow to filter stock photos if they have the keywords ChromeColorMatch, RTT, Default, WHITE, they are stock photos, and do not need to be displayed and sync with vehicle details.
- Need to be able to delete manually loaded media from the showroom view.


- Implement ShowroomView share selection feature
- Remove placeholder fallbacks from VehicleSelector
- Fix Vehicle interface TypeScript errors
- Complete end-to-end testing of customer shareable flow
- Begin writing component tests

---

### New Conversation Prompt

Continue implementing the customer-facing vehicle share feature for Vehicle Vista. The main tasks are:

1. Add a share button/feature in ShowroomView to generate shareable links for specific vehicles
2. Remove placeholder fallbacks from VehicleSelector component
3. Fix TypeScript errors in the Vehicle interface (status enum mismatch)
4. Complete end-to-end testing of the customer shareable flow

The shareable link functionality should allow customers to view a specific vehicle and browse other inventory. The ShowroomView needs a UI element to generate these links, and the CustomerView component needs to properly display the shared vehicle without relying on placeholder data.
