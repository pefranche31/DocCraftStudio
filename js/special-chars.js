/**
 * DocCraft Studio - Special Characters & Emoji Picker
 */

const specialCharsData = {
  "math": {
    label: "Maths & Logique",
    icon: "fa-calculator",
    items: [
      { char: "=", name: "Égal", keywords: "equal egal" },
      { char: "≠", name: "Différent de", keywords: "not equal different" },
      { char: "≈", name: "Environ égal", keywords: "almost equal environ" },
      { char: "≡", name: "Identique à", keywords: "identical identique" },
      { char: "≤", name: "Inférieur ou égal", keywords: "less than or equal inferieur" },
      { char: "≥", name: "Supérieur ou égal", keywords: "greater than or equal superieur" },
      { char: "<", name: "Strictement inférieur", keywords: "less inferieur" },
      { char: ">", name: "Strictement supérieur", keywords: "greater superieur" },
      { char: "+", name: "Plus", keywords: "plus add" },
      { char: "−", name: "Moins", keywords: "minus moins" },
      { char: "±", name: "Plus ou moins", keywords: "plus minus" },
      { char: "×", name: "Multiplication", keywords: "multiply multiplication fois cross" },
      { char: "÷", name: "Division", keywords: "divide division" },
      { char: "∑", name: "Somme", keywords: "sum somme sigma" },
      { char: "∏", name: "Produit", keywords: "product produit pi" },
      { char: "√", name: "Racine carrée", keywords: "square root racine" },
      { char: "∞", name: "Infini", keywords: "infinity infini" },
      { char: "∫", name: "Intégrale", keywords: "integral" },
      { char: "∂", name: "Dérivée partielle", keywords: "partial derivative derivee" },
      { char: "∆", name: "Delta (Incrément)", keywords: "delta difference increment" },
      { char: "∈", name: "Appartient à", keywords: "in appartient" },
      { char: "∉", name: "N'appartient pas", keywords: "not in" },
      { char: "⊂", name: "Inclus dans", keywords: "subset inclus" },
      { char: "⊃", name: "Contient", keywords: "superset contient" },
      { char: "∪", name: "Union", keywords: "union" },
      { char: "∩", name: "Intersection", keywords: "intersection" },
      { char: "∅", name: "Ensemble vide", keywords: "empty set vide" },
      { char: "°", name: "Degré", keywords: "degree degre" },
      { char: "‰", name: "Pour mille", keywords: "per mille pourmille" },
      { char: "¼", name: "Un quart", keywords: "quarter quart" },
      { char: "½", name: "Un demi", keywords: "half demi" },
      { char: "¾", name: "Trois quarts", keywords: "three quarters trois" },
      { char: "²", name: "Au carré", keywords: "squared carre" },
      { char: "³", name: "Au cube", keywords: "cubed cube" },
      { char: "π", name: "Pi", keywords: "pi" },
      { char: "α", name: "Alpha", keywords: "alpha greek" },
      { char: "β", name: "Beta", keywords: "beta greek" },
      { char: "γ", name: "Gamma", keywords: "gamma greek" },
      { char: "λ", name: "Lambda", keywords: "lambda greek" },
      { char: "μ", name: "Mu", keywords: "mu greek" },
      { char: "Ω", name: "Omega", keywords: "omega greek" }
    ]
  },
  "arrows": {
    label: "Flèches",
    icon: "fa-arrow-right",
    items: [
      { char: "→", name: "Droite", keywords: "right droite arrow" },
      { char: "←", name: "Gauche", keywords: "left gauche arrow" },
      { char: "↑", name: "Haut", keywords: "up haut arrow" },
      { char: "↓", name: "Bas", keywords: "down bas arrow" },
      { char: "↔", name: "Gauche-Droite", keywords: "left right gauche droite horizontal double" },
      { char: "↕", name: "Haut-Bas", keywords: "up down haut bas vertical double" },
      { char: "↗", name: "Haut-Droite", keywords: "up right haut droite diagonal" },
      { char: "↘", name: "Bas-Droite", keywords: "down right bas droite diagonal" },
      { char: "↖", name: "Haut-Gauche", keywords: "up left haut gauche diagonal" },
      { char: "↙", name: "Bas-Gauche", keywords: "down left bas gauche diagonal" },
      { char: "⇒", name: "Implique (Droite)", keywords: "implies double right" },
      { char: "⇐", name: "Implique (Gauche)", keywords: "implies double left" },
      { char: "⇔", name: "Équivalent", keywords: "equivalent double horizontal" },
      { char: "⇑", name: "Double Haut", keywords: "double up" },
      { char: "⇓", name: "Double Bas", keywords: "double down" },
      { char: "↵", name: "Retour chariot", keywords: "return enter chariot retour" },
      { char: "↩", name: "Retour", keywords: "return back" },
      { char: "↻", name: "Rotation horaire", keywords: "rotate clockwise horaire" },
      { char: "↺", name: "Rotation anti-horaire", keywords: "rotate counterclockwise antihoraire" },
      { char: "➔", name: "Flèche épaisse droite", keywords: "thick right" }
    ]
  },
  "emojis": {
    label: "Emojis",
    icon: "fa-face-smile",
    items: [
      { char: "😀", name: "Sourire", keywords: "smile grinning" },
      { char: "😂", name: "Mort de rire", keywords: "joy laugh mdr lol" },
      { char: "🤣", name: "Roulade de rire", keywords: "rofl laugh" },
      { char: "😊", name: "Sourire chaleureux", keywords: "blush chaleureux" },
      { char: "😉", name: "Clin d'œil", keywords: "wink clin oeil" },
      { char: "😍", name: "Amoureux", keywords: "heart eyes amour love" },
      { char: "🥰", name: "Visage affectueux", keywords: "affection coeurs hearts" },
      { char: "😎", name: "Cool", keywords: "cool lunettes soleil sunglasses" },
      { char: "🤔", name: "Réflexion", keywords: "thinking reflexion penser" },
      { char: "🙄", name: "Lève les yeux au ciel", keywords: "roll eyes" },
      { char: "😴", name: "Dort", keywords: "sleep dort" },
      { char: "🤯", name: "Tête qui explose", keywords: "mind blown explosion tete" },
      { char: "🥳", name: "Fête", keywords: "party fete celebration" },
      { char: "🥺", name: "Suppliant", keywords: "pleading suppliant mignon" },
      { char: "😭", name: "Pleure", keywords: "cry sob pleure" },
      { char: "👍", name: "Pouce en l'air", keywords: "thumbs up pouce oui ok" },
      { char: "👎", name: "Pouce vers le bas", keywords: "thumbs down non" },
      { char: "👏", name: "Applaudissements", keywords: "clap bravo" },
      { char: "🙌", name: "Mains en l'air", keywords: "raise hands hourra" },
      { char: "🙏", name: "Prière / Merci", keywords: "pray merci please" },
      { char: "🤝", name: "Poignée de main", keywords: "handshake accord" },
      { char: "✌️", name: "Victoire / Paix", keywords: "peace victoire" },
      { char: "💪", name: "Force", keywords: "muscle force" },
      { char: "❤️", name: "Cœur rouge", keywords: "heart red amour love" },
      { char: "💔", name: "Cœur brisé", keywords: "broken heart" },
      { char: "🔥", name: "Feu", keywords: "fire feu chaud hot" },
      { char: "⭐", name: "Étoile", keywords: "star etoile" },
      { char: "✨", name: "Étincelles", keywords: "sparkles brillant" },
      { char: "💡", name: "Idée", keywords: "idea ampoule bulb" },
      { char: "🎉", name: "Confettis", keywords: "tada fete" },
      { char: "⚠️", name: "Attention", keywords: "warning attention danger" },
      { char: "✅", name: "Validé", keywords: "check tick ok valide" },
      { char: "❌", name: "Croix", keywords: "cross x faux" },
      { char: "❓", name: "Point d'interrogation", keywords: "question" },
      { char: "❗", name: "Point d'exclamation", keywords: "exclamation" },
      { char: "🚀", name: "Fusée", keywords: "rocket espace" },
      { char: "📌", name: "Punaise", keywords: "pin epingle" },
      { char: "📝", name: "Mémo", keywords: "memo note" },
      { char: "📅", name: "Calendrier", keywords: "calendar date" },
      { char: "💻", name: "Ordinateur", keywords: "computer pc" }
    ]
  },
  "symbols": {
    label: "Typographie",
    icon: "fa-shapes",
    items: [
      { char: "«", name: "Guillemet ouvrant", keywords: "quote ouvrant french" },
      { char: "»", name: "Guillemet fermant", keywords: "quote fermant french" },
      { char: "“", name: "Guillemet anglais ouvrant", keywords: "quote double english" },
      { char: "”", name: "Guillemet anglais fermant", keywords: "quote double english" },
      { char: "‘", name: "Guillemet simple ouvrant", keywords: "quote single" },
      { char: "’", name: "Guillemet simple fermant", keywords: "quote single apostrophe" },
      { char: "—", name: "Tiret cadratin (Em dash)", keywords: "dash em tiret long" },
      { char: "–", name: "Tiret demi-cadratin (En dash)", keywords: "dash en tiret" },
      { char: "…", name: "Points de suspension", keywords: "ellipsis points" },
      { char: "•", name: "Puce", keywords: "bullet point" },
      { char: "§", name: "Paragraphe (Section)", keywords: "section paragraphe" },
      { char: "¶", name: "Pied de mouche", keywords: "pilcrow paragraphe" },
      { char: "©", name: "Copyright", keywords: "copyright" },
      { char: "®", name: "Marque déposée", keywords: "registered marque" },
      { char: "™", name: "Trade Mark", keywords: "trademark" },
      { char: "€", name: "Euro", keywords: "euro money monnaie" },
      { char: "$", name: "Dollar", keywords: "dollar money monnaie" },
      { char: "£", name: "Livre", keywords: "pound money monnaie" },
      { char: "¥", name: "Yen", keywords: "yen money monnaie" }
    ]
  }
};

