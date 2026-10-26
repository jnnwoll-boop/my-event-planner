# My Event Planner

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

Plain HTML, CSS, and JavaScript; no build step and no dependencies for the application. All three app files must stay together.

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
