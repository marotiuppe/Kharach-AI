  // Date & Month Formatting Helpers (Omit year for current FY, show month names)
  const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function formatDisplayDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return dateStr || '-';
    const parts = dateStr.trim().split('-');
    if (parts.length !== 3) return dateStr;

    const year = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(monthIdx) || isNaN(day) || monthIdx < 0 || monthIdx > 11) {
      return dateStr;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
    const fyEndYear = fyStartYear + 1;

    const isCurrentFY = (year === fyStartYear && monthIdx >= 3) || (year === fyEndYear && monthIdx < 3) || year === currentYear;
    const monthShort = MONTH_NAMES_SHORT[monthIdx];

    if (isCurrentFY) {
      return `${day} ${monthShort}`;
    }
    return `${day} ${monthShort} ${year}`;
  }

  function formatDisplayMonth(monthStr) {
    if (!monthStr || typeof monthStr !== 'string') return monthStr || '';
    const parts = monthStr.trim().split('-');
    if (parts.length < 2) return monthStr;

    const year = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;

    if (isNaN(year) || isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) {
      return monthStr;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
    const fyEndYear = fyStartYear + 1;

    const isCurrentFY = (year === fyStartYear && monthIdx >= 3) || (year === fyEndYear && monthIdx < 3) || year === currentYear;
    const fullMonth = MONTH_NAMES_FULL[monthIdx];

    if (isCurrentFY) {
      return fullMonth;
    }
    return `${fullMonth} '${String(year).slice(2)}`;
  }

document.addEventListener('DOMContentLoaded', () => {
  // DOM Element References
  const landingScreen = document.getElementById('landing-screen');
  const authScreen = document.getElementById('auth-screen');
  const dashboardScreen = document.getElementById('dashboard-screen');
  const navPublicSection = document.getElementById('nav-public-section');
  const navUserSection = document.getElementById('nav-user-section');
  const navBrand = document.getElementById('nav-brand');
  const userDisplayName = document.getElementById('user-display-name');
  const btnLogout = document.getElementById('btn-logout');

  // Landing & Navigation Action Buttons
  const btnNavLogin = document.getElementById('btn-nav-login');
  const btnNavSignup = document.getElementById('btn-nav-signup');
  const btnNavLanding = document.getElementById('btn-nav-landing');
  const btnNavDashboard = document.getElementById('btn-nav-dashboard');
  const btnHeroSignup = document.getElementById('btn-hero-signup');
  const btnHeroLogin = document.getElementById('btn-hero-login');
  const btnSecuritySignup = document.getElementById('btn-security-signup');
  const btnInstallPwa = document.getElementById('btn-install-pwa');

  // PWA Service Worker Registration & Prompt
  let deferredPrompt = null;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('PWA ServiceWorker failed:', err);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnInstallPwa) {
      btnInstallPwa.classList.remove('hidden');
    }
  });

  if (btnInstallPwa) {
    btnInstallPwa.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        btnInstallPwa.classList.add('hidden');
      }
      deferredPrompt = null;
    });
  }

  window.addEventListener('appinstalled', () => {
    if (btnInstallPwa) {
      btnInstallPwa.classList.add('hidden');
    }
    deferredPrompt = null;
  });

  // Lightbox Modal Elements
  const imageLightboxModal = document.getElementById('image-lightbox-modal');
  const lightboxFullImage = document.getElementById('lightbox-full-image');
  const btnCloseLightbox = document.getElementById('btn-close-lightbox');

  // Admin Settings Elements
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const settingsModal = document.getElementById('settings-modal');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const formAdminSettings = document.getElementById('form-admin-settings');
  const settingsSaveMsg = document.getElementById('settings-save-msg');

  // Test Models Elements
  const btnTestModels = document.getElementById('btn-test-models');
  const modelsTestResults = document.getElementById('models-test-results');

  // Auth Elements
  const tabLoginBtn = document.getElementById('tab-login-btn');
  const tabSignupBtn = document.getElementById('tab-signup-btn');
  const formLogin = document.getElementById('form-login');
  const formSignup = document.getElementById('form-signup');
  const authErrorMsg = document.getElementById('auth-error-msg');
  const signupMsg = document.getElementById('signup-msg');

  const signupEmailInput = document.getElementById('signup-email');
  const signupUsernameInput = document.getElementById('signup-username');
  const btnSendOtp = document.getElementById('btn-send-otp');
  const otpSendStatus = document.getElementById('otp-send-status');
  const otpSection = document.getElementById('otp-section');

  // AI Chat & Staging Elements
  const aiChatCard = document.getElementById('ai-chat-card');
  const chatModelSelector = document.getElementById('chat-model-selector');
  const btnClearChat = document.getElementById('btn-clear-chat');
  const chatMessagesContainer = document.getElementById('chat-messages-container');
  const analysisSpinner = document.getElementById('analysis-spinner');

  const stagedPreviewWrapper = document.getElementById('staged-preview-wrapper');
  const stagedPreviewsContainer = document.getElementById('staged-previews-container');
  const btnClearStaged = document.getElementById('btn-clear-staged');

  const attachmentMenuPopup = document.getElementById('attachment-menu-popup');
  const btnToggleAttachment = document.getElementById('btn-toggle-attachment');
  const attachOptionFile = document.getElementById('attach-option-file');
  const attachOptionLibrary = document.getElementById('attach-option-library');
  const existingFilesDropdown = document.getElementById('existing-files-dropdown');

  const chatInputPrompt = document.getElementById('chat-input-prompt');
  const btnSendChat = document.getElementById('btn-send-chat');
  const fileInput = document.getElementById('file-input');

  // Metric Elements
  const kpiCredited = document.getElementById('kpi-credited');
  const kpiDebited = document.getElementById('kpi-debited');
  const kpiBalance = document.getElementById('kpi-balance');
  const kpiCount = document.getElementById('kpi-count');

  // Tab Elements
  const tabBtnLedger = document.getElementById('tab-btn-ledger');
  const tabBtnAnalytics = document.getElementById('tab-btn-analytics');
  const tabBtnMerchants = document.getElementById('tab-btn-merchants');
  const tabBtnCashflow = document.getElementById('tab-btn-cashflow');
  const tabBtnRecurring = document.getElementById('tab-btn-recurring');
  const tabBtnBudget = document.getElementById('tab-btn-budget');
  const tabBtnLarge = document.getElementById('tab-btn-large');
  const tabBtnUdhar = document.getElementById('tab-btn-udhar');
  const tabBtnGroups = document.getElementById('tab-btn-groups');
  const tabBtnAdminAnalytics = document.getElementById('tab-btn-admin-analytics');
  const tabBtnAdminSettings = document.getElementById('tab-btn-admin-settings');

  const tabContentLedger = document.getElementById('tab-content-ledger');
  const tabContentAnalytics = document.getElementById('tab-content-analytics');
  const tabContentMerchants = document.getElementById('tab-content-merchants');
  const tabContentCashflow = document.getElementById('tab-content-cashflow');
  const tabContentRecurring = document.getElementById('tab-content-recurring');
  const tabContentBudget = document.getElementById('tab-content-budget');
  const tabContentLarge = document.getElementById('tab-content-large');
  const tabContentUdhar = document.getElementById('tab-content-udhar');
  const tabContentGroups = document.getElementById('tab-content-groups');
  const tabContentAdminAnalytics = document.getElementById('tab-content-admin-analytics');
  const tabContentAdminSettings = document.getElementById('tab-content-admin-settings');

  // Filter Elements
  const filterType = document.getElementById('filter-type');
  const filterCategory = document.getElementById('filter-category');
  const filterAccount = document.getElementById('filter-account');
  const filterSearch = document.getElementById('filter-search');
  const btnResetFilters = document.getElementById('btn-reset-filters');
  const btnClearAllData = document.getElementById('btn-clear-all-data');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnExportExcel = document.getElementById('btn-export-excel');


  // Table Bodies
  const ledgerTableBody = document.getElementById('ledger-table-body');
  const largeTableBody = document.getElementById('large-table-body');

  // State Management
  let catChartInstance = null;
  let trendChartInstance = null;
  let selectedFiles = [];
  let currentTransactions = [];
  let currentSortField = 'date';
  let currentSortOrder = 'desc';
  let selectedTxIds = new Set();
  let currentPage = 1;
  const PAGE_SIZE = 15;
  let totalFilteredTransactions = [];

  // Bulk Action UI Elements
  const bulkActionsBar = document.getElementById('bulk-actions-bar');
  const bulkSelectedCount = document.getElementById('bulk-selected-count');
  const selectAllTxCheckbox = document.getElementById('select-all-tx');
  const bulkCategorySelect = document.getElementById('bulk-category-select');
  const btnBulkDelete = document.getElementById('btn-bulk-delete');
  const btnBulkClear = document.getElementById('btn-bulk-clear');

  // Theme Toggle Elements & Setup
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const btnUserThemeToggle = document.getElementById('btn-user-theme-toggle');

  function initTheme() {
    const savedTheme = localStorage.getItem('kharach_theme') || 'dark';
    applyTheme(savedTheme);
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (btnThemeToggle) btnThemeToggle.textContent = '☀️';
      if (btnUserThemeToggle) btnUserThemeToggle.textContent = '☀️';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (btnThemeToggle) btnThemeToggle.textContent = '🌙';
      if (btnUserThemeToggle) btnUserThemeToggle.textContent = '🌙';
    }
    localStorage.setItem('kharach_theme', theme);
  }

  function toggleTheme() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    applyTheme(isLight ? 'dark' : 'light');
  }

  if (btnThemeToggle) btnThemeToggle.addEventListener('click', toggleTheme);
  if (btnUserThemeToggle) btnUserThemeToggle.addEventListener('click', toggleTheme);
  initTheme();

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Ctrl+K or Cmd+K: Focus search input
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (filterSearch) {
        filterSearch.focus();
        filterSearch.select();
      }
    }
    // Escape: Close active modals or clear selection
    if (e.key === 'Escape') {
      if (imageLightboxModal && !imageLightboxModal.classList.contains('hidden')) {
        closeLightbox();
      } else if (settingsModal && !settingsModal.classList.contains('hidden')) {
        settingsModal.classList.add('hidden');
      } else if (txModal && !txModal.classList.contains('hidden')) {
        txModal.classList.add('hidden');
      } else if (selectedTxIds.size > 0) {
        clearBulkSelection();
      }
    }
  });

  // Bulk Selection Helpers
  function updateBulkBar() {
    if (!bulkActionsBar || !bulkSelectedCount) return;
    bulkSelectedCount.textContent = selectedTxIds.size;
    if (selectedTxIds.size > 0) {
      bulkActionsBar.classList.remove('hidden');
    } else {
      bulkActionsBar.classList.add('hidden');
      if (bulkCategorySelect) bulkCategorySelect.value = '';
    }

    if (selectAllTxCheckbox) {
      const displayedIds = currentTransactions.map(t => t.id);
      const allSelected = displayedIds.length > 0 && displayedIds.every(id => selectedTxIds.has(id));
      selectAllTxCheckbox.checked = allSelected;
    }
  }

  function clearBulkSelection() {
    selectedTxIds.clear();
    renderSortedLedger();
    updateBulkBar();
  }

  if (selectAllTxCheckbox) {
    selectAllTxCheckbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      currentTransactions.forEach(t => {
        if (isChecked) {
          selectedTxIds.add(t.id);
        } else {
          selectedTxIds.delete(t.id);
        }
      });
      renderSortedLedger();
      updateBulkBar();
    });
  }

  if (btnBulkClear) {
    btnBulkClear.addEventListener('click', clearBulkSelection);
  }

  if (btnBulkDelete) {
    btnBulkDelete.addEventListener('click', async () => {
      if (selectedTxIds.size === 0) return;
      if (!confirm(`Are you sure you want to delete ${selectedTxIds.size} selected transactions?`)) {
        return;
      }

      const formData = new FormData();
      selectedTxIds.forEach(id => formData.append('tx_ids', id));

      try {
        const res = await fetch('/api/transactions/bulk-delete', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) {
          selectedTxIds.clear();
          updateBulkBar();
          fetchFilteredTransactions();
          fetchMetrics();
        } else {
          alert(data.detail || 'Bulk delete failed.');
        }
      } catch (err) {
        alert('Server error during bulk delete.');
      }
    });
  }

  if (bulkCategorySelect) {
    bulkCategorySelect.addEventListener('change', async () => {
      const newCat = bulkCategorySelect.value;
      if (!newCat || selectedTxIds.size === 0) return;

      const formData = new FormData();
      formData.append('category', newCat);
      selectedTxIds.forEach(id => formData.append('tx_ids', id));

      try {
        const res = await fetch('/api/transactions/bulk-category', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) {
          selectedTxIds.clear();
          updateBulkBar();
          fetchFilteredTransactions();
          fetchMetrics();
        } else {
          alert(data.detail || 'Bulk category update failed.');
        }
      } catch (err) {
        alert('Server error during bulk category update.');
      }
    });
  }

  // Check initial authentication
  checkAuthSession();

  // Lightbox Modal Handlers
  function openLightbox(imgSrc) {
    lightboxFullImage.src = imgSrc;
    imageLightboxModal.classList.remove('hidden');
  }

  function closeLightbox() {
    imageLightboxModal.classList.add('hidden');
    lightboxFullImage.src = '';
  }

  btnCloseLightbox.addEventListener('click', closeLightbox);
  imageLightboxModal.addEventListener('click', (e) => {
    if (e.target === imageLightboxModal) {
      closeLightbox();
    }
  });

  // Helper to add files with de-duplication/replace logic
  function addFilesToStaging(newFiles) {
    newFiles.forEach(nf => {
      const existingIdx = selectedFiles.findIndex(sf => sf.size === nf.size && sf.name === nf.name);
      if (existingIdx !== -1) {
        selectedFiles[existingIdx] = nf; // Replace existing duplicate file
      } else {
        selectedFiles.push(nf);
      }
    });
    updateFilePreview();
  }

  // Drag & Drop Handlers — Full-Screen Overlay
  const dropOverlay = document.getElementById('drop-overlay');
  let dragCounter = 0;

  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    if (dropOverlay) dropOverlay.classList.remove('hidden');
    if (aiChatCard) aiChatCard.classList.add('dragover');
  }, false);

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  }, false);

  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      if (dropOverlay) dropOverlay.classList.add('hidden');
      if (aiChatCard) aiChatCard.classList.remove('dragover');
    }
  }, false);

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    if (dropOverlay) dropOverlay.classList.add('hidden');
    if (aiChatCard) aiChatCard.classList.remove('dragover');

    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type.includes('pdf') || f.type.includes('image') || f.name.match(/\.(pdf|png|jpg|jpeg)$/i)
    );
    if (files.length > 0) {
      addFilesToStaging(files);
      // Auto-open chat panel when files are dropped
      const chatEl = document.querySelector('.dashboard-chat-right');
      if (chatEl && chatEl.classList.contains('chat-collapsed')) {
        chatEl.classList.remove('chat-collapsed');
      }
    }
  }, false);

  // Clipboard Ctrl+V Paste Image Handler
  window.addEventListener('paste', (e) => {
    if (!e.clipboardData || !e.clipboardData.items) return;

    const pastedFiles = [];
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      const item = e.clipboardData.items[i];
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          const file = new File([blob], `pasted_${blob.size}.png`, { type: blob.type || 'image/png' });
          pastedFiles.push(file);
        }
      }
    }

    if (pastedFiles.length > 0) {
      addFilesToStaging(pastedFiles);
    }
  });

  btnClearStaged.addEventListener('click', () => {
    selectedFiles = [];
    updateFilePreview();
  });

  function updateFilePreview() {
    if (selectedFiles.length > 0) {
      stagedPreviewWrapper.classList.remove('hidden');

      stagedPreviewsContainer.innerHTML = '';
      selectedFiles.forEach((file, index) => {
        const card = document.createElement('div');
        card.style.cssText = `
          position: relative;
          display: inline-block;
          margin-top: 4px;
          margin-right: 6px;
        `;

        let mediaElement = '';
        if (file.type.startsWith('image/')) {
          const imgUrl = URL.createObjectURL(file);
          mediaElement = `<img src="${imgUrl}" class="staged-thumb-img" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color); display: block; cursor: pointer;" title="Click to view full image" />`;
        } else {
          mediaElement = `<div style="width: 44px; height: 44px; background: rgba(99,102,241,0.2); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">📄</div>`;
        }

        card.innerHTML = `
          ${mediaElement}
          <button data-index="${index}" class="btn-remove-file" style="position: absolute; top: -5px; right: -5px; background: #ef4444; border: 2px solid #0a0c10; color: #ffffff; border-radius: 50%; width: 16px; height: 16px; font-size: 0.6rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
        `;

        stagedPreviewsContainer.appendChild(card);
      });

      // Attach Lightbox click event to thumbnail images
      document.querySelectorAll('.staged-thumb-img').forEach(img => {
        img.addEventListener('click', (e) => {
          openLightbox(e.target.src);
        });
      });

      document.querySelectorAll('.btn-remove-file').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(e.target.getAttribute('data-index'), 10);
          selectedFiles.splice(idx, 1);
          updateFilePreview();
        });
      });

    } else {
      stagedPreviewWrapper.classList.add('hidden');
      stagedPreviewsContainer.innerHTML = '';
    }
  }

  // Existing File Dropdown Change Listener
  existingFilesDropdown.addEventListener('change', () => {
    btnReanalyzeExisting.disabled = !existingFilesDropdown.value;
  });

  // Sortable Table Header Clicks
  document.querySelectorAll('.sortable-header').forEach(header => {
    header.addEventListener('click', () => {
      const field = header.getAttribute('data-sort');
      if (currentSortField === field) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortField = field;
        currentSortOrder = 'asc';
      }
      renderSortedLedger();
    });
  });

  // Filter Change Handlers
  [filterType, filterCategory, filterAccount].forEach(select => {
    if (select) {
      select.addEventListener('change', () => {
        fetchFilteredTransactions();
        fetchMetrics();
      });
    }
  });

  if (filterSearch) {
    filterSearch.addEventListener('input', debounce(() => fetchFilteredTransactions(), 300));
  }

  // Reset All Filters Helper
  function resetAllFilters(triggerFetch = true) {
    if (filterType) filterType.value = 'ALL';
    if (filterCategory) filterCategory.value = 'ALL';
    if (filterAccount) filterAccount.value = 'ALL';
    if (filterSearch) filterSearch.value = '';
    currentSortField = 'date';
    currentSortOrder = 'desc';
    if (triggerFetch) {
      fetchFilteredTransactions();
      fetchMetrics();
    }
  }

  // Reset Filters Action Button
  btnResetFilters.addEventListener('click', () => {
    resetAllFilters(true);
  });

  // Interactive KPI Cards Filtering
  [
    { el: kpiCredited, type: 'CREDIT', title: 'Click to view all CREDIT transactions' },
    { el: kpiDebited, type: 'DEBIT', title: 'Click to view all DEBIT transactions' },
    { el: kpiBalance, type: 'ALL', title: 'Click to view all transactions' },
    { el: kpiCount, type: 'ALL', title: 'Click to view all transactions' }
  ].forEach(item => {
    if (item.el) {
      const card = item.el.closest('.kpi-card');
      if (card) {
        card.style.cursor = 'pointer';
        card.title = item.title;
        card.addEventListener('click', () => {
          resetAllFilters(false);
          filterType.value = item.type;
          switchTab(tabBtnLedger, tabContentLedger, false);
          fetchFilteredTransactions();
        });
      }
    }
  });

  // CSV Export Action
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      window.location.href = '/api/export-csv';
    });
  }

  // Excel Export Action
  if (btnExportExcel) {
    btnExportExcel.addEventListener('click', () => {
      const type = filterType.value;
      const cat = filterCategory.value;
      const acc = filterAccount ? filterAccount.value : 'ALL';
      const search = filterSearch.value;

      const params = new URLSearchParams();
      if (type) params.append('type_filter', type);
      if (cat) params.append('category_filter', cat);
      if (acc) params.append('account_filter', acc);
      if (search) params.append('search_query', search);

      window.location.href = `/api/export-excel?${params.toString()}`;
    });
  }


  // Clear All Transaction Data Action
  btnClearAllData.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete all imported transaction history? This operation cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch('/api/transactions/clear-all', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'All transaction history has been wiped.');
        await loadDashboardData();
      } else {
        alert(data.detail || 'Failed to clear transaction history.');
      }
    } catch (e) {
      alert('Error communicating with server.');
    }
  });

  // Admin Settings Handlers
  async function loadAdminSettings() {
    if (settingsSaveMsg) settingsSaveMsg.classList.add('hidden');
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (res.ok) {
        document.getElementById('admin-gemini-key').value = data.gemini_api_key || '';
        document.getElementById('admin-gemini-model').value = data.gemini_model || 'gemini-flash-latest';
        document.getElementById('admin-smtp-server').value = data.smtp_server || 'smtp.gmail.com';
        document.getElementById('admin-smtp-port').value = data.smtp_port || '587';
        document.getElementById('admin-smtp-user').value = data.smtp_username || '';
        document.getElementById('admin-smtp-pass').value = data.smtp_password || '';
        document.getElementById('admin-smtp-from').value = data.smtp_from_email || '';
        const resendKeyInput = document.getElementById('admin-resend-key');
        if (resendKeyInput) resendKeyInput.value = data.resend_api_key || '';
        const brevoKeyInput = document.getElementById('admin-brevo-key');
        if (brevoKeyInput) brevoKeyInput.value = data.brevo_api_key || '';
        const reqMobileInput = document.getElementById('admin-req-mobile-otp');
        if (reqMobileInput) reqMobileInput.value = data.require_mobile_otp || 'false';
        const saveFilesInput = document.getElementById('admin-save-files');
        if (saveFilesInput) saveFilesInput.value = data.save_uploaded_files || 'false';
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  }

  if (btnOpenSettings) {
    btnOpenSettings.addEventListener('click', () => {
      showAdminSettingsScreen();
    });
  }

  formAdminSettings.addEventListener('submit', async (e) => {
    e.preventDefault();
    settingsSaveMsg.classList.add('hidden');

    const formData = new FormData();
    formData.append('gemini_api_key', document.getElementById('admin-gemini-key').value);
    formData.append('gemini_model', document.getElementById('admin-gemini-model').value);
    formData.append('smtp_server', document.getElementById('admin-smtp-server').value);
    formData.append('smtp_port', document.getElementById('admin-smtp-port').value);
    formData.append('smtp_username', document.getElementById('admin-smtp-user').value);
    formData.append('smtp_password', document.getElementById('admin-smtp-pass').value);
    formData.append('smtp_from_email', document.getElementById('admin-smtp-from').value);
    const resendKeyInput = document.getElementById('admin-resend-key');
    if (resendKeyInput) formData.append('resend_api_key', resendKeyInput.value);
    const brevoKeyInput = document.getElementById('admin-brevo-key');
    if (brevoKeyInput) formData.append('brevo_api_key', brevoKeyInput.value);
    const reqMobileInput = document.getElementById('admin-req-mobile-otp');
    if (reqMobileInput) formData.append('require_mobile_otp', reqMobileInput.value);
    const saveFilesInput = document.getElementById('admin-save-files');
    if (saveFilesInput) formData.append('save_uploaded_files', saveFilesInput.value);

    try {
      const res = await fetch('/api/admin/settings', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        settingsSaveMsg.style.color = 'var(--accent-success)';
        settingsSaveMsg.textContent = 'Settings saved successfully!';
        settingsSaveMsg.classList.remove('hidden');
      } else {
        settingsSaveMsg.style.color = 'var(--accent-danger)';
        settingsSaveMsg.textContent = data.detail || 'Failed to save settings.';
        settingsSaveMsg.classList.remove('hidden');
      }
    } catch (err) {
      settingsSaveMsg.style.color = 'var(--accent-danger)';
      settingsSaveMsg.textContent = 'Server connection error.';
      settingsSaveMsg.classList.remove('hidden');
    }
  });


  // Admin User Analytics & Control Panel Handlers
  const btnOpenAdminUsers = document.getElementById('btn-open-admin-users');
  const btnCloseAdminUsersModal = document.getElementById('btn-close-admin-users-modal');
  const adminUsersModal = document.getElementById('admin-users-modal');
  const adminUsersTableBody = document.getElementById('admin-users-table-body');
  const adminUsersSearch = document.getElementById('admin-users-search');

  let adminUsersList = [];

  if (btnOpenAdminUsers) {
    btnOpenAdminUsers.addEventListener('click', () => {
      showAdminAnalyticsScreen();
    });
  }

  const btnRefreshAdminAnalytics = document.getElementById('btn-refresh-admin-analytics');
  if (btnRefreshAdminAnalytics) {
    btnRefreshAdminAnalytics.addEventListener('click', () => {
      loadAdminAnalytics();
    });
  }

  async function loadAdminAnalytics() {
    try {
      const res = await fetch('/api/admin/analytics');
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Failed to fetch admin user analytics.');
        return;
      }

      const stats = data.stats || {};
      adminUsersList = data.users || [];

      const uEl = document.getElementById('admin-kpi-users');
      const txEl = document.getElementById('admin-kpi-tx');
      const udharEl = document.getElementById('admin-kpi-udhar');
      const groupEl = document.getElementById('admin-kpi-groups');

      if (uEl) uEl.textContent = stats.total_users || 0;
      if (txEl) txEl.textContent = stats.total_transactions || 0;
      if (udharEl) udharEl.textContent = `${stats.total_contacts || 0} (${stats.total_debts || 0} debts)`;
      if (groupEl) groupEl.textContent = `${stats.total_groups || 0} (${stats.total_group_expenses || 0} expenses)`;

      renderAdminUsersTable();
    } catch (err) {
      console.error('Error fetching admin analytics', err);
    }
  }

  function renderAdminUsersTable() {
    if (!adminUsersTableBody) return;
    const query = (adminUsersSearch ? adminUsersSearch.value : '').toLowerCase().trim();

    const filtered = adminUsersList.filter(u => {
      return (u.full_name || '').toLowerCase().includes(query) ||
             (u.username || '').toLowerCase().includes(query) ||
             (u.email || '').toLowerCase().includes(query) ||
             (u.mobile || '').toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
      adminUsersTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-secondary);">No matching users found.</td></tr>`;
      return;
    }

    adminUsersTableBody.innerHTML = filtered.map(u => {
      const isAdmin = u.is_admin === 1 || u.is_admin === true;
      const roleBadge = isAdmin 
        ? `<span class="badge-settled" style="font-size: 0.7rem; padding: 0.15rem 0.45rem;">👑 Admin</span>`
        : `<span class="user-badge" style="font-size: 0.7rem; padding: 0.15rem 0.45rem;">👤 User</span>`;

      return `
        <tr>
          <td>#${u.id}</td>
          <td><strong>${escapeHtml(u.full_name || 'N/A')}</strong></td>
          <td>${escapeHtml(u.username || 'N/A')}</td>
          <td>${escapeHtml(u.email || 'N/A')}</td>
          <td>${escapeHtml(u.mobile || 'N/A')}</td>
          <td>${formatDisplayDate(u.created_at)}</td>
          <td><strong style="color: var(--accent-primary);">${u.transaction_count || 0}</strong></td>
          <td>${roleBadge}</td>
        </tr>
      `;
    }).join('');
  }

  if (adminUsersSearch) {
    adminUsersSearch.addEventListener('input', () => {
      renderAdminUsersTable();
    });
  }


  // Test Models Handler (inside Settings page)
  if (btnTestModels) {
    btnTestModels.addEventListener('click', async () => {
      btnTestModels.disabled = true;
      btnTestModels.textContent = 'Testing...';
      if (modelsTestResults) {
        modelsTestResults.classList.remove('hidden');
        modelsTestResults.innerHTML = '<span style="color: var(--text-secondary);">Sending test prompts to Gemini API models...</span>';
      }

      try {
        const res = await fetch('/api/test-models');
        const data = await res.json();
        if (res.ok && data.models && modelsTestResults) {
          modelsTestResults.innerHTML = data.models.map(m => {
            const isWorking = m.status === 'WORKING';
            const badgeColor = isWorking ? 'var(--accent-success)' : 'var(--accent-danger)';
            const bgColor = isWorking ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
            return `<div style="background: ${bgColor}; border: 1px solid ${badgeColor}; padding: 0.3rem 0.6rem; border-radius: 6px;">
              <strong>${escapeHtml(m.name)}</strong>: <span style="color: ${badgeColor};">${escapeHtml(m.status)}</span>
            </div>`;
          }).join('');
        } else if (modelsTestResults) {
          modelsTestResults.innerHTML = `<span style="color: var(--accent-danger);">${escapeHtml(data.detail || 'Failed to test models.')}</span>`;
        }
      } catch (e) {
        if (modelsTestResults) modelsTestResults.innerHTML = '<span style="color: var(--accent-danger);">Error connecting to backend test API.</span>';
      } finally {
        btnTestModels.disabled = false;
        btnTestModels.textContent = '🔍 Run Model Tests';
      }
    });
  }

  if (btnNavDashboard) {
    btnNavDashboard.addEventListener('click', async () => {
      // Navigate back to dashboard from any admin screen — re-check auth to restore name/role
      const res = await fetch('/api/me');
      const data = await res.json();
      if (data.authenticated) {
        showDashboard(data.full_name || data.username, data.is_admin);
      }
    });
  }

  // Auto-fill Username from Email
  signupEmailInput.addEventListener('input', (e) => {
    const val = e.target.value;
    if (val.includes('@')) {
      const handle = val.split('@')[0];
      const sanitizedUsername = handle.replace(/[^a-zA-Z0-9]/g, '');
      signupUsernameInput.value = sanitizedUsername;
    }
  });

  async function checkAuthSession() {
    try {
      const res = await fetch('/api/me');
      const data = await res.json();
      if (data.authenticated) {
        showDashboard(data.full_name || data.username, data.is_admin);
      } else {
        showLanding();
      }
    } catch (e) {
      showLanding();
    }
  }

  function showLanding() {
    if (landingScreen) landingScreen.classList.remove('hidden');
    if (authScreen) authScreen.classList.add('hidden');
    if (dashboardScreen) dashboardScreen.classList.add('hidden');
    if (navPublicSection) navPublicSection.classList.remove('hidden');
    if (navUserSection) navUserSection.classList.add('hidden');
    const btnFloatingAi = document.getElementById('btn-floating-ai');
    if (btnFloatingAi) btnFloatingAi.classList.add('hidden');
  }

  async function fetchAppConfig() {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      const reqMobile = data.require_mobile_otp === true;

      const mobileInput = document.getElementById('signup-mobile');
      const mobileLabel = document.getElementById('signup-mobile-label');
      const mobileOtpGroup = document.getElementById('signup-mobile-otp-group');
      const mobileOtpInput = document.getElementById('signup-mobile-otp');

      if (reqMobile) {
        if (mobileLabel) mobileLabel.textContent = 'Mobile Number';
        if (mobileInput) mobileInput.setAttribute('required', 'required');
        if (mobileOtpGroup) mobileOtpGroup.classList.remove('hidden');
        if (mobileOtpInput) mobileOtpInput.setAttribute('required', 'required');
        if (btnSendOtp) btnSendOtp.textContent = 'Send Verification OTPs';
      } else {
        if (mobileLabel) mobileLabel.textContent = 'Mobile Number (Optional)';
        if (mobileInput) mobileInput.removeAttribute('required');
        if (mobileOtpGroup) mobileOtpGroup.classList.add('hidden');
        if (mobileOtpInput) mobileOtpInput.removeAttribute('required');
        if (btnSendOtp) btnSendOtp.textContent = 'Send Verification OTP';
      }
    } catch (e) {
      console.warn('Could not fetch app config:', e);
    }
  }

  function showAuth(mode = 'login') {
    if (landingScreen) landingScreen.classList.add('hidden');
    if (authScreen) authScreen.classList.remove('hidden');
    if (dashboardScreen) dashboardScreen.classList.add('hidden');
    if (navPublicSection) navPublicSection.classList.remove('hidden');
    if (navUserSection) navUserSection.classList.add('hidden');

    fetchAppConfig();

    if (mode === 'signup') {
      if (tabSignupBtn) tabSignupBtn.click();
    } else {
      if (tabLoginBtn) tabLoginBtn.click();
    }
  }

  const adminAnalyticsScreen = document.getElementById('admin-analytics-screen');
  const adminSettingsScreen = document.getElementById('admin-settings-screen');

  function showDashboard(name, isAdmin) {
    if (landingScreen) landingScreen.classList.add('hidden');
    if (authScreen) authScreen.classList.add('hidden');
    if (adminAnalyticsScreen) adminAnalyticsScreen.classList.add('hidden');
    if (adminSettingsScreen) adminSettingsScreen.classList.add('hidden');
    if (dashboardScreen) dashboardScreen.classList.remove('hidden');
    if (navPublicSection) navPublicSection.classList.add('hidden');
    if (navUserSection) navUserSection.classList.remove('hidden');
    
    if (btnNavDashboard) btnNavDashboard.className = 'btn';
    if (btnOpenAdminUsers) btnOpenAdminUsers.className = 'btn btn-secondary';
    if (btnOpenSettings) btnOpenSettings.className = 'btn btn-secondary';

    if (name) userDisplayName.textContent = `👤 ${name}${isAdmin ? ' (Admin)' : ''}`;

    const btnFloatingAi = document.getElementById('btn-floating-ai');
    if (btnFloatingAi) btnFloatingAi.classList.remove('hidden');

    if (dashboardChatRight) dashboardChatRight.classList.add('chat-collapsed');
    if (chatResizerGutter) chatResizerGutter.style.display = 'none';

    if (isAdmin) {
      if (btnOpenSettings) btnOpenSettings.classList.remove('hidden');
      if (btnOpenAdminUsers) btnOpenAdminUsers.classList.remove('hidden');
      if (btnTestModels) btnTestModels.classList.remove('hidden');
    } else {
      if (btnOpenSettings) btnOpenSettings.classList.add('hidden');
      if (btnOpenAdminUsers) btnOpenAdminUsers.classList.add('hidden');
      if (btnTestModels) btnTestModels.classList.add('hidden');
    }

    loadDashboardData();
    restoreChatSession();
  }

  function showAdminAnalyticsScreen() {
    if (landingScreen) landingScreen.classList.add('hidden');
    if (authScreen) authScreen.classList.add('hidden');
    if (dashboardScreen) dashboardScreen.classList.add('hidden');
    if (adminSettingsScreen) adminSettingsScreen.classList.add('hidden');
    if (adminAnalyticsScreen) adminAnalyticsScreen.classList.remove('hidden');
    if (navPublicSection) navPublicSection.classList.add('hidden');
    if (navUserSection) navUserSection.classList.remove('hidden');

    if (btnNavDashboard) btnNavDashboard.className = 'btn btn-secondary';
    if (btnOpenSettings) btnOpenSettings.className = 'btn btn-secondary';
    if (btnOpenAdminUsers) btnOpenAdminUsers.className = 'btn';

    loadAdminAnalytics();
  }

  function showAdminSettingsScreen() {
    if (landingScreen) landingScreen.classList.add('hidden');
    if (authScreen) authScreen.classList.add('hidden');
    if (dashboardScreen) dashboardScreen.classList.add('hidden');
    if (adminAnalyticsScreen) adminAnalyticsScreen.classList.add('hidden');
    if (adminSettingsScreen) adminSettingsScreen.classList.remove('hidden');
    if (navPublicSection) navPublicSection.classList.add('hidden');
    if (navUserSection) navUserSection.classList.remove('hidden');

    if (btnNavDashboard) btnNavDashboard.className = 'btn btn-secondary';
    if (btnOpenAdminUsers) btnOpenAdminUsers.className = 'btn btn-secondary';
    if (btnOpenSettings) btnOpenSettings.className = 'btn';

    loadAdminSettings();
  }

  // Floating AI FAB & Chat Drawer Toggle Handlers
  const btnFloatingAi = document.getElementById('btn-floating-ai');
  const btnToggleChat = document.getElementById('btn-toggle-chat');
  const dashboardChatRight = document.querySelector('.dashboard-chat-right');
  const chatResizerGutter = document.getElementById('chat-resizer');

  function toggleChatDrawer() {
    if (!dashboardChatRight) return;
    const isCollapsed = dashboardChatRight.classList.toggle('chat-collapsed');
    if (chatResizerGutter) {
      if (isCollapsed) {
        chatResizerGutter.style.display = 'none';
      } else {
        chatResizerGutter.style.display = '';
      }
    }
  }

  if (btnFloatingAi) btnFloatingAi.addEventListener('click', toggleChatDrawer);
  if (btnToggleChat) btnToggleChat.addEventListener('click', toggleChatDrawer);

  // Landing Page & Navigation Listeners
  if (navBrand) {
    navBrand.addEventListener('click', () => {
      fetch('/api/me').then(res => res.json()).then(data => {
        if (data.authenticated) {
          showDashboard(data.full_name || data.username, data.is_admin);
        } else {
          showLanding();
        }
      }).catch(() => showLanding());
    });
  }

  if (btnNavLogin) btnNavLogin.addEventListener('click', () => showAuth('login'));
  if (btnNavSignup) btnNavSignup.addEventListener('click', () => showAuth('signup'));
  if (btnHeroLogin) btnHeroLogin.addEventListener('click', () => showAuth('login'));
  if (btnHeroSignup) btnHeroSignup.addEventListener('click', () => showAuth('signup'));
  if (btnSecuritySignup) btnSecuritySignup.addEventListener('click', () => showAuth('signup'));

  if (btnNavLanding) {
    btnNavLanding.addEventListener('click', () => {
      if (landingScreen) landingScreen.classList.remove('hidden');
      if (authScreen) authScreen.classList.add('hidden');
      if (dashboardScreen) dashboardScreen.classList.add('hidden');
    });
  }

  if (btnNavDashboard) {
    btnNavDashboard.addEventListener('click', () => {
      if (landingScreen) landingScreen.classList.add('hidden');
      if (authScreen) authScreen.classList.add('hidden');
      if (dashboardScreen) dashboardScreen.classList.remove('hidden');
    });
  }

  // Auth Tab Switching
  tabLoginBtn.addEventListener('click', () => {
    tabLoginBtn.classList.add('active');
    tabSignupBtn.classList.remove('active');
    formLogin.classList.remove('hidden');
    formSignup.classList.add('hidden');
    authErrorMsg.classList.add('hidden');
  });

  tabSignupBtn.addEventListener('click', () => {
    tabSignupBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    formSignup.classList.remove('hidden');
    formLogin.classList.add('hidden');
    signupMsg.classList.add('hidden');
  });

  // Login Form Submit
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    authErrorMsg.classList.add('hidden');
    const formData = new FormData();
    formData.append('username', document.getElementById('login-username').value);
    formData.append('password', document.getElementById('login-password').value);

    try {
      const res = await fetch('/api/login', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        showDashboard(data.full_name || data.username, data.is_admin);
      } else {
        authErrorMsg.textContent = data.detail || 'Login failed.';
        authErrorMsg.classList.remove('hidden');
      }
    } catch (err) {
      authErrorMsg.textContent = 'Server connection error.';
      authErrorMsg.classList.remove('hidden');
    }
  });

  // Send OTP Action
  btnSendOtp.addEventListener('click', async () => {
    const email = document.getElementById('signup-email').value;
    const mobile = document.getElementById('signup-mobile').value;

    if (!email) {
      alert('Please enter your Email Address first.');
      return;
    }

    const formData = new FormData();
    formData.append('email', email);
    if (mobile) formData.append('mobile', mobile);

    try {
      const res = await fetch('/api/send-otp', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        otpSendStatus.textContent = data.message || 'Verification OTPs sent!';
        otpSendStatus.classList.remove('hidden');
        otpSection.classList.remove('hidden');
      } else {
        alert(data.detail || 'Failed to send OTP');
      }
    } catch (err) {
      alert('Error sending OTP.');
    }
  });

  // Signup Form Submit
  formSignup.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupMsg.classList.add('hidden');

    const fullName = document.getElementById('signup-fullname').value;
    const email = document.getElementById('signup-email').value;
    const mobile = document.getElementById('signup-mobile').value;
    const emailOtp = document.getElementById('signup-email-otp').value;
    const mobileOtp = document.getElementById('signup-mobile-otp').value;
    const username = document.getElementById('signup-username').value;
    const pass = document.getElementById('signup-password').value;
    const conf = document.getElementById('signup-confirm').value;

    if (pass !== conf) {
      signupMsg.style.color = 'var(--accent-danger)';
      signupMsg.textContent = 'Passwords do not match.';
      signupMsg.classList.remove('hidden');
      return;
    }

    const formData = new FormData();
    formData.append('full_name', fullName);
    formData.append('email', email);
    formData.append('mobile', mobile);
    formData.append('email_otp', emailOtp);
    formData.append('mobile_otp', mobileOtp);
    formData.append('username', username);
    formData.append('password', pass);

    try {
      const res = await fetch('/api/signup', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        signupMsg.style.color = 'var(--accent-success)';
        signupMsg.textContent = 'Account created & verified! Please Sign In.';
        signupMsg.classList.remove('hidden');
        tabLoginBtn.click();
      } else {
        signupMsg.style.color = 'var(--accent-danger)';
        signupMsg.textContent = data.detail || 'Sign up failed.';
        signupMsg.classList.remove('hidden');
      }
    } catch (err) {
      signupMsg.style.color = 'var(--accent-danger)';
      signupMsg.textContent = 'Server connection error.';
      signupMsg.classList.remove('hidden');
    }
  });

  // Logout
  btnLogout.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    showAuth();
  });

  // Toggle Attachment Menu Popup & Submenu
  btnToggleAttachment.addEventListener('click', (e) => {
    e.stopPropagation();
    attachmentMenuPopup.classList.toggle('hidden');
    if (librarySubmenuPopup) librarySubmenuPopup.classList.add('hidden');
  });

  const libraryTrigger = document.getElementById('attach-option-library-trigger');
  const librarySubmenuPopup = document.getElementById('library-submenu-popup');

  if (libraryTrigger && librarySubmenuPopup) {
    librarySubmenuPopup.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    libraryTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!librarySubmenuPopup.contains(e.target) || e.target === libraryTrigger) {
        librarySubmenuPopup.classList.toggle('hidden');
      }
    });

    libraryTrigger.addEventListener('mouseenter', () => {
      librarySubmenuPopup.classList.remove('hidden');
    });
  }

  document.addEventListener('click', (e) => {
    if (attachmentMenuPopup && !attachmentMenuPopup.contains(e.target) && e.target !== btnToggleAttachment) {
      attachmentMenuPopup.classList.add('hidden');
      if (librarySubmenuPopup) librarySubmenuPopup.classList.add('hidden');
    }
  });

  attachOptionFile.addEventListener('click', () => {
    attachmentMenuPopup.classList.add('hidden');
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      addFilesToStaging(files);
    }
  });

  function renderChatWelcomeMessage(txCount = 0) {
    const firstMsg = chatMessagesContainer.querySelector('.chat-message.assistant');
    if (!firstMsg) return;
    const chipsContainer = firstMsg.querySelector('.suggestion-chips-container');
    if (!chipsContainer) return;

    if (txCount === 0) {
      chipsContainer.innerHTML = `
        <button type="button" class="suggestion-chip" data-prompt="How do I upload or paste bank statements?">📄 How to upload statements?</button>
        <button type="button" class="suggestion-chip" data-prompt="How do I add manual transaction entries?">➕ How to add entries?</button>
      `;
    } else {
      chipsContainer.innerHTML = `
        <button type="button" class="suggestion-chip" data-prompt="How much did I spend on shopping or fuel in July?">📊 Expense Breakdown</button>
        <button type="button" class="suggestion-chip" data-prompt="What was my total salary/income this month?">💰 Income & Balance Analysis</button>
        <button type="button" class="suggestion-chip" data-prompt="How much did I pay towards loans or EMIs?">💳 Loan & EMI Tracking</button>
      `;
    }
  }

  // Clear Chat History
  btnClearChat.addEventListener('click', () => {
    chatMessagesContainer.innerHTML = `
      <div class="chat-message assistant">
        <div class="message-avatar">✨</div>
        <div class="message-bubble">
          Hello! I am <strong>Kharach AI</strong>. You can paste bank statement screenshots (Ctrl+V), upload statement PDFs/images, or ask me any questions about your expenses and budget!
          <div class="suggestion-chips-container"></div>
        </div>
      </div>
    `;
    const count = parseInt(kpiCount.textContent, 10) || 0;
    renderChatWelcomeMessage(count);
  });


  // Handle click on suggestion chips inside chat container
  chatMessagesContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.suggestion-chip');
    if (chip) {
      const promptText = chip.getAttribute('data-prompt');
      if (promptText) {
        chatInputPrompt.value = promptText;
        chatInputPrompt.focus();
        chatInputPrompt.style.height = 'auto';
        chatInputPrompt.style.height = Math.min(chatInputPrompt.scrollHeight, 100) + 'px';
      }
    }
  });

  // Auto-resize chat textarea
  chatInputPrompt.addEventListener('input', () => {
    chatInputPrompt.style.height = 'auto';
    chatInputPrompt.style.height = Math.min(chatInputPrompt.scrollHeight, 100) + 'px';
  });

  // Handle Enter key for sending chat message
  chatInputPrompt.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  btnSendChat.addEventListener('click', () => sendChatMessage());

  // Chat Session Storage helpers
  const CHAT_SESSION_KEY = 'kharach_chat_session';

  function saveChatSession() {
    const messages = [];
    chatMessagesContainer.querySelectorAll('.chat-message').forEach(msg => {
      const role = msg.classList.contains('user') ? 'user' : 'assistant';
      const bubble = msg.querySelector('.message-bubble');
      messages.push({ role, html: bubble ? bubble.innerHTML : '' });
    });
    try { sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(messages)); } catch(_) {}
  }

  function restoreChatSession() {
    try {
      const raw = sessionStorage.getItem(CHAT_SESSION_KEY);
      if (!raw) return;
      const messages = JSON.parse(raw);
      if (!messages || messages.length === 0) return;
      chatMessagesContainer.innerHTML = '';
      messages.forEach(({ role, html }) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${role}`;
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.textContent = role === 'user' ? '👤' : '✨';
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        bubbleDiv.innerHTML = html;
        msgDiv.appendChild(avatarDiv);
        msgDiv.appendChild(bubbleDiv);
        chatMessagesContainer.appendChild(msgDiv);
      });
      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    } catch(_) {}
  }

  function appendChatMessage(role, content, attachmentLabels = []) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${role}`;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.textContent = role === 'user' ? '👤' : '✨';

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';

    let extractedCharts = [];
    let extractedSuggestions = [];
    let mainContent = content;

    if (role === 'assistant' && mainContent) {
      // 1. Extract [CHART: type | Title | Label: Amount, ...] tags
      const chartRegex = /\[CHART:\s*(doughnut|bar|pie)\s*\|\s*([^|\]]+)\|\s*([^\]]+)\]/gi;
      let chartMatch;
      let chartCount = 0;
      while ((chartMatch = chartRegex.exec(mainContent)) !== null) {
        chartCount++;
        const chartId = `chat-chart-canvas-${Date.now()}-${chartCount}`;
        const chartType = chartMatch[1].trim().toLowerCase();
        const chartTitle = chartMatch[2].trim();
        const dataPairsStr = chartMatch[3].trim();

        const labels = [];
        const values = [];
        dataPairsStr.split(',').forEach(pair => {
          const parts = pair.split(':');
          if (parts.length >= 2) {
            const lbl = parts[0].trim();
            const val = parseFloat(parts[1].replace(/[^0-9.]/g, '')) || 0;
            if (lbl && !isNaN(val)) {
              labels.push(lbl);
              values.push(val);
            }
          }
        });

        if (labels.length > 0) {
          extractedCharts.push({ id: chartId, type: chartType, title: chartTitle, labels, values });
        }
      }
      mainContent = mainContent.replace(chartRegex, '').trim();

      // 2. Extract [SUGGESTION: Label | Prompt] tags
      const tagRegex = /\[SUGGESTION:\s*([^|\]]+)\|\s*([^\]]+)\]/gi;
      let tagMatch;
      while ((tagMatch = tagRegex.exec(mainContent)) !== null) {
        extractedSuggestions.push({
          label: tagMatch[1].trim(),
          prompt: tagMatch[2].trim()
        });
      }
      mainContent = mainContent.replace(tagRegex, '').trim();

      // 3. Extract bullet lines like `📊 Expense Breakdown: "How much..."`
      const lines = mainContent.split('\n');
      const cleanLines = [];
      const linePattern = /^(?:[•\*\-\s]|&bull;)*([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]?\s*[*_]*[A-Za-z0-9\s&,/\-\(\)]+[*_]*)\s*:\s*["'“]([^"'”]+)["'”]\*?$/u;

      for (let line of lines) {
        const trimmed = line.trim();
        const m = linePattern.exec(trimmed);
        if (m) {
          const label = m[1].replace(/[*_]/g, '').trim();
          const prompt = m[2].trim();
          if (label && prompt && !extractedSuggestions.some(s => s.prompt === prompt)) {
            extractedSuggestions.push({ label, prompt });
            continue;
          }
        }
        cleanLines.push(line);
      }
      mainContent = cleanLines.join('\n').trim();
    }

    bubbleDiv.innerHTML = formatMarkdown(mainContent);

    // Render extracted inline charts
    if (extractedCharts.length > 0) {
      extractedCharts.forEach(c => {
        const card = document.createElement('div');
        card.className = 'chat-inline-chart-card';
        card.innerHTML = `
          <div class="chat-inline-chart-title">📊 ${escapeHtml(c.title)}</div>
          <div style="max-height: 220px; position: relative;">
            <canvas id="${c.id}" style="max-height: 210px;"></canvas>
          </div>
        `;
        bubbleDiv.appendChild(card);
      });
    }

    if (extractedSuggestions.length > 0) {
      const chipsContainer = document.createElement('div');
      chipsContainer.className = 'suggestion-chips-container';
      extractedSuggestions.forEach(s => {
        const chipBtn = document.createElement('button');
        chipBtn.className = 'suggestion-chip';
        chipBtn.setAttribute('type', 'button');
        chipBtn.setAttribute('data-prompt', s.prompt);
        chipBtn.textContent = s.label;
        chipsContainer.appendChild(chipBtn);
      });
      bubbleDiv.appendChild(chipsContainer);
    }

    if (attachmentLabels && attachmentLabels.length > 0) {
      const attachDiv = document.createElement('div');
      attachDiv.style.cssText = 'font-size: 0.75rem; color: var(--accent-primary); margin-top: 6px; padding-top: 4px; border-top: 1px dashed rgba(255,255,255,0.1);';
      attachDiv.textContent = attachmentLabels.join(' | ');
      bubbleDiv.appendChild(attachDiv);
    }

    msgDiv.appendChild(avatarDiv);
    msgDiv.appendChild(bubbleDiv);
    chatMessagesContainer.appendChild(msgDiv);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

    // Instantiate Chart.js instances after appending to DOM
    if (extractedCharts.length > 0) {
      const palette = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#3b82f6', '#14b8a6'];
      extractedCharts.forEach(c => {
        const canvas = document.getElementById(c.id);
        if (canvas) {
          const ctx = canvas.getContext('2d');
          new Chart(ctx, {
            type: c.type,
            data: {
              labels: c.labels,
              datasets: [{
                data: c.values,
                backgroundColor: palette.slice(0, c.labels.length),
                borderWidth: 1,
                borderColor: '#12161f'
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: { color: '#f0f4f8', font: { size: 10 }, boxWidth: 10 }
                }
              }
            }
          });
        }
      });
    }

    saveChatSession();
  }

  function formatMarkdown(text) {
    if (!text) return '';

    // First escape raw HTML special characters
    let html = escapeHtml(text);

    // Code blocks ``` ... ```
    html = html.replace(/```([\s\S]*?)```/g, (match, p1) => {
      return `<pre style="background: rgba(0,0,0,0.4); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.5rem 0.75rem; overflow-x: auto; font-family: monospace; font-size: 0.8rem; margin: 0.4rem 0;"><code>${p1.trim()}</code></pre>`;
    });

    // Inline code `...`
    html = html.replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 0.1rem 0.35rem; border-radius: 4px; font-family: monospace; font-size: 0.82rem;">$1</code>');

    // Horizontal rules: --- or ***
    html = html.replace(/^[\-\*]{3,}$/gm, '<hr style="border: 0; border-top: 1px solid var(--border-color); margin: 0.6rem 0;">');

    // Headings: ####, ###, ##, #
    html = html.replace(/^#{4,6}\s*(.*$)/gm, '<div style="font-size: 0.92rem; font-weight: 700; color: var(--accent-primary); margin: 0.6rem 0 0.25rem 0; border-left: 3px solid var(--accent-primary); padding-left: 0.5rem; background: rgba(99,102,241,0.08); border-radius: 0 4px 4px 0; padding-top: 0.15rem; padding-bottom: 0.15rem;">$1</div>');
    html = html.replace(/^###\s*(.*$)/gm, '<h3 style="font-size: 0.98rem; font-weight: 700; color: var(--text-primary); margin: 0.6rem 0 0.25rem 0;">$1</h3>');
    html = html.replace(/^##\s*(.*$)/gm, '<h2 style="font-size: 1.05rem; font-weight: 700; color: var(--accent-primary); margin: 0.7rem 0 0.3rem 0;">$1</h2>');
    html = html.replace(/^#\s*(.*$)/gm, '<h1 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin: 0.8rem 0 0.35rem 0;">$1</h1>');

    // Clean dangling/stray asterisks at line ends
    html = html.replace(/(\w+)\*+(\s|$)/g, '$1$2');
    html = html.replace(/(^|\s)\*+(\s|$)/g, '$1$2');

    // Highlight Currency Amounts like ₹50,020.00 in colorful pill badges
    html = html.replace(/(₹\s*[\d,]+(?:\.\d+)?)/g, '<span class="chat-amount-badge">$1</span>');

    // Bold: **text** or __text__
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary); font-weight: 600;">$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong style="color: var(--text-primary); font-weight: 600;">$1</strong>');

    // Italic: *text* or _text_
    html = html.replace(/\*(.*?)\*/g, '<em style="color: rgba(240,244,248,0.9);">$1</em>');

    // Process lines into tight paragraphs and flex list rows
    const lines = html.split('\n');
    let formattedLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) {
        if (i > 0 && !lines[i - 1].trim()) continue;
        formattedLines.push('<div style="height: 0.3rem;"></div>');
        continue;
      }

      // Match list item: •, *, - or numbers like 1.
      const listMatch = line.match(/^(?:[•\*\-]|(\d+\.))\s+(.*)$/);
      if (listMatch) {
        const prefix = listMatch[1] ? `<span style="color: var(--accent-primary); font-weight: 700; min-width: 18px; display: inline-block;">${listMatch[1]}</span>` : '<span style="color: var(--accent-primary); margin-right: 6px;">•</span>';
        const itemContent = listMatch[2];
        formattedLines.push(`<div style="display: flex; align-items: flex-start; margin: 0.15rem 0; padding-left: 0.2rem; line-height: 1.45;">${prefix}<div style="flex: 1;">${itemContent}</div></div>`);
      } else {
        formattedLines.push(`<div style="margin: 0.15rem 0; line-height: 1.45;">${line}</div>`);
      }
    }

    return formattedLines.join('');
  }

  async function sendChatMessage() {
    const userText = chatInputPrompt.value.trim();

    // Collect all checked library files
    const checkedLibBoxes = document.querySelectorAll('.library-file-checkbox:checked');
    const selectedLibraryFiles = Array.from(checkedLibBoxes).map(cb => cb.value);

    if (!userText && selectedFiles.length === 0 && selectedLibraryFiles.length === 0) {
      return;
    }

    // Compose user message display string & attachments
    const displayMsg = userText || 'Analyzed attached document(s)';
    const attachmentLabels = [];
    if (selectedFiles.length > 0) {
      attachmentLabels.push(`📄 ${selectedFiles.length} local file(s) attached`);
    }
    if (selectedLibraryFiles.length > 0) {
      attachmentLabels.push(`📁 ${selectedLibraryFiles.length} library file(s): ${selectedLibraryFiles.join(', ')}`);
    }

    appendChatMessage('user', displayMsg, attachmentLabels);

    // Prepare API Request
    const formData = new FormData();
    if (userText) formData.append('prompt', userText);
    if (chatModelSelector && chatModelSelector.value) {
      formData.append('selected_model', chatModelSelector.value);
    }

    selectedLibraryFiles.forEach(libFname => {
      formData.append('existing_filenames', libFname);
    });

    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    // Reset Input Fields
    chatInputPrompt.value = '';
    chatInputPrompt.style.height = 'auto';
    selectedFiles = [];
    updateFilePreview();

    // Uncheck library checkboxes
    checkedLibBoxes.forEach(cb => cb.checked = false);

    analysisSpinner.classList.remove('hidden');
    btnSendChat.disabled = true;

    try {
      const res = await fetch('/api/chat', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok) {
        let aiReply = data.reply || 'Request processed.';
        if (data.inserted_count > 0) {
          aiReply += `<br><br><span style="color: var(--accent-success); font-weight: 600;">✅ Successfully parsed and saved ${data.inserted_count} new transaction(s) into your ledger!</span>`;
          await loadDashboardData();
        }
        appendChatMessage('assistant', aiReply);
      } else {
        appendChatMessage('assistant', `⚠️ Error: ${data.detail || 'Failed to process request with Gemini.'}`);
      }
    } catch (err) {
      appendChatMessage('assistant', '⚠️ Communication error with Gemini AI server.');
    } finally {
      analysisSpinner.classList.add('hidden');
      btnSendChat.disabled = false;
    }
  }

  // Dashboard Tabs Switcher
  const allTabBtns = [tabBtnLedger, tabBtnAnalytics, tabBtnMerchants, tabBtnCashflow, tabBtnRecurring, tabBtnBudget, tabBtnLarge, tabBtnUdhar, tabBtnGroups, tabBtnAdminAnalytics, tabBtnAdminSettings];
  const allTabContents = [tabContentLedger, tabContentAnalytics, tabContentMerchants, tabContentCashflow, tabContentRecurring, tabContentBudget, tabContentLarge, tabContentUdhar, tabContentGroups, tabContentAdminAnalytics, tabContentAdminSettings];

  tabBtnLedger.addEventListener('click', () => switchTab(tabBtnLedger, tabContentLedger));
  tabBtnAnalytics.addEventListener('click', () => switchTab(tabBtnAnalytics, tabContentAnalytics));
  tabBtnMerchants.addEventListener('click', () => switchTab(tabBtnMerchants, tabContentMerchants));
  tabBtnCashflow.addEventListener('click', () => switchTab(tabBtnCashflow, tabContentCashflow));
  tabBtnRecurring.addEventListener('click', () => switchTab(tabBtnRecurring, tabContentRecurring));
  tabBtnBudget.addEventListener('click', () => switchTab(tabBtnBudget, tabContentBudget));
  tabBtnLarge.addEventListener('click', () => switchTab(tabBtnLarge, tabContentLarge));
  if (tabBtnUdhar) {
    tabBtnUdhar.addEventListener('click', () => {
      switchTab(tabBtnUdhar, tabContentUdhar, false);
      loadUdharModule();
    });
  }
  if (tabBtnGroups) {
    tabBtnGroups.addEventListener('click', () => {
      switchTab(tabBtnGroups, tabContentGroups, false);
      loadGroupsModule();
    });
  }
  if (tabBtnAdminAnalytics) {
    tabBtnAdminAnalytics.addEventListener('click', () => {
      switchTab(tabBtnAdminAnalytics, tabContentAdminAnalytics, false);
      loadAdminAnalytics();
    });
  }
  if (tabBtnAdminSettings) {
    tabBtnAdminSettings.addEventListener('click', () => {
      switchTab(tabBtnAdminSettings, tabContentAdminSettings, false);
      loadAdminSettings();
    });
  }

  function switchTab(btn, content, clearFiltersOnSwitch = true) {
    allTabBtns.forEach(b => b && b.classList.remove('active'));
    allTabContents.forEach(c => c && c.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (content) content.classList.add('active');
    if (clearFiltersOnSwitch) {
      resetAllFilters(true);
    }
  }

  // Filters Trigger
  filterType.addEventListener('change', fetchFilteredTransactions);
  filterCategory.addEventListener('change', fetchFilteredTransactions);
  filterSearch.addEventListener('input', debounce(fetchFilteredTransactions, 300));

  btnExportCsv.addEventListener('click', () => {
    window.location.href = '/api/export-csv';
  });

  async function loadDashboardData() {
    await fetchUserFiles();
    await fetchMetrics();
    await fetchFilteredTransactions();
  }

  async function fetchUserFiles() {
    const libraryContainer = document.getElementById('library-files-container');
    const countBadge = document.getElementById('library-count-badge');

    try {
      const res = await fetch('/api/user-files');
      const files = await res.json();

      if (countBadge) {
        countBadge.textContent = files ? files.length : 0;
      }

      if (!files || files.length === 0) {
        if (libraryContainer) {
          libraryContainer.innerHTML = `<span style="font-size: 0.75rem; color: var(--text-secondary); padding: 0.4rem;">No uploaded documents</span>`;
        }
        return;
      }

      if (libraryContainer) {
        libraryContainer.innerHTML = files.map(f => `
          <div class="attachment-option" style="display: flex; align-items: center; justify-content: space-between; gap: 0.4rem; padding: 0.3rem 0.5rem; background: rgba(255,255,255,0.03); border-radius: 6px;">
            <label style="display: flex; align-items: center; gap: 0.45rem; font-size: 0.78rem; cursor: pointer; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <input type="checkbox" class="library-file-checkbox" value="${escapeHtml(f.filename)}" />
              <span>📄 ${escapeHtml(f.filename)} <span style="font-size: 0.68rem; color: var(--text-secondary);">(${(f.size_bytes / 1024).toFixed(1)} KB)</span></span>
            </label>
            <button class="btn-delete-file" data-filename="${escapeHtml(f.filename)}" title="Delete uploaded file" style="background: none; border: none; color: var(--accent-danger); cursor: pointer; padding: 0.15rem 0.35rem; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>

          </div>
        `).join('');

        // Attach click listeners to delete buttons
        libraryContainer.querySelectorAll('.btn-delete-file').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const fname = btn.getAttribute('data-filename');
            if (confirm(`Delete file '${fname}' and its extracted transactions?`)) {
              await deleteUserFile(fname);
            }
          });
        });
      }

    } catch (err) {
      console.error('Failed to fetch user files', err);
    }
  }

  async function deleteUserFile(filename) {
    try {
      const res = await fetch(`/api/user-files/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        await loadDashboardData();
      } else {
        alert(data.detail || 'Failed to delete file.');
      }
    } catch (e) {
      alert('Error communicating with server.');
    }
  }

  async function fetchMetrics() {
    try {
      const accFilter = filterAccount ? filterAccount.value : 'ALL';
      const params = new URLSearchParams();
      if (accFilter) params.append('account_filter', accFilter);

      const res = await fetch(`/api/metrics?${params.toString()}`);
      const data = await res.json();

      kpiCredited.textContent = `₹${data.total_credited.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      kpiDebited.textContent = `₹${data.total_debited.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      kpiBalance.textContent = `₹${data.net_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      kpiCount.textContent = data.tx_count;

      const currentCat = filterCategory.value;
      filterCategory.innerHTML = '<option value="ALL">All Categories</option>';
      data.categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        if (cat === currentCat) opt.selected = true;
        filterCategory.appendChild(opt);
      });

      if (filterAccount && data.accounts) {
        const currentAcc = filterAccount.value;
        filterAccount.innerHTML = '<option value="ALL">All Accounts</option>';
        data.accounts.forEach(acc => {
          const opt = document.createElement('option');
          opt.value = acc;
          opt.textContent = acc;
          if (acc === currentAcc) opt.selected = true;
          filterAccount.appendChild(opt);
        });
      }

      renderLargeTransactions(data.large_transactions);
      renderCharts(data.category_spending, data.daily_trends);
      renderTopMerchants(data.top_recipients, data.total_debited);
      renderCashFlowChart(data.monthly_cashflow);
      renderRecurringSubscriptions(data.recurring_transactions);
      await renderBudgetLimits(data.categories, data.category_spending);
      renderChatWelcomeMessage(data.tx_count || 0);


    } catch (err) {
      console.error('Failed to fetch metrics', err);
    }
  }

  async function fetchFilteredTransactions() {
    const type = filterType.value;
    const cat = filterCategory.value;
    const acc = filterAccount ? filterAccount.value : 'ALL';
    const search = filterSearch.value;

    const params = new URLSearchParams();
    if (type) params.append('type_filter', type);
    if (cat) params.append('category_filter', cat);
    if (acc) params.append('account_filter', acc);
    if (search) params.append('search_query', search);

    try {
      const res = await fetch(`/api/transactions?${params.toString()}`);
      totalFilteredTransactions = await res.json();
      currentTransactions = totalFilteredTransactions;
      currentPage = 1;
      renderSortedLedger();
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    }
  }

  function renderSortedLedger() {
    let sorted = [...totalFilteredTransactions];
    if (currentSortField) {
      sorted.sort((a, b) => {
        let valA = a[currentSortField] ?? '';
        let valB = b[currentSortField] ?? '';

        if (currentSortField.includes('amount')) {
          valA = Number(valA) || 0;
          valB = Number(valB) || 0;
        } else {
          valA = String(valA).toLowerCase();
          valB = String(valB).toLowerCase();
        }

        if (valA < valB) return currentSortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    currentTransactions = sorted;
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const paginated = sorted.slice(start, start + PAGE_SIZE);
    renderLedgerTable(paginated);
    updatePaginationUI(total, start, paginated.length, currentPage, totalPages);
  }

  function updatePaginationUI(total, start, count, page, totalPages) {
    const infoEl = document.getElementById('pagination-info');
    const pageNumEl = document.getElementById('pagination-page-num');
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');
    const bar = document.getElementById('table-pagination-bar');

    if (!bar) return;
    bar.style.display = total > 0 ? 'flex' : 'none';

    if (infoEl) infoEl.textContent = `Showing ${total === 0 ? 0 : start + 1}–${start + count} of ${total} entries`;
    if (pageNumEl) pageNumEl.textContent = `Page ${page} of ${totalPages}`;
    if (btnPrev) btnPrev.disabled = page <= 1;
    if (btnNext) btnNext.disabled = page >= totalPages;
  }

  // Pagination Button Listeners
  const btnPrevPage = document.getElementById('btn-prev-page');
  const btnNextPage = document.getElementById('btn-next-page');
  if (btnPrevPage) btnPrevPage.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderSortedLedger(); } });
  if (btnNextPage) btnNextPage.addEventListener('click', () => { currentPage++; renderSortedLedger(); });

  function renderLedgerTable(transactions) {
    if (!transactions || transactions.length === 0) {
      const isEmpty = !totalFilteredTransactions || totalFilteredTransactions.length === 0;
      ledgerTableBody.innerHTML = isEmpty ? `
        <tr><td colspan="10" style="padding: 0;">
          <div class="empty-state-cta">
            <div class="empty-icon">🏦</div>
            <h3>No Transactions Yet</h3>
            <p>Drop a bank statement PDF or image anywhere on this page, or paste a screenshot (Ctrl+V) to get started with AI analysis.</p>
            <button class="btn-cta" onclick="document.getElementById('file-input').click()">📂 Import First Statement</button>
          </div>
        </td></tr>` : `<tr><td colspan="10" style="text-align: center; color: var(--text-secondary);">No matching transactions found.</td></tr>`;
      updateBulkBar();
      return;
    }

    ledgerTableBody.innerHTML = transactions.map(t => `
      <tr>
        <td style="text-align: center;"><input type="checkbox" class="tx-row-checkbox" data-id="${t.id}" ${selectedTxIds.has(t.id) ? 'checked' : ''} style="cursor: pointer; width: 15px; height: 15px;" /></td>
        <td><strong>${formatDisplayDate(t.date)}</strong></td>
        <td><strong>${escapeHtml(t.recipient_or_sender || '-')}</strong></td>
        <td>${escapeHtml(t.particulars_note || '-')}</td>
        <td style="color: var(--accent-danger);">₹${Number(t.debit_amount || 0).toFixed(2)}</td>
        <td style="color: var(--accent-success);">₹${Number(t.credit_amount || 0).toFixed(2)}</td>
        <td><span class="${t.type === 'DEBIT' ? 'badge-debit' : 'badge-credit'}">${t.type}</span></td>
        <td>${escapeHtml(t.category || 'Others')}</td>
        <td><span class="user-badge" style="font-size: 0.72rem; padding: 0.15rem 0.45rem; background: rgba(99,102,241,0.12); color: var(--accent-primary); border: 1px solid rgba(99,102,241,0.3); white-space: nowrap;">${escapeHtml(t.account_name || 'General')}</span></td>
        <td style="text-align: center; white-space: nowrap;">
          <button class="btn-edit-tx" data-id="${t.id}" title="Edit transaction" style="background: none; border: none; cursor: pointer; color: var(--accent-primary); padding: 0.2rem 0.25rem; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn-reconcile-tx" data-id="${t.id}" title="Link to Udhar Contact" style="background: none; border: none; cursor: pointer; color: var(--accent-success); padding: 0.2rem 0.25rem; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; font-size: 0.85rem;">
            📗
          </button>
        </td>
      </tr>
    `).join('');

    ledgerTableBody.querySelectorAll('.tx-row-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = parseInt(cb.getAttribute('data-id'), 10);
        if (e.target.checked) {
          selectedTxIds.add(id);
        } else {
          selectedTxIds.delete(id);
        }
        updateBulkBar();
      });
    });

    ledgerTableBody.querySelectorAll('.btn-edit-tx').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const tx = currentTransactions.find(x => x.id === id);
        if (tx) openTxModal(tx);
      });
    });

    ledgerTableBody.querySelectorAll('.btn-reconcile-tx').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const tx = currentTransactions.find(x => x.id === id);
        if (tx && window.openReconcileModal) {
          const desc = `${tx.recipient_or_sender || 'Tx'} (₹${(tx.debit_amount || tx.credit_amount || 0).toFixed(2)})`;
          window.openReconcileModal(id, desc);
        }
      });
    });

    ledgerTableBody.querySelectorAll('.btn-delete-tx').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        if (confirm('Delete this transaction?')) {
          await deleteTransaction(id);
        }
      });
    });

    updateBulkBar();
  }

  const btnAddTx = document.getElementById('btn-add-tx');
  const txModal = document.getElementById('tx-modal');
  const btnCloseTxModal = document.getElementById('btn-close-tx-modal');
  const formTxModal = document.getElementById('form-tx-modal');
  const txModalTitle = document.getElementById('tx-modal-title');
  const txEditId = document.getElementById('tx-edit-id');
  const txModalMsg = document.getElementById('tx-modal-msg');
  const btnForgotPass = document.getElementById('btn-forgot-pass');

  if (btnAddTx) {
    btnAddTx.addEventListener('click', () => openTxModal(null));
  }
  if (btnCloseTxModal) {
    btnCloseTxModal.addEventListener('click', () => txModal.classList.add('hidden'));
  }

  function openTxModal(tx) {
    txModalMsg.classList.add('hidden');
    if (tx) {
      txModalTitle.textContent = '✏️ Edit Transaction';
      txEditId.value = tx.id;
      document.getElementById('tx-modal-date').value = tx.date || '';
      document.getElementById('tx-modal-type').value = tx.type || 'DEBIT';
      document.getElementById('tx-modal-recipient').value = tx.recipient_or_sender || '';
      document.getElementById('tx-modal-note').value = tx.particulars_note || '';
      document.getElementById('tx-modal-amount').value = tx.type === 'CREDIT' ? tx.credit_amount : tx.debit_amount;
      document.getElementById('tx-modal-category').value = tx.category || 'Others';
      const accInput = document.getElementById('tx-modal-account');
      if (accInput) accInput.value = tx.account_name || 'General';
    } else {
      txModalTitle.textContent = '➕ Add Transaction';
      txEditId.value = '';
      document.getElementById('tx-modal-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('tx-modal-type').value = 'DEBIT';
      document.getElementById('tx-modal-recipient').value = '';
      document.getElementById('tx-modal-note').value = '';
      document.getElementById('tx-modal-amount').value = '';
      document.getElementById('tx-modal-category').value = 'Others';
      const accInput = document.getElementById('tx-modal-account');
      if (accInput) accInput.value = 'General';
    }
    txModal.classList.remove('hidden');
  }


  if (formTxModal) {
    formTxModal.addEventListener('submit', async (e) => {
      e.preventDefault();
      txModalMsg.classList.add('hidden');

      const id = txEditId.value;
      const date = document.getElementById('tx-modal-date').value;
      const type = document.getElementById('tx-modal-type').value;
      const recipient = document.getElementById('tx-modal-recipient').value;
      const note = document.getElementById('tx-modal-note').value;
      const amount = parseFloat(document.getElementById('tx-modal-amount').value) || 0.0;
      const category = document.getElementById('tx-modal-category').value;
      const accInput = document.getElementById('tx-modal-account');
      const accountName = accInput ? accInput.value : 'General Account';

      const formData = new FormData();
      formData.append('date', date);
      formData.append('recipient_or_sender', recipient);
      formData.append('particulars_note', note);
      formData.append('debit_amount', type === 'DEBIT' ? amount : 0.0);
      formData.append('credit_amount', type === 'CREDIT' ? amount : 0.0);
      formData.append('tx_type', type);
      formData.append('category', category);
      formData.append('account_name', accountName);

      const url = id ? `/api/transactions/${id}` : '/api/transactions';
      const method = id ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, { method, body: formData });
        const data = await res.json();
        if (res.ok) {
          txModal.classList.add('hidden');
          await loadDashboardData();
        } else {
          txModalMsg.style.color = 'var(--accent-danger)';
          txModalMsg.textContent = data.detail || 'Failed to save transaction.';
          txModalMsg.classList.remove('hidden');
        }
      } catch (err) {
        txModalMsg.style.color = 'var(--accent-danger)';
        txModalMsg.textContent = 'Server connection error.';
        txModalMsg.classList.remove('hidden');
      }
    });
  }


  async function deleteTransaction(id) {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadDashboardData();
      } else {
        const data = await res.json();
        alert(data.detail || 'Failed to delete transaction.');
      }
    } catch (e) {
      alert('Error connecting to server.');
    }
  }

  if (btnForgotPass) {
    btnForgotPass.addEventListener('click', async () => {
      const email = prompt('Enter your registered Email Address:');
      if (!email) return;
      const mobile = prompt('Enter your registered Mobile Number:');
      if (!mobile) return;

      const fd = new FormData();
      fd.append('email', email);
      fd.append('mobile', mobile);

      try {
        const res = await fetch('/api/send-otp', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) {
          alert(data.detail || 'Failed to send OTP');
          return;
        }

        const otp = prompt('Enter 6-digit Email OTP received:');
        if (!otp) return;
        const newPass = prompt('Enter your new Password:');
        if (!newPass) return;

        const resetFd = new FormData();
        resetFd.append('email', email);
        resetFd.append('email_otp', otp);
        resetFd.append('new_password', newPass);

        const resetRes = await fetch('/api/reset-password', { method: 'POST', body: resetFd });
        const resetData = await resetRes.json();
        if (resetRes.ok) {
          alert(resetData.message || 'Password reset successfully!');
        } else {
          alert(resetData.detail || 'Failed to reset password.');
        }
      } catch (err) {
        alert('Server connection error.');
      }
    });
  }


  function renderLargeTransactions(transactions) {
    if (!transactions || transactions.length === 0) {
      largeTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No transactions above ₹1,000 found.</td></tr>`;
      return;
    }

    largeTableBody.innerHTML = transactions.map(t => `
      <tr>
        <td><strong>${formatDisplayDate(t.date)}</strong></td>
        <td><strong>${escapeHtml(t.recipient_or_sender || '-')}</strong></td>
        <td>${escapeHtml(t.particulars_note || '-')}</td>
        <td style="color: var(--accent-danger);">₹${Number(t.debit_amount || 0).toFixed(2)}</td>
        <td style="color: var(--accent-success);">₹${Number(t.credit_amount || 0).toFixed(2)}</td>
        <td><span class="${t.type === 'DEBIT' ? 'badge-debit' : 'badge-credit'}">${t.type}</span></td>
        <td>${escapeHtml(t.category || 'Others')}</td>
      </tr>
    `).join('');
  }

  function renderCharts(categoryData, trendData) {
    const ctxCat = document.getElementById('chart-categories').getContext('2d');
    if (catChartInstance) catChartInstance.destroy();

    catChartInstance = new Chart(ctxCat, {
      type: 'bar',
      data: {
        labels: categoryData.map(c => c.category),
        datasets: [{
          label: 'Total Spent (₹)',
          data: categoryData.map(c => c.debit_amount),
          backgroundColor: '#6366f1',
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        onClick: (evt, elements) => {
          if (elements.length > 0) {
            const idx = elements[0].index;
            const clickedCategory = categoryData[idx].category;
            resetAllFilters(false);
            filterCategory.value = clickedCategory;
            switchTab(tabBtnLedger, tabContentLedger, false);
            fetchFilteredTransactions();
          }
        },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });

    const ctxTrend = document.getElementById('chart-daily-trend').getContext('2d');
    if (trendChartInstance) trendChartInstance.destroy();

    trendChartInstance = new Chart(ctxTrend, {
      type: 'line',
      data: {
        labels: trendData.map(t => formatDisplayDate(t.date)),
        datasets: [{
          label: 'Daily Debit (₹)',
          data: trendData.map(t => t.debit_amount),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.3,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        onClick: (evt, elements) => {
          if (elements.length > 0) {
            const idx = elements[0].index;
            const clickedDate = trendData[idx].date;
            filterSearch.value = clickedDate;
            switchTab(tabBtnLedger, tabContentLedger);
            fetchFilteredTransactions();
          }
        },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  let cashflowChartInstance = null;

  function renderTopMerchants(topRecipients, totalDebited) {
    const tbody = document.getElementById('merchants-table-body');
    if (!tbody) return;

    if (!topRecipients || topRecipients.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No merchant spending data available yet.</td></tr>`;
      return;
    }

    const totalSpentAll = totalDebited > 0 ? totalDebited : topRecipients.reduce((sum, r) => sum + (r.debit_amount || 0), 0);

    tbody.innerHTML = topRecipients.map((r, i) => {
      const spent = Number(r.debit_amount || 0);
      const pct = totalSpentAll > 0 ? Math.min(100, Math.round((spent / totalSpentAll) * 100)) : 0;
      const rankBadge = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
      return `
        <tr class="merchant-row" style="cursor: pointer;" title="Click to filter ${escapeHtml(r.recipient_or_sender)} transactions">
          <td><strong>${rankBadge}</strong></td>
          <td><strong>${escapeHtml(r.recipient_or_sender || '-')}</strong></td>
          <td><span class="badge-debit" style="background: rgba(99,102,241,0.15); color: var(--accent-primary); border-color: rgba(99,102,241,0.3);">${escapeHtml(r.category || 'Others')}</span></td>
          <td>${r.count || 1} tx</td>
          <td style="color: var(--accent-danger); font-weight: 700;">₹${spent.toFixed(2)}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="flex: 1; background: rgba(255,255,255,0.08); border-radius: 10px; height: 7px; overflow: hidden;">
                <div style="width: ${pct}%; background: var(--accent-gradient); height: 100%; border-radius: 10px;"></div>
              </div>
              <span style="font-size: 0.75rem; color: var(--text-secondary); width: 35px; text-align: right;">${pct}%</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.merchant-row').forEach((row, idx) => {
      row.addEventListener('click', () => {
        const item = topRecipients[idx];
        if (item && item.recipient_or_sender) {
          resetAllFilters(false);
          filterSearch.value = item.recipient_or_sender;
          switchTab(tabBtnLedger, tabContentLedger, false);
          fetchFilteredTransactions();
        }
      });
    });
  }

  function renderCashFlowChart(monthlyCashflow) {
    const canvas = document.getElementById('chart-cashflow');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (cashflowChartInstance) cashflowChartInstance.destroy();

    if (!monthlyCashflow || monthlyCashflow.length === 0) return;

    cashflowChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthlyCashflow.map(m => formatDisplayMonth(m.month)),
        datasets: [
          {
            label: 'Total Income (Credit) ₹',
            data: monthlyCashflow.map(m => m.credited),
            backgroundColor: '#10b981',
            borderRadius: 6,
          },
          {
            label: 'Total Debits ₹',
            data: monthlyCashflow.map(m => m.debited),
            backgroundColor: '#ef4444',
            borderRadius: 6,
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#f0f4f8' } }
        },
        onClick: (evt, elements) => {
          if (elements.length > 0) {
            const el = elements[0];
            const monthObj = monthlyCashflow[el.index];
            if (monthObj) {
              const isCredit = el.datasetIndex === 0;
              resetAllFilters(false);
              filterType.value = isCredit ? 'CREDIT' : 'DEBIT';
              filterSearch.value = monthObj.month;
              switchTab(tabBtnLedger, tabContentLedger, false);
              fetchFilteredTransactions();
            }
          }
        },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  function renderRecurringSubscriptions(recurringTx) {
    const grid = document.getElementById('recurring-cards-grid');
    const burnTotalEl = document.getElementById('burn-rate-total');
    if (!grid) return;

    if (!recurringTx || recurringTx.length === 0) {
      if (burnTotalEl) burnTotalEl.textContent = '₹0.00 / month';
      grid.innerHTML = `<div style="color: var(--text-secondary); font-size: 0.85rem; padding: 1rem; text-align: center; grid-column: 1/-1;">No repeating subscription transactions detected yet.</div>`;
      return;
    }

    const totalBurn = recurringTx.reduce((sum, item) => sum + (item.avg_amount || 0), 0);
    if (burnTotalEl) burnTotalEl.textContent = `₹${totalBurn.toFixed(2)} / month`;

    grid.innerHTML = recurringTx.map(item => `
      <div class="kpi-card recurring-card" style="padding: 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem; cursor: pointer;" title="Click to filter ${escapeHtml(item.recipient_or_sender)} transactions">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.2rem;">${escapeHtml(item.recipient_or_sender)}</h4>
            <span class="badge-debit" style="background: rgba(245,158,11,0.15); color: var(--accent-warning); border-color: rgba(245,158,11,0.3);">${escapeHtml(item.category)}</span>
          </div>
          <span style="font-size: 0.72rem; color: var(--text-secondary); background: rgba(255,255,255,0.06); padding: 0.15rem 0.45rem; border-radius: 10px;">${item.count} occurrences</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.08);">
          <div>
            <div style="font-size: 0.72rem; color: var(--text-secondary);">Avg per Bill</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--accent-danger);">₹${Number(item.avg_amount).toFixed(2)}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.72rem; color: var(--text-secondary);">Total Spent</div>
            <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">₹${Number(item.total_spent).toFixed(2)}</div>
          </div>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.recurring-card').forEach((card, idx) => {
      card.addEventListener('click', () => {
        const item = recurringTx[idx];
        if (item && item.recipient_or_sender) {
          resetAllFilters(false);
          filterSearch.value = item.recipient_or_sender;
          filterType.value = 'DEBIT';
          switchTab(tabBtnLedger, tabContentLedger, false);
          fetchFilteredTransactions();
        }
      });
    });
  }

  async function renderBudgetLimits(categories, categorySpending) {
    const grid = document.getElementById('budget-cards-grid');
    if (!grid) return;

    let savedBudgets = {};
    try {
      const res = await fetch('/api/budgets');
      if (res.ok) savedBudgets = await res.json();
    } catch (e) {
      console.error('Failed to fetch budgets', e);
    }

    const spentMap = {};
    if (categorySpending) {
      categorySpending.forEach(c => spentMap[c.category] = c.debit_amount || 0);
    }

    const allCategories = categories && categories.length > 0 ? categories : ['Food/Groceries', 'Fuel', 'Shopping', 'Rent/Housing', 'Bills/Recharge', 'Others'];

    grid.innerHTML = allCategories.map(cat => {
      const bObj = savedBudgets[cat];
      let budgetLimit = 0;
      let spent = spentMap[cat] || 0;

      if (typeof bObj === 'object' && bObj !== null) {
        budgetLimit = bObj.budget_limit || 0;
        if (bObj.spent !== undefined) spent = bObj.spent;
      } else if (typeof bObj === 'number') {
        budgetLimit = bObj;
      }

      const pct = budgetLimit > 0 ? Math.min(100, Math.round((spent / budgetLimit) * 100)) : 0;

      let meterColor = 'var(--accent-success)';
      let statusText = 'On Track';
      if (budgetLimit > 0) {
        if (spent > budgetLimit || pct >= 100) {
          meterColor = 'var(--accent-danger)';
          statusText = '🚨 Exceeded (100%+)';
        } else if (pct >= 80) {
          meterColor = 'var(--accent-warning)';
          statusText = '⚠️ Warning (80%+)';
        }
      }

      return `
        <div class="kpi-card" style="padding: 1rem; display: flex; flex-direction: column; gap: 0.6rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 class="budget-cat-title" style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); cursor: pointer;" title="Click to filter ${escapeHtml(cat)} transactions">${escapeHtml(cat)}</h4>
            <span style="font-size: 0.72rem; font-weight: 600; color: ${meterColor}; background: rgba(255,255,255,0.05); padding: 0.2rem 0.5rem; border-radius: 12px; border: 1px solid ${meterColor};">${statusText}</span>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary);">
            <span>Spent: <strong style="color: var(--text-primary);">₹${spent.toFixed(2)}</strong></span>
            <span>Limit: <strong style="color: var(--accent-primary);">₹${budgetLimit.toFixed(2)}</strong></span>
          </div>

          <div style="background: rgba(255,255,255,0.08); border-radius: 10px; height: 8px; overflow: hidden; margin: 0.2rem 0;">
            <div style="width: ${pct}%; background: ${meterColor}; height: 100%; border-radius: 10px; transition: width 0.3s ease;"></div>
          </div>

          <form class="form-set-budget" data-category="${escapeHtml(cat)}" style="display: flex; gap: 0.4rem; margin-top: 0.3rem;">
            <input type="number" class="form-input budget-input" placeholder="Set Limit ₹" value="${budgetLimit > 0 ? budgetLimit : ''}" style="padding: 0.3rem 0.6rem; font-size: 0.78rem;" required />
            <button type="submit" class="btn" style="font-size: 0.75rem; padding: 0.3rem 0.75rem; white-space: nowrap;">Save Target</button>
          </form>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.budget-cat-title').forEach(title => {
      title.addEventListener('click', () => {
        const catName = title.textContent.trim();
        resetAllFilters(false);
        filterCategory.value = catName;
        switchTab(tabBtnLedger, tabContentLedger, false);
        fetchFilteredTransactions();
      });
    });


    grid.querySelectorAll('.form-set-budget').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const catName = form.getAttribute('data-category');
        const inputVal = form.querySelector('.budget-input').value;
        const formData = new FormData();
        formData.append('category', catName);
        formData.append('budget_limit', inputVal);

        try {
          const res = await fetch('/api/budgets', { method: 'POST', body: formData });
          if (res.ok) {
            await fetchMetrics();
          } else {
            alert('Failed to save budget target.');
          }
        } catch (err) {
          alert('Error communicating with server.');
        }
      });
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[m]);
  }

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // AI Chat Panel Resizer Logic
  const chatResizer = document.getElementById('chat-resizer');
  const chatRightPanel = document.querySelector('.dashboard-chat-right');
  const splitLayout = document.querySelector('.dashboard-split-layout');

  if (chatResizer && chatRightPanel && splitLayout) {
    let isDragging = false;

    const startDragging = () => {
      isDragging = true;
      chatResizer.classList.add('is-dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const stopDragging = () => {
      if (isDragging) {
        isDragging = false;
        chatResizer.classList.remove('is-dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    const onMove = (clientX) => {
      if (!isDragging) return;
      const layoutRect = splitLayout.getBoundingClientRect();
      const newWidth = layoutRect.right - clientX;
      const minWidthPx = window.innerWidth * 0.20; // 20vw min width
      const maxWidthPx = Math.min(window.innerWidth * 0.75, layoutRect.width - 300);
      const clampedWidth = Math.max(minWidthPx, Math.min(newWidth, maxWidthPx));
      chatRightPanel.style.width = `${clampedWidth}px`;
    };

    chatResizer.addEventListener('mousedown', startDragging);
    document.addEventListener('mousemove', (e) => onMove(e.clientX));
    document.addEventListener('mouseup', stopDragging);

    chatResizer.addEventListener('touchstart', startDragging, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) onMove(e.touches[0].clientX);
    }, { passive: true });
    document.addEventListener('touchend', stopDragging);
  }


  // ==========================================================================
  // KHATABOOK / UDHAR LEDGER MODULE LOGIC
  // ==========================================================================

  let udharContacts = [];
  let activeUdharContactId = null;

  const udharKpiGet = document.getElementById('udhar-kpi-get');
  const udharKpiGive = document.getElementById('udhar-kpi-give');
  const udharKpiNet = document.getElementById('udhar-kpi-net');
  const udharKpiContacts = document.getElementById('udhar-kpi-contacts');
  const udharContactsList = document.getElementById('udhar-contacts-list');
  const udharContactSearch = document.getElementById('udhar-contact-search');

  const udharContactEmptyState = document.getElementById('udhar-contact-empty-state');
  const udharContactActiveView = document.getElementById('udhar-contact-active-view');
  const udharActiveName = document.getElementById('udhar-active-name');
  const udharActiveDetails = document.getElementById('udhar-active-details');
  const udharActiveNet = document.getElementById('udhar-active-net');
  const udharDebtsTableBody = document.getElementById('udhar-debts-table-body');

  const btnOpenAddContact = document.getElementById('btn-open-add-contact');
  const btnDeleteActiveContact = document.getElementById('btn-delete-active-contact');
  const btnUdharAddGave = document.getElementById('btn-udhar-add-gave');
  const btnUdharAddGot = document.getElementById('btn-udhar-add-got');

  // Modals
  const udharContactModal = document.getElementById('udhar-contact-modal');
  const btnCloseUdharContactModal = document.getElementById('btn-close-udhar-contact-modal');
  const formUdharContact = document.getElementById('form-udhar-contact');

  const udharEntryModal = document.getElementById('udhar-entry-modal');
  const btnCloseUdharEntryModal = document.getElementById('btn-close-udhar-entry-modal');
  const formUdharEntry = document.getElementById('form-udhar-entry');

  const udharReconcileModal = document.getElementById('udhar-reconcile-modal');
  const btnCloseReconcileModal = document.getElementById('btn-close-reconcile-modal');
  const formUdharReconcile = document.getElementById('form-udhar-reconcile');

  async function loadUdharModule() {
    try {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      if (!res.ok) return;

      udharContacts = data.contacts || [];
      if (udharKpiGet) udharKpiGet.textContent = `₹${(data.total_will_get || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      if (udharKpiGive) udharKpiGive.textContent = `₹${(data.total_will_give || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      if (udharKpiNet) udharKpiNet.textContent = `₹${(data.overall_net || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      if (udharKpiContacts) udharKpiContacts.textContent = udharContacts.length;

      renderContactsList();

      if (activeUdharContactId) {
        const activeExists = udharContacts.some(c => c.id === activeUdharContactId);
        if (activeExists) {
          await selectUdharContact(activeUdharContactId);
        } else {
          activeUdharContactId = null;
          showUdharEmptyState();
        }
      } else {
        showUdharEmptyState();
      }
    } catch (err) {
      console.error('Failed to load Udhar module', err);
    }
  }

  function renderContactsList() {
    if (!udharContactsList) return;
    const query = (udharContactSearch ? udharContactSearch.value : '').toLowerCase().trim();
    const filtered = udharContacts.filter(c => c.name.toLowerCase().includes(query) || (c.phone && c.phone.includes(query)));

    if (filtered.length === 0) {
      udharContactsList.innerHTML = `<div style="color: var(--text-secondary); font-size: 0.82rem; text-align: center; padding: 1.5rem 0;">No matching contacts found.</div>`;
      return;
    }

    udharContactsList.innerHTML = filtered.map(c => {
      const net = c.net_balance || 0;
      let badgeHtml = '';
      if (net > 0) {
        badgeHtml = `<span class="badge-got">Get ₹${net.toFixed(2)}</span>`;
      } else if (net < 0) {
        badgeHtml = `<span class="badge-gave">Give ₹${Math.abs(net).toFixed(2)}</span>`;
      } else {
        badgeHtml = `<span class="badge-settled">Settled</span>`;
      }

      const isActive = c.id === activeUdharContactId;
      return `
        <div class="udhar-contact-item ${isActive ? 'active' : ''}" data-id="${c.id}">
          <div>
            <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">${escapeHtml(c.name)}</div>
            <div style="font-size: 0.72rem; color: var(--text-secondary);">${escapeHtml(c.phone || c.email || 'No phone')}</div>
          </div>
          <div>${badgeHtml}</div>
        </div>
      `;
    }).join('');

    udharContactsList.querySelectorAll('.udhar-contact-item').forEach(item => {
      item.addEventListener('click', async () => {
        const id = parseInt(item.getAttribute('data-id'), 10);
        await selectUdharContact(id);
      });
    });
  }

  if (udharContactSearch) {
    udharContactSearch.addEventListener('input', debounce(renderContactsList, 200));
  }

  function showUdharEmptyState() {
    if (udharContactEmptyState) udharContactEmptyState.classList.remove('hidden');
    if (udharContactActiveView) udharContactActiveView.classList.add('hidden');
  }

  async function selectUdharContact(contactId) {
    activeUdharContactId = contactId;
    renderContactsList();

    try {
      const res = await fetch(`/api/contacts/${contactId}/debts`);
      const data = await res.json();
      if (!res.ok) return;

      const contact = data.contact;
      const debts = data.debts || [];
      const net = data.net_balance || 0;

      if (udharContactEmptyState) udharContactEmptyState.classList.add('hidden');
      if (udharContactActiveView) udharContactActiveView.classList.remove('hidden');

      if (udharActiveName) udharActiveName.textContent = contact.name;
      if (udharActiveDetails) udharActiveDetails.textContent = [contact.phone, contact.email].filter(Boolean).join(' • ') || 'No contact details';

      if (udharActiveNet) {
        if (net > 0) {
          udharActiveNet.textContent = `You Will Get ₹${net.toFixed(2)}`;
          udharActiveNet.style.color = 'var(--accent-success)';
        } else if (net < 0) {
          udharActiveNet.textContent = `You Will Give ₹${Math.abs(net).toFixed(2)}`;
          udharActiveNet.style.color = 'var(--accent-danger)';
        } else {
          udharActiveNet.textContent = `Settled (₹0.00)`;
          udharActiveNet.style.color = 'var(--accent-primary)';
        }
      }

      renderDebtsTable(debts);
    } catch (err) {
      console.error('Failed to fetch contact debts', err);
    }
  }

  function renderDebtsTable(debts) {
    if (!udharDebtsTableBody) return;
    if (!debts || debts.length === 0) {
      udharDebtsTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No ledger entries recorded for this contact yet.</td></tr>`;
      return;
    }

    udharDebtsTableBody.innerHTML = debts.map(d => {
      const isGave = d.type === 'GAVE';
      const isSettled = d.status === 'SETTLED';

      return `
        <tr style="${isSettled ? 'opacity: 0.6;' : ''}">
          <td><strong>${formatDisplayDate(d.date)}</strong></td>
          <td><span class="${isGave ? 'badge-gave' : 'badge-got'}">${isGave ? 'GAVE (Lent)' : 'GOT (Received)'}</span></td>
          <td style="font-weight: 700; color: ${isGave ? 'var(--accent-danger)' : 'var(--accent-success)'};">₹${Number(d.amount).toFixed(2)}</td>
          <td>${escapeHtml(d.note || '-')}${d.tx_recipient ? `<br><span style="font-size: 0.72rem; color: var(--accent-primary);">🔗 ${escapeHtml(d.tx_recipient)}</span>` : ''}</td>
          <td><span class="${isSettled ? 'badge-settled' : 'badge-pending'}">${d.status}</span></td>
          <td style="text-align: center; white-space: nowrap;">
            <button class="btn-toggle-settle btn btn-secondary" data-id="${d.id}" data-status="${d.status}" style="font-size: 0.72rem; padding: 0.2rem 0.5rem; margin-right: 0.3rem;">
              ${isSettled ? 'Mark Pending' : '✓ Settle'}
            </button>
            <button class="btn-delete-debt" data-id="${d.id}" title="Delete debt entry" style="background: none; border: none; color: var(--accent-danger); cursor: pointer; padding: 0.2rem;">✕</button>
          </td>
        </tr>
      `;
    }).join('');

    udharDebtsTableBody.querySelectorAll('.btn-toggle-settle').forEach(btn => {
      btn.addEventListener('click', async () => {
        const debtId = parseInt(btn.getAttribute('data-id'), 10);
        const currentStatus = btn.getAttribute('data-status');
        const nextStatus = currentStatus === 'SETTLED' ? 'PENDING' : 'SETTLED';

        const fd = new FormData();
        fd.append('status_flag', nextStatus);

        try {
          const res = await fetch(`/api/debts/${debtId}/settle`, { method: 'PUT', body: fd });
          if (res.ok) {
            await loadUdharModule();
          }
        } catch (e) {
          alert('Error updating debt status.');
        }
      });
    });

    udharDebtsTableBody.querySelectorAll('.btn-delete-debt').forEach(btn => {
      btn.addEventListener('click', async () => {
        const debtId = parseInt(btn.getAttribute('data-id'), 10);
        if (confirm('Delete this ledger entry?')) {
          try {
            const res = await fetch(`/api/debts/${debtId}`, { method: 'DELETE' });
            if (res.ok) {
              await loadUdharModule();
            }
          } catch (e) {
            alert('Error deleting debt entry.');
          }
        }
      });
    });
  }

  // Add Contact Handlers
  if (btnOpenAddContact) {
    btnOpenAddContact.addEventListener('click', () => {
      if (udharContactModal) udharContactModal.classList.remove('hidden');
    });
  }

  if (btnCloseUdharContactModal) {
    btnCloseUdharContactModal.addEventListener('click', () => {
      if (udharContactModal) udharContactModal.classList.add('hidden');
    });
  }

  if (formUdharContact) {
    formUdharContact.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('contact-modal-name').value;
      const phone = document.getElementById('contact-modal-phone').value;
      const email = document.getElementById('contact-modal-email').value;

      const fd = new FormData();
      fd.append('name', name);
      fd.append('phone', phone);
      fd.append('email', email);

      try {
        const res = await fetch('/api/contacts', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok) {
          if (udharContactModal) udharContactModal.classList.add('hidden');
          formUdharContact.reset();
          activeUdharContactId = data.id;
          await loadUdharModule();
        } else {
          alert(data.detail || 'Failed to create contact.');
        }
      } catch (err) {
        alert('Server error creating contact.');
      }
    });
  }

  // Delete Contact Handler
  if (btnDeleteActiveContact) {
    btnDeleteActiveContact.addEventListener('click', async () => {
      if (!activeUdharContactId) return;
      if (confirm('Are you sure you want to delete this contact and all their ledger history?')) {
        try {
          const res = await fetch(`/api/contacts/${activeUdharContactId}`, { method: 'DELETE' });
          if (res.ok) {
            activeUdharContactId = null;
            await loadUdharModule();
          }
        } catch (e) {
          alert('Error deleting contact.');
        }
      }
    });
  }

  // Add Debt Entry Modal Handlers
  function openUdharEntryModal(type) {
    if (!activeUdharContactId) return;
    const titleEl = document.getElementById('udhar-entry-modal-title');
    const typeInput = document.getElementById('udhar-entry-type');
    const dateInput = document.getElementById('udhar-entry-date');

    if (typeInput) typeInput.value = type;
    if (titleEl) titleEl.textContent = type === 'GAVE' ? '🔻 You Gave Money (Lent)' : '🔺 You Got Money (Received)';
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    document.getElementById('udhar-entry-amount').value = '';
    document.getElementById('udhar-entry-note').value = '';

    if (udharEntryModal) udharEntryModal.classList.remove('hidden');
  }

  if (btnUdharAddGave) btnUdharAddGave.addEventListener('click', () => openUdharEntryModal('GAVE'));
  if (btnUdharAddGot) btnUdharAddGot.addEventListener('click', () => openUdharEntryModal('GOT'));

  if (btnCloseUdharEntryModal) {
    btnCloseUdharEntryModal.addEventListener('click', () => {
      if (udharEntryModal) udharEntryModal.classList.add('hidden');
    });
  }

  if (formUdharEntry) {
    formUdharEntry.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeUdharContactId) return;

      const type = document.getElementById('udhar-entry-type').value;
      const amount = parseFloat(document.getElementById('udhar-entry-amount').value) || 0;
      const date = document.getElementById('udhar-entry-date').value;
      const dueDate = document.getElementById('udhar-entry-due').value;
      const note = document.getElementById('udhar-entry-note').value;

      const fd = new FormData();
      fd.append('contact_id', activeUdharContactId);
      fd.append('debt_type', type);
      fd.append('amount', amount);
      fd.append('date', date);
      fd.append('due_date', dueDate);
      fd.append('note', note);

      try {
        const res = await fetch('/api/debts', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok) {
          if (udharEntryModal) udharEntryModal.classList.add('hidden');
          formUdharEntry.reset();
          await loadUdharModule();
        } else {
          alert(data.detail || 'Failed to save debt entry.');
        }
      } catch (err) {
        alert('Server error saving debt entry.');
      }
    });
  }

  // Statement Reconciliation Handlers
  window.openReconcileModal = async function(txId, txDesc) {
    document.getElementById('reconcile-tx-id').value = txId;
    document.getElementById('reconcile-tx-preview').textContent = txDesc;

    // Load contacts into dropdown
    const select = document.getElementById('reconcile-contact-select');
    if (select) {
      try {
        const res = await fetch('/api/contacts');
        const data = await res.json();
        select.innerHTML = '<option value="">-- Choose Contact --</option>';
        (data.contacts || []).forEach(c => {
          select.innerHTML += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
        });
      } catch (e) {}
    }

    if (udharReconcileModal) udharReconcileModal.classList.remove('hidden');
  };

  if (btnCloseReconcileModal) {
    btnCloseReconcileModal.addEventListener('click', () => {
      if (udharReconcileModal) udharReconcileModal.classList.add('hidden');
    });
  }

  if (formUdharReconcile) {
    formUdharReconcile.addEventListener('submit', async (e) => {
      e.preventDefault();
      const txId = document.getElementById('reconcile-tx-id').value;
      const contactId = document.getElementById('reconcile-contact-select').value;
      const debtType = document.getElementById('reconcile-debt-type').value;

      if (!contactId) {
        alert('Please select a contact first.');
        return;
      }

      const fd = new FormData();
      fd.append('transaction_id', txId);
      fd.append('contact_id', contactId);
      fd.append('debt_type', debtType);

      try {
        const res = await fetch('/api/debts/reconcile', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok) {
          if (udharReconcileModal) udharReconcileModal.classList.add('hidden');
          alert('Transaction successfully linked to contact Udhar ledger!');
          activeUdharContactId = parseInt(contactId, 10);
          switchTab(tabBtnUdhar, tabContentUdhar, false);
          await loadUdharModule();
        } else {
          alert(data.detail || 'Failed to reconcile transaction.');
        }
      } catch (err) {
        alert('Server error reconciling transaction.');
      }
    });
  }


  // ==========================================================================
  // GROUP SPLITS & SPLITWISE MODULE LOGIC
  // ==========================================================================

  let userGroups = [];
  let activeGroupId = null;
  let activeGroupData = null;

  const groupsListContainer = document.getElementById('groups-list-container');
  const groupEmptyState = document.getElementById('group-empty-state');
  const groupActiveView = document.getElementById('group-active-view');

  const groupActiveName = document.getElementById('group-active-name');
  const groupActiveCurrencyBadge = document.getElementById('group-active-currency-badge');
  const groupActiveDesc = document.getElementById('group-active-desc');
  const groupActiveTotalSpend = document.getElementById('group-active-total-spend');
  const groupActiveMembersRow = document.getElementById('group-active-members-row');
  const groupExpensesList = document.getElementById('group-expenses-list');
  const groupSettlementContainer = document.getElementById('group-settlement-instructions-container');

  const btnOpenCreateGroup = document.getElementById('btn-open-create-group');
  const btnDeleteActiveGroup = document.getElementById('btn-delete-active-group');
  const btnOpenAddGroupExpense = document.getElementById('btn-open-add-group-expense');

  // Modals
  const groupCreateModal = document.getElementById('group-create-modal');
  const btnCloseGroupCreateModal = document.getElementById('btn-close-group-create-modal');
  const formGroupCreate = document.getElementById('form-group-create');

  const groupExpenseModal = document.getElementById('group-expense-modal');
  const btnCloseGroupExpenseModal = document.getElementById('btn-close-group-expense-modal');
  const formGroupExpense = document.getElementById('form-group-expense');
  const btnSplitEqually = document.getElementById('btn-split-equally');
  const gexpenseSplitsContainer = document.getElementById('gexpense-splits-inputs-container');

  async function loadGroupsModule() {
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      if (!res.ok) return;

      userGroups = data.groups || [];
      renderGroupsList();

      if (activeGroupId) {
        const exists = userGroups.some(g => g.id === activeGroupId);
        if (exists) {
          await selectGroup(activeGroupId);
        } else {
          activeGroupId = null;
          showGroupEmptyState();
        }
      } else {
        showGroupEmptyState();
      }
    } catch (err) {
      console.error('Failed to load groups module', err);
    }
  }

  function renderGroupsList() {
    if (!groupsListContainer) return;
    if (userGroups.length === 0) {
      groupsListContainer.innerHTML = `<div style="color: var(--text-secondary); font-size: 0.82rem; text-align: center; padding: 1.5rem 0;">No groups created yet. Click "+ Create Group" to start!</div>`;
      return;
    }

    groupsListContainer.innerHTML = userGroups.map(g => {
      const isActive = g.id === activeGroupId;
      return `
        <div class="group-card-item ${isActive ? 'active' : ''}" data-id="${g.id}">
          <div>
            <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">${escapeHtml(g.name)}</div>
            <div style="font-size: 0.72rem; color: var(--text-secondary);">${g.member_count} member(s) • ${escapeHtml(g.currency || 'INR')}</div>
          </div>
          <div style="font-size: 0.85rem; font-weight: 700; color: var(--accent-warning);">
            ₹${Number(g.total_expenses || 0).toFixed(2)}
          </div>
        </div>
      `;
    }).join('');

    groupsListContainer.querySelectorAll('.group-card-item').forEach(item => {
      item.addEventListener('click', async () => {
        const id = parseInt(item.getAttribute('data-id'), 10);
        await selectGroup(id);
      });
    });
  }

  function showGroupEmptyState() {
    if (groupEmptyState) groupEmptyState.classList.remove('hidden');
    if (groupActiveView) groupActiveView.classList.add('hidden');
  }

  async function selectGroup(groupId) {
    activeGroupId = groupId;
    renderGroupsList();

    try {
      const res = await fetch(`/api/groups/${groupId}`);
      const data = await res.json();
      if (!res.ok) return;

      activeGroupData = data;
      const group = data.group;
      const members = data.members || [];
      const expenses = data.expenses || [];
      const settlements = data.settlements || [];

      if (groupEmptyState) groupEmptyState.classList.add('hidden');
      if (groupActiveView) groupActiveView.classList.remove('hidden');

      if (groupActiveName) groupActiveName.textContent = group.name;
      if (groupActiveCurrencyBadge) groupActiveCurrencyBadge.textContent = group.currency || 'INR';
      if (groupActiveDesc) groupActiveDesc.textContent = group.description || 'Shared trip expenses';
      if (groupActiveTotalSpend) groupActiveTotalSpend.textContent = `₹${(data.total_spend || 0).toFixed(2)}`;

      // Render members badges
      if (groupActiveMembersRow) {
        groupActiveMembersRow.innerHTML = members.map(m => {
          const net = m.net_balance || 0;
          let badgeClass = 'badge-settled';
          let text = `${escapeHtml(m.name)}: Settled`;
          if (net > 0) {
            badgeClass = 'badge-got';
            text = `${escapeHtml(m.name)}: +₹${net.toFixed(2)}`;
          } else if (net < 0) {
            badgeClass = 'badge-gave';
            text = `${escapeHtml(m.name)}: -₹${Math.abs(net).toFixed(2)}`;
          }
          return `<span class="${badgeClass}" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">${text}</span>`;
        }).join('');
      }

      // Render expenses feed
      renderGroupExpensesFeed(expenses);

      // Render minimal debt settlement graph
      renderSettlementInstructions(settlements);

    } catch (err) {
      console.error('Failed to fetch group details', err);
    }
  }

  function renderGroupExpensesFeed(expenses) {
    if (!groupExpensesList) return;
    if (!expenses || expenses.length === 0) {
      groupExpensesList.innerHTML = `<div style="color: var(--text-secondary); font-size: 0.82rem; text-align: center; padding: 1.5rem 0;">No shared expenses logged in this group yet.</div>`;
      return;
    }

    groupExpensesList.innerHTML = expenses.map(exp => {
      const splitsSummary = (exp.splits || []).map(s => `${escapeHtml(s.member_name)}: ₹${Number(s.split_amount).toFixed(2)}`).join(' • ');

      return `
        <div class="group-expense-card">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <strong style="font-size: 0.92rem; color: var(--text-primary);">${escapeHtml(exp.title)}</strong>
              <span class="user-badge" style="font-size: 0.68rem; padding: 0.1rem 0.4rem;">${escapeHtml(exp.category || 'Others')}</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem;">
              Paid by <strong>${escapeHtml(exp.paid_by_name)}</strong> on ${formatDisplayDate(exp.date)}
            </div>
            <div style="font-size: 0.72rem; color: var(--accent-primary); margin-top: 0.25rem;">
              Splits: ${splitsSummary || 'Equal'}
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--accent-warning);">
              ₹${Number(exp.amount).toFixed(2)}
            </div>
            <button class="btn-delete-group-expense" data-id="${exp.id}" title="Delete expense" style="background: none; border: none; color: var(--accent-danger); cursor: pointer; padding: 0.2rem;">✕</button>
          </div>
        </div>
      `;
    }).join('');

    groupExpensesList.querySelectorAll('.btn-delete-group-expense').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        if (confirm('Delete this shared group expense?')) {
          try {
            const res = await fetch(`/api/group-expenses/${id}`, { method: 'DELETE' });
            if (res.ok) {
              await selectGroup(activeGroupId);
            }
          } catch (e) {
            alert('Error deleting group expense.');
          }
        }
      });
    });
  }

  function renderSettlementInstructions(settlements) {
    if (!groupSettlementContainer) return;
    if (!settlements || settlements.length === 0) {
      groupSettlementContainer.innerHTML = `<div style="font-size: 0.82rem; color: var(--accent-success); font-weight: 600;">🎉 All balances in this group are settled up!</div>`;
      return;
    }

    groupSettlementContainer.innerHTML = settlements.map(s => `
      <div class="settlement-instruction-item">
        <span><strong>${escapeHtml(s.from_name)}</strong> pays <strong>${escapeHtml(s.to_name)}</strong></span>
        <strong style="color: var(--accent-success); font-size: 0.9rem;">₹${Number(s.amount).toFixed(2)}</strong>
      </div>
    `).join('');
  }

  // Create Group Handlers
  if (btnOpenCreateGroup) {
    btnOpenCreateGroup.addEventListener('click', () => {
      if (groupCreateModal) groupCreateModal.classList.remove('hidden');
    });
  }

  if (btnCloseGroupCreateModal) {
    btnCloseGroupCreateModal.addEventListener('click', () => {
      if (groupCreateModal) groupCreateModal.classList.add('hidden');
    });
  }

  if (formGroupCreate) {
    formGroupCreate.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('group-modal-name').value;
      const currency = document.getElementById('group-modal-currency').value;
      const desc = document.getElementById('group-modal-desc').value;
      const members = document.getElementById('group-modal-members').value;

      const fd = new FormData();
      fd.append('name', name);
      fd.append('currency', currency);
      fd.append('description', desc);
      fd.append('member_names', members);

      try {
        const res = await fetch('/api/groups', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok) {
          if (groupCreateModal) groupCreateModal.classList.add('hidden');
          formGroupCreate.reset();
          activeGroupId = data.group_id;
          await loadGroupsModule();
        } else {
          alert(data.detail || 'Failed to create group.');
        }
      } catch (err) {
        alert('Server error creating group.');
      }
    });
  }

  // Delete Active Group Handler
  if (btnDeleteActiveGroup) {
    btnDeleteActiveGroup.addEventListener('click', async () => {
      if (!activeGroupId) return;
      if (confirm('Delete this group and all its logged shared expenses?')) {
        try {
          const res = await fetch(`/api/groups/${activeGroupId}`, { method: 'DELETE' });
          if (res.ok) {
            activeGroupId = null;
            await loadGroupsModule();
          }
        } catch (e) {
          alert('Error deleting group.');
        }
      }
    });
  }

  // Add Shared Expense Handlers
  if (btnOpenAddGroupExpense) {
    btnOpenAddGroupExpense.addEventListener('click', () => {
      if (!activeGroupData || !activeGroupData.members) return;

      const members = activeGroupData.members;
      const paidBySelect = document.getElementById('gexpense-modal-paidby');
      const dateInput = document.getElementById('gexpense-modal-date');

      if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
      document.getElementById('gexpense-modal-title').value = '';
      document.getElementById('gexpense-modal-amount').value = '';

      if (paidBySelect) {
        paidBySelect.innerHTML = '<option value="">-- Select Member --</option>';
        members.forEach(m => {
          paidBySelect.innerHTML += `<option value="${m.id}">${escapeHtml(m.name)}</option>`;
        });
      }

      // Populate member split inputs
      renderSplitInputs(members);

      if (groupExpenseModal) groupExpenseModal.classList.remove('hidden');
    });
  }

  function renderSplitInputs(members) {
    if (!gexpenseSplitsContainer) return;
    gexpenseSplitsContainer.innerHTML = members.map(m => `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; font-size: 0.8rem;">
        <span>${escapeHtml(m.name)}</span>
        <input type="number" step="0.01" class="form-input gexpense-member-split" data-member-id="${m.id}" placeholder="₹0.00" style="width: 110px; padding: 0.25rem 0.5rem; font-size: 0.78rem;" />
      </div>
    `).join('');
  }

  if (btnSplitEqually) {
    btnSplitEqually.addEventListener('click', () => {
      const total = parseFloat(document.getElementById('gexpense-modal-amount').value) || 0;
      const inputs = document.querySelectorAll('.gexpense-member-split');
      if (inputs.length === 0 || total <= 0) return;

      const share = roundToTwoDecimals(total / inputs.length);
      inputs.forEach(inp => inp.value = share.toFixed(2));
    });
  }

  function roundToTwoDecimals(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  if (btnCloseGroupExpenseModal) {
    btnCloseGroupExpenseModal.addEventListener('click', () => {
      if (groupExpenseModal) groupExpenseModal.classList.add('hidden');
    });
  }

  if (formGroupExpense) {
    formGroupExpense.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeGroupId) return;

      const title = document.getElementById('gexpense-modal-title').value;
      const amount = parseFloat(document.getElementById('gexpense-modal-amount').value) || 0;
      const paidByMemberId = parseInt(document.getElementById('gexpense-modal-paidby').value, 10);
      const date = document.getElementById('gexpense-modal-date').value;
      const category = document.getElementById('gexpense-modal-category').value;

      if (!paidByMemberId) {
        alert('Please select who paid for this expense.');
        return;
      }

      // Collect splits map
      const splits = {};
      let totalSplitSum = 0;
      document.querySelectorAll('.gexpense-member-split').forEach(inp => {
        const mId = inp.getAttribute('data-member-id');
        const sAmt = parseFloat(inp.value) || 0;
        splits[mId] = sAmt;
        totalSplitSum += sAmt;
      });

      // If splits left empty, auto-split equally
      if (totalSplitSum <= 0 && activeGroupData && activeGroupData.members) {
        const count = activeGroupData.members.length;
        const equalShare = roundToTwoDecimals(amount / count);
        activeGroupData.members.forEach(m => {
          splits[m.id] = equalShare;
        });
      }

      const fd = new FormData();
      fd.append('title', title);
      fd.append('amount', amount);
      fd.append('paid_by_member_id', paidByMemberId);
      fd.append('date', date);
      fd.append('category', category);
      fd.append('splits_json', JSON.stringify(splits));

      try {
        const res = await fetch(`/api/groups/${activeGroupId}/expenses`, { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok) {
          if (groupExpenseModal) groupExpenseModal.classList.add('hidden');
          formGroupExpense.reset();
          await selectGroup(activeGroupId);
        } else {
          alert(data.detail || 'Failed to save group expense.');
        }
      } catch (err) {
        alert('Server error saving group expense.');
      }
    });
  }
});