let specialCharsActiveCategory = 'all';

function openSpecialCharsModal() {
  const modal = document.getElementById('specialCharsModal');
  const input = document.getElementById('specialCharsSearch');
  if (!modal) return;
  modal.classList.remove('hidden');
  if (input) {
    input.value = '';
    setTimeout(() => {
      input.focus();
    }, 50);
  }
  specialCharsActiveCategory = 'all';
  renderSpecialCharsTabs();
  renderSpecialCharsList();
}

function closeSpecialCharsModal() {
  const modal = document.getElementById('specialCharsModal');
  if (modal) modal.classList.add('hidden');
  if (typeof cmEditor !== 'undefined' && cmEditor) {
    cmEditor.focus();
  }
}

function renderSpecialCharsTabs() {
  const container = document.getElementById('specialCharsTabs');
  if (!container) return;
  
  let html = `<button onclick="setSpecialCharsCategory('all')" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${specialCharsActiveCategory === 'all' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}">Tous</button>`;
  
  for (const [key, category] of Object.entries(specialCharsData)) {
    const isActive = specialCharsActiveCategory === key;
    html += `<button onclick="setSpecialCharsCategory('${key}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${isActive ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}">
      <i class="fa-solid ${category.icon} text-[10px]"></i>
      ${category.label}
    </button>`;
  }
  
  container.innerHTML = html;
}

