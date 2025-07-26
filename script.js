// === CONSTANTS ===
const STORAGE_KEY = 'oblivionChecklistProgress';
const EXPANDED_STATE_KEY = 'oblivionExpandedState';

// === STATE ===
let QUEST_DATA = {};
let allExpanded = false;

// === DATA LOADING ===
async function fetchQuests() {
  try {
    const res = await fetch('quests.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    QUEST_DATA = await res.json();
  } catch (error) {
    console.error('Failed to load quest data:', error);
    showError('Failed to load quest data. Please refresh the page.');
  }
}

// === ERROR HANDLING ===
function showError(message) {
  const container = document.getElementById('quest-list');
  container.innerHTML = `<div class="error-message">${message}</div>`;
}

// === QUEST RENDERING ===
async function generateChecklist() {
  await fetchQuests();
  const container = document.getElementById('quest-list');
  container.innerHTML = '';
  
  // Utility function to count quests
  function getQuestCount(node) {
    if (Array.isArray(node)) return node.length;
    if (typeof node === "object" && node !== null) {
      return Object.values(node).reduce((sum, val) => sum + getQuestCount(val), 0);
    }
    return 0;
  }

  function renderQuests(parent, category, quests, level = 2) {
    // level: 2=h2, 3=h3, 4=h4
    const section = document.createElement('section');
    section.setAttribute('data-category', category);
    const header = document.createElement('h' + level);
    header.className = 'category-header';
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', 'false');
    header.style.marginTop = level === 2 ? '2em' : '1.2em';
    header.style.fontSize = level === 2 ? '1.2em' : (level === 3 ? '1.08em' : '1em');

    // Testo della categoria direttamente nell'header
    let displayKey = category.replace(/ \(\d+\)$/g, "");
    if (Array.isArray(quests) || (typeof quests === 'object' && quests !== null)) {
      const count = getQuestCount(quests);
      header.textContent = `${displayKey} (${count})`;
    } else {
      header.textContent = displayKey;
    }
    section.appendChild(header);

    const content = document.createElement('div');
    content.className = 'category-content';
    content.setAttribute('aria-hidden', 'true');
    // Chiudi tutte le categorie all'inizio
    content.style.display = 'none';

    if (Array.isArray(quests)) {
      quests.forEach((quest, i) => {
        const id = `${category}-${i}`.replace(/\s+/g, '-').toLowerCase();
        const div = document.createElement('div');
        div.className = 'quest';
        div.setAttribute('role', 'group');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `quest-${id}`;
        checkbox.dataset.id = id;
        checkbox.setAttribute('aria-describedby', `desc-${id}`);
        div.appendChild(checkbox);
        
        const label = document.createElement('label');
        label.htmlFor = `quest-${id}`;
        label.textContent = quest.name;
        label.className = 'quest-title';
        div.appendChild(label);
        
        const desc = document.createElement('div');
        desc.id = `desc-${id}`;
        desc.className = 'quest-desc';
        desc.textContent = quest.desc;
        div.appendChild(desc);
        
        // Blocca selezione testo per click
        div.style.userSelect = 'none';
        
        // Clicca ovunque nel blocco per checkare
        div.addEventListener('click', function(e) {
          // Se si clicca direttamente sul checkbox o label, lascia comportamento nativo
          if (e.target === checkbox || e.target === label) return;
          // Toggle manuale
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        });
        
        content.appendChild(div);
      });
    } else if (typeof quests === 'object') {
      for (const [subcat, subquests] of Object.entries(quests)) {
        renderQuests(content, subcat, subquests, Math.min(level + 1, 4));
      }
    }
    section.appendChild(content);
    parent.appendChild(section);

    // Funzionalità hide/unhide
    function toggleCategory() {
      const isHidden = content.style.display === 'none';
      content.style.display = isHidden ? '' : 'none';
      header.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
      content.setAttribute('aria-hidden', isHidden ? 'false' : 'true');
      saveExpandedState();
    }
    
    header.addEventListener('click', toggleCategory);
    
    // Keyboard navigation
    header.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCategory();
      }
    });
  }

  for (const [category, quests] of Object.entries(QUEST_DATA)) {
    renderQuests(container, category, quests, 2);
  }

  // === EVENT LISTENERS ===
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', saveProgress);
  });

  loadProgress();
  loadExpandedState();
}

