# My Event Planner

For GitHub/Vercel deployment, see DEPLOYMENT.md; no ZIP download is required.

A private, free event planner. No accounts, API keys, subscriptions, external fonts, or internet requests. Nothing to install to open the app in a normal desktop browser.

## Open the app on your computer

1. Download `My-Event-Planner.zip` and extract/unzip it. Do not open the app from inside the ZIP.
2. Open the extracted `my-event-planner` folder.
3. Double-click `index.html`. If asked which program to use, choose Chrome, Edge, Firefox, or Safari.
4. Bookmark the page if you like. Keep the folder in the same location.

This cloud's managed browser blocks file pages, so automated tests used a local web server. Direct file opening depends on your browser's settings. If your browser blocks it or saved events do not survive reopening, use the fallback below. No software was installed during this project.

## Use it

- Click **Create event**, enter its name, date, location, guests, type, and budget, then **Save event**. Choose a template checklist or start empty. Templates are included for birthdays, graduations, holidays, and open houses.
- On the dashboard, click **Plan this event** to open an event. **Edit event** changes its details. **Delete event** asks before permanently removing it.
- **Food & drinks** lets you change hours, food portions per guest per hour, drinks per guest per hour, and extra allowance. Click **Update estimate** to save. Results round up to whole servings. The formula is shown in the app.
- **Shopping list** accepts an item, quantity, and unit price. Edit quantities or prices directly. Check **Bought** when purchased. Update prices to match receipts. Remove items with **Remove**.
- **Overview** shows your budget, planned spending (all shopping items), actual spending (purchased shopping items), and money remaining. Add non-food expenses such as venue rental to shopping too.
- **Preparation** lets you add tasks and due dates, check tasks off, edit them, or remove them. Template tasks are editable. Changing an event's type later preserves its existing checklist.

## Keep your data safe

Your events save automatically in this browser on this computer. There is no online copy or sync. Private/incognito browsing, clearing browser data, changing browsers, moving the app folder, or changing the address used to open it can make saved events unavailable. Browser storage restrictions or a full disk can prevent saving; the app warns you when it detects a problem.

Click **Export backup** regularly. A file named `my-event-planner-backup.json` goes to your browser's download folder. Keep it somewhere safe. To restore it, click **Import backup**, select that file, and confirm. Import replaces all current events; export your current data first if you want to keep it. Invalid backups are rejected without changing events. Backups contain your event details in plain text, so share them carefully.

## Local-server fallback (only if Python is already installed)

You do not need this for normal file opening. Do not install Python unless you choose to do so.

