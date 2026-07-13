/**
 * app.js
 * Core controller for the PurlWise progress tracking application.
 * Manages database, state, rendering, user interactions, audio synthesis, and toolkits.
 */
// ----------------------------------------------------
// 0. CUSTOM ELECTRON COMPATIBLE DIALOGS (Confirm & Prompt)
// ----------------------------------------------------
const Dialogs = {
  confirm(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active';
      overlay.style.zIndex = '1000';
      
      overlay.innerHTML = `
        <div class="modal-card" style="max-width: 400px; padding: 24px; text-align: center; border-radius: var(--radius-md);">
          <h3 style="margin-bottom: 12px; font-family: var(--font-sans); font-weight: 600; font-size: 1.25rem;">Confirm Action</h3>
          <p style="margin-bottom: 24px; font-size: 0.95rem; color: var(--color-text-muted); line-height: 1.5;">${message}</p>
          <div style="display: flex; justify-content: center; gap: 12px;">
            <button class="btn btn-secondary" id="confirm-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="confirm-ok-btn" style="background-color: var(--color-danger); border-color: var(--color-danger); box-shadow: 0 4px 12px rgba(178,88,88,0.2);">Confirm</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      overlay.querySelector('#confirm-cancel-btn').onclick = () => {
        overlay.remove();
        resolve(false);
      };
      
      overlay.querySelector('#confirm-ok-btn').onclick = () => {
        overlay.remove();
        resolve(true);
      };
    });
  },
  
  prompt(message, defaultValue = '') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active';
      overlay.style.zIndex = '1000';
      
      overlay.innerHTML = `
        <div class="modal-card" style="max-width: 400px; padding: 24px; border-radius: var(--radius-md);">
          <h3 style="margin-bottom: 12px; font-family: var(--font-sans); font-weight: 600; font-size: 1.25rem;">Input Required</h3>
          <p style="margin-bottom: 12px; font-size: 0.95rem; color: var(--color-text-muted);">${message}</p>
          <input type="text" id="prompt-input-field" value="${defaultValue}" style="width: 100%; margin-bottom: 20px; box-sizing: border-box;" autocomplete="off">
          <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <button class="btn btn-secondary" id="prompt-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="prompt-ok-btn">OK</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      const input = overlay.querySelector('#prompt-input-field');
      input.focus();
      input.select();
      
      input.onkeydown = (e) => {
        if (this.dom.focusControllerWidget) {
          this.dom.focusControllerWidget.classList.remove('hidden');
          this.dom.focusControllerWidget.classList.remove('minimized');
        }
        if (this.dom.focusBookmarksWidget && this.activeProject && this.activeProject.bookmarks && this.activeProject.bookmarks.length > 0) {
          this.dom.focusBookmarksWidget.classList.remove('hidden');
          this.dom.focusBookmarksWidget.classList.remove('minimized');
        }
        if (this.dom.focusNotesWidget && this.activeProject && this.activeProject.notes) {
          this.dom.focusNotesWidget.classList.remove('hidden');
          this.dom.focusNotesWidget.classList.remove('minimized');
        }};

      overlay.querySelector('#prompt-cancel-btn').onclick = () => {
        overlay.remove();
        resolve(null);
      };
      
      overlay.querySelector('#prompt-ok-btn').onclick = () => {
        overlay.remove();
        resolve(input.value.trim());
      };
    });
  },

  alert(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active';
      overlay.style.zIndex = '1000';
      
      overlay.innerHTML = `
        <div class="modal-card" style="max-width: 400px; padding: 24px; text-align: center; border-radius: var(--radius-md);">
          <h3 style="margin-bottom: 12px; font-family: var(--font-sans); font-weight: 600; font-size: 1.25rem;">Notification</h3>
          <p style="margin-bottom: 24px; font-size: 0.95rem; color: var(--color-text-muted); line-height: 1.5;">${message}</p>
          <div style="display: flex; justify-content: center;">
            <button class="btn btn-primary" id="alert-ok-btn" style="width: 100px;">OK</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      overlay.querySelector('#alert-ok-btn').onclick = () => {
        overlay.remove();
        resolve();
      };
    });
  }
};

// ----------------------------------------------------
// 1. INDEXEDDB MANAGER (LOCAL STORAGE OF IMAGES/PDFs)
// ----------------------------------------------------
const DBManager = {
  dbName: 'PurlWiseDB',
  dbVersion: 2,
  db: null,

  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error('Database error:', event.target.error);
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('stash')) {
          db.createObjectStore('stash', { keyPath: 'id' });
        }
      };
    });
  },

  getAllProjects() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  saveProject(project) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      const request = store.put(project);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  deleteProject(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  getAllStash() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['stash'], 'readonly');
      const store = transaction.objectStore('stash');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  saveStash(stashItem) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['stash'], 'readwrite');
      const store = transaction.objectStore('stash');
      const request = store.put(stashItem);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  deleteStash(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['stash'], 'readwrite');
      const store = transaction.objectStore('stash');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async migrateFromLegacyKnitFlow() {
    try {
      // Check if PurlWiseDB already has projects, if so, skip migration
      const currentProjects = await this.getAllProjects();
      if (currentProjects.length > 0) return;

      const legacyProjects = await new Promise((resolve, reject) => {
        const req = indexedDB.open('KnitFlowDB', 1);
        
        req.onupgradeneeded = (e) => {
          // KnitFlowDB doesn't exist, abort to avoid creating an empty DB
          e.target.transaction.abort();
          resolve([]);
        };

        req.onerror = (e) => {
          resolve([]);
        };

        req.onsuccess = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('projects')) {
            db.close();
            resolve([]);
            return;
          }
          const tx = db.transaction(['projects'], 'readonly');
          const store = tx.objectStore('projects');
          const getAllReq = store.getAll();
          getAllReq.onsuccess = () => {
            db.close();
            resolve(getAllReq.result);
          };
          getAllReq.onerror = () => {
            db.close();
            reject(getAllReq.error);
          };
        };
      });

      if (legacyProjects && legacyProjects.length > 0) {
        console.log(`Migrating ${legacyProjects.length} projects from KnitFlowDB to PurlWiseDB...`);
        for (const proj of legacyProjects) {
          await this.saveProject(proj);
        }
      }
    } catch (e) {
      console.warn('Legacy DB migration failed or not applicable', e);
    }
  }
};

// ----------------------------------------------------
// 2. COZY AUDIO CLICK SYNTHESIZER (Web Audio API)
// ----------------------------------------------------
const AudioSynth = {
  audioCtx: null,
  soundEnabled: true,

  init() {
    // Lazy initialize on first interaction
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  playWoodClick() {
    if (!this.soundEnabled) return;
    this.init();
    
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const now = this.audioCtx.currentTime;
    
    // Create nodes
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    // Wood block configuration
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.04);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    // Fast wood tap volume envelope
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    // Connect nodes
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);

    // Play
    osc.start(now);
    osc.stop(now + 0.06);
  }
};

// ----------------------------------------------------
// 3. STITCH DICTIONARY DATA
// ----------------------------------------------------
const STITCH_DICTIONARY = [
  { name: 'Knit', abbr: 'k', desc: 'The basic foundational stitch of knitting. Insert right needle from front to back through loop, wrap yarn around, and pull through.', inst: 'Knit stitch (Stockinette: knit on RS, purl on WS).' },
  { name: 'Purl', abbr: 'p', desc: 'The reverse of a knit stitch. Insert needle from back to front, wrap yarn over top, and push loop through to back.', inst: 'Purl stitch.' },
  { name: 'Yarn Over', abbr: 'yo', desc: 'An increase stitch that creates an decorative open eyelet hole. Wrap yarn once completely around the right-hand needle before working the next stitch.', inst: 'Yo (Adds 1 stitch).' },
  { name: 'Slip Slip Knit', abbr: 'ssk', desc: 'A left-leaning decrease stitch. Slip next 2 stitches knitwise one-at-a-time, insert left needle into front of these two loops, and knit them together.', inst: 'ssk (Decreases 1 stitch).' },
  { name: 'Knit 2 Together', abbr: 'k2tog', desc: 'A right-leaning decrease stitch. Insert right needle through the next 2 stitches on left needle simultaneously, wrap yarn, and knit together.', inst: 'k2tog (Decreases 1 stitch).' },
  { name: 'Slip 1, Knit 2 Together, Pass Slipped Stitch Over', abbr: 'sl1-k2tog-psso', desc: 'A double decrease stitch. Slip 1 stitch knitwise, knit next 2 stitches together, then lift the slipped stitch up and off the needle over the k2tog stitch.', inst: 'sl1-k2tog-psso (Decreases 2 stitches).' },
  { name: '1/1 Right Cable', abbr: '1/1 RC', desc: 'A basic cable crossing. Slip next stitch to a cable needle and hold it in the back, knit 1 stitch from left needle, then knit the stitch from the cable needle.', inst: 'Slip 1 to cable needle at back, K1, K1 from cable needle.' },
  { name: '1/1 Left Cable', abbr: '1/1 LC', desc: 'A basic cable crossing. Slip next stitch to a cable needle and hold it in the front, knit 1 stitch from left needle, then knit the stitch from the cable needle.', inst: 'Slip 1 to cable needle at front, K1, K1 from cable needle.' }
];

// ----------------------------------------------------
// 4. MAIN APP STATE & CONTROLLER
// ----------------------------------------------------
const App = {
  projects: [],
  activeProject: null,
  activeView: 'dashboard',
  
  // Render scaling & position tracking
  zoomLevel: 100, // percentage
  patternImage: null, // Holds HTMLImageElement if pattern is image
  isDraggingTracker: false,
  dragStartY: 0,
  dragStartTrackerY: 0,

  // Tool activation
  isLineTrackerActive: false,
  isFocusModeActive: false,
  lastPageBeforeJump: null,
  wakeLockEnabled: false,
  wakeLockRef: null,

  // Temporary file hold during creation
  loadedFileData: null,
  loadedFileName: '',
  loadedFileType: '',

  async init() {
    this.cacheDOM();
    this.bindEvents();
    this.initTheme();
    this.initWakeLock();
    
    // Initialize DB & load projects
    try {
      await DBManager.init();
      await DBManager.migrateFromLegacyKnitFlow();
      await this.loadAllProjectsFromDB();
    } catch (err) {
      alert('Could not initialize local database. App will run in memory-only mode.');
    }
    
    this.renderProjectsGrid();
    this.renderStitchDictionary();
  },

  cacheDOM() {
    this.dom = {
      // Views
      viewDashboard: document.getElementById('view-dashboard'),
      viewWorkspace: document.getElementById('view-workspace'),
      
      // Global controls
      themeSelector: document.getElementById('theme-selector'),
      btnWakelockToggle: document.getElementById('btn-wakelock-toggle'),
      wakelockIconOn: document.getElementById('wakelock-icon-on'),
      wakelockIconOff: document.getElementById('wakelock-icon-off'),
      
      btnFocusWakelockToggle: document.getElementById('btn-focus-wakelock-toggle'),
      focusWakelockIconOn: document.getElementById('focus-wakelock-icon-on'),
      focusWakelockIconOff: document.getElementById('focus-wakelock-icon-off'),

      btnSoundToggle: document.getElementById('btn-sound-toggle'),
      soundIconOn: document.getElementById('sound-icon-on'),
      soundIconOff: document.getElementById('sound-icon-off'),
      btnToolkit: document.getElementById('btn-toolkit'),

      // Dashboard View
      projectsGrid: document.getElementById('projects-grid'),
      emptyState: document.getElementById('empty-state'),
      btnCreateProject: document.getElementById('btn-create-project'),
      btnQuickstart: document.getElementById('btn-quickstart'),
      statActiveCount: document.getElementById('stat-active-count'),
      statStitchCount: document.getElementById('stat-stitch-count'),
      statCompletedCount: document.getElementById('stat-completed-count'),

      // Workspace View
      btnBackDashboard: document.getElementById('btn-back-dashboard'),
      projTitle: document.getElementById('workspace-project-title'),
      projCategory: document.getElementById('workspace-project-category'),
      projPageMeta: document.getElementById('workspace-project-page'),
      btnDeleteProject: document.getElementById('btn-delete-project'),      
      // Sidebar counters
      countRowValue: document.getElementById('count-row-value'),
      btnRowMinus: document.getElementById('btn-row-minus'),
      btnRowPlus: document.getElementById('btn-row-plus'),
      btnResetRows: document.getElementById('btn-reset-rows'),
      rowProgressFill: document.getElementById('row-progress-fill'),
      rowProgressText: document.getElementById('row-progress-text'),
      btnSetRowTarget: document.getElementById('btn-set-row-target'),
      
      countStitchValue: document.getElementById('count-stitch-value'),
      btnStitchMinus: document.getElementById('btn-stitch-minus'),
      btnStitchPlus: document.getElementById('btn-stitch-plus'),
      btnResetStitches: document.getElementById('btn-reset-stitches'),
      stitchPerRowText: document.getElementById('stitch-per-row-text'),

      // Sub-counters
      subcountersContainer: document.getElementById('subcounters-container'),
      btnAddSubcounter: document.getElementById('btn-add-subcounter'),
      bookmarksListContainer: document.getElementById('bookmarks-list-container'),

      // Notes
      notesLogContainer: document.getElementById('notes-log-container'),
      btnAddSticky: document.getElementById('btn-add-sticky'),

      // Viewport & Workspace Canvas
      btnBackToProjects: document.getElementById('btn-back-to-projects'),
      btnPrevPage: document.getElementById('btn-prev-page'),
      btnNextPage: document.getElementById('btn-next-page'),
      pageIndicator: document.getElementById('page-indicator'),
      btnZoomOut: document.getElementById('btn-zoom-out'),
      btnZoomIn: document.getElementById('btn-zoom-in'),
      zoomValue: document.getElementById('zoom-value'),
      btnToggleTrackerLine: document.getElementById('btn-toggle-tracker-line'),
      btnToggleFocus: document.getElementById('btn-toggle-focus'),
      btnBookmarkPage: document.getElementById('btn-bookmark-page'),
      btnJumpBack: document.getElementById('btn-jump-back'),
      btnRotatePage: document.getElementById('btn-rotate-page'),

      interactiveContainer: document.getElementById('interactive-container'),
      focusBottomBar: document.getElementById('focus-bottom-bar'),
      focusLeftDrawer: document.getElementById('focus-left-drawer'),
      btnFocusDrawerToggle: document.getElementById('btn-focus-drawer-toggle'),
      btnFocusDrawerClose: document.getElementById('btn-focus-drawer-close'),
      btnFocusExpandSubcounters: document.getElementById('btn-focus-expand-subcounters'),
      focusRowValue: document.getElementById('focus-row-value'),
      btnFocusRowMinus: document.getElementById('btn-focus-row-minus'),
      btnFocusRowPlus: document.getElementById('btn-focus-row-plus'),
      focusStitchValue: document.getElementById('focus-stitch-value'),
      btnFocusStitchMinus: document.getElementById('btn-focus-stitch-minus'),
      btnFocusStitchPlus: document.getElementById('btn-focus-stitch-plus'),
      focusBookmarksListContainer: document.getElementById('focus-bookmarks-list-container'),
      focusNotesLogContainer: document.getElementById('focus-notes-log-container'),
      btnFocusAddSticky: document.getElementById('btn-focus-add-sticky'),
      focusSubcountersContainer: document.getElementById('focus-subcounters-container'),
      patternWrapper: document.getElementById('pattern-wrapper'),
      patternCanvas: document.getElementById('pattern-canvas'),
      annotationsOverlay: document.getElementById('annotations-overlay'),
      rowTrackerLine: document.getElementById('row-tracker-line'),
      trackerRowNum: document.getElementById('tracker-row-num'),
      trackerBtnOpacity: document.getElementById('tracker-btn-opacity'),
      trackerBtnColor: document.getElementById('tracker-btn-color'),
      trackerBtnSize: document.getElementById('tracker-btn-size'),

      // Project Modal
      modalProject: document.getElementById('modal-project'),
      projectForm: document.getElementById('project-form'),
      btnCloseProjectModal: document.getElementById('btn-close-project-modal'),
      btnCancelProject: document.getElementById('btn-cancel-project'),
      patternFileInput: document.getElementById('pattern-file'),
      uploadBox: document.getElementById('upload-box'),
      fileSelectedIndicator: document.getElementById('file-selected-indicator'),
      selectedFileName: document.getElementById('selected-file-name'),
      btnClearFile: document.getElementById('btn-clear-file'),
      btnBrowseFile: document.getElementById('btn-browse-file'),

      // Toolkit Drawer
      toolkitDrawer: document.getElementById('toolkit-drawer'),
      btnCloseToolkit: document.getElementById('btn-close-toolkit'),
      tabBtnGauge: document.getElementById('tab-btn-gauge'),
      tabBtnDictionary: document.getElementById('tab-btn-dictionary'),
      tabBtnBackup: document.getElementById('tab-btn-backup'),
      tabContentGauge: document.getElementById('tab-content-gauge'),
      tabContentDictionary: document.getElementById('tab-content-dictionary'),
      tabContentBackup: document.getElementById('tab-content-backup'),
      btnExportBackup: document.getElementById('btn-export-backup'),
      btnImportBackup: document.getElementById('btn-import-backup'),
      backupFileInput: document.getElementById('backup-file-input'),
      
      // Gauge Calc
      gaugeSwatchSts: document.getElementById('gauge-swatch-sts'),
      gaugeSwatchW: document.getElementById('gauge-swatch-w'),
      gaugeSwatchRows: document.getElementById('gauge-swatch-rows'),
      gaugeSwatchH: document.getElementById('gauge-swatch-h'),
      gaugeTargetW: document.getElementById('gauge-target-w'),
      gaugeTargetH: document.getElementById('gauge-target-h'),
      btnCalculateGauge: document.getElementById('btn-calculate-gauge'),
      gaugeResults: document.getElementById('gauge-results'),
      resCastOn: document.getElementById('res-cast-on'),
      resTotalRows: document.getElementById('res-total-rows'),

      // Stitch Dictionary
      stitchSearch: document.getElementById('stitch-search'),
      stitchList: document.getElementById('stitch-list')
    };
  },

  bindEvents() {
    // Theme Selector
    if (this.dom.themeSelector) {
      this.dom.themeSelector.addEventListener('change', (e) => this.changeTheme(e.target.value));
    }
    
    // Wake Lock Toggle
    if (this.dom.btnWakelockToggle) {
      this.dom.btnWakelockToggle.addEventListener('click', () => this.toggleWakeLock());
    }
    if (this.dom.btnFocusWakelockToggle) {
      this.dom.btnFocusWakelockToggle.addEventListener('click', () => this.toggleWakeLock());
    }

    // Wake Lock visibility change listener
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    
    // Sound Toggle
    this.dom.btnSoundToggle.addEventListener('click', () => this.toggleSound());

    // Project Modals
    this.dom.btnCreateProject.addEventListener('click', () => this.showProjectModal(true));
    this.dom.btnCancelProject.addEventListener('click', () => this.showProjectModal(false));
    this.dom.btnCloseProjectModal.addEventListener('click', () => this.showProjectModal(false));
    this.dom.projectForm.addEventListener('submit', (e) => this.handleProjectSubmit(e));
    
    // Pattern Source Radio toggle styling
    const sourceRadios = this.dom.projectForm.querySelectorAll('input[name="pattern-source"]');
    sourceRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const uploadSection = document.getElementById('file-upload-section');
        const cards = this.dom.projectForm.querySelectorAll('.source-card');
        cards.forEach(c => c.classList.remove('active-source'));
        
        radio.closest('.source-card').classList.add('active-source');
        
        if (e.target.value === 'upload') {
          uploadSection.classList.remove('hidden');
          this.dom.patternFileInput.required = !this.loadedFileData;
        } else {
          uploadSection.classList.add('hidden');
          this.dom.patternFileInput.required = false;
        }
      });
    });

    // File Drag & Drop
    const uploadBox = this.dom.uploadBox;
    uploadBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadBox.style.borderColor = 'var(--color-accent)';
    });
    uploadBox.addEventListener('dragleave', () => {
      uploadBox.style.borderColor = 'var(--color-border)';
    });
    uploadBox.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadBox.style.borderColor = 'var(--color-border)';
      if (e.dataTransfer.files.length > 0) {
        this.processPatternFile(e.dataTransfer.files[0]);
      }
    });

    this.dom.btnBrowseFile.addEventListener('click', () => this.dom.patternFileInput.click());
    this.dom.patternFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.processPatternFile(e.target.files[0]);
      }
    });
    this.dom.btnClearFile.addEventListener('click', () => this.clearLoadedFile());

    // Load Quickstart Sample
    this.dom.btnQuickstart.addEventListener('click', () => this.loadQuickstartSample());

    // Navigation Back to Dashboard
    this.dom.btnBackDashboard.addEventListener('click', () => this.exitWorkspace());

    // Row counters
    this.dom.btnRowPlus.addEventListener('click', () => this.adjustRow(1));
    this.dom.btnRowMinus.addEventListener('click', () => this.adjustRow(-1));
    this.dom.btnResetRows.addEventListener('click', async () => {
      const ok = await Dialogs.confirm('Reset row counter back to Row 1?');
      if (ok) this.setRow(1);
    });
    this.dom.btnSetRowTarget.addEventListener('click', () => this.promptNewRowTarget());

    // Stitch counters
    this.dom.btnStitchPlus.addEventListener('click', () => this.adjustStitch(1));
    this.dom.btnStitchMinus.addEventListener('click', () => this.adjustStitch(-1));
    this.dom.btnResetStitches.addEventListener('click', () => this.setStitch(0));

    // Sub-counters addition
    this.dom.btnAddSubcounter.addEventListener('click', () => this.promptCreateSubcounter());

    // Delete Project



    // Bookmarks and Rotation
    this.dom.btnBookmarkPage.addEventListener('click', () => this.toggleBookmark());
    this.dom.btnJumpBack.addEventListener('click', () => this.jumpBack());
    this.dom.btnRotatePage.addEventListener('click', () => this.rotatePage());

    // Toolbar Viewport Controls
    if (this.dom.btnBackToProjects) {
      this.dom.btnBackToProjects.addEventListener('click', () => {
        if (this.isFocusModeActive) {
          this.toggleFocusMode();
        }
        this.exitWorkspace(false);
      });
    }
    this.dom.btnPrevPage.addEventListener('click', () => this.changePage(-1));
    this.dom.btnNextPage.addEventListener('click', () => this.changePage(1));
    this.dom.btnZoomIn.addEventListener('click', () => this.adjustZoom(10));
    this.dom.btnZoomOut.addEventListener('click', () => this.adjustZoom(-10));
    
    // Tracker switches
    this.dom.btnToggleTrackerLine.addEventListener('click', () => this.toggleTrackerLineTool());
    
    // Focus Mode switches & adjusters
    this.dom.btnToggleFocus.addEventListener('click', () => this.toggleFocusMode());
    this.dom.btnFocusRowMinus.addEventListener('click', () => this.adjustRow(-1));
    this.dom.btnFocusRowPlus.addEventListener('click', () => this.adjustRow(1));
    this.dom.btnFocusStitchMinus.addEventListener('click', () => this.adjustStitch(-1));
    this.dom.btnFocusStitchPlus.addEventListener('click', () => this.adjustStitch(1));
    
    // Notes quick action in focus widget
    this.dom.btnFocusAddSticky.addEventListener('click', () => {
      this.placeStickyNoteAtCenter();
    });

    // Focus UI drawer & bottom bar toggle logic
    if (this.dom.btnFocusDrawerToggle) {
      this.dom.btnFocusDrawerToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dom.focusLeftDrawer.classList.remove('hidden');
      });
    }

    if (this.dom.btnFocusDrawerClose) {
      this.dom.btnFocusDrawerClose.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dom.focusLeftDrawer.classList.add('hidden');
      });
    }

    if (this.dom.btnFocusExpandSubcounters) {
      this.dom.btnFocusExpandSubcounters.addEventListener('click', () => {
        const expanded = this.dom.btnFocusExpandSubcounters.classList.toggle('expanded');
        if (this.dom.focusSubcountersContainer) {
          if (expanded) {
            this.dom.focusSubcountersContainer.classList.add('expanded');
          } else {
            this.dom.focusSubcountersContainer.classList.remove('expanded');
          }
        }
      });
    }

    // Optional: click outside to close left drawer
    document.addEventListener('click', (e) => {
      if (this.isFocusModeActive && this.dom.focusLeftDrawer && !this.dom.focusLeftDrawer.classList.contains('hidden')) {
        const isOutsideDrawer = !this.dom.focusLeftDrawer.contains(e.target);
        const isNotToggle = !this.dom.btnFocusDrawerToggle.contains(e.target);
        const isNotTopToolbar = !e.target.closest('.viewport-toolbar');
        const isNotBottomBar = !e.target.closest('#focus-bottom-bar');
        
        if (isOutsideDrawer && isNotToggle && isNotTopToolbar && isNotBottomBar) {
          this.dom.focusLeftDrawer.classList.add('hidden');
        }
      }
    });

    // Drag-and-drop tracker line logic
    const line = this.dom.rowTrackerLine;
    line.addEventListener('mousedown', (e) => this.startDraggingTracker(e));
    line.addEventListener('touchstart', (e) => this.startDraggingTracker(e), { passive: true });
    
    document.addEventListener('mousemove', (e) => this.dragTracker(e));
    document.addEventListener('touchmove', (e) => this.dragTracker(e));
    document.addEventListener('mouseup', () => this.stopDraggingTracker());
    document.addEventListener('touchend', () => this.stopDraggingTracker());

    // Interactive sticky note placement on double click
    this.dom.patternCanvas.addEventListener('dblclick', (e) => this.handleCanvasDoubleClick(e));
    this.dom.annotationsOverlay.addEventListener('dblclick', (e) => this.handleCanvasDoubleClick(e));

    // Pinch-to-zoom logic for interactive container
    let initialPinchDistance = null;
    let initialZoomLevel = null;

    this.dom.interactiveContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        // e.preventDefault(); // Don't prevent default on start, might interfere with standard interactions
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialPinchDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        initialZoomLevel = this.zoomLevel;
      }
    }, { passive: false });

    this.dom.interactiveContainer.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && initialPinchDistance !== null) {
        e.preventDefault(); // Prevent standard browser zoom/scroll while pinching
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        
        const scale = currentDistance / initialPinchDistance;
        let newZoomLevel = Math.round(initialZoomLevel * scale);
        
        newZoomLevel = Math.max(50, Math.min(500, newZoomLevel));
        
        if (newZoomLevel !== this.zoomLevel) {
          this.adjustZoom(newZoomLevel - this.zoomLevel);
        }
      }
    }, { passive: false });

    this.dom.interactiveContainer.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        initialPinchDistance = null;
        initialZoomLevel = null;
      }
    });

    // Toolbar settings within tracker line
    this.dom.trackerBtnOpacity.addEventListener('click', (e) => {
      e.stopPropagation();
      this.activeProject.trackerOpacityLow = !this.activeProject.trackerOpacityLow;
      this.renderTrackerLine();
      this.saveActiveProjectState();
    });
    this.dom.trackerBtnColor.addEventListener('click', (e) => {
      e.stopPropagation();
      const colors = ['#c36d53', '#748a7b', '#4a90e2', '#e2b13c', '#9b51e0'];
      let idx = colors.indexOf(this.activeProject.trackerColor || '#c36d53');
      idx = (idx + 1) % colors.length;
      this.activeProject.trackerColor = colors[idx];
      this.renderTrackerLine();
      this.saveActiveProjectState();
    });
    this.dom.trackerBtnSize.addEventListener('click', (e) => {
      e.stopPropagation();
      const sizes = [2, 4, 8, 12];
      let idx = sizes.indexOf(this.activeProject.trackerSize || 4);
      idx = (idx + 1) % sizes.length;
      this.activeProject.trackerSize = sizes[idx];
      this.renderTrackerLine();
      this.saveActiveProjectState();
    });

    // Toolkit Drawer Actions
    this.dom.btnToolkit.addEventListener('click', () => this.toggleToolkitDrawer(true));
    this.dom.btnCloseToolkit.addEventListener('click', () => this.toggleToolkitDrawer(false));
    
    // Tab toggles in toolkit
    this.dom.tabBtnGauge.addEventListener('click', () => this.switchToolkitTab('gauge'));
    this.dom.tabBtnDictionary.addEventListener('click', () => this.switchToolkitTab('dictionary'));
    this.dom.tabBtnBackup.addEventListener('click', () => this.switchToolkitTab('backup'));
    
    // Gauge Calc triggers
    this.dom.btnCalculateGauge.addEventListener('click', () => this.runGaugeCalculation());

    // Backup actions
    this.dom.btnExportBackup.addEventListener('click', () => this.exportBackup());
    this.dom.btnImportBackup.addEventListener('click', () => this.dom.backupFileInput.click());
    this.dom.backupFileInput.addEventListener('change', (e) => this.importBackup(e));
    
    // Stitch dictionary search filter
    this.dom.stitchSearch.addEventListener('input', () => this.renderStitchDictionary());

    // Keyboard Shortcuts Listener
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

    // Notes quick action
    this.dom.btnAddSticky.addEventListener('click', () => {
      this.placeStickyNoteAtCenter();
    });

    window.addEventListener('resize', () => {
      if (this.isFocusModeActive) {
        this.constrainFocusWidgets();
      }
    });
  },

  // ----------------------------------------------------
  // THEME & SOUND CONTROLS
  // ----------------------------------------------------
  initTheme() {
    const savedTheme = localStorage.getItem('purlwise-theme') || 'light';
    const isDarkBase = (savedTheme === 'dark' || savedTheme === 'ocean' || savedTheme === 'fireplace');
    document.body.classList.toggle('dark-mode', isDarkBase);
    document.body.classList.toggle('light-mode', !isDarkBase);
    document.body.classList.toggle('theme-ocean', savedTheme === 'ocean');
    document.body.classList.toggle('theme-autumn', savedTheme === 'autumn');
    document.body.classList.toggle('theme-christmas', savedTheme === 'christmas');
    document.body.classList.toggle('theme-cafe', savedTheme === 'cafe');
    document.body.classList.toggle('theme-fireplace', savedTheme === 'fireplace');
    
    if (this.dom.themeSelector) {
      this.dom.themeSelector.value = savedTheme;
    }
  },

  changeTheme(themeValue) {
    const isDarkBase = (themeValue === 'dark' || themeValue === 'ocean' || themeValue === 'fireplace');
    document.body.classList.toggle('dark-mode', isDarkBase);
    document.body.classList.toggle('light-mode', !isDarkBase);
    document.body.classList.toggle('theme-ocean', themeValue === 'ocean');
    document.body.classList.toggle('theme-autumn', themeValue === 'autumn');
    document.body.classList.toggle('theme-christmas', themeValue === 'christmas');
    document.body.classList.toggle('theme-cafe', themeValue === 'cafe');
    document.body.classList.toggle('theme-fireplace', themeValue === 'fireplace');
    
    localStorage.setItem('purlwise-theme', themeValue);
  },

  toggleSound() {
    AudioSynth.soundEnabled = !AudioSynth.soundEnabled;
    this.dom.soundIconOn.classList.toggle('hidden', !AudioSynth.soundEnabled);
    this.dom.soundIconOff.classList.toggle('hidden', AudioSynth.soundEnabled);
  },

  async initWakeLock() {
    const savedWakeLock = localStorage.getItem('purlwise-wakelock');
    this.wakeLockEnabled = (savedWakeLock === 'true');
    this.updateWakeLockUI();

    if (this.wakeLockEnabled) {
      await this.requestWakeLock();
    }
  },

  updateWakeLockUI() {
    if (this.dom.wakelockIconOn && this.dom.wakelockIconOff) {
      this.dom.wakelockIconOn.classList.toggle('hidden', !this.wakeLockEnabled);
      this.dom.wakelockIconOff.classList.toggle('hidden', this.wakeLockEnabled);
    }
    if (this.dom.focusWakelockIconOn && this.dom.focusWakelockIconOff) {
      this.dom.focusWakelockIconOn.classList.toggle('hidden', !this.wakeLockEnabled);
      this.dom.focusWakelockIconOff.classList.toggle('hidden', this.wakeLockEnabled);
    }
  },

  async toggleWakeLock() {
    this.wakeLockEnabled = !this.wakeLockEnabled;
    localStorage.setItem('purlwise-wakelock', this.wakeLockEnabled);
    this.updateWakeLockUI();

    if (this.wakeLockEnabled) {
      await this.requestWakeLock();
    } else {
      await this.releaseWakeLock();
    }
  },

  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLockRef = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn(`Wake Lock request failed: ${err.name}, ${err.message}`);
      }
    }
  },

  async releaseWakeLock() {
    if (this.wakeLockRef !== null) {
      await this.wakeLockRef.release();
      this.wakeLockRef = null;
    }
  },

  async handleVisibilityChange() {
    if (this.wakeLockEnabled && document.visibilityState === 'visible') {
      await this.requestWakeLock();
    }
  },

  // ----------------------------------------------------
  // PROJECT LOADING & DB HANDLERS
  // ----------------------------------------------------
  async loadAllProjectsFromDB() {
    this.projects = await DBManager.getAllProjects();
    this.updateDashboardStats();
  },

  updateDashboardStats() {
    this.dom.statActiveCount.innerText = this.projects.length.toString();
    
    let totalStitches = 0;
    let completedCount = 0;
    this.projects.forEach(p => {
      totalStitches += p.currentStitch;
      if (p.currentRow >= p.targetRows) {
        completedCount++;
      }
    });

    this.dom.statStitchCount.innerText = totalStitches.toLocaleString();
    this.dom.statCompletedCount.innerText = completedCount.toString();
  },

  renderProjectsGrid() {
    this.dom.projectsGrid.innerHTML = '';
    
    if (this.projects.length === 0) {
      this.dom.emptyState.classList.remove('hidden');
      return;
    }
    
    this.dom.emptyState.classList.add('hidden');

    this.projects.forEach(project => {
      const card = document.createElement('div');
      card.className = 'project-card';
      card.dataset.id = project.id;
      
      const pct = Math.round((project.currentRow / project.targetRows) * 100);

      // Fetch or generate thumbnail preview
      let previewHTML = '';
      if (project.thumbnail) {
        previewHTML = `<img src="${project.thumbnail}" alt="${project.title}">`;
      } else if (project.patternType === 'sample') {
        previewHTML = `<div class="project-card-icon-placeholder">
          <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>`;
      } else {
        // PDF or uploaded image placeholder or preview if image
        if (project.patternFileType && project.patternFileType.startsWith('image/')) {
          previewHTML = `<img src="${project.patternFile}" alt="${project.title}">`;
        } else {
          previewHTML = `<div class="project-card-icon-placeholder">
            <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>`;
        }
      }

      card.innerHTML = `
        <div class="project-card-preview">
          ${previewHTML}
          <div class="project-card-badge">${project.category}</div>
        </div>
        <div class="project-card-info">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <h4 class="project-card-title" style="flex: 1; margin-right: 10px;">${project.title}</h4>
            <div class="project-card-menu" style="position: relative;">
              <button class="btn-card-menu btn btn-icon-only small" aria-label="Options" style="background: none; border: none; color: var(--color-text-light); padding: 4px;">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
              </button>
              <div class="project-card-dropdown hidden" style="position: absolute; right: 0; top: 24px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); box-shadow: var(--shadow-md); z-index: 100; min-width: 140px; overflow: hidden; display: flex; flex-direction: column;">
                <button class="btn-allocate-project-card" style="width: 100%; padding: 10px 16px; text-align: left; background: none; border: none; color: var(--color-text-main); cursor: pointer; font-size: 0.9rem; transition: background 0.2s; border-bottom: 1px solid var(--color-border);">Allocate Yarn</button>
                <button class="btn-delete-project-card" style="width: 100%; padding: 10px 16px; text-align: left; background: none; border: none; color: var(--color-danger); cursor: pointer; font-size: 0.9rem; transition: background 0.2s;">Delete Project</button>
              </div>
            </div>
          </div>
          <div class="project-card-progressbar">
            <div class="project-card-progressfill" style="width: ${Math.min(pct, 100)}%"></div>
          </div>
          <div class="project-card-progress">
            <span class="progress-text-label">Row ${project.currentRow} of ${project.targetRows}</span>
            <span class="progress-text-percent">${pct}%</span>
          </div>
          
          <!-- Assigned Yarns badge section -->
          ${(() => {
            if (window.StashManager && window.StashManager.stash) {
              const projectYarns = window.StashManager.stash.filter(y => 
                y.allocations && y.allocations.some(a => a.projectId === project.id)
              );
              if (projectYarns.length > 0) {
                return `
                  <div class="project-card-yarns">
                    ${projectYarns.map(yarn => {
                      const allocText = window.StashManager.formatAllocation(yarn, project.id);
                      return `
                        <div class="project-card-yarn-badge" data-yarn-id="${yarn.id}">
                          <span class="color-dot" style="background-color: ${yarn.colorHex || '#ddd'}"></span>
                          <span class="yarn-badge-name" style="font-weight:500;">${yarn.brand} ${yarn.name}</span>
                          <span class="yarn-badge-qty" style="margin-left:auto; font-weight:600;">${allocText}</span>
                        </div>
                      `;
                    }).join('')}
                  </div>
                `;
              }
            }
            return '';
          })()}
        </div>
        <div class="project-card-footer">
          <span>Stitches: ${project.currentStitch}</span>
          <span>Last active: ${new Date(project.lastActive).toLocaleDateString()}</span>
        </div>
      `;

      // Event listener for opening the workspace
      card.addEventListener('click', (e) => {
        // If they clicked the menu or delete button, ignore
        if (e.target.closest('.project-card-menu')) return;
        this.enterWorkspace(project.id);
      });

      // Event listeners for the menu
      const menuBtn = card.querySelector('.btn-card-menu');
      const dropdown = card.querySelector('.project-card-dropdown');
      const delBtn = card.querySelector('.btn-delete-project-card');
      const allocProjectBtn = card.querySelector('.btn-allocate-project-card');

      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close other open dropdowns
        document.querySelectorAll('.project-card-dropdown:not(.hidden)').forEach(d => {
          if (d !== dropdown) d.classList.add('hidden');
        });
        dropdown.classList.toggle('hidden');
      });

      allocProjectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.add('hidden');
        if (window.StashManager) {
          window.StashManager.openAllocateModal(project.id);
        }
      });

      // Bind edit allocation click to yarn badges on the card
      card.querySelectorAll('.project-card-yarn-badge').forEach(badge => {
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          const yarnId = badge.dataset.yarnId;
          if (window.StashManager) {
            window.StashManager.openAllocateModal(project.id, yarnId);
          }
        });
      });

      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        dropdown.classList.add('hidden');
        if (await Dialogs.confirm(`Are you sure you want to delete "${project.title}"?`)) {
          await DBManager.deleteProject(project.id);
          await this.loadAllProjectsFromDB();
          this.renderProjectsGrid();
        }
      });

      this.dom.projectsGrid.appendChild(card);
    });

    // Close any open dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.project-card-menu')) {
        document.querySelectorAll('.project-card-dropdown:not(.hidden)').forEach(d => d.classList.add('hidden'));
      }
    });
  },

  // ----------------------------------------------------
  // WORKSPACE NAVIGATION & TIMER
  // ----------------------------------------------------
  async enterWorkspace(projectId) {
    this.activeProject = this.projects.find(p => p.id === projectId);
    if (!this.activeProject) return;

    // Transition view
    this.dom.viewDashboard.classList.remove('active');
    this.dom.viewWorkspace.classList.add('active');
    this.activeView = 'workspace';

    // Set side panel values
    this.dom.projTitle.innerText = this.activeProject.title;
    this.dom.projCategory.innerText = this.activeProject.category;

    // Reset view variables
    this.zoomLevel = 100;
    if (this.dom.zoomValue) {
      this.dom.zoomValue.innerText = '100%';
    }

    this.isLineTrackerActive = false;
    this.dom.btnToggleTrackerLine.classList.remove('active-toggle');
    this.dom.rowTrackerLine.classList.add('hidden');

    // Restore counters values
    this.updateCounterUI();
    this.renderSubcounters();
    
    // Refresh allocated yarn panel
    if (window.StashManager) {
      window.StashManager.refreshProjectYarnPanel(projectId);
    }
    this.renderNotesLog();

    // Restore bookmarks states
    this.lastPageBeforeJump = null;
    this.updateJumpBackButtonUI();
    this.updateBookmarkButtonUI();
    this.renderBookmarks();
    // Render pattern page
    await this.loadAndRenderPattern();

    // Set focus mode on by default when entering the workspace
    this.isFocusModeActive = false;
    this.toggleFocusMode();
  },

  exitWorkspace(skipSave = false) {
    if (this.isFocusModeActive) {
      this.toggleFocusMode();
    }
    // Save state on leave
    if (this.activeProject && !skipSave) {
      this.activeProject.lastActive = new Date().toISOString();
      DBManager.saveProject(this.activeProject);
    }
    
    this.activeProject = null;
    this.dom.viewWorkspace.classList.remove('active');
    this.dom.viewDashboard.classList.add('active');
    this.activeView = 'dashboard';
    
    this.loadAllProjectsFromDB().then(() => {
      this.renderProjectsGrid();
    });
  },

  async deleteActiveProject() {
    if (!this.activeProject) return;
    const ok = await Dialogs.confirm(`Are you sure you want to permanently delete the project "${this.activeProject.title}"?`);
    if (ok) {
      const id = this.activeProject.id;
      await DBManager.deleteProject(id);
      this.exitWorkspace(true);
    }
  },

  saveActiveProjectState() {
    if (this.activeProject) {
      this.activeProject.lastActive = new Date().toISOString();
      DBManager.saveProject(this.activeProject);
    }
  },

  // ----------------------------------------------------
  // PATTERN RENDERING INTERACTIVE CANVAS
  // ----------------------------------------------------
  async loadAndRenderPattern() {
    const canvas = this.dom.patternCanvas;
    const pageNum = this.activeProject.currentPageNum || 1;
    const rotations = this.activeProject.pageRotations || {};
    const rotation = rotations[pageNum] || 0;
    
    if (this.activeProject.patternType === 'sample') {
      // Draw pre-made sample pattern
      const sampleCanvas = SamplePattern.createMockPatternCanvas();
      this.drawRotatedCanvas(sampleCanvas, canvas, rotation);

      this.activeProject.totalPages = 1;
      this.activeProject.currentPageNum = 1;
      this.dom.pageIndicator.innerText = `Page 1 / 1`;
      this.dom.projPageMeta.innerText = `Page 1/1`;
      this.dom.btnPrevPage.disabled = true;
      this.dom.btnNextPage.disabled = true;

      this.onPatternRenderComplete();
    } else {
      // PDF or Image upload
      const fileData = this.activeProject.patternFile;
      const fileType = this.activeProject.patternFileType;

      if (fileType && fileType.startsWith('image/')) {
        // Render image onto canvas
        this.patternImage = new Image();
        this.patternImage.src = fileData;
        this.patternImage.onload = () => {
          this.drawRotatedCanvas(this.patternImage, canvas, rotation);

          this.activeProject.totalPages = 1;
          this.activeProject.currentPageNum = 1;
          this.dom.pageIndicator.innerText = `Page 1 / 1`;
          this.dom.projPageMeta.innerText = `Page 1/1`;
          this.dom.btnPrevPage.disabled = true;
          this.dom.btnNextPage.disabled = true;
          this.onPatternRenderComplete();
        };
      } else if (fileType === 'application/pdf') {
        // Convert Base64 array string back to buffer
        const binaryString = atob(fileData.split(',')[1]);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        try {
          await PdfViewer.loadPdf(bytes.buffer);
          this.activeProject.totalPages = PdfViewer.totalPages;
          if (!this.activeProject.currentPageNum) this.activeProject.currentPageNum = 1;
          
          this.renderPdfPage();
        } catch (err) {
          alert('Could not render PDF: ' + err.message);
        }
      }
    }
  },

  async renderPdfPage() {
    const canvas = this.dom.patternCanvas;
    const pageNum = this.activeProject.currentPageNum;
    const rotations = this.activeProject.pageRotations || {};
    const rotation = rotations[pageNum] || 0;

    this.dom.pageIndicator.innerText = `Loading...`;
    const renderInfo = await PdfViewer.renderPage(pageNum, canvas, rotation);
    
    if (renderInfo) {
      this.dom.pageIndicator.innerText = `Page ${pageNum} / ${renderInfo.totalPages}`;
      this.dom.projPageMeta.innerText = `Page ${pageNum}/${renderInfo.totalPages}`;
      this.dom.btnPrevPage.disabled = pageNum <= 1;
      this.dom.btnNextPage.disabled = pageNum >= renderInfo.totalPages;

      this.onPatternRenderComplete();
    }
  },

  onPatternRenderComplete() {
    // Canvas sizing scaling
    this.updateCanvasDisplaySize();
    
    // Position the row tracker and notes
    this.renderTrackerLine();
    this.renderNotesOnOverlay();
  },

  updateCanvasDisplaySize() {
    const canvas = this.dom.patternCanvas;
    const width = canvas.width * (this.zoomLevel / 100);
    this.dom.patternWrapper.style.width = `${width}px`;
  },

  async changePage(dir) {
    if (!this.activeProject || this.activeProject.patternType === 'sample') return;
    
    const targetPage = this.activeProject.currentPageNum + dir;
    if (targetPage >= 1 && targetPage <= this.activeProject.totalPages) {
      this.activeProject.currentPageNum = targetPage;
      this.saveActiveProjectState();
      await this.renderPdfPage();
    }
  },

  adjustZoom(amount) {
    this.zoomLevel = Math.max(50, Math.min(500, this.zoomLevel + amount));
    if (this.dom.zoomValue) {
      this.dom.zoomValue.innerText = `${this.zoomLevel}%`;
    }
    this.updateCanvasDisplaySize();
    
    // Notes and tracker will naturally scale due to absolute position sizing percents,
    // but re-rendering keeps coordinates crisp.
    this.renderTrackerLine();
    this.renderNotesOnOverlay();
  },

  // ----------------------------------------------------
  // DYNAMIC ROW HIGHLIGHTER LINE TRACKER
  // ----------------------------------------------------
  renderTrackerLine() {
    const tracker = this.dom.rowTrackerLine;
    if (!this.isLineTrackerActive || !this.activeProject) {
      tracker.classList.add('hidden');
      return;
    }
    tracker.classList.remove('hidden');

    const wrapperHeight = this.dom.patternWrapper.offsetHeight;
    const pageNum = this.activeProject.currentPageNum || 1;
    
    // Read Y offset as percentage of height, defaults to 20%
    if (!this.activeProject.trackerY) this.activeProject.trackerY = {};
    if (this.activeProject.trackerY[pageNum] === undefined) {
      this.activeProject.trackerY[pageNum] = 20; // 20% down page
    }

    const yPct = this.activeProject.trackerY[pageNum];
    tracker.style.top = `${yPct}%`;

    // Apply active project visual choices
    const color = this.activeProject.trackerColor || '#c36d53';
    const size = this.activeProject.trackerSize || 4;
    const lowOpacity = this.activeProject.trackerOpacityLow || false;

    tracker.style.backgroundColor = color;
    tracker.style.height = `${size}px`;
    tracker.style.boxShadow = `0 0 10px ${color}80`;

    // Overlay colors
    const colorDot = this.dom.trackerBtnColor.querySelector('.color-dot');
    colorDot.style.backgroundColor = color;

    // Apply low opacity style
    tracker.classList.toggle('low-opacity', lowOpacity);

    // Update row label inside tracker
    this.dom.trackerRowNum.innerText = this.activeProject.currentRow.toString();
  },

  startDraggingTracker(e) {
    e.preventDefault();
    this.isDraggingTracker = true;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    this.dragStartY = clientY;
    
    const pageNum = this.activeProject.currentPageNum || 1;
    const wrapperHeight = this.dom.patternWrapper.offsetHeight;
    const currentYPercent = this.activeProject.trackerY[pageNum] || 20;
    
    // Convert percent to pixels
    this.dragStartTrackerY = (currentYPercent / 100) * wrapperHeight;
    this.dom.rowTrackerLine.style.cursor = 'grabbing';
  },

  dragTracker(e) {
    if (!this.isDraggingTracker) return;
    
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - this.dragStartY;
    
    const wrapperHeight = this.dom.patternWrapper.offsetHeight;
    const newY = Math.max(0, Math.min(wrapperHeight, this.dragStartTrackerY + deltaY));
    
    const pageNum = this.activeProject.currentPageNum || 1;
    const yPct = (newY / wrapperHeight) * 100;
    
    this.activeProject.trackerY[pageNum] = yPct;
    this.dom.rowTrackerLine.style.top = `${yPct}%`;
  },

  stopDraggingTracker() {
    if (this.isDraggingTracker) {
      this.isDraggingTracker = false;
      this.dom.rowTrackerLine.style.cursor = 'grab';
      this.saveActiveProjectState();
    }
  },

  nudgeTracker(dir) {
    if (!this.activeProject) return;
    const pageNum = this.activeProject.currentPageNum || 1;
    const currentY = this.activeProject.trackerY[pageNum] || 20;
    
    // Nudge up/down by 0.5% (approx 5 pixels)
    const newY = Math.max(0, Math.min(100, currentY + dir * 0.6));
    this.activeProject.trackerY[pageNum] = newY;
    this.renderTrackerLine();
    this.saveActiveProjectState();
  },

  toggleTrackerLineTool() {
    this.isLineTrackerActive = !this.isLineTrackerActive;
    this.dom.btnToggleTrackerLine.classList.toggle('active-toggle', this.isLineTrackerActive);
    this.renderTrackerLine();
  },

  // ----------------------------------------------------


  // ----------------------------------------------------
  // INTERACTIVE STICKY NOTES & ANNOTATIONS
  // ----------------------------------------------------
  renderNotesOnOverlay() {
    const overlay = this.dom.annotationsOverlay;
    overlay.innerHTML = '';
    
    if (!this.activeProject || !this.activeProject.notes) return;
    
    const currentPage = this.activeProject.currentPageNum || 1;
    const pageNotes = this.activeProject.notes.filter(n => n.page === currentPage);
    
    pageNotes.forEach(note => {
      const pin = document.createElement('div');
      pin.className = 'sticky-note-pin';
      pin.style.left = `${note.x}%`;
      pin.style.top = `${note.y}%`;
      pin.dataset.id = note.id;

      pin.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openStickyNoteEditor(note, pin);
      });

      overlay.appendChild(pin);
    });
  },

  handleCanvasDoubleClick(e) {
    e.preventDefault();
    if (!this.activeProject) return;

    const wrapper = this.dom.patternWrapper;
    const rect = wrapper.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;

    // Convert to percentage
    const xPct = (xPx / wrapper.offsetWidth) * 100;
    const yPct = (yPx / wrapper.offsetHeight) * 100;

    const newNote = {
      id: Date.now().toString(),
      page: this.activeProject.currentPageNum || 1,
      x: xPct,
      y: yPct,
      text: '',
      created: new Date().toISOString()
    };

    if (!this.activeProject.notes) this.activeProject.notes = [];
    this.activeProject.notes.push(newNote);

    this.renderNotesOnOverlay();
    
    // Focus immediately on editor
    const pin = this.dom.annotationsOverlay.querySelector(`[data-id="${newNote.id}"]`);
    if (pin) this.openStickyNoteEditor(newNote, pin);
  },

  placeStickyNoteAtCenter() {
    if (!this.activeProject) return;
    
    // Put note at the middle of viewport
    const newNote = {
      id: Date.now().toString(),
      page: this.activeProject.currentPageNum || 1,
      x: 50,
      y: 50,
      text: 'Note details...',
      created: new Date().toISOString()
    };

    if (!this.activeProject.notes) this.activeProject.notes = [];
    this.activeProject.notes.push(newNote);

    this.renderNotesOnOverlay();
    this.renderNotesLog();
    this.saveActiveProjectState();

    const pin = this.dom.annotationsOverlay.querySelector(`[data-id="${newNote.id}"]`);
    if (pin) this.openStickyNoteEditor(newNote, pin);
  },

  openStickyNoteEditor(note, pinElement) {
    // Close existing editors first
    const activeEditors = document.querySelectorAll('.sticky-note-editor');
    activeEditors.forEach(ae => ae.remove());
    
    const pins = document.querySelectorAll('.sticky-note-pin');
    pins.forEach(p => p.classList.remove('active'));

    pinElement.classList.add('active');

    const editor = document.createElement('div');
    
    editor.innerHTML = `
      <div class="editor-content" contenteditable="true" placeholder="Type a note...">${note.text || ''}</div>
      <div class="sticky-note-editor-footer">
        <button class="sticky-note-delete-btn">Delete</button>
      </div>
    `;

    // Handle clicks inside editor without bubble trigger to pattern canvas
    editor.addEventListener('click', (e) => e.stopPropagation());
    editor.addEventListener('dblclick', (e) => e.stopPropagation());
    editor.addEventListener('wheel', (e) => e.stopPropagation(), {passive: false});
    editor.addEventListener('touchstart', (e) => e.stopPropagation(), {passive: false});
    editor.addEventListener('touchmove', (e) => e.stopPropagation(), {passive: false});

    const txtArea = editor.querySelector('.editor-content');
    
    // Delete note trigger
    editor.querySelector('.sticky-note-delete-btn').addEventListener('click', () => {
      this.activeProject.notes = this.activeProject.notes.filter(n => n.id !== note.id);
      this.saveActiveProjectState();
      this.renderNotesOnOverlay();
      this.renderNotesLog();
      editor.remove();
    });

    document.body.appendChild(editor);

    // Position based on pin bounding rect
    const pinRect = pinElement.getBoundingClientRect();
    const isTopHalf = pinRect.top < window.innerHeight / 2;
    const isLeftHalf = pinRect.left < window.innerWidth / 2;

    let tailClass = '';
    if (isTopHalf && isLeftHalf) tailClass = 'bubble-tail-top-left';
    if (isTopHalf && !isLeftHalf) tailClass = 'bubble-tail-top-right';
    if (!isTopHalf && isLeftHalf) tailClass = 'bubble-tail-bottom-left';
    if (!isTopHalf && !isLeftHalf) tailClass = 'bubble-tail-bottom-right';

    editor.className = `sticky-note-editor ${tailClass}`;

    // Temporarily render invisible to get dimensions
    editor.style.visibility = 'hidden';
    const gap = 15;
    let topPos = 0;
    let leftPos = 0;

    const positionEditor = () => {
      const editorRect = editor.getBoundingClientRect();
      
      if (isTopHalf) {
        topPos = pinRect.bottom + gap;
      } else {
        topPos = pinRect.top - editorRect.height - gap;
      }

      if (isLeftHalf) {
        leftPos = pinRect.left + (pinRect.width / 2) - 30; // tail is 20px from left + 10px buffer
      } else {
        leftPos = pinRect.right - (pinRect.width / 2) - editorRect.width + 30; // tail is 20px from right
      }

      // Clamp to screen
      leftPos = Math.max(10, Math.min(leftPos, window.innerWidth - editorRect.width - 10));
      topPos = Math.max(10, Math.min(topPos, window.innerHeight - editorRect.height - 10));

      editor.style.top = `${topPos}px`;
      editor.style.left = `${leftPos}px`;
    };

    positionEditor();
    editor.style.visibility = 'visible';

    // Observe size changes as user types
    const resizeObserver = new ResizeObserver(() => {
      positionEditor();
    });
    resizeObserver.observe(editor);

    // Clean up observer if editor is removed
    const cleanupObserver = new MutationObserver((mutations) => {
      if (!document.body.contains(editor)) {
        resizeObserver.disconnect();
        cleanupObserver.disconnect();
      }
    });
    cleanupObserver.observe(document.body, { childList: true, subtree: true });

    // Place cursor at the end
    txtArea.focus();
    if (typeof window.getSelection !== "undefined" && typeof document.createRange !== "undefined" && txtArea.childNodes.length > 0) {
      const range = document.createRange();
      range.selectNodeContents(txtArea);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    // Add class to body to hide bottom bar
    document.body.classList.add('note-editor-open');

    // Close on outside click
    const outsideClickListener = (e) => {
      // If clicked inside the editor or on a pin, ignore
      if (editor.contains(e.target) || e.target.closest('.sticky-note-pin')) {
        return;
      }
      
      // Save and close
      note.text = txtArea.innerText.trim();
      this.saveActiveProjectState();
      this.renderNotesOnOverlay();
      this.renderNotesLog();
      
      editor.remove();
      document.body.classList.remove('note-editor-open');
      document.removeEventListener('pointerdown', outsideClickListener);
    };

    // Use pointerdown to catch taps before they turn into full clicks, bypassing canvas issues
    setTimeout(() => {
      document.addEventListener('pointerdown', outsideClickListener);
    }, 10);

    // Override the delete button to also clean up the listener
    editor.querySelector('.sticky-note-delete-btn').addEventListener('click', () => {
      document.body.classList.remove('note-editor-open');
      document.removeEventListener('pointerdown', outsideClickListener);
    });
  },

  renderNotesLog() {
    const logs = [this.dom.notesLogContainer, this.dom.focusNotesLogContainer].filter(Boolean);
    logs.forEach(log => {
      log.innerHTML = '';
    });

    if (!this.activeProject || !this.activeProject.notes || this.activeProject.notes.length === 0) {
      logs.forEach(log => {
        log.innerHTML = `<p class="empty-notes-text">No notes yet. Double-click the pattern or click "+ Add" to place an interactive note!</p>`;
      });
      return;
    }

    // Sort notes chronologically
    const sorted = [...this.activeProject.notes].sort((a,b) => new Date(b.created) - new Date(a.created));

    sorted.forEach(note => {
      logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'notes-log-item';
        item.innerHTML = `
          <div class="notes-log-item-header">
            <span>Page ${note.page}</span>
            <span>${new Date(note.created).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
          <div class="notes-log-item-text">${note.text || '<i>Empty note. Click to write details.</i>'}</div>
        `;

        item.addEventListener('click', () => {
          // Go to page note was written on
          if (this.activeProject.currentPageNum !== note.page) {
            this.activeProject.currentPageNum = note.page;
            this.renderPdfPage().then(() => {
              this.focusOnPin(note.id);
            });
          } else {
            this.focusOnPin(note.id);
          }
        });

        log.appendChild(item);
      });
    });
  },

  focusOnPin(noteId) {
    const pin = this.dom.annotationsOverlay.querySelector(`[data-id="${noteId}"]`);
    if (pin) {
      // Find note data
      const note = this.activeProject.notes.find(n => n.id === noteId);
      this.openStickyNoteEditor(note, pin);
      
      // Smooth scroll inside viewport
      pin.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  },

  // ----------------------------------------------------
  // satisfecho COUNTER MODULE
  // ----------------------------------------------------
  updateCounterUI() {
    if (!this.activeProject) return;

    // 1. Rows
    const val = this.activeProject.currentRow;
    this.dom.countRowValue.innerText = val.toString();
    this.dom.trackerRowNum.innerText = val.toString();
    if (this.dom.focusRowValue) {
      this.dom.focusRowValue.innerText = val.toString();
    }

    // Trigger bounce scale micro-animation
    this.dom.countRowValue.classList.remove('bounce-animation');
    void this.dom.countRowValue.offsetWidth; // trigger reflow
    this.dom.countRowValue.classList.add('bounce-animation');

    const target = this.activeProject.targetRows || 100;
    const pct = Math.min(100, Math.round((val / target) * 100));
    this.dom.rowProgressFill.style.width = `${pct}%`;
    this.dom.rowProgressText.innerText = `Row ${val} of ${target}`;

    // 2. Stitches
    this.dom.countStitchValue.innerText = this.activeProject.currentStitch.toString();
    if (this.dom.focusStitchValue) {
      this.dom.focusStitchValue.innerText = this.activeProject.currentStitch.toString();
    }
    
    // Check if we can display stitch guidelines
    if (this.activeProject.patternType === 'sample') {
      this.dom.stitchPerRowText.innerText = `Standard Row: 22 stitches`;
    } else {
      this.dom.stitchPerRowText.innerText = `Tracked stitches this row`;
    }
  },

  adjustRow(amount) {
    if (!this.activeProject) return;
    
    const newVal = Math.max(1, this.activeProject.currentRow + amount);
    this.setRow(newVal);
  },

  setRow(val) {
    if (!this.activeProject) return;
    this.activeProject.currentRow = val;
    this.updateCounterUI();
    AudioSynth.playWoodClick();
    this.saveActiveProjectState();
  },

  async promptNewRowTarget() {
    if (!this.activeProject) return;
    const currentTarget = this.activeProject.targetRows || 100;
    const val = await Dialogs.prompt('Set row progress target (total rows to knit):', currentTarget);
    if (val !== null && val !== '') {
      const num = parseInt(val);
      if (!isNaN(num) && num > 0) {
        this.activeProject.targetRows = num;
        this.updateCounterUI();
        this.saveActiveProjectState();
      }
    }
  },

  adjustStitch(amount) {
    if (!this.activeProject) return;
    const newVal = Math.max(0, this.activeProject.currentStitch + amount);
    this.setStitch(newVal);
  },

  setStitch(val) {
    if (!this.activeProject) return;
    this.activeProject.currentStitch = val;
    this.updateCounterUI();
    AudioSynth.playWoodClick();
    this.saveActiveProjectState();
  },

  // ----------------------------------------------------
  // SUB-COUNTERS OPERATIONS
  // ----------------------------------------------------
  renderSubcounters() {
    const container = this.dom.subcountersContainer;
    const focusContainer = document.getElementById('focus-subcounters-container');
    
    if (container) container.innerHTML = '';
    
    if (!this.activeProject || !this.activeProject.subCounters || this.activeProject.subCounters.length === 0) {
      if (focusContainer) focusContainer.innerHTML = ''; // Keep it clean and thin if no sub-counters
      return;
    }

    if (focusContainer) focusContainer.innerHTML = '';

    this.activeProject.subCounters.forEach((sub, index) => {
      const item = document.createElement('div');
      item.className = 'subcounter-card-item';
      item.innerHTML = `
        <div class="subcounter-info">
          <span class="subcounter-name">${sub.name}</span>
          <span class="subcounter-val-badge">${sub.value}</span>
        </div>
        <div class="subcounter-controls">
          <button class="btn-subcounter-adjust dec-sub">-</button>
          <button class="btn-subcounter-adjust inc-sub">+</button>
          <button class="subcounter-delete-btn" title="Remove sub-counter">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;

      const focusItem = document.createElement('div');
      focusItem.className = 'bar-counter-group';
      focusItem.innerHTML = `
        <span class="bar-label" style="width: 80px; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${sub.name}">${sub.name}</span>
        <button class="bar-btn-adjust minus dec-sub">-</button>
        <span class="bar-value">${sub.value}</span>
        <button class="bar-btn-adjust plus inc-sub">+</button>
      `;

      const attachEvents = (el) => {
        el.querySelector('.inc-sub').addEventListener('click', () => {
          sub.value++;
          this.renderSubcounters();
          AudioSynth.playWoodClick();
          this.saveActiveProjectState();
        });

        el.querySelector('.dec-sub').addEventListener('click', () => {
          sub.value = Math.max(0, sub.value - 1);
          this.renderSubcounters();
          AudioSynth.playWoodClick();
          this.saveActiveProjectState();
        });

        const delBtn = el.querySelector('.subcounter-delete-btn');
        if (delBtn) {
          delBtn.addEventListener('click', () => {
            this.activeProject.subCounters = this.activeProject.subCounters.filter(s => s.id !== sub.id);
            this.renderSubcounters();
            this.saveActiveProjectState();
          });
        }
      };

      attachEvents(item);
      attachEvents(focusItem);

      if (container) container.appendChild(item);
      
      if (focusContainer) {
        focusContainer.appendChild(focusItem);
      }
    });
  },

  async promptCreateSubcounter() {
    if (!this.activeProject) return;
    const name = await Dialogs.prompt('Enter a label for this sub-counter (e.g., "Left Sleeve decreases", "Cable repeats"):');
    if (name && name.trim()) {
      if (!this.activeProject.subCounters) this.activeProject.subCounters = [];
      
      this.activeProject.subCounters.push({
        id: Date.now().toString(),
        name: name.trim(),
        value: 0
      });

      this.renderSubcounters();
      this.saveActiveProjectState();
    }
  },



  // ----------------------------------------------------
  // KEYBOARD ACCESSIBILITY BINDINGS
  // ----------------------------------------------------
  handleKeyboardShortcuts(e) {
    // Ignore keys if user is typing in notes/form fields
    if (document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA' || 
        document.activeElement.tagName === 'SELECT' ||
        document.activeElement.isContentEditable) {
      return;
    }

    if (this.activeView !== 'workspace') return;

    switch (e.code) {
      case 'Escape':
        if (this.isFocusModeActive) {
          e.preventDefault();
          this.toggleFocusMode();
        }
        break;
      case 'Space':
        e.preventDefault();
        // Space advances row, Shift+Space goes back
        if (e.shiftKey) {
          this.adjustRow(-1);
        } else {
          this.adjustRow(1);
        }
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        // Move row line tracker up
        this.nudgeTracker(-1);
        break;

      case 'ArrowDown':
        e.preventDefault();
        // Move row line tracker down
        this.nudgeTracker(1);
        break;

      case 'Tab':
        e.preventDefault();
        // Tab increments stitches, Shift+Tab decrements
        if (e.shiftKey) {
          this.adjustStitch(-1);
        } else {
          this.adjustStitch(1);
        }
        break;
    }
  },

  // ----------------------------------------------------
  // NEW PROJECT CREATOR MODAL FORM
  // ----------------------------------------------------
  showProjectModal(visible) {
    this.dom.modalProject.classList.toggle('active', visible);
    if (visible) {
      this.dom.projectForm.reset();
      this.clearLoadedFile();
      this.dom.patternFileInput.required = true;
    }
  },

  processPatternFile(file) {
    const reader = new FileReader();
    this.loadedFileName = file.name;
    this.loadedFileType = file.type;

    if (file.type === 'application/pdf') {
      reader.onload = (e) => {
        this.loadedFileData = e.target.result;
        this.updateFileSelectedIndicator();
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('image/')) {
      reader.onload = (e) => {
        this.loadedFileData = e.target.result;
        this.updateFileSelectedIndicator();
      };
      reader.readAsDataURL(file);
    } else {
      alert('Unsupported file format. Please upload a PDF pattern or image file.');
      this.clearLoadedFile();
    }
  },

  updateFileSelectedIndicator() {
    this.dom.uploadBox.classList.add('hidden');
    this.dom.fileSelectedIndicator.classList.remove('hidden');
    this.dom.selectedFileName.innerText = this.loadedFileName;
    this.dom.patternFileInput.required = false;
  },

  clearLoadedFile() {
    this.loadedFileData = null;
    this.loadedFileName = '';
    this.loadedFileType = '';
    this.dom.patternFileInput.value = '';
    this.dom.uploadBox.classList.remove('hidden');
    this.dom.fileSelectedIndicator.classList.add('hidden');
    this.dom.patternFileInput.required = true;
  },

  async loadQuickstartSample() {
    const project = {
      id: 'sample-' + Date.now(),
      title: 'Cozy Autumn Leaf Scarf',
      category: 'Scarf',
      targetRows: 20,
      currentRow: 1,
      currentStitch: 0,
      subCounters: [],
      patternType: 'sample',
      created: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      notes: [],
      timeSpent: 0,
      bookmarks: [],
      pageRotations: {},
      thumbnail: this.generateSampleThumbnail()
    };

    await DBManager.saveProject(project);
    await this.loadAllProjectsFromDB();
    this.renderProjectsGrid();
    
    // Automatically open this project
    this.enterWorkspace(project.id);
  },

  async handleProjectSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('proj-title').value.trim();
    const category = document.getElementById('proj-category').value;
    const targetRows = parseInt(document.getElementById('proj-target-rows').value) || 100;
    const patternSource = 'upload';

    if (!this.loadedFileData) {
      alert('Please upload a pattern PDF or Image.');
      return;
    }

    const newProject = {
      id: Date.now().toString(),
      title: title,
      category: category,
      targetRows: targetRows,
      currentRow: 1,
      currentStitch: 0,
      subCounters: [],
      patternType: patternSource,
      created: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      notes: [],
      timeSpent: 0,
      bookmarks: [],
      pageRotations: {}
    };

    newProject.patternFile = this.loadedFileData;
    newProject.patternFileName = this.loadedFileName;
    newProject.patternFileType = this.loadedFileType;
    
    // Generate thumbnail
    if (this.loadedFileType === 'application/pdf') {
      newProject.thumbnail = await this.generatePdfThumbnail(this.loadedFileData);
    } else if (this.loadedFileType.startsWith('image/')) {
      newProject.thumbnail = this.loadedFileData;
    }

    await DBManager.saveProject(newProject);
    this.showProjectModal(false);
    
    await this.loadAllProjectsFromDB();
    this.renderProjectsGrid();
    
    // Immediately open newly created project
    this.enterWorkspace(newProject.id);
  },

  // ----------------------------------------------------
  // TOOLKIT CALCULATORS & REFERENCE DRAWER
  // ----------------------------------------------------
  toggleToolkitDrawer(visible) {
    this.dom.toolkitDrawer.classList.toggle('active', visible);
  },

  switchToolkitTab(tab) {
    this.dom.tabBtnGauge.classList.toggle('active', tab === 'gauge');
    this.dom.tabBtnDictionary.classList.toggle('active', tab === 'dictionary');
    this.dom.tabBtnBackup.classList.toggle('active', tab === 'backup');
    
    this.dom.tabContentGauge.classList.toggle('active-content', tab === 'gauge');
    this.dom.tabContentDictionary.classList.toggle('active-content', tab === 'dictionary');
    this.dom.tabContentBackup.classList.toggle('active-content', tab === 'backup');
  },

  runGaugeCalculation() {
    const sts = parseFloat(this.dom.gaugeSwatchSts.value);
    const w = parseFloat(this.dom.gaugeSwatchW.value);
    const rows = parseFloat(this.dom.gaugeSwatchRows.value);
    const h = parseFloat(this.dom.gaugeSwatchH.value);
    
    const targetW = parseFloat(this.dom.gaugeTargetW.value);
    const targetH = parseFloat(this.dom.gaugeTargetH.value);

    if (isNaN(sts) || isNaN(w) || isNaN(rows) || isNaN(h) || isNaN(targetW) || isNaN(targetH)) {
      alert('Please fill out all calculator fields.');
      return;
    }

    // Calculations
    const stsPerUnit = sts / w;
    const rowsPerUnit = rows / h;

    const castOn = Math.round(targetW * stsPerUnit);
    const totalRows = Math.round(targetH * rowsPerUnit);

    this.dom.resCastOn.innerText = castOn.toString();
    this.dom.resTotalRows.innerText = totalRows.toString();
    this.dom.gaugeResults.classList.remove('hidden');
  },

  renderStitchDictionary() {
    const list = this.dom.stitchList;
    list.innerHTML = '';

    const query = this.dom.stitchSearch.value.trim().toLowerCase();

    const filtered = STITCH_DICTIONARY.filter(item => {
      return item.name.toLowerCase().includes(query) || 
             item.abbr.toLowerCase().includes(query) ||
             item.desc.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
      list.innerHTML = `<p class="empty-notes-text">No stitches found matching "${query}"</p>`;
      return;
    }

    filtered.forEach(stitch => {
      const card = document.createElement('div');
      card.className = 'stitch-card';
      card.innerHTML = `
        <div class="stitch-card-header">
          <span class="stitch-title">${stitch.name}</span>
          <span class="stitch-abbr">${stitch.abbr.toUpperCase()}</span>
        </div>
        <p class="stitch-desc">${stitch.desc}</p>
        <div class="stitch-instruction">${stitch.inst}</div>
      `;
      list.appendChild(card);
    });
  },

  // ----------------------------------------------------
  // ADVANCED FEATURE HELPERS: THUMBNAILS, BOOKMARKS & ROTATION
  // ----------------------------------------------------
  async generatePdfThumbnail(fileData) {
    try {
      const binaryString = atob(fileData.split(',')[1]);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const loadingTask = pdfjsLib.getDocument({ data: bytes.buffer });
      const pdfDoc = await loadingTask.promise;
      const page = await pdfDoc.getPage(1);
      
      const viewport = page.getViewport({ scale: 0.35 }); // Scale down for thumbnail
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      
      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise;
      
      return canvas.toDataURL('image/jpeg', 0.6);
    } catch (err) {
      console.error('Error generating PDF thumbnail:', err);
      return null;
    }
  },

  generateSampleThumbnail() {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 250;
    const ctx = canvas.getContext('2d');
    
    // Draw cozy paper thumbnail mock
    ctx.fillStyle = '#FAF7F2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#D4C5B3';
    ctx.lineWidth = 4;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    
    ctx.fillStyle = '#4A3B32';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Cozy Scarf', canvas.width / 2, 100);
    
    ctx.font = 'italic 11px Georgia, serif';
    ctx.fillStyle = '#7C6758';
    ctx.fillText('Sample Pattern', canvas.width / 2, 130);

    // Ball of yarn outline
    ctx.strokeStyle = 'rgba(142, 115, 85, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 190, 25, 0, Math.PI * 2);
    ctx.stroke();

    return canvas.toDataURL('image/jpeg', 0.6);
  },

  drawRotatedCanvas(source, canvas, rotation) {
    const ctx = canvas.getContext('2d');
    const w = source.width;
    const h = source.height;
    
    if (rotation === 90 || rotation === 270) {
      canvas.width = h;
      canvas.height = w;
    } else {
      canvas.width = w;
      canvas.height = h;
    }
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(source, -w / 2, -h / 2);
    ctx.restore();
  },

  toggleBookmark() {
    if (!this.activeProject) return;
    const pageNum = this.activeProject.currentPageNum || 1;
    if (!this.activeProject.bookmarks) this.activeProject.bookmarks = [];
    
    const idx = this.activeProject.bookmarks.indexOf(pageNum);
    if (idx > -1) {
      this.activeProject.bookmarks.splice(idx, 1);
    } else {
      this.activeProject.bookmarks.push(pageNum);
      this.activeProject.bookmarks.sort((a, b) => a - b);
    }
    
    this.updateBookmarkButtonUI();
    this.renderBookmarks();
    this.saveActiveProjectState();
  },

  updateBookmarkButtonUI() {
    if (!this.activeProject) return;
    const pageNum = this.activeProject.currentPageNum || 1;
    const bookmarks = this.activeProject.bookmarks || [];
    const isBookmarked = bookmarks.includes(pageNum);
    
    this.dom.btnBookmarkPage.classList.toggle('active-bookmark', isBookmarked);
  },

  renderBookmarks() {
    const containers = [this.dom.bookmarksListContainer, this.dom.focusBookmarksListContainer].filter(Boolean);
    containers.forEach(container => {
      container.innerHTML = '';
    });
    
    if (!this.activeProject || !this.activeProject.bookmarks || this.activeProject.bookmarks.length === 0) {
      containers.forEach(container => {
        container.innerHTML = `<p class="empty-bookmarks-text">No page bookmarks. Click the bookmark icon on the toolbar to add this page!</p>`;
      });
      return;
    }
    
    this.activeProject.bookmarks.forEach(page => {
      containers.forEach(container => {
        const item = document.createElement('div');
        item.className = 'bookmark-item';
        item.innerHTML = `
          <span class="bookmark-item-label">
            <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2.5" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            Page ${page}
          </span>
          <button class="bookmark-item-delete" title="Delete bookmark">
            &times;
          </button>
        `;
        
        item.addEventListener('click', (e) => {
          if (!e.target.closest('.bookmark-item-delete')) {
            this.jumpToPageWithReturnTrack(page);
          }
        });
        
        item.querySelector('.bookmark-item-delete').addEventListener('click', (e) => {
          e.stopPropagation();
          this.activeProject.bookmarks = this.activeProject.bookmarks.filter(b => b !== page);
          this.updateBookmarkButtonUI();
          this.renderBookmarks();
          this.saveActiveProjectState();
        });
        
        container.appendChild(item);
      });
    });
  },

  jumpToPageWithReturnTrack(targetPage) {
    if (!this.activeProject) return;
    const currentPage = this.activeProject.currentPageNum || 1;
    if (currentPage === targetPage) return;
    
    // Set departure page so they can return
    this.lastPageBeforeJump = currentPage;
    this.updateJumpBackButtonUI();
    
    this.activeProject.currentPageNum = targetPage;
    this.saveActiveProjectState();
    
    if (this.activeProject.patternType === 'sample') {
      this.loadAndRenderPattern();
    } else {
      if (this.activeProject.patternFileType && this.activeProject.patternFileType.startsWith('image/')) {
        this.loadAndRenderPattern();
      } else {
        this.renderPdfPage();
      }
    }
    this.updateBookmarkButtonUI();
  },

  updateJumpBackButtonUI() {
    const btn = this.dom.btnJumpBack;
    if (this.lastPageBeforeJump !== null) {
      btn.innerText = `← Back to Page ${this.lastPageBeforeJump}`;
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
  },

  jumpBack() {
    if (this.lastPageBeforeJump === null) return;
    const target = this.lastPageBeforeJump;
    this.lastPageBeforeJump = null;
    this.updateJumpBackButtonUI();
    
    this.activeProject.currentPageNum = target;
    this.saveActiveProjectState();
    
    if (this.activeProject.patternType === 'sample') {
      this.loadAndRenderPattern();
    } else {
      if (this.activeProject.patternFileType && this.activeProject.patternFileType.startsWith('image/')) {
        this.loadAndRenderPattern();
      } else {
        this.renderPdfPage();
      }
    }
    this.updateBookmarkButtonUI();
  },

  rotatePage() {
    if (!this.activeProject) return;
    const pageNum = this.activeProject.currentPageNum || 1;
    if (!this.activeProject.pageRotations) this.activeProject.pageRotations = {};
    
    const currentRot = this.activeProject.pageRotations[pageNum] || 0;
    const newRot = (currentRot + 90) % 360;
    this.activeProject.pageRotations[pageNum] = newRot;
    
    this.saveActiveProjectState();
    
    if (this.activeProject.patternType === 'sample') {
      this.loadAndRenderPattern();
    } else {
      if (this.activeProject.patternFileType && this.activeProject.patternFileType.startsWith('image/')) {
        this.loadAndRenderPattern();
      } else {
        this.renderPdfPage();
      }
    }
  },

  async exportBackup() {
    try {
      const projects = await DBManager.getAllProjects();
      const stash = await DBManager.getAllStash();
      const backupData = {
        app: 'PurlWise',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        projects: projects,
        stash: stash
      };
      
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `purlwise-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      await Dialogs.alert('Failed to export backup: ' + err.message);
    }
  },

  async importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        if (backup.app !== 'PurlWise' && backup.app !== 'KnitFlow') {
          await Dialogs.alert('Invalid backup file. Make sure you upload a .json file exported from PurlWise or KnitFlow.');
          return;
        }
        
        const projects = backup.projects || [];
        const stash = backup.stash || [];
        const projectCount = projects.length;
        const stashCount = stash.length;
        
        const confirmMsg = `Are you sure you want to import ${projectCount} projects and ${stashCount} yarn stash items? This will merge them with your current data.`;
        const confirmMerge = await Dialogs.confirm(confirmMsg);
        if (!confirmMerge) {
          this.dom.backupFileInput.value = '';
          return;
        }
        
        // Save projects
        for (const project of projects) {
          if (project.id && project.title) {
            await DBManager.saveProject(project);
          }
        }

        // Save stash items
        for (const yarn of stash) {
          if (yarn.id && yarn.brand && yarn.name) {
            await DBManager.saveStash(yarn);
          }
        }
        
        await Dialogs.alert(`Successfully imported ${projectCount} projects and ${stashCount} yarn stash items!`);
        this.dom.backupFileInput.value = '';
        
        // Reload projects list
        await this.loadAllProjectsFromDB();
        this.renderProjectsGrid();
        
        // Reload stash list if StashManager is loaded
        if (window.StashManager && typeof window.StashManager.loadStash === 'function') {
          await window.StashManager.loadStash();
        }
        
      } catch (err) {
        await Dialogs.alert('Error parsing backup file: ' + err.message);
        this.dom.backupFileInput.value = '';
      }
    };
    reader.readAsText(file);
  },

  // ----------------------------------------------------
  // FOCUS MODE CONTROLS & INTERACTIONS
  // ----------------------------------------------------
  toggleFocusMode() {
    if (!this.activeProject) return;
    this.isFocusModeActive = !this.isFocusModeActive;

    document.body.classList.toggle('focus-mode-active', this.isFocusModeActive);
    
    if (this.dom.btnToggleFocus) {
      this.dom.btnToggleFocus.classList.toggle('active-toggle', this.isFocusModeActive);
    }

    if (this.dom.btnToggleFocus) {
      this.dom.btnToggleFocus.classList.toggle('active-toggle', this.isFocusModeActive);
    }

    if (this.isFocusModeActive) {
      if (this.dom.focusBottomBar) this.dom.focusBottomBar.classList.remove('hidden');
      if (this.dom.btnFocusDrawerToggle) this.dom.btnFocusDrawerToggle.classList.remove('hidden');
      
      this.updateCounterUI();
      this.renderBookmarks();
      this.renderNotesLog();
      this.renderSubcounters();
    } else {
      if (this.dom.focusBottomBar) this.dom.focusBottomBar.classList.add('hidden');
      if (this.dom.btnFocusDrawerToggle) this.dom.btnFocusDrawerToggle.classList.add('hidden');
      if (this.dom.focusLeftDrawer) this.dom.focusLeftDrawer.classList.add('hidden');
    }

    // Redraw components because screen coordinates shift/expand
    this.renderTrackerLine();
    this.renderNotesOnOverlay();
  }

};

// Initialize App
window.Dialogs = Dialogs;
window.DBManager = DBManager;
window.App = App;

window.addEventListener('DOMContentLoaded', () => App.init());
