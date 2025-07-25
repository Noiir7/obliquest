const STORAGE_KEY = 'oblivionChecklistProgress';
let QUEST_DATA = {};

async function fetchQuests() {
  const res = await fetch('quests.json');
  QUEST_DATA = await res.json();
}

async function generateChecklist() {
  await fetchQuests();
  const container = document.getElementById('quest-list');
  container.innerHTML = '';
  function getQuestCount(node) {
    if (Array.isArray(node)) {
      return node.length;
    } else if (typeof node === "object" && node !== null) {
      return Object.values(node).reduce((sum, val) => sum + getQuestCount(val), 0);
    }
    return 0;
  }

  function renderQuests(parent, category, quests, level = 2) {
    // level: 2=h2, 3=h3, 4=h4
    const section = document.createElement('section');
    const header = document.createElement('h' + level);
    header.className = 'category-header';
    header.style.marginTop = level === 2 ? '2em' : '1.2em';
    header.style.fontSize = level === 2 ? '1.2em' : (level === 3 ? '1.08em' : '1em');
    header.style.color = '#444';

    // Bottone hide/unhide con freccia sottile
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-btn';
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-label', 'Nascondi/Mostra');
    toggleBtn.textContent = '▾';
    toggleBtn.style.marginRight = '0.5em';
    header.appendChild(toggleBtn);
    // Testo cliccabile
    const catText = document.createElement('span');
    // Calcola il conteggio delle quest per la categoria
    let displayKey = category.replace(/ \(\d+\)$/g, "");
    if (Array.isArray(quests) || (typeof quests === 'object' && quests !== null)) {
      const count = getQuestCount(quests);
      catText.textContent = `${displayKey} (${count})`;
    } else {
      catText.textContent = displayKey;
    }
    catText.className = 'category-title';
    header.appendChild(catText);
    // Colore diverso per livello
    header.classList.add('category-header-level' + level);
    section.appendChild(header);

    const content = document.createElement('div');
    content.className = 'category-content';

    if (Array.isArray(quests)) {
      quests.forEach((quest, i) => {
        const id = `${category}-${i}`.replace(/\s+/g, '-').toLowerCase();
        const div = document.createElement('div');
        div.className = 'quest';
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.id = id;
        label.appendChild(checkbox);
        label.append(` ${quest.name}`);
        div.appendChild(label);
        const desc = document.createElement('div');
        desc.className = 'quest-desc';
        desc.textContent = quest.desc;
        div.appendChild(desc);
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
      if (content.style.display === 'none') {
        content.style.display = '';
        toggleBtn.textContent = '▾';
      } else {
        content.style.display = 'none';
        toggleBtn.textContent = '▸';
      }
    }
    toggleBtn.addEventListener('click', toggleCategory);
    catText.addEventListener('click', toggleCategory);
    catText.style.cursor = 'pointer';
  }

  for (const [category, quests] of Object.entries(QUEST_DATA)) {
    renderQuests(container, category, quests, 2);
  }

  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', saveProgress);
  });

  loadProgress();
}

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
  const progress = JSON.parse(saved);
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.checked = progress[cb.dataset.id] || false;
  });
  updateProgressBar();
}

function updateProgressBar() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  const total = checkboxes.length;
  const checked = [...checkboxes].filter(cb => cb.checked).length;
  const percent = Math.round((checked / total) * 100);
  document.getElementById('progress-bar').value = percent;
  document.getElementById('progress-text').textContent = percent + '%';
}

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

document.addEventListener('DOMContentLoaded', generateChecklist);
