# 🧶 PurlWise

PurlWise is a beautiful, local-first, interactive knitting pattern tracking application. Built with a stunning glassmorphism aesthetic featuring textured knit backgrounds for both light and dark themes, it is designed to help makers keep their place in complex cable charts, track active stitches/rows, and annotate patterns effortlessly.

The project is packaged for **Windows Desktop** (using Electron) and **Android Mobile** (using Capacitor).

---

## ✨ Features

*   **📍 Interactive Row-Line Tracker:** A movable horizontal tracker line to highlight your current knitting chart row. Off by default and toggleable from the viewport toolbar.
*   **🔍 Magnifying Glass Chart Reader:** A smooth, magnifying glass overlay to enlarge intricate lace or cable grids.
*   **📊 Custom Counters & Sub-Counters:** Main row counter with interactive progress bar, plus the ability to add unlimited, named sub-counters for repeats, sleeve increases, or ribbing sections.
*   **🔖 Smart Page Bookmarks:** Quickly save pages in your PDF patterns. A floating **"← Back to Page X"** button automatically appears when jumping, allowing you to return to where you were with one click.
*   **🔄 Per-Page Rotation:** Rotate specific chart pages in 90-degree increments. Rotations are persisted per-page to accommodate wide horizontal lace sheets.
*   **📝 Coordinate-based Sticky Notes:** Double-click anywhere on the pattern wrapper to drop a cozy sticky note. Note coordinates scale and reposition automatically as you zoom and rotate.
*   **🧶 Integrated Yarn Stash:** Catalog and track your yarn inventory (by weight or skein count), allocate stash stock to specific projects, and easily view allocations in both the project dashboard and the workspace reader sidebar. Features 10 customizable sorting modes.
*   **💾 Local-First Storage:** Projects, PDFs/images, bookmarks, notes, and layout properties are saved locally using a robust IndexedDB database.
*   **🌓 Dark/Light Theme Memory:** The app remembers your preferred layout theme across sessions.
*   **📥 Migration & Backups:** Export all project progress, custom counters, bookmarks, and patterns into a single backup file to migrate onto another machine.

---

## 🛠️ Tech Stack

*   **Frontend Core:** HTML5, Vanilla CSS3, Javascript (ES6 Modules).
*   **PDF Engine:** [PDF.js](https://mozilla.github.io/pdf.js/) (integrated dynamically inside IndexedDB).
*   **Desktop Package:** Electron (v25).
*   **Mobile Engine:** Capacitor (v6).
*   **Local Database:** IndexedDB.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed.

### Installation

1. Clone or download the repository.
2. Open terminal in the root directory and install dependencies:
    ```bash
    npm install
    ```

### Running Locally (Electron Desktop)

To start the desktop app in development mode:
```bash
npm start
```

### Packaging Desktop App (Windows Executable)

To build a standalone Windows application package:
```bash
npm run package
```
The compiled build will be generated under `dist/PurlWise-win32-x64/`.

---

## 📱 Mobile Porting (Android)

PurlWise compiles into a native Android app using Capacitor. The mobile web assets are compiled inside `/www` to exclude desktop dependencies.

To sync and build the Android package:
1. Sync web assets:
    ```bash
    npx cap sync android
    ```
2. Build the debug APK (requires Android SDK and JDK 21+):
    ```bash
    # Move to the android directory
    cd android
    # Build using Gradle Wrapper
    ./gradlew.bat assembleDebug
    ```
The compiled package will be generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 📁 Project Structure

*   `index.html` - The main user interface.
*   `style.css` - Responsive typography, themes, and cozy glassmorphism component layouts.
*   `app.js` - Main application logic, including database orchestration, layout scaling, and notes management.
*   `assets/` - Contains UI assets such as the textured knitted background images and SVG masks.
*   `stash-manager.js` - Dedicated controller for the My Stash inventory, allocations, and UI wizard.
*   `pdf-viewer.js` - Helper interface for loading and scaling PDF pages.
*   `sample-pattern.js` - Base64 data provider for the quickstart knitting template.
*   `main.js` & `preload.js` - Electron desktop lifecycle and security bridge.
*   `www/` - Target web-assets build output for Capacitor.
*   `android/` - Generated native Android Studio configuration.