// === CATEGORY MANAGEMENT ===
function toggleAllCategories() {
  const btn = document.getElementById('toggle-all-btn');
  const sections = document.querySelectorAll('.category-content');
  const headers = document.querySelectorAll('.category-header');
  
  allExpanded = !allExpanded;
  
  sections.forEach((content) => {
    content.style.display = allExpanded ? '' : 'none';
    content.setAttribute('aria-hidden', allExpanded ? 'false' : 'true');
  });
  
  headers.forEach(header => {
    header.setAttribute('aria-expanded', allExpanded ? 'true' : 'false');
  });
  
  btn.textContent = allExpanded ? 'Collapse All' : 'Expand All';
  saveExpandedState();
}

// === STATE PERSISTENCE ===
function saveExpandedState() {
  const expandedSections = {};
  document.querySelectorAll('section[data-category]').forEach(section => {
    const category = section.dataset.category;
    const content = section.querySelector('.category-content');
    expandedSections[category] = content.style.display !== 'none';
  });
  
  const state = {
    sections: expandedSections,
    allExpanded: allExpanded
  };
  
  localStorage.setItem(EXPANDED_STATE_KEY, JSON.stringify(state));
}

function loadExpandedState() {
  const saved = localStorage.getItem(EXPANDED_STATE_KEY);
  if (!saved) return;
  
  try {
    const state = JSON.parse(saved);
    allExpanded = state.allExpanded || false;
    
    const btn = document.getElementById('toggle-all-btn');
    btn.textContent = allExpanded ? 'Collapse All' : 'Expand All';
    
    if (state.sections) {
      document.querySelectorAll('section[data-category]').forEach(section => {
        const category = section.dataset.category;
        const content = section.querySelector('.category-content');
        const header = section.querySelector('.category-header');
        
        const isExpanded = state.sections[category] || false;
        content.style.display = isExpanded ? '' : 'none';
        content.setAttribute('aria-hidden', isExpanded ? 'false' : 'true');
        header.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      });
    }
  } catch (error) {
    console.error('Failed to load expanded state:', error);
  }
}

// === PROGRESS TRACKING ===
function saveProgress() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  const progress = {};
  checkboxes.forEach(cb => {
    progress[cb.dataset.id] = cb.checked;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  updateProgressBar();
}

function loadProgress() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  
  try {
    const progress = JSON.parse(saved);
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = progress[cb.dataset.id] || false;
    });
    updateProgressBar();
  } catch (error) {
    console.error('Failed to load progress:', error);
  }
}

function updateProgressBar() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  const total = checkboxes.length;
  
  if (total === 0) {
    document.getElementById('progress-bar').value = 0;
    document.getElementById('progress-text').textContent = '0%';
    return;
  }
  
  const checked = [...checkboxes].filter(cb => cb.checked).length;
  const percent = Math.round((checked / total) * 100);
  
  document.getElementById('progress-bar').value = percent;
  document.getElementById('progress-text').textContent = `${percent}% (${checked}/${total})`;
}

// === IMPORT/EXPORT ===
function exportProgress() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  const progress = {};
  checkboxes.forEach(cb => {
    progress[cb.dataset.id] = cb.checked;
  });

  const json = JSON.stringify(progress, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'oblivion-progress.json';
  a.style.display = 'none';
  document.body.appendChild(a);

  setTimeout(() => {
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

function importProgress() {
  const input = document.getElementById('import-file');
  input.value = '';
  input.click();
  input.onchange = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
          cb.checked = !!data[cb.dataset.id];
        });
        saveProgress();
      } catch (err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };
}

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', generateChecklist);