1. Open a terminal/command prompt in the extracted app folder (Windows: open the folder, type `cmd` in File Explorer's address bar, and press Enter; macOS: use Terminal and change to this folder).
2. Windows: run `py -m http.server 8000 --bind 127.0.0.1`. macOS/Linux: run `python3 -m http.server 8000 --bind 127.0.0.1`.
3. In your browser, type `http://127.0.0.1:8000` in the address bar. Keep the terminal open while using the app. Press Ctrl+C in the terminal when finished.
4. Use that same address and browser each time. File mode and server mode have separate storage; export and import a backup when switching.

If Python isn't available and file opening doesn't work, ask for help before installing anything.

## Development and validation

The app remains plain HTML, CSS, and JavaScript with no runtime dependencies. Vite is a development/build dependency for Vercel. Use Node.js 24, run `npm ci --include=dev`, then `npm run build`. Publish `dist`. Keep all generated app files together.

Existing cloud tools: Node, Python, Chromium, and Playwright. To repeat the browser checks, start the local server above, then run `node tests/browser.cjs` in this cloud checkout. The test uses the cloud's preinstalled Playwright/Chromium and localhost port 8000. It does not install software. Tests cover event CRUD, templates, adjustable estimates, spending, task editing, persistence on reload, exported backup contents, restored backups, invalid imports, mobile overflow, and browser errors. File-URL behavior on a personal computer remains unverified.

## iPhone Home Screen app (after HTTPS publication)

The new version includes a PWA manifest, Apple touch icon, standalone app display, safe-area spacing, touch-friendly controls, and offline app files. Desktop use still works. Downloading the ZIP to your iPhone does not install the PWA; it first needs a published HTTPS website. See DEPLOYMENT.md for the prepared deployment checklist. Nothing has been published yet.

1. Open the published website in **Safari** on your iPhone.
2. Tap **Share** (the square with an upward arrow; its location varies with iOS).
3. Choose **Add to Home Screen**. If necessary scroll through the action list. If shown, turn on **Open as Web App**.
4. Tap **Add**. Find the green calendar icon on your Home Screen and open it.
5. Open it online once and let it finish loading before using it offline. **Install app** inside the planner includes these instructions and offline readiness status.

Your desktop events do not automatically appear on your iPhone. Export a backup on desktop, transfer the JSON file to your iPhone using your preferred method, then choose **Import backup** in the Home Screen app and select it from Files. Export from the Home Screen app regularly; use Safari's download/save options to keep a copy in Files. Import replaces current events after confirmation.

The Home Screen app and Safari may use separate storage depending on iOS. Export before switching, and import if needed. Keep the published website address stable. Clearing website data or removing the app may remove events. There is no cloud sync yet.

For updates, finish editing, close all planner windows (including Safari tabs for it), and reopen while online. The app reports when an update is waiting. Event storage is kept through application cache updates.

Additional cloud validation: with the local server running, `node tests/pwa.cjs` checks the manifest, icon dimensions, install instructions, all event sections at widths 320–1280px, 44px touch targets, and offline reload/edit/save/export. This is Chromium emulation; physical iPhone/Safari verification is still needed after publishing.


## Inspiration Board / Ideas

Open an event, then tap **Ideas**. Under **Add photos**, choose one or several photos from your iPhone photo library or computer. Each event has a separate gallery. Enter a short caption (up to 240 characters), choose Decor, Food, Cake, Invitations, Colors, Outfits, or Other, and tap **Save details**. **Delete photo** asks for confirmation and removes the photo and its note. Images are part of the existing event backup export/import, and older backups still import normally.

Photos are processed on your device, not sent to a server. Originals up to 20 MB and 50 megapixels are accepted if your browser can decode them. Saved copies are resized to at most 1,000 pixels on the longest side and compressed to JPEG (at most about 135 KB of JPEG data per photo). Keep original-quality photos separately. JPEG, PNG, and WebP generally work; HEIC support depends on the browser—if it fails, export a JPEG and choose that instead. Transparent backgrounds become white; animated images become still images.

Browser storage is limited: localStorage commonly allows roughly 5 MB per site, with variations by browser. This version uses a conservative limit of 1.8 million characters for the entire planner snapshot when adding photos (about 3.6 MB in UTF-16, including all events and photo data). It also caps each event at 100 photos, but the shared storage budget will usually be reached sooner. The actual number depends on image detail and your other planner data. Storage can fail earlier; the app reports failures and rolls back failed photo additions, edits, or deletions. Export a backup before deleting photos or clearing browser data. A backup is a separate copy and does not itself free space.

For a larger local-only collection, IndexedDB would provide a better browser image store. For a larger library shared across devices, the next cloud upgrade would be **private object storage** (for example, Supabase Storage) plus a database for event/photo metadata, authentication, access rules, and explicit synchronization. Photos should live as files in object storage rather than base64 text in event records. That upgrade needs a separate design and your permission to use an external service; none is connected now.

The Ideas board works offline after the app has updated online. If you do not see **Ideas**, finish editing, close all planner windows and Home Screen instances, then reopen online to activate the new PWA version. Existing events remain stored.

Feature checks: `TEST_BASE_URL=http://127.0.0.1:8001/ node tests/ideas.cjs` against the production preview verifies photo compression, captions/categories, deletion, event separation, storage failure rollback, unsupported photos, backup compatibility, offline photos, and responsive/touch layouts. These are Chromium/iPhone-emulation checks, not physical iPhone/Safari checks.


## Detailed Task Planner and subtasks

In an event, open **Preparation** to find the **Task Planner**. All previous checklist tasks appear as main tasks; their titles, dates, and completion status are kept.

- Enter a main task title (for example, Entry Table Setup) and optional due date, then tap **Add task**.
- Tap **Edit** on a task to change its title, notes/instructions, due date, completion checkbox, and photos. Notes can hold measurements, supplies, instructions, and up to 10,000 characters. Tap **Save task** to keep changes; closing the editor cancels unsaved changes.
- Tap **+ Add subtask**, enter a title such as Welcome sign, Basket, Camera, or Sign-in book, and save. Subtasks have the same notes, date, completion, and photo fields as main tasks. This planner supports main tasks plus one level of subtasks.
- Use **↑ Up** and **↓ Down** to reorder within the main list or within a main task’s subtasks. No dragging is needed. **Duplicate** inserts a copy after the original, keeping notes, dates, and photo links. Main-task copies include their subtasks with new IDs; all copied completion checkboxes reset to unchecked.
- **Hide subtasks** / **Show subtasks** keeps the view manageable. This preference and task order are saved. Each main task shows completed-subtask count and percentage. Its own checkbox is independent: finishing all subtasks does not automatically check the main task.
- In **Edit**, check several Inspiration Gallery photos to attach them. A photo can be linked to many tasks without storing extra image copies. **Upload new photos** adds compressed photos to the event gallery and links them to this task when saved. Closing without saving does not upload them to the gallery.
- Tap an attached thumbnail to enlarge it. Tap **Unlink** to remove a task’s attachment while keeping the gallery photo and its other links. Deleting a task also keeps gallery photos. Deleting a photo from **Ideas** removes that original and its links from every task, after confirmation.
- **Delete** on a main task removes its subtasks too, after confirmation. Subtask deletion affects only that subtask.

All notes, subtasks, completion states, order, collapse preferences, gallery photos, and photo links stay in browser storage and are included in **Export backup**. Import checks relationships and rejects broken photo references. Older backups without these optional task fields remain supported. Browser/image limits are unchanged; keep backups regularly. No cloud account or new service is needed.

After deployment, reopen online and let the PWA update (close old planner windows if an update is waiting). Do not clear browser storage to update. Physical iPhone/Safari behavior should still be checked; cloud tests use Chromium with iPhone emulation.

Task tests: `TEST_BASE_URL=http://127.0.0.1:8001/ node tests/tasks.cjs` against the production preview. They cover main-task/subtask creation/editing/completion/deletion, progress, order, duplication, shared photo selection, direct uploads, enlargement/unlinking, gallery deletion cleanup, storage failures, responsive layouts, offline backup restoration, and invalid photo relationships.
