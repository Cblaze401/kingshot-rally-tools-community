// Named snapshots are separate from the automatically saved working setup.
(() => {
  'use strict';
  const key = 'kingshot.march.presets.v1';
  const format = 'kingshot-rally-presets';
  const select = $('preset-select'), status = $('preset-status');
  let presets = [], storageError = '';
  const clone = value => JSON.parse(JSON.stringify(value));
  const fail = message => { throw Error(message); };
  function setup(value) {
    if (!value || !Array.isArray(value.groups) || !value.groups.length || value.groups.length > 100 || !Array.isArray(value.players) || value.players.length > 500) fail('Invalid preset groups or players.');
    const name = v => typeof v === 'string' && v.length <= 120 ? v : fail('Invalid name.');
    const seconds = v => v === '' ? '' : (typeof v === 'number' || typeof v === 'string') && String(v).trim() !== '' && Number.isInteger(+v) && +v >= 0 && +v <= 86400 ? +v : fail('Times must be whole seconds from 0 to 86400.');
    const bool = v => typeof v === 'boolean' ? v : fail('Invalid selection.');
    const ids = new Set();
    const id = v => { if (!Number.isSafeInteger(v) || v < 1 || v >= Number.MAX_SAFE_INTEGER - 1000 || ids.has(v)) fail('Invalid or duplicate player/group ID.'); ids.add(v); return v; };
    const groups = value.groups.map(g => {
      if (!g || !['chain','together'].includes(g.mode)) fail('Invalid hit pattern.');
      return {id:id(g.id),name:name(g.name),on:bool(g.on),mode:g.mode,gap:seconds(g.gap),spacing:seconds(g.spacing)};
    });
    const players = value.players.map(p => {
      if (!p || !groups.some(g => g.id === p.group)) fail('Player has an unknown group.');
      return {id:id(p.id),name:name(p.name),duration:seconds(p.duration),petDuration:seconds(p.petDuration),group:p.group,on:bool(p.on),pet:bool(p.pet)};
    });
    return {groups,players,prep:seconds(value.prep)};
  }
  function readLibrary(data) {
    if (!data || data.format !== format || data.version !== 1 || !Array.isArray(data.presets) || data.presets.length > 100) fail('Choose a valid March Command preset export (up to 100 presets).');
    const ids = new Set();
    return data.presets.map(p => {
      if (!p || typeof p.id !== 'string' || !p.id || p.id.length > 100 || ids.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 80) fail('Invalid preset name or ID.');
      ids.add(p.id);
      return {id:p.id,name:p.name.trim(),setup:setup(p.setup)};
    });
  }
  const snapshot = () => setup({groups:state.groups,players:state.players,prep:$('prep').value});
  const selected = () => presets.find(p => p.id === select.value);
  const envelope = list => ({format,version:1,presets:list});
  function refresh(id = select.value) {
    select.innerHTML = '<option value="">Choose a preset</option>' + presets.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
    select.value = presets.some(p => p.id === id) ? id : '';
    for (const action of ['load','save','delete']) $('preset-' + action).disabled = !selected();
    $('preset-export').disabled = !presets.length;
  }
  function persist(list) {
    if (storageError) fail(storageError);
    if (list.length > 100) fail('You can save up to 100 presets. Export a backup before deleting unused presets.');
    try { localStorage.setItem(key, JSON.stringify(envelope(list))); }
    catch { fail('Could not save presets in this browser. Your existing presets have not been changed.'); }
    presets = list;
  }
  function run(action) { return async () => { try { await action(); } catch (error) { status.textContent = error.message; } }; }
  function newId(list) { let id; do { id = 'preset-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2); } while (list.some(p => p.id === id)); return id; }
  try {
    const raw = localStorage.getItem(key);
    if (raw) presets = readLibrary(JSON.parse(raw));
  } catch { storageError = 'Could not read saved presets. They have been left untouched. Check browser storage or restore a backup in another browser.'; status.textContent = storageError; }
  refresh();
  select.onchange = () => { refresh(); status.textContent = selected() ? 'Selected ' + selected().name + '. Press Load to apply it; Save replaces this preset with your current setup.' : 'Enter a new name and use Save As.'; };
  $('preset-new').onclick = run(() => {
    const name = $('preset-name').value.trim();
    if (!name || name.length > 80) fail('Enter a preset name (up to 80 characters).');
    if (presets.some(p => p.name.toLowerCase() === name.toLowerCase())) fail('That name already exists. Select it and use Save, or enter a different name.');
    const p = {id:newId(presets),name,setup:snapshot()};
    persist([...presets,p]); refresh(p.id); $('preset-name').value = ''; status.textContent = 'Saved ' + name + '.';
  });
  $('preset-save').onclick = run(() => {
    const p = selected(); if (!p) return;
    persist(presets.map(item => item.id === p.id ? {...p,setup:snapshot()} : item));
    status.textContent = 'Updated ' + p.name + '.';
  });
  $('preset-load').onclick = run(() => {
    const p = selected(); if (!p) return;
    const saved = clone(p.setup);
    stopCountdown('Preset loaded. Copy the schedule to start a new countdown.');
    state.groups = saved.groups; state.players = saved.players;
    next = Math.max(10,...state.groups.map(g => g.id),...state.players.map(player => player.id)) + 1;
    $('prep').value = saved.prep; render();
    document.dispatchEvent(new Event('march-setup-loaded'));
    status.textContent = 'Loaded ' + p.name + '. Copy the schedule for fresh call times.';
  });
  $('preset-delete').onclick = run(() => {
    const p = selected(); if (!p || !confirm('Delete preset “' + p.name + '”? Your current setup will stay as it is.')) return;
    persist(presets.filter(item => item.id !== p.id)); refresh(''); status.textContent = 'Deleted ' + p.name + '. Current setup unchanged.';
  });
  $('preset-export').onclick = run(() => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(envelope(presets),null,2)],{type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'kingshot-rally-presets.json';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
    status.textContent = 'Exported ' + presets.length + ' presets. Keep the file as a backup or share it.';
  });
  $('preset-import').onclick = () => $('preset-file').click();
  $('preset-file').onchange = run(async () => {
    const input = $('preset-file'), file = input.files[0]; input.value = ''; if (!file) return;
    if (file.size > 2 * 1024 * 1024) fail('Choose a preset file smaller than 2 MB.');
    const incoming = readLibrary(JSON.parse(await file.text()));
    if (!incoming.length) fail('This file has no presets to import.');
    const merged = [...presets];
    for (const p of incoming) {
      const base = p.name; let name = base, suffix = 2;
      while (merged.some(item => item.name.toLowerCase() === name.toLowerCase())) { const ending = ' (' + suffix++ + ')'; name = base.slice(0,80 - ending.length) + ending; }
      merged.push({id:newId(merged),name,setup:p.setup});
    }
    persist(merged); refresh(merged[merged.length - 1].id);
    status.textContent = 'Imported ' + incoming.length + ' presets without replacing existing saves. Press Load to apply one.';
  });
})();
