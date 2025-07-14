# Granular Plan: UI Consolidation & Refactoring

This plan focuses on integrating disparate UI components into a single, cohesive showroom experience, cleaning up the codebase, and aligning with the core project vision.

---

## Phase 1: Analysis & Discovery (Current)

- [ ] List all major UI components in `src/components` to identify candidates for cleanup.
- [ ] Analyze the structure of `DiscordShowroom` to understand its current layout and functionality.
- [ ] Review `MediaUploader`, `MediaSlideshow`, `ShowroomTools`, and `VehicleSelector` to map out their props and intended use.
- [ ] Determine which components are actively used, which are redundant, and which are orphaned.

## Phase 2: Consolidation & Implementation

- [ ] Redesign the main showroom page (`DiscordShowroom` or a new component) to logically incorporate the necessary child components.
- [ ] Integrate `VehicleSelector` to drive the vehicle state for the entire page.
- [ ] Integrate `MediaSlideshow` to display images for the currently selected vehicle.
- [ ] Integrate `MediaUploader` to allow adding new media for that vehicle.
- [ ] Wire up the state management to ensure all components react to changes (e.g., selecting a new vehicle updates the slideshow and uploader context).

## Phase 3: Cleanup & Verification

- [ ] Remove or archive unused and orphaned components identified in Phase 1.
- [ ] Test the fully integrated showroom to ensure seamless functionality.
- [ ] Verify that the styling remains consistent and professional.
- [ ] Confirm that all core features (vehicle selection, slideshow, media upload) are working as expected.
