## Project Overview 
- **Stack:** Next.js 13 App Router (in `my-app/`), TypeScript, Tailwind (shadcn/ui). Uses Prisma (DB), AWS S3 for media, Upstash Redis for caching.

## Environment & Setup 
- **Env Vars:** AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, VEHICLE_MEDIA_BUCKET must be set (S3 uploads):contentReference[oaicite:19]{index=19}. Upstash Redis URL & TOKEN needed for caching:contentReference[oaicite:20]{index=20}.  
- **Directory:** Run all commands in `my-app/` (contains package.json).

## Testing & Validation 
- **Lint:** Run `npm run lint` and fix any issues before committing:contentReference[oaicite:21]{index=21}.  
- **Type Check:** Project must build with no TypeScript errors (`npm run build`).  
- **Tests:** Run `npm test` (Jest) – all tests must pass. Fix or update tests if needed:contentReference[oaicite:22]{index=22}.  

## Coding Conventions 
- **TypeScript:** Use strict typing; no `any` unless unavoidable.  
- **Components:** Follow existing patterns (use shadcn/UI components and Tailwind for styling). No inline styles; ensure responsive classes for mobile.  
- **State & Data:** Use SWR or React state as in existing code for data fetching and state management (e.g., see how `VehicleSelector` and `CustomerView` manage selected vehicle state).  
- **Logging:** Use `console.error`/`console.log` as seen in code (with emojis like 🔵/❌ for clarity in server logs).

## Feature Notes 
- **Media Upload:** Uploaded files go to S3. After uploading, call `redisService.cacheMedia` to save media metadata in Redis:contentReference[oaicite:23]{index=23}:contentReference[oaicite:24]{index=24}. Scraped vehicle images remain in `vehicle.images` array. The UI (slideshow/gallery) merges both: stock images plus any `Media` items for that vehicle.  
- **Customer Share Link:** Generating a link copies `${window.location.origin}/customer/{vehicleId}` to clipboard:contentReference[oaicite:25]{index=25}. The **CustomerView** page displays the vehicle’s details and an image carousel (using `selectedVehicle.images`):contentReference[oaicite:26]{index=26}:contentReference[oaicite:27]{index=27}. It also provides a dropdown to switch among all inventory vehicles:contentReference[oaicite:28]{index=28}. Only one vehicle ID is supported per share link (multi-vehicle sharing may come later).  
- **Known Issues:** *CustomerView* has some flashing/hydration issues and type errors to resolve – keep an eye on console warnings. Ensure no regressions on these fronts when modifying related code.