function setSpecialCharsCategory(category) {
  specialCharsActiveCategory = category;
  renderSpecialCharsTabs();
  renderSpecialCharsList();
  const input = document.getElementById('specialCharsSearch');
  if (input) input.focus();
}

function handleSpecialCharsSearch(term) {
  renderSpecialCharsList(term.trim().toLowerCase());
}

function insertSpecialChar(char) {
  if (typeof insertAtCursor === 'function') {
    insertAtCursor(char);
  }
  // Save to recents
  let recents = [];
  try {
    recents = JSON.parse(localStorage.getItem('special_chars_recent') || '[]');
  } catch(e) {}
  
  recents = recents.filter(c => c !== char);
  recents.unshift(char);
  if (recents.length > 24) recents = recents.slice(0, 24); // max 24 recent items
  localStorage.setItem('special_chars_recent', JSON.stringify(recents));
  
  // Close the modal after insertion by default
  closeSpecialCharsModal();
}

function renderSpecialCharsList(searchTerm = '') {
  const container = document.getElementById('specialCharsGrid');
  if (!container) return;

  // Recent Section
  let recents = [];
  try {
    recents = JSON.parse(localStorage.getItem('special_chars_recent') || '[]');
  } catch(e) {}

  let html = '';

  if (searchTerm === '' && specialCharsActiveCategory === 'all' && recents.length > 0) {
    html += `<div class="mb-5">
      <h4 class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Récemment utilisés</h4>
      <div class="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">`;
    for (const char of recents) {
      // Find its name if possible
      let charName = "Caractère " + char;
      html += `<button onclick="insertSpecialChar('${char}')" title="${charName}" class="aspect-square flex items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-lg transition text-slate-800 dark:text-slate-200">${char}</button>`;
    }
    html += `</div></div>`;
  }

  // Iterate categories
  let totalMatches = 0;
  for (const [key, category] of Object.entries(specialCharsData)) {
    if (specialCharsActiveCategory !== 'all' && specialCharsActiveCategory !== key) continue;
    
    let filteredItems = category.items;
    if (searchTerm) {
      filteredItems = filteredItems.filter(item => 
        item.char.toLowerCase().includes(searchTerm) || 
        item.name.toLowerCase().includes(searchTerm) || 
        item.keywords.toLowerCase().includes(searchTerm)
      );
    }
    
    if (filteredItems.length > 0) {
      totalMatches += filteredItems.length;
      html += `<div class="mb-5">
        <h4 class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><i class="fa-solid ${category.icon}"></i> ${category.label}</h4>
        <div class="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">`;
      for (const item of filteredItems) {
        html += `<button onclick="insertSpecialChar('${item.char}')" title="${item.name}" class="aspect-square flex items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-lg transition text-slate-800 dark:text-slate-200">${item.char}</button>`;
      }
      html += `</div></div>`;
    }
  }

  if (totalMatches === 0) {
    html = `<div class="text-center py-10 text-slate-500 dark:text-slate-400">
      <i class="fa-regular fa-face-frown text-3xl mb-3 opacity-50"></i>
      <p class="text-sm">Aucun caractère trouvé pour "<strong>${searchTerm}</strong>"</p>
    </div>`;
  }

  container.innerHTML = html;
}
