const StashManager = {
  stash: [],
  currentWizardStep: 1,
  editingYarnId: null,

  init() {
    this.cacheDOM();
    this.bindEvents();
    
    // Load stash shortly after app initializes
    setTimeout(() => {
      this.loadStash();
    }, 500);
  },

  cacheDOM() {
    this.dom = {
      // Dashboard toggle
      tabProjects: document.getElementById('tab-dashboard-projects'),
      tabStash: document.getElementById('tab-dashboard-stash'),
      secProjects: document.getElementById('dashboard-projects-section'),
      secStash: document.getElementById('dashboard-stash-section'),
      
      // Stash Grid
      stashGrid: document.getElementById('stash-grid'),
      stashEmptyState: document.getElementById('stash-empty-state'),
      btnAddStash: document.getElementById('btn-add-stash'),
      btnQuickAddStash: document.getElementById('btn-quick-add-stash'),
      
      // Wizard Modal
      modalWizard: document.getElementById('modal-stash-wizard'),
      btnCloseWizard: document.getElementById('btn-close-stash-modal'),
      wizardTitle: document.getElementById('stash-wizard-title'),
      stashForm: document.getElementById('stash-form'),
      
      // Steps
      step1: document.getElementById('wizard-step-1'),
      step2: document.getElementById('wizard-step-2'),
      step3: document.getElementById('wizard-step-3'),
      ind1: document.getElementById('wizard-ind-1'),
      ind2: document.getElementById('wizard-ind-2'),
      ind3: document.getElementById('wizard-ind-3'),
      
      // Buttons
      btnPrev: document.getElementById('btn-stash-prev'),
      btnNext: document.getElementById('btn-stash-next'),
      
      // Sorting
      sortSelect: document.getElementById('stash-sort-select'),

      // Form Elements
      btnSave: document.getElementById('btn-save-stash'),
      btnCancel: document.getElementById('btn-cancel-stash'),
      
      // Form fields
      fBrand: document.getElementById('stash-brand'),
      fName: document.getElementById('stash-name'),
      fColorway: document.getElementById('stash-colorway'),
      fColorHex: document.getElementById('stash-colorhex'),
      fColorHexText: document.getElementById('stash-colorhex-text'),
      fWeight: document.getElementById('stash-weight'),
      fDyeLot: document.getElementById('stash-dyelot'),
      fFibers: document.getElementById('stash-fibers'),
      fSkeinWeight: document.getElementById('stash-skein-weight'),
      fSkeinLength: document.getElementById('stash-skein-length'),
      fQuantitySkeins: document.getElementById('stash-quantity-skeins'),
      fQuantityWeight: document.getElementById('stash-quantity-weight'),
      fLocation: document.getElementById('stash-location'),
      fNotes: document.getElementById('stash-notes'),
      
      // Autocomplete lists
      autoBrand: document.getElementById('autocomplete-brand'),
      autoName: document.getElementById('autocomplete-name'),
      autoLocation: document.getElementById('autocomplete-location'),

      // Project Sidebar Allocation
      btnAllocate: document.getElementById('btn-allocate-yarn'),
      projectYarnList: document.getElementById('project-yarn-list'),
      
      // Allocate Modal
      modalAllocate: document.getElementById('modal-allocate-yarn'),
      btnCloseAllocate: document.getElementById('btn-close-allocate-modal'),
      btnCancelAllocate: document.getElementById('btn-cancel-allocate'),
      btnSaveAllocate: document.getElementById('btn-save-allocate'),
      btnRemoveAllocation: document.getElementById('btn-remove-allocation'),
      allocSelect: document.getElementById('allocate-yarn-select'),
      allocQty: document.getElementById('allocate-quantity'),
      allocSkeins: document.getElementById('allocate-skeins'),
      allocSkeinsGroup: document.getElementById('allocate-skeins-group'),
      allocWeightGroup: document.getElementById('allocate-weight-group'),
      allocHint: document.getElementById('allocate-max-hint')
    };
  },

  bindEvents() {
    // Dashboard Tabs
    if(this.dom.tabProjects) {
      this.dom.tabProjects.addEventListener('click', () => this.switchTab('projects'));
      this.dom.tabStash.addEventListener('click', () => this.switchTab('stash'));
    }

    // Modal Triggers
    if(this.dom.btnAddStash) {
      this.dom.btnAddStash.addEventListener('click', () => this.openWizard());
      this.dom.btnQuickAddStash.addEventListener('click', () => this.openWizard());
    }

    // Wizard Nav
    if(this.dom.btnCloseWizard) {
      this.dom.btnCloseWizard.addEventListener('click', () => this.closeWizard());
      this.dom.btnCancel.addEventListener('click', () => this.closeWizard());
      this.dom.btnNext.addEventListener('click', () => this.nextStep());
      this.dom.btnPrev.addEventListener('click', () => this.prevStep());
      this.dom.stashForm.addEventListener('submit', (e) => this.saveStashEntry(e));
    }

    // Color hex sync
    if(this.dom.fColorHex) {
      this.dom.fColorHex.addEventListener('input', (e) => {
        this.dom.fColorHexText.value = e.target.value.toUpperCase();
      });
    }

    // Sorting
    if(this.dom.sortSelect) {
      const savedSort = localStorage.getItem('stashSortPreference') || 'brand_asc';
      this.dom.sortSelect.value = savedSort;
      
      this.dom.sortSelect.addEventListener('change', (e) => {
        localStorage.setItem('stashSortPreference', e.target.value);
        this.renderGrid();
      });
    }

    // Autocomplete events
    this.setupAutocomplete(this.dom.fBrand, 'brand', this.dom.autoBrand);
    this.setupAutocomplete(this.dom.fName, 'name', this.dom.autoName);
    this.setupAutocomplete(this.dom.fLocation, 'location', this.dom.autoLocation);

    // Allocation UI
    if(this.dom.btnAllocate) {
      console.log("StashManager: binding event listeners to allocate elements");
      this.dom.btnAllocate.addEventListener('click', () => {
        console.log("StashManager: btnAllocate clicked");
        this.openAllocateModal();
      });
      this.dom.btnCloseAllocate.addEventListener('click', () => this.closeAllocateModal());
      this.dom.btnCancelAllocate.addEventListener('click', () => this.closeAllocateModal());
      this.dom.btnSaveAllocate.addEventListener('click', () => this.confirmAllocation());
      if (this.dom.btnRemoveAllocation) {
        this.dom.btnRemoveAllocation.addEventListener('click', () => this.removeAllocation());
      }
      
      this.dom.allocSelect.addEventListener('change', () => this.updateAllocateHint());
    } else {
      console.warn("StashManager: btnAllocate is NULL!");
    }
  },

  switchTab(tab) {
    if (tab === 'projects') {
      this.dom.tabProjects.classList.add('active');
      this.dom.tabStash.classList.remove('active');
      this.dom.secProjects.classList.remove('hidden');
      this.dom.secStash.classList.add('hidden');
    } else {
      this.dom.tabStash.classList.add('active');
      this.dom.tabProjects.classList.remove('active');
      this.dom.secStash.classList.remove('hidden');
      this.dom.secProjects.classList.add('hidden');
      this.loadStash();
    }
  },

  async loadStash() {
    if (!window.DBManager) return;
    try {
      this.stash = await window.DBManager.getAllStash();
      this.renderGrid();
      if (window.App && typeof window.App.renderProjectsGrid === 'function') {
        window.App.renderProjectsGrid();
      }
    } catch (err) {
      console.warn("Stash DB not ready yet or error loading.", err);
    }
  },

  renderGrid() {
    if (!this.dom.stashGrid) return;
    this.dom.stashGrid.innerHTML = '';
    
    if (this.stash.length === 0) {
      this.dom.stashGrid.classList.add('hidden');
      this.dom.stashEmptyState.classList.remove('hidden');
      return;
    }

    this.dom.stashGrid.classList.remove('hidden');
    this.dom.stashEmptyState.classList.add('hidden');

    const sortPref = localStorage.getItem('stashSortPreference') || 'brand_asc';
    const weightOrder = ['Lace', 'Fingering', 'Sport', 'DK', 'Worsted', 'Aran', 'Bulky', 'Super Bulky'];
    
    const sortedStash = [...this.stash].sort((a, b) => {
      switch (sortPref) {
        case 'brand_asc':
          return (a.brand || '').localeCompare(b.brand || '') || (a.name || '').localeCompare(b.name || '');
        case 'brand_desc':
          return (b.brand || '').localeCompare(a.brand || '') || (b.name || '').localeCompare(a.name || '');
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'date_desc':
          return new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0);
        case 'date_asc':
          return new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0);
        case 'weight_desc': {
          const wA = a.unitType === 'g' ? (a.quantityAvailable || 0) : ((a.quantityAvailable || 0) * (a.skeinWeight || 0));
          const wB = b.unitType === 'g' ? (b.quantityAvailable || 0) : ((b.quantityAvailable || 0) * (b.skeinWeight || 0));
          return wB - wA;
        }
        case 'weight_asc': {
          const wA = a.unitType === 'g' ? (a.quantityAvailable || 0) : ((a.quantityAvailable || 0) * (a.skeinWeight || 0));
          const wB = b.unitType === 'g' ? (b.quantityAvailable || 0) : ((b.quantityAvailable || 0) * (b.skeinWeight || 0));
          return wA - wB;
        }
        case 'skeins_desc': {
          const sA = a.unitType === 'g' ? (a.skeinWeight ? (a.quantityAvailable || 0) / a.skeinWeight : 0) : (a.quantityAvailable || 0);
          const sB = b.unitType === 'g' ? (b.skeinWeight ? (b.quantityAvailable || 0) / b.skeinWeight : 0) : (b.quantityAvailable || 0);
          return sB - sA;
        }
        case 'skeins_asc': {
          const sA = a.unitType === 'g' ? (a.skeinWeight ? (a.quantityAvailable || 0) / a.skeinWeight : 0) : (a.quantityAvailable || 0);
          const sB = b.unitType === 'g' ? (b.skeinWeight ? (b.quantityAvailable || 0) / b.skeinWeight : 0) : (b.quantityAvailable || 0);
          return sA - sB;
        }
        case 'category_asc': {
          const idxA = weightOrder.indexOf(a.weight);
          const idxB = weightOrder.indexOf(b.weight);
          const wA = idxA === -1 ? 99 : idxA;
          const wB = idxB === -1 ? 99 : idxB;
          return wA - wB || (a.brand || '').localeCompare(b.brand || '');
        }
        default:
          return (a.brand || '').localeCompare(b.brand || '');
      }
    });

    sortedStash.forEach(yarn => {
      const card = document.createElement('div');
      card.className = 'yarn-card';
      
      const unit = yarn.unitType || 'g';
      let availableText = '';
      let totalM = 0;
      
      if (unit === 'g') {
        const availG = typeof yarn.quantityAvailable === 'number' ? Math.round(yarn.quantityAvailable) : yarn.quantityAvailable;
        const totalG = typeof yarn.quantityTotal === 'number' ? Math.round(yarn.quantityTotal) : yarn.quantityTotal;
        availableText = `${availG}g / ${totalG}g`;
        if (yarn.skeinWeight) {
          const estSkeins = (yarn.quantityAvailable / yarn.skeinWeight).toFixed(1);
          availableText += ` (~${estSkeins} sk)`;
        }
        const metersPerG = yarn.metersPerGram || (yarn.skeinLength && yarn.skeinWeight ? (yarn.skeinLength / yarn.skeinWeight) : 0);
        totalM = metersPerG ? Math.round(yarn.quantityAvailable * metersPerG) : 0;
      } else {
        // Skeins-only fallback
        const skeinsAvail = typeof yarn.quantityAvailable === 'number' ? parseFloat(yarn.quantityAvailable.toFixed(1)) : yarn.quantityAvailable;
        const skeinsTotal = typeof yarn.quantityTotal === 'number' ? parseFloat(yarn.quantityTotal.toFixed(1)) : yarn.quantityTotal;
        availableText = `${skeinsAvail} / ${skeinsTotal} skeins`;
        totalM = yarn.skeinLength ? Math.round(yarn.quantityAvailable * yarn.skeinLength) : 0;
      }
      
      card.innerHTML = `
        <div class="yarn-card-swatch" style="background-color: ${yarn.colorHex || '#ddd'}"></div>
        <div class="yarn-card-label" style="border-bottom: 3px solid ${yarn.colorHex || '#ddd'}">
          <div class="yarn-card-brand">${yarn.brand}</div>
          <div class="yarn-card-name">${yarn.name}</div>
          <div class="yarn-card-colorway">
            <div class="yarn-color-circle" style="background-color: ${yarn.colorHex || '#ddd'}"></div>
            ${yarn.colorway} (Lot: ${yarn.dyeLot || 'N/A'})
          </div>
          
          <div class="yarn-card-stats">
            <div class="yarn-stat">
              <span class="yarn-stat-label">Weight</span>
              <span>${yarn.weight}</span>
            </div>
            <div class="yarn-stat">
              <span class="yarn-stat-label">Available</span>
              <span style="font-weight:bold; color: var(--color-primary)">${availableText}</span>
            </div>
            <div class="yarn-stat">
              <span class="yarn-stat-label">Total Length</span>
              <span>${totalM ? totalM + 'm' : 'N/A'}</span>
            </div>
            <div class="yarn-stat" style="width: 100%;">
              <span class="yarn-stat-label">Location</span>
              <span>${yarn.location || 'Unknown'}</span>
            </div>
          </div>
        </div>
        <div class="yarn-card-actions">
          <button class="btn btn-secondary small btn-edit-yarn" data-id="${yarn.id}">Edit</button>
          <button class="btn btn-secondary small btn-dup-yarn" data-id="${yarn.id}">Duplicate</button>
          <button class="btn btn-danger small btn-del-yarn" data-id="${yarn.id}" style="margin-left: auto;">Delete</button>
        </div>
      `;
      
      // Bind actions
      card.querySelector('.btn-edit-yarn').addEventListener('click', () => this.openWizard(yarn));
      card.querySelector('.btn-dup-yarn').addEventListener('click', () => this.openWizard(yarn, true));
      card.querySelector('.btn-del-yarn').addEventListener('click', () => this.deleteYarn(yarn.id));

      this.dom.stashGrid.appendChild(card);
    });
  },

  // -------------------------
  // WIZARD LOGIC
  // -------------------------
  openWizard(yarn = null, isDuplicate = false) {
    this.dom.modalWizard.classList.add('active');
    this.dom.stashForm.reset();
    
    // Clear custom color
    this.dom.fColorHex.value = '#8B8C89';
    this.dom.fColorHexText.value = '#8B8C89';
    
    if (yarn) {
      this.dom.fBrand.value = yarn.brand || '';
      this.dom.fName.value = yarn.name || '';
      this.dom.fColorway.value = yarn.colorway || '';
      this.dom.fColorHex.value = yarn.colorHex || '#8B8C89';
      this.dom.fColorHexText.value = yarn.colorHex || '#8B8C89';
      this.dom.fWeight.value = yarn.weight || 'Worsted';
      this.dom.fDyeLot.value = yarn.dyeLot || '';
      this.dom.fFibers.value = yarn.fibers || '';
      this.dom.fSkeinWeight.value = yarn.skeinWeight || '';
      this.dom.fSkeinLength.value = yarn.skeinLength || '';
      // Prefill quantitySkeins, fall back to quantityTotal if it was skein-based or just default to 1
      const defaultSkeins = yarn.unitType === 'skeins' ? (yarn.quantityTotal || 1) : (yarn.quantitySkeins || 1);
      this.dom.fQuantitySkeins.value = isDuplicate ? 1 : defaultSkeins;
      this.dom.fQuantityWeight.value = isDuplicate ? '' : (yarn.quantityWeight || '');
      this.dom.fLocation.value = yarn.location || '';
      this.dom.fNotes.value = yarn.notes || '';
      
      if (isDuplicate) {
        this.editingYarnId = null;
        this.dom.wizardTitle.textContent = 'Duplicate Yarn Entry';
        // Clear color/lot for duplicates
        this.dom.fColorway.value = '';
        this.dom.fDyeLot.value = '';
      } else {
        this.editingYarnId = yarn.id;
        this.dom.wizardTitle.textContent = 'Edit Yarn Stash';
      }
    } else {
      this.editingYarnId = null;
      this.dom.wizardTitle.textContent = 'Add Yarn to Stash';
    }

    this.currentWizardStep = 1;
    this.updateWizardUI();
  },

  closeWizard() {
    this.dom.modalWizard.classList.remove('active');
  },

  updateWizardUI() {
    this.dom.step1.classList.toggle('hidden', this.currentWizardStep !== 1);
    this.dom.step2.classList.toggle('hidden', this.currentWizardStep !== 2);
    this.dom.step3.classList.toggle('hidden', this.currentWizardStep !== 3);
    
    this.dom.ind1.classList.toggle('active', this.currentWizardStep === 1);
    this.dom.ind2.classList.toggle('active', this.currentWizardStep === 2);
    this.dom.ind3.classList.toggle('active', this.currentWizardStep === 3);
    
    this.dom.ind1.classList.toggle('completed', this.currentWizardStep > 1);
    this.dom.ind2.classList.toggle('completed', this.currentWizardStep > 2);
    
    this.dom.btnPrev.classList.toggle('hidden', this.currentWizardStep === 1);
    this.dom.btnNext.classList.toggle('hidden', this.currentWizardStep === 3);
    this.dom.btnSave.classList.toggle('hidden', this.currentWizardStep !== 3);
  },

  async nextStep() {
    // Basic validation
    if (this.currentWizardStep === 1) {
      if (!this.dom.fBrand.value || !this.dom.fName.value || !this.dom.fColorway.value) {
        await window.Dialogs.alert("Please fill out Brand, Name, and Colorway.");
        return;
      }
    }
    if (this.currentWizardStep < 3) {
      this.currentWizardStep++;
      this.updateWizardUI();
    }
  },

  prevStep() {
    if (this.currentWizardStep > 1) {
      this.currentWizardStep--;
      this.updateWizardUI();
    }
  },

  async saveStashEntry(e) {
    e.preventDefault();
    
    const skeinWeight = parseFloat(this.dom.fSkeinWeight.value) || null;
    const skeinLength = parseFloat(this.dom.fSkeinLength.value) || null;
    
    const quantitySkeinsVal = this.dom.fQuantitySkeins.value.trim();
    let quantitySkeins = quantitySkeinsVal !== '' ? parseFloat(quantitySkeinsVal) : null;
    
    const quantityWeightVal = this.dom.fQuantityWeight.value.trim();
    const quantityWeight = quantityWeightVal !== '' ? parseFloat(quantityWeightVal) : null;
    
    if ((quantitySkeins === null || isNaN(quantitySkeins) || quantitySkeins <= 0) && 
        (quantityWeight === null || isNaN(quantityWeight) || quantityWeight <= 0)) {
      await window.Dialogs.alert("Please input either the number of skeins or the total weight.");
      return;
    }

    if (quantitySkeins === null || isNaN(quantitySkeins) || quantitySkeins === 0) {
      if (quantityWeight !== null && skeinWeight) {
        quantitySkeins = quantityWeight / skeinWeight;
      } else {
        quantitySkeins = 0;
      }
    }
    
    const metersPerGram = (skeinWeight && skeinLength) ? (skeinLength / skeinWeight) : null;
    
    let unitType = 'skeins';
    let quantityTotal = 0;
    
    if (skeinWeight || quantityWeight !== null) {
      unitType = 'g';
      quantityTotal = quantityWeight !== null ? quantityWeight : (quantitySkeins * skeinWeight);
    } else {
      unitType = 'skeins';
      quantityTotal = quantitySkeins;
    }

    const yarnData = {
      id: this.editingYarnId || crypto.randomUUID(),
      brand: this.dom.fBrand.value.trim(),
      name: this.dom.fName.value.trim(),
      colorway: this.dom.fColorway.value.trim(),
      colorHex: this.dom.fColorHex.value,
      weight: this.dom.fWeight.value,
      dyeLot: this.dom.fDyeLot.value.trim(),
      fibers: this.dom.fFibers.value.trim(),
      
      skeinWeight,
      skeinLength,
      quantitySkeins,
      quantityWeight,
      metersPerGram,
      
      quantityTotal,
      unitType,
      location: this.dom.fLocation.value.trim(),
      notes: this.dom.fNotes.value.trim(),
      dateAdded: new Date().toISOString()
    };

    // If editing, preserve allocations and calculate available
    if (this.editingYarnId) {
      const existing = this.stash.find(y => y.id === this.editingYarnId);
      yarnData.allocations = existing.allocations || [];
      const allocatedQty = yarnData.allocations.reduce((sum, a) => sum + a.quantity, 0);
      yarnData.quantityAvailable = yarnData.quantityTotal - allocatedQty;
      yarnData.dateAdded = existing.dateAdded || yarnData.dateAdded; 
    } else {
      yarnData.allocations = [];
      yarnData.quantityAvailable = yarnData.quantityTotal;
    }
    
    if (yarnData.quantityAvailable < 0) {
      await window.Dialogs.alert("Error: Total quantity cannot be less than the amount currently allocated to projects.");
      return;
    }

    try {
      await window.DBManager.saveStash(yarnData);
      this.closeWizard();
      this.loadStash();
    } catch (err) {
      await window.Dialogs.alert("Error saving yarn: " + err.message);
    }
  },

  async deleteYarn(id) {
    if (await window.Dialogs.confirm("Are you sure you want to permanently delete this yarn from your stash?")) {
      try {
        await window.DBManager.deleteStash(id);
        this.loadStash();
      } catch (err) {
        await window.Dialogs.alert("Error deleting yarn.");
      }
    }
  },

  // -------------------------
  // AUTOCOMPLETE
  // -------------------------
  setupAutocomplete(inputElement, fieldKey, dropdownElement) {
    if (!inputElement || !dropdownElement) return;

    // Bootstrap lists for brand and location autocomplete
    const brandBootstrap = [
      "Drops", "Sandnes Garn", "Viking of Norway", "Malabrigo", "Rauma Garn",
      "Järbo", "Filcolana", "Hobbii", "Rowan", "Lana Grossa", "Schachenmayr",
      "Cascade Yarns", "Madelinetosh", "Lion Brand", "Bernat", "Caron",
      "Red Heart", "Knit Picks", "Paintbox Yarns", "Debbie Bliss", "Noro",
      "BC Garn", "Istex (Lopi)", "Novita", "Dale Garn"
    ];

    const locationBootstrap = [
      "Blue Bin", "Red Box", "Stash Box", "Craft Room", "Storage Closet",
      "Shelf A", "Shelf B", "Under Bed Drawer", "Yarn Basket"
    ];

    inputElement.addEventListener('input', () => {
      const val = inputElement.value.toLowerCase();
      dropdownElement.innerHTML = '';
      if (!val) {
        dropdownElement.classList.add('hidden');
        return;
      }

      // Get unique values from user's current stash
      const dbValues = this.stash.map(y => y[fieldKey]).filter(Boolean);
      let bootstrapValues = [];
      if (fieldKey === 'brand') {
        bootstrapValues = brandBootstrap;
      } else if (fieldKey === 'location') {
        bootstrapValues = locationBootstrap;
      }

      // Combine user entries and bootstrapped values, and filter matches
      const combined = [...new Set([...dbValues, ...bootstrapValues])];
      const matches = combined.filter(v => v.toLowerCase().includes(val));

      if (matches.length > 0) {
        dropdownElement.classList.remove('hidden');
        matches.forEach(match => {
          const li = document.createElement('li');
          li.textContent = match;
          li.addEventListener('click', () => {
            inputElement.value = match;
            dropdownElement.classList.add('hidden');
          });
          dropdownElement.appendChild(li);
        });
      } else {
        dropdownElement.classList.add('hidden');
      }
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (e.target !== inputElement) {
        dropdownElement.classList.add('hidden');
      }
    });
  },

  formatAllocation(yarn, projectId) {
    const alloc = yarn.allocations.find(a => a.projectId === projectId);
    if (!alloc) return '';
    
    const unit = yarn.unitType || 'g';
    if (yarn.skeinWeight) {
      if (unit === 'g') {
        const grams = alloc.quantity;
        const skeins = grams / yarn.skeinWeight;
        return `${Math.round(grams)}g (~${skeins.toFixed(1)} sk)`;
      } else {
        const skeins = alloc.quantity;
        const grams = skeins * yarn.skeinWeight;
        return `${skeins.toFixed(1)} sk (~${Math.round(grams)}g)`;
      }
    } else {
      if (unit === 'g') {
        return `${Math.round(alloc.quantity)}g`;
      } else {
        return `${parseFloat(alloc.quantity.toFixed(1))} sk`;
      }
    }
  },

  // -------------------------
  // PROJECT ALLOCATION
  // -------------------------
  refreshProjectYarnPanel(projectId) {
    if (!this.dom.projectYarnList) return;
    
    this.dom.projectYarnList.innerHTML = '';
    
    // Find all yarns that have an allocation for this projectId
    const allocatedYarns = this.stash.filter(y => y.allocations && y.allocations.some(a => a.projectId === projectId));

    if (allocatedYarns.length === 0) {
      this.dom.projectYarnList.innerHTML = '<p class="empty-notes-text">No yarn allocated to this project yet.</p>';
      return;
    }

    allocatedYarns.forEach(yarn => {
      const alloc = yarn.allocations.find(a => a.projectId === projectId);
      const item = document.createElement('div');
      item.className = 'project-yarn-item';
      item.style.cursor = 'pointer';
      const allocText = this.formatAllocation(yarn, projectId);
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="project-yarn-title" style="display:flex; align-items:center; gap:6px;">
            <div class="yarn-color-circle" style="background-color: ${yarn.colorHex || '#ddd'}; width:10px; height:10px;"></div>
            ${yarn.brand} ${yarn.name}
          </div>
          <span style="font-weight:bold; font-size:0.85rem;">${allocText}</span>
        </div>
        <div class="project-yarn-meta">${yarn.colorway}</div>
        <button class="btn-text-only" style="font-size:0.75rem; color:var(--color-danger); text-align:left; padding:0;" data-id="${yarn.id}">Remove</button>
      `;

      item.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeAllocation(yarn, projectId);
      });
      item.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        this.openAllocateModal(projectId, yarn.id);
      });
      this.dom.projectYarnList.appendChild(item);
    });
  },

  async openAllocateModal(projectId = null, editYarnId = null) {
    this.currentAllocateProjectId = projectId;
    this.editingAllocation = null;
    
    // Check if we are in edit mode
    if (editYarnId) {
      const targetYarn = this.stash.find(y => y.id === editYarnId);
      if (targetYarn) {
        const alloc = targetYarn.allocations.find(a => a.projectId === projectId);
        if (alloc) {
          this.editingAllocation = {
            yarnId: editYarnId,
            projectId: projectId,
            currentQty: alloc.quantity
          };
        }
      }
    }

    // Populate select with available yarn (or include the editing yarn even if available qty is 0)
    this.dom.allocSelect.innerHTML = '';
    const availableYarn = this.stash.filter(y => y.quantityAvailable > 0 || (this.editingAllocation && y.id === editYarnId));
    
    if (availableYarn.length === 0) {
      await window.Dialogs.alert("No yarn available in your stash to allocate.");
      return;
    }

    availableYarn.forEach(yarn => {
      const opt = document.createElement('option');
      opt.value = yarn.id;
      const unit = yarn.unitType || 'g';
      const formattedAvail = typeof yarn.quantityAvailable === 'number' ? parseFloat(yarn.quantityAvailable.toFixed(1)) : yarn.quantityAvailable;
      opt.textContent = `${yarn.brand} ${yarn.name} - ${yarn.colorway} (${formattedAvail}${unit} avail)`;
      opt.dataset.max = yarn.quantityAvailable;
      this.dom.allocSelect.appendChild(opt);
    });

    this.dom.allocSelect.disabled = false;

    if (this.dom.btnRemoveAllocation) {
      if (this.editingAllocation) {
        this.dom.btnRemoveAllocation.classList.remove('hidden');
      } else {
        this.dom.btnRemoveAllocation.classList.add('hidden');
      }
    }

    if (this.editingAllocation) {
      this.dom.allocSelect.value = editYarnId;
    }

    this.updateAllocateHint();
    this.dom.modalAllocate.classList.add('active');
  },

  closeAllocateModal() {
    this.dom.modalAllocate.classList.remove('active');
    this.dom.allocSelect.disabled = false;
    this.currentAllocateProjectId = null;
    this.editingAllocation = null;
  },

  updateAllocateHint() {
    const selected = this.dom.allocSelect.options[this.dom.allocSelect.selectedIndex];
    if (selected) {
      const yarn = this.stash.find(y => y.id === selected.value);
      if (!yarn) return;

      const unit = yarn.unitType || 'g';
      let max = parseFloat(selected.dataset.max);
      
      if (this.editingAllocation && selected.value === this.editingAllocation.yarnId) {
        max = yarn.quantityAvailable + this.editingAllocation.currentQty;
        this.dom.allocHint.textContent = `Available to allocate: ${parseFloat(max.toFixed(1))}${unit} (Current: ${parseFloat(this.editingAllocation.currentQty.toFixed(1))}${unit})`;
      } else {
        this.dom.allocHint.textContent = `Available: ${parseFloat(max.toFixed(1))}${unit}`;
      }

      // Reset input values
      this.dom.allocQty.value = '';
      this.dom.allocSkeins.value = '';

      if (yarn.skeinWeight) {
        // Show both weight and skeins inputs
        this.dom.allocSkeinsGroup.classList.remove('hidden');
        this.dom.allocWeightGroup.classList.remove('hidden');

        // Set max attribute limits
        if (unit === 'g') {
          this.dom.allocQty.max = max;
          this.dom.allocSkeins.max = (max / yarn.skeinWeight).toFixed(2);
        } else {
          this.dom.allocSkeins.max = max;
          this.dom.allocQty.max = (max * yarn.skeinWeight).toFixed(1);
        }

        // Dynamically sync inputs
        this.dom.allocSkeins.oninput = () => {
          const s = parseFloat(this.dom.allocSkeins.value);
          this.dom.allocQty.value = isNaN(s) ? '' : parseFloat((s * yarn.skeinWeight).toFixed(1));
        };
        this.dom.allocQty.oninput = () => {
          const w = parseFloat(this.dom.allocQty.value);
          this.dom.allocSkeins.value = isNaN(w) ? '' : parseFloat((w / yarn.skeinWeight).toFixed(2));
        };

        // Set initial values
        if (this.editingAllocation && selected.value === this.editingAllocation.yarnId) {
          if (unit === 'g') {
            this.dom.allocQty.value = this.editingAllocation.currentQty;
            this.dom.allocSkeins.value = (this.editingAllocation.currentQty / yarn.skeinWeight).toFixed(2);
          } else {
            this.dom.allocSkeins.value = this.editingAllocation.currentQty;
            this.dom.allocQty.value = (this.editingAllocation.currentQty * yarn.skeinWeight).toFixed(1);
          }
        } else {
          this.dom.allocSkeins.value = 1;
          this.dom.allocQty.value = yarn.skeinWeight;
        }
      } else {
        // No skeinWeight spec
        const isEditingCurrent = this.editingAllocation && selected.value === this.editingAllocation.yarnId;
        if (unit === 'g') {
          this.dom.allocSkeinsGroup.classList.add('hidden');
          this.dom.allocWeightGroup.classList.remove('hidden');
          this.dom.allocQty.max = max;
          this.dom.allocQty.value = isEditingCurrent ? this.editingAllocation.currentQty : Math.min(50, max);
          this.dom.allocQty.oninput = null;
        } else {
          this.dom.allocSkeinsGroup.classList.remove('hidden');
          this.dom.allocWeightGroup.classList.add('hidden');
          this.dom.allocSkeins.max = max;
          this.dom.allocSkeins.value = isEditingCurrent ? this.editingAllocation.currentQty : Math.min(1, max);
          this.dom.allocSkeins.oninput = null;
        }
      }
    }
  },

  async confirmAllocation() {
    const yarnId = this.dom.allocSelect.value;
    if (!yarnId) return;

    const yarn = this.stash.find(y => y.id === yarnId);
    if (!yarn) return;

    const unit = yarn.unitType || 'g';
    let qty = 0;

    if (yarn.skeinWeight) {
      if (unit === 'g') {
        qty = parseFloat(this.dom.allocQty.value);
        if (isNaN(qty) && !isNaN(parseFloat(this.dom.allocSkeins.value))) {
          qty = parseFloat(this.dom.allocSkeins.value) * yarn.skeinWeight;
        }
      } else {
        qty = parseFloat(this.dom.allocSkeins.value);
        if (isNaN(qty) && !isNaN(parseFloat(this.dom.allocQty.value))) {
          qty = parseFloat(this.dom.allocQty.value) / yarn.skeinWeight;
        }
      }
    } else {
      qty = unit === 'g' ? parseFloat(this.dom.allocQty.value) : parseFloat(this.dom.allocSkeins.value);
    }
    
    if (isNaN(qty) || qty <= 0) {
      await window.Dialogs.alert("Please enter a valid quantity.");
      return;
    }

    const projectId = this.currentAllocateProjectId || (window.App && window.App.activeProject ? window.App.activeProject.id : null);
    if (!projectId) {
      await window.Dialogs.alert("No project selected.");
      return;
    }

    const existingAlloc = yarn.allocations.find(a => a.projectId === projectId);
    
    if (this.editingAllocation && yarnId === this.editingAllocation.yarnId) {
      const diff = qty - this.editingAllocation.currentQty;
      if (diff > yarn.quantityAvailable) {
        await window.Dialogs.alert("Quantity exceeds available stock.");
        return;
      }
      if (existingAlloc) {
        existingAlloc.quantity = qty;
      }
      yarn.quantityAvailable -= diff;
    } else {
      if (qty > yarn.quantityAvailable) {
        await window.Dialogs.alert("Quantity exceeds available stock.");
        return;
      }

      // If we are editing, but switched to a different yarn, we must remove the old allocation!
      if (this.editingAllocation && yarnId !== this.editingAllocation.yarnId) {
        const oldYarn = this.stash.find(y => y.id === this.editingAllocation.yarnId);
        if (oldYarn) {
          const oldAllocIndex = oldYarn.allocations.findIndex(a => a.projectId === projectId);
          if (oldAllocIndex > -1) {
            oldYarn.quantityAvailable += oldYarn.allocations[oldAllocIndex].quantity;
            oldYarn.allocations.splice(oldAllocIndex, 1);
            await window.DBManager.saveStash(oldYarn);
          }
        }
      }

      if (existingAlloc) {
        existingAlloc.quantity += qty;
      } else {
        yarn.allocations.push({ projectId, quantity: qty });
      }
      yarn.quantityAvailable -= qty;
    }

    try {
      await window.DBManager.saveStash(yarn);
      this.closeAllocateModal();
      
      // Refresh sidebar if it's active
      if (window.App && window.App.activeProject && window.App.activeProject.id === projectId) {
        this.refreshProjectYarnPanel(projectId);
      }
      // Refresh dashboard projects grid
      if (window.App) {
        window.App.renderProjectsGrid();
      }
    } catch (err) {
      await window.Dialogs.alert("Error allocating yarn.");
    }
  },

  async removeAllocation(yarn, projectId) {
    if (!yarn && this.editingAllocation) {
      yarn = this.stash.find(y => y.id === this.editingAllocation.yarnId);
      projectId = this.editingAllocation.projectId;
    }
    
    if (!yarn || !projectId) return;

    if (this.dom.modalAllocate.classList.contains('active')) {
      const confirmed = await window.Dialogs.confirm("Remove this yarn allocation from the project?");
      if (!confirmed) return;
    }

    const allocIndex = yarn.allocations.findIndex(a => a.projectId === projectId);
    if (allocIndex > -1) {
      const alloc = yarn.allocations[allocIndex];
      yarn.quantityAvailable += alloc.quantity;
      yarn.allocations.splice(allocIndex, 1);
      
      try {
        await window.DBManager.saveStash(yarn);
        if (this.dom.modalAllocate.classList.contains('active')) {
          this.closeAllocateModal();
        }
        this.refreshProjectYarnPanel(projectId);
        if (window.App) {
          window.App.renderProjectsGrid();
        }
      } catch(err) {
        await window.Dialogs.alert("Error removing allocation.");
      }
    }
  }

};

window.StashManager = StashManager;
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    StashManager.init();
  });
} else {
  StashManager.init();
}
