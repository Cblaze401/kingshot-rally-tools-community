// Remember lead setups; reopening never restarts an old enemy rally.
(() => {
  const key = 'kingshot.reinforcement.setup.v1';
  const status = $('save-status');
  const fields = ['my-march','arrival-offset','prep','enemy-name','enemy-march'];
  function save() {
    try {
      localStorage.setItem(key, JSON.stringify({version:1, fields:Object.fromEntries(fields.map(id => [id,$(id).value])), audio:$('audio-enabled').checked, leads:leads.map(l => ({name:l.name,march:l.march}))}));
      status.textContent = 'Setup saved automatically in this browser. Reopened rallies are ready to start again.';
    } catch { status.textContent = 'Saving is unavailable in this browser. Keep this tab open to keep your setup.'; }
  }
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved) {
      if(saved.version !== 1 || !saved.fields || !fields.every(id => typeof saved.fields[id] === 'string') || typeof saved.audio !== 'boolean' || !Array.isArray(saved.leads) || !saved.leads.every(l => l && typeof l.name === 'string' && valid(l.march))) throw Error('Invalid setup');
      fields.forEach(id => { $(id).value = saved.fields[id]; });
      $('audio-enabled').checked = saved.audio;
      rallyAudio.enabled = saved.audio;
      leads.splice(0,leads.length,...saved.leads.map(l => ({id:nextId++,name:l.name,march:l.march,start:null,prep:Number($('prep').value),adjust:0,alerted:false})));
      renderLeads();
      status.textContent = 'Saved setup restored. Press Start when an enemy begins a new rally.';
    }
  } catch { status.textContent = 'Could not restore the saved setup. Your next edit will save a new setup.'; }
  document.addEventListener('input', e => {
    if (e.target.dataset.march) {
      const lead = leads.find(l => l.id === Number(e.target.dataset.march));
      const march = parseDuration(e.target.value);
      if (lead && valid(march)) lead.march = march;
    }
    save();
  });
  document.addEventListener('change', save);
  document.addEventListener('submit', save);
  document.addEventListener('click', e => { if(e.target.closest('button')) save(); });
})();
