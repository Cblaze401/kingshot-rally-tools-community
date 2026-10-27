// Save the setup, not an old rally countdown.
(() => {
  const key = 'kingshot.march.setup.v1';
  const status = document.getElementById('save-status');
  function save() {
    try {
      localStorage.setItem(key, JSON.stringify({version:1, petModel:'manual-times', groups:state.groups, players:state.players, prep:$('prep').value}));
      status.textContent = 'Setup saved automatically in this browser.';
    } catch { status.textContent = 'Saving is unavailable in this browser. Keep this tab open to keep your setup.'; }
  }
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved) {
      const scalar = v => typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v));
      const id = v => Number.isSafeInteger(v) && v > 0;
      if (saved.version !== 1 || !Array.isArray(saved.groups) || !saved.groups.length || !Array.isArray(saved.players) || !scalar(saved.prep)) throw Error('Invalid setup');
      if (!saved.groups.every(g => g && id(g.id) && typeof g.name === 'string' && typeof g.on === 'boolean' && ['chain','together'].includes(g.mode) && scalar(g.gap) && scalar(g.spacing))) throw Error('Invalid groups');
      if (!saved.players.every(p => p && id(p.id) && typeof p.name === 'string' && scalar(p.duration) && typeof p.on === 'boolean' && typeof p.pet === 'boolean' && saved.groups.some(g => g.id === p.group))) throw Error('Invalid players');
      const ids = [...saved.groups,...saved.players].map(x => x.id);
      if (new Set(ids).size !== ids.length) throw Error('Duplicate IDs');
      state.groups = saved.groups;
      state.players = saved.players;
      // Preserve the roster and normal times; use only known measured defaults.
      state.players.forEach(p => {
        if (!scalar(p.petDuration)) p.petDuration = defaultPetMarch(p.duration);
        p.pet = false;
      });
      next = Math.max(10,...ids) + 1;
      $('prep').value = saved.prep;
      render();
      status.textContent = 'Saved setup restored. Copy the schedule to start a new countdown.';
    }
  } catch { status.textContent = 'Could not restore the saved setup. Your next edit will save a new setup.'; }
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.p || el.dataset.g) {
      const obj = (el.dataset.p ? state.players : state.groups).find(x => x.id === Number(el.dataset.p || el.dataset.g));
      if (obj) obj[el.dataset.field] = el.type === 'checkbox' ? el.checked : el.dataset.field === 'group' ? Number(el.value) : el.value;
      update();
      if (obj && ['duration','petDuration'].includes(el.dataset.field)) {
        const summary = document.querySelector(`[data-pet-summary="${obj.id}"]`);
        if (summary) summary.textContent = `March Speed Up: +${obj.pet?55:25}% · ${marchSummary(obj)}`;
      }
    }
    save();
  });
  document.addEventListener('change', save);
  document.addEventListener('click', e => { if(e.target.closest('button')) save(); });
})();
