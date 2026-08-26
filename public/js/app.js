/**
 * Riwaz Problem Statement Submission Portal - Executive Client Controller
 */

(function () {
  'use strict';

  // State
  const state = {
    selectedTeam: null,
    selectedTheme: null,
    selectedPS: null,
    themes: [],
    problemStatementsByTheme: {},
    isSubmitting: false,
  };

  // DOM Elements
  const DOM = {
    // Stepper
    stepIndicators: [
      document.getElementById('stepIndicator1'),
      document.getElementById('stepIndicator2'),
      document.getElementById('stepIndicator3'),
    ],
    stepNums: [
      document.getElementById('stepNum1'),
      document.getElementById('stepNum2'),
      document.getElementById('stepNum3'),
    ],

    // Notifications
    globalNotification: document.getElementById('globalNotification'),

    // Phase 1 Elements
    phase1Card: document.getElementById('phase1Card'),
    phase1Badge: document.getElementById('phase1Badge'),
    teamSearchSection: document.getElementById('teamSearchSection'),
    teamSearchInput: document.getElementById('teamSearchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    autocompleteList: document.getElementById('autocompleteList'),
    teamDetailsSection: document.getElementById('teamDetailsSection'),
    changeTeamBtn: document.getElementById('changeTeamBtn'),
    alreadySubmittedAlert: document.getElementById('alreadySubmittedAlert'),
    dispTeamName: document.getElementById('dispTeamName'),
    dispTeamLeader: document.getElementById('dispTeamLeader'),
    dispLeaderUSN: document.getElementById('dispLeaderUSN'),
    dispPhone: document.getElementById('dispPhone'),
    dispCollege: document.getElementById('dispCollege'),
    dispTrack: document.getElementById('dispTrack'),
    dispMembers: document.getElementById('dispMembers'),

    // Phase 2 Elements
    phase2Card: document.getElementById('phase2Card'),
    phase2Badge: document.getElementById('phase2Badge'),
    themesLoading: document.getElementById('themesLoading'),
    themesGrid: document.getElementById('themesGrid'),
    psSelectGroup: document.getElementById('psSelectGroup'),
    psDropdown: document.getElementById('psDropdown'),
    psCountHint: document.getElementById('psCountHint'),
    psDetailsSection: document.getElementById('psDetailsSection'),
    dispPsCategory: document.getElementById('dispPsCategory'),
    dispPsId: document.getElementById('dispPsId'),
    dispPsTheme: document.getElementById('dispPsTheme'),
    dispPsTitle: document.getElementById('dispPsTitle'),

    // Phase 3 Elements
    phase3Card: document.getElementById('phase3Card'),
    phase3Badge: document.getElementById('phase3Badge'),
    summaryTeamName: document.getElementById('summaryTeamName'),
    summaryTeamLeader: document.getElementById('summaryTeamLeader'),
    summaryPsId: document.getElementById('summaryPsId'),
    summaryPsTheme: document.getElementById('summaryPsTheme'),
    summaryPsName: document.getElementById('summaryPsName'),
    finalSubmitBtn: document.getElementById('finalSubmitBtn'),

    // Confirmation Modal
    confirmModal: document.getElementById('confirmModal'),
    modalConfirmTeamLeader: document.getElementById('modalConfirmTeamLeader'),
    modalConfirmTeamName: document.getElementById('modalConfirmTeamName'),
    modalConfirmPsId: document.getElementById('modalConfirmPsId'),
    modalConfirmPsName: document.getElementById('modalConfirmPsName'),
    modalConfirmTheme: document.getElementById('modalConfirmTheme'),
    cancelConfirmBtn: document.getElementById('cancelConfirmBtn'),
    executeSubmitBtn: document.getElementById('executeSubmitBtn'),

    // Receipt Modal
    receiptModal: document.getElementById('receiptModal'),
    receiptTeamName: document.getElementById('receiptTeamName'),
    receiptLeader: document.getElementById('receiptLeader'),
    receiptPsId: document.getElementById('receiptPsId'),
    receiptPsName: document.getElementById('receiptPsName'),
    receiptTheme: document.getElementById('receiptTheme'),
    receiptCategory: document.getElementById('receiptCategory'),
    printReceiptBtn: document.getElementById('printReceiptBtn'),
    closeModalBtn: document.getElementById('closeModalBtn'),
  };

  // Debounce helper
  function debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Refresh Lucide icons
  function refreshIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Generate 2-letter initials for avatar
  function getInitials(name) {
    if (!name) return 'TM';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  // Show alert notification banner
  function showNotification(message, type = 'error') {
    DOM.globalNotification.className = `alert-card-box ${type}`;
    DOM.globalNotification.innerHTML = `
      <i data-lucide="${type === 'error' ? 'alert-circle' : type === 'warning' ? 'alert-triangle' : 'check-circle'}" style="width: 18px; height: 18px; flex-shrink: 0; margin-top: 2px;"></i>
      <div><strong>${type === 'error' ? 'Error' : type === 'warning' ? 'Notice' : 'Success'}:</strong> ${escapeHtml(message)}</div>
    `;
    DOM.globalNotification.style.display = 'flex';
    refreshIcons();

    if (type !== 'error') {
      setTimeout(() => {
        DOM.globalNotification.style.display = 'none';
      }, 5000);
    }
  }

  function hideNotification() {
    DOM.globalNotification.style.display = 'none';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ========================================================
  // PHASE 1: TEAM SEARCH & AUTOCOMPLETE
  // ========================================================

  async function handleSearchInput(e) {
    const query = e.target.value.trim();

    if (query.length > 0) {
      DOM.clearSearchBtn.style.display = 'block';
    } else {
      DOM.clearSearchBtn.style.display = 'none';
    }

    if (query.length < 2) {
      DOM.autocompleteList.classList.remove('open');
      DOM.autocompleteList.innerHTML = '';
      return;
    }

    DOM.autocompleteList.innerHTML = '<div class="dropdown-state-msg">Searching registered teams...</div>';
    DOM.autocompleteList.classList.add('open');

    try {
      const res = await fetch(`/api/teams/search?q=${encodeURIComponent(query)}`);
      const result = await res.json();

      if (!result.success || !result.data || result.data.length === 0) {
        DOM.autocompleteList.innerHTML = `
          <div class="dropdown-state-msg">
            No registered team found matching "<strong>${escapeHtml(query)}</strong>"
          </div>
        `;
        return;
      }

      renderSuggestions(result.data);
    } catch (err) {
      DOM.autocompleteList.innerHTML = '<div class="dropdown-state-msg">Search temporarily unavailable. Please retry.</div>';
    }
  }

  function renderSuggestions(teams) {
    DOM.autocompleteList.innerHTML = '';

    teams.forEach((team) => {
      const initials = getInitials(team.teamLeader || team.teamName);
      const card = document.createElement('div');
      card.className = 'team-result-card';
      card.setAttribute('role', 'option');
      card.innerHTML = `
        <div class="team-avatar-info">
          <div class="team-avatar-circle">${escapeHtml(initials)}</div>
          <div>
            <div class="team-name-text">${escapeHtml(team.teamName)}</div>
            <div class="team-leader-sub">Leader: <strong>${escapeHtml(team.teamLeader)}</strong></div>
          </div>
        </div>
        <div class="team-action-side">
          <span class="badge-tag-sm">${escapeHtml(team.matchField)}</span>
          <span class="select-action-btn">Select →</span>
        </div>
      `;

      // Instant selection triggers on both mousedown & click
      const onSelect = (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectTeam(team.teamId || team.usn || team.teamLeader);
      };

      card.addEventListener('mousedown', onSelect);
      card.addEventListener('click', onSelect);

      DOM.autocompleteList.appendChild(card);
    });
  }

  async function selectTeam(teamId) {
    DOM.autocompleteList.classList.remove('open');
    DOM.teamSearchInput.value = '';
    DOM.clearSearchBtn.style.display = 'none';
    hideNotification();

    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}`);
      const result = await res.json();

      if (!result.success || !result.data) {
        showNotification(result.message || 'Unable to load team details', 'error');
        return;
      }

      state.selectedTeam = result.data;
      displayTeamDetails(result.data);

      if (result.data.hasSubmitted) {
        DOM.alreadySubmittedAlert.style.display = 'flex';
        DOM.phase1Badge.textContent = 'Already Submitted';
        DOM.phase1Badge.className = 'badge-tag tag-warning';
        lockPhase(2);
        lockPhase(3);
        updateStepper(1);
      } else {
        DOM.alreadySubmittedAlert.style.display = 'none';
        DOM.phase1Badge.textContent = 'Verified ✓';
        DOM.phase1Badge.className = 'badge-tag tag-verified';
        
        unlockPhase(2);
        updateStepper(2);
        loadThemes();
      }
      refreshIcons();
    } catch (err) {
      showNotification('Network error retrieving team record.', 'error');
    }
  }

  function displayTeamDetails(team) {
    DOM.dispTeamName.textContent = team.teamName || '-';
    DOM.dispTeamLeader.textContent = team.teamLeader || '-';
    DOM.dispLeaderUSN.textContent = team.usn || '-';
    DOM.dispPhone.textContent = team.phone || '-';
    DOM.dispCollege.textContent = team.college || 'Engineering';
    DOM.dispTrack.textContent = team.track || 'General';

    if (team.members) {
      const memberList = String(team.members)
        .split(/[,;\n•]+/)
        .map((m) => m.trim())
        .filter(Boolean);

      if (memberList.length > 0) {
        DOM.dispMembers.innerHTML = memberList
          .map((name, idx) => `<span class="member-chip"><span class="member-chip-num">${idx + 1}</span>${escapeHtml(name)}</span>`)
          .join('');
      } else {
        DOM.dispMembers.innerHTML = `<span class="member-chip">${escapeHtml(team.members)}</span>`;
      }
    } else {
      DOM.dispMembers.innerHTML = '<span class="member-chip">Registered Team Members</span>';
    }

    DOM.teamSearchSection.style.display = 'none';
    DOM.teamDetailsSection.style.display = 'block';
  }

  function resetTeamSelection() {
    state.selectedTeam = null;
    state.selectedTheme = null;
    state.selectedPS = null;

    DOM.teamDetailsSection.style.display = 'none';
    DOM.teamSearchSection.style.display = 'block';
    DOM.teamSearchInput.value = '';
    DOM.phase1Badge.textContent = 'Pending';
    DOM.phase1Badge.className = 'badge-tag tag-pending';

    DOM.psDropdown.innerHTML = '<option value="">-- Choose Problem Statement --</option>';
    DOM.psSelectGroup.style.display = 'none';
    DOM.psDetailsSection.style.display = 'none';
    const activePill = DOM.themesGrid.querySelector('.theme-chip-btn.active');
    if (activePill) activePill.classList.remove('active');

    lockPhase(2);
    lockPhase(3);
    updateStepper(1);
    hideNotification();
    refreshIcons();
  }

  // ========================================================
  // PHASE 2: THEME & PROBLEM STATEMENT SELECTION
  // ========================================================

  async function loadThemes() {
    if (state.themes.length > 0) return;

    try {
      DOM.themesLoading.textContent = 'Loading themes...';
      const res = await fetch('/api/themes');
      const result = await res.json();

      if (!result.success || !result.data) {
        DOM.themesLoading.textContent = 'Failed to load themes';
        return;
      }

      state.themes = result.data;
      DOM.themesLoading.textContent = `${result.data.length} themes available`;
      renderThemePills(result.data);
    } catch (err) {
      DOM.themesLoading.textContent = 'Failed to load themes';
    }
  }

  function renderThemePills(themes) {
    DOM.themesGrid.innerHTML = '';

    themes.forEach((theme) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'theme-chip-btn';
      chip.textContent = theme;

      chip.addEventListener('click', () => {
        selectTheme(theme, chip);
      });

      DOM.themesGrid.appendChild(chip);
    });
  }

  async function selectTheme(theme, activePillElement) {
    state.selectedTheme = theme;
    state.selectedPS = null;

    const pills = DOM.themesGrid.querySelectorAll('.theme-chip-btn');
    pills.forEach((p) => p.classList.remove('active'));
    if (activePillElement) {
      activePillElement.classList.add('active');
    }

    DOM.psDetailsSection.style.display = 'none';
    lockPhase(3);
    DOM.phase2Badge.textContent = 'Theme Selected';
    DOM.phase2Badge.className = 'badge-tag tag-pending';

    DOM.psSelectGroup.style.display = 'block';
    DOM.psDropdown.innerHTML = '<option value="">Loading problem statements...</option>';
    DOM.psDropdown.disabled = true;

    try {
      let statements = state.problemStatementsByTheme[theme];
      if (!statements) {
        const res = await fetch(`/api/problem-statements?theme=${encodeURIComponent(theme)}`);
        const result = await res.json();
        if (result.success && result.data) {
          statements = result.data;
          state.problemStatementsByTheme[theme] = statements;
        }
      }

      if (!statements || statements.length === 0) {
        DOM.psDropdown.innerHTML = '<option value="">No problem statements found under this theme</option>';
        DOM.psCountHint.textContent = '0 statements';
        return;
      }

      DOM.psCountHint.textContent = `${statements.length} problem statements available`;
      DOM.psDropdown.disabled = false;
      DOM.psDropdown.innerHTML = '<option value="">-- Choose Problem Statement --</option>';

      statements.forEach((ps) => {
        const opt = document.createElement('option');
        opt.value = ps.psId;
        opt.textContent = `[${ps.psId}] ${ps.problemStatement}`;
        DOM.psDropdown.appendChild(opt);
      });
    } catch (err) {
      DOM.psDropdown.innerHTML = '<option value="">Failed to load problem statements</option>';
    }
  }

  function handlePSDropdownChange(e) {
    const psId = e.target.value;
    if (!psId) {
      state.selectedPS = null;
      DOM.psDetailsSection.style.display = 'none';
      lockPhase(3);
      DOM.phase2Badge.textContent = 'Theme Selected';
      DOM.phase2Badge.className = 'badge-tag tag-pending';
      return;
    }

    const currentThemeStatements = state.problemStatementsByTheme[state.selectedTheme] || [];
    const ps = currentThemeStatements.find((item) => item.psId === psId);

    if (!ps) return;

    state.selectedPS = ps;
    displayPSDetails(ps);

    DOM.phase2Badge.textContent = 'Selected ✓';
    DOM.phase2Badge.className = 'badge-tag tag-verified';

    unlockPhase(3);
    updateStepper(3);
    preparePhase3Summary();
    refreshIcons();
  }

  function displayPSDetails(ps) {
    DOM.dispPsId.textContent = ps.psId;
    DOM.dispPsTheme.textContent = ps.theme;
    DOM.dispPsCategory.textContent = ps.category || 'General';
    DOM.dispPsTitle.textContent = ps.problemStatement;
    DOM.psDetailsSection.style.display = 'block';
  }

  // ========================================================
  // PHASE 3: SUBMISSION & CONFIRMATION MODAL
  // ========================================================

  function preparePhase3Summary() {
    if (!state.selectedTeam || !state.selectedPS) return;

    DOM.summaryTeamName.textContent = state.selectedTeam.teamName;
    DOM.summaryTeamLeader.textContent = state.selectedTeam.teamLeader;
    DOM.summaryPsId.textContent = state.selectedPS.psId;
    DOM.summaryPsTheme.textContent = state.selectedPS.theme;
    DOM.summaryPsName.textContent = state.selectedPS.problemStatement;
    DOM.finalSubmitBtn.disabled = false;
  }

  function handleOpenConfirmModal() {
    if (!state.selectedTeam || !state.selectedPS || state.isSubmitting) return;

    DOM.modalConfirmTeamLeader.textContent = state.selectedTeam.teamLeader;
    DOM.modalConfirmTeamName.textContent = state.selectedTeam.teamName;
    DOM.modalConfirmPsId.textContent = state.selectedPS.psId;
    DOM.modalConfirmPsName.textContent = state.selectedPS.problemStatement;
    DOM.modalConfirmTheme.textContent = state.selectedPS.theme;

    DOM.confirmModal.classList.add('open');
    refreshIcons();
  }

  function handleCloseConfirmModal() {
    DOM.confirmModal.classList.remove('open');
  }

  async function handleExecuteSubmit() {
    if (!state.selectedTeam || !state.selectedPS || state.isSubmitting) return;

    state.isSubmitting = true;
    DOM.executeSubmitBtn.disabled = true;
    DOM.executeSubmitBtn.innerHTML = '<span class="spin-loader"></span> Submitting...';
    hideNotification();

    try {
      const payload = {
        teamId: state.selectedTeam.teamId || state.selectedTeam.usn || state.selectedTeam.teamLeader,
        psId: state.selectedPS.psId,
      };

      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        handleCloseConfirmModal();
        showNotification(result.message || 'Submission was rejected by the server.', 'error');
        DOM.finalSubmitBtn.disabled = false;
        DOM.executeSubmitBtn.disabled = false;
        DOM.executeSubmitBtn.textContent = 'Confirm & Lock In';
        refreshIcons();
        state.isSubmitting = false;
        return;
      }

      handleCloseConfirmModal();

      DOM.phase3Badge.textContent = 'Submitted ✓';
      DOM.phase3Badge.className = 'badge-tag tag-verified';
      DOM.finalSubmitBtn.disabled = true;
      DOM.finalSubmitBtn.innerHTML = '<i data-lucide="check" style="width: 18px; height: 18px;"></i> Submitted Successfully';
      completeAllSteps();

      showReceiptModal(result.data);
    } catch (err) {
      handleCloseConfirmModal();
      showNotification('Network error occurred during submission. Please try again.', 'error');
      DOM.finalSubmitBtn.disabled = false;
      DOM.executeSubmitBtn.disabled = false;
      DOM.executeSubmitBtn.textContent = 'Confirm & Lock In';
      refreshIcons();
    } finally {
      state.isSubmitting = false;
    }
  }

  function showReceiptModal(data) {
    DOM.receiptTeamName.textContent = data.teamName;
    DOM.receiptLeader.textContent = data.leader;
    DOM.receiptPsId.textContent = data.psId;
    DOM.receiptPsName.textContent = data.psName || data.problemStatement;
    DOM.receiptTheme.textContent = data.theme;
    DOM.receiptCategory.textContent = data.category;

    DOM.receiptModal.classList.add('open');
    refreshIcons();
  }

  function closeReceiptModal() {
    DOM.receiptModal.classList.remove('open');
  }

  // ========================================================
  // STEPPER & PHASE CARD HELPERS
  // ========================================================

  function unlockPhase(phaseNum) {
    const card = document.getElementById(`phase${phaseNum}Card`);
    if (card) {
      card.classList.remove('disabled-panel');
    }
  }

  function lockPhase(phaseNum) {
    const card = document.getElementById(`phase${phaseNum}Card`);
    if (card) {
      card.classList.add('disabled-panel');
    }
    const badge = document.getElementById(`phase${phaseNum}Badge`);
    if (badge) {
      badge.textContent = 'Locked';
      badge.className = 'badge-tag tag-pending';
    }
  }

  function updateStepper(currentStep) {
    DOM.stepIndicators.forEach((ind, index) => {
      const stepNum = index + 1;
      ind.classList.remove('active', 'completed');
      DOM.stepNums[index].innerHTML = stepNum;

      if (stepNum < currentStep) {
        ind.classList.add('completed');
        DOM.stepNums[index].innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px;"></i>';
      } else if (stepNum === currentStep) {
        ind.classList.add('active');
      }
    });
    refreshIcons();
  }

  function completeAllSteps() {
    DOM.stepIndicators.forEach((ind, index) => {
      ind.classList.remove('active');
      ind.classList.add('completed');
      DOM.stepNums[index].innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px;"></i>';
    });
    refreshIcons();
  }

  // ========================================================
  // EVENT LISTENERS & INIT
  // ========================================================

  function initEventListeners() {
    DOM.teamSearchInput.addEventListener('input', debounce(handleSearchInput, 150));
    DOM.teamSearchInput.addEventListener('focus', handleSearchInput);

    DOM.clearSearchBtn.addEventListener('click', () => {
      DOM.teamSearchInput.value = '';
      DOM.clearSearchBtn.style.display = 'none';
      DOM.autocompleteList.classList.remove('open');
      DOM.teamSearchInput.focus();
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#teamSearchSection')) {
        DOM.autocompleteList.classList.remove('open');
      }
    });

    DOM.changeTeamBtn.addEventListener('click', resetTeamSelection);
    DOM.psDropdown.addEventListener('change', handlePSDropdownChange);
    DOM.finalSubmitBtn.addEventListener('click', handleOpenConfirmModal);
    DOM.cancelConfirmBtn.addEventListener('click', handleCloseConfirmModal);
    DOM.executeSubmitBtn.addEventListener('click', handleExecuteSubmit);

    DOM.closeModalBtn.addEventListener('click', closeReceiptModal);
    DOM.printReceiptBtn.addEventListener('click', () => {
      window.print();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    refreshIcons();
  });
})();
