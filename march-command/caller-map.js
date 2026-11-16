(() => {
  const kingdom = $('map-kingdom'), refresh = $('map-refresh'), status = $('map-status');
  const positions = new Map();
  let busy = false;
  const selectedPlayers = () => state.players.filter(p => p.on && state.groups.some(g => g.id === p.group && g.on));
  const validId = id => typeof id === 'string' && /^[1-9]\d{0,19}$/.test(id);
  function castleTimes(x,y) {
    const from = MarchCalculation.center([x,y],'town'), to = MarchCalculation.PRESETS.castle.center;
    const options = {from,to,marchType:108,baseSpeed:11,normalBonusPercent:25,petBonusPercent:30};
    return {normal:MarchTypes.calculateCenters({...options,petEnabled:false}).clientPreviewSeconds,pet:MarchTypes.calculateCenters({...options,petEnabled:true}).clientPreviewSeconds};
  }
  function draw() {
    const players = selectedPlayers();
    const kingdoms = [...new Set(players.map(p=>positions.get(p.governorId)?.kingdom).filter(k=>Number.isSafeInteger(k)&&k>0))].sort((a,b)=>a-b);
    const previous = kingdom.value;
    kingdom.innerHTML = kingdoms.length ? kingdoms.map(k=>`<option value="${k}">Kingdom ${k}</option>`).join('') : '<option value="">Refresh to find kingdoms</option>';
    kingdom.value = kingdoms.includes(Number(previous)) ? previous : String(kingdoms[0]||'');
    const shown = players.map(p => ({p,location:positions.get(p.governorId)})).filter(({location:l}) => l && l.kingdom === Number(kingdom.value) && Number.isInteger(l.x) && Number.isInteger(l.y));
    const points = [[600,600],[552,552],[648,648],...shown.map(({location:l})=>[l.x+1,l.y+1])];
    let xmin=Math.min(...points.map(p=>p[0]))-20, ymin=Math.min(...points.map(p=>p[1]))-20;
    const size=Math.max(140,Math.max(...points.map(p=>p[0]))-xmin+20,Math.max(...points.map(p=>p[1]))-ymin+20);
    const x=v=>30+(v-xmin)/size*540, y=v=>570-(v-ymin)/size*540;
    let svg=`<rect x="${x(552)}" y="${y(648)}" width="${96/size*540}" height="${96/size*540}" fill="#3c344d" opacity=".55"/><text x="${x(552)}" y="${y(648)-6}" fill="#c8b6df" font-size="12">Ruins</text>`;
    for(const {p,location:l} of shown){const sx=x(l.x+1),sy=y(l.y+1);svg+=`<line x1="${sx}" y1="${sy}" x2="${x(600)}" y2="${y(600)}" stroke="${l.fresh?'#65e3bf':'#aebdcc'}" stroke-dasharray="5 5" opacity=".6"/><circle cx="${sx}" cy="${sy}" r="5" fill="${l.fresh?'#65e3bf':'#aebdcc'}"><title>${esc(p.name)}: ${l.x}, ${l.y}</title></circle><text x="${sx+8}" y="${sy-7}" font-size="13" fill="#e6edf4">${esc(p.name)}</text>`;}
    svg+=`<rect x="${x(600)-6}" y="${y(600)-6}" width="12" height="12" fill="#ffd77b"/><text x="${x(600)+10}" y="${y(600)+18}" font-size="14" fill="#ffd77b">King's Castle</text><text x="12" y="22" fill="#9aabba" font-size="12">K${esc(kingdom.value||'?')} · north ↑ · east →</text>`;
    $('caller-map-svg').innerHTML=svg;
    $('map-results').innerHTML=players.map(p=>{const l=positions.get(p.governorId);return `<tr><td>${esc(p.name)}<small>${esc(p.governorId||'No Player ID')}</small></td><td>${l&&l.x!==null&&l.y!==null?`K${esc(l.kingdom)} · ${l.x}, ${l.y}`:'—'}</td><td>${l?.times?l.times.normal+'s / '+l.times.pet+'s':'—'}</td><td>${esc(l?.message||(validId(p.governorId)?'Not refreshed':'Enter Player ID'))}${typeof l?.ageSeconds==='number'?'<small>Age at lookup: '+Math.ceil(l.ageSeconds)+'s</small>':''}${l?.cachedAt?'<small>Source: '+esc(l.cachedAt)+'</small>':''}</td></tr>`}).join('');
  }
  kingdom.addEventListener('change',draw);
  document.addEventListener('march-roster-rendered',draw);
  document.addEventListener('input',e=>{if(e.target.dataset?.field==='governorId')draw()});
  refresh.onclick = async () => {
    if(busy)return;
    const players=selectedPlayers(), roster=state.players;
    if(!players.length){status.textContent='Select callers in an enabled group first.';return}
    if(players.some(p=>!validId(p.governorId))){status.textContent='Enter a valid in-game Player ID for every selected caller.';return}
    const ids=[...new Set(players.map(p=>p.governorId))];
    if(ids.length>50){status.textContent='Select no more than 50 callers per refresh.';return}
    const binding=players.map(p=>[p,p.governorId]);
    busy=true;refresh.disabled=true;status.textContent='Looking up callers in Mightpulse…';
    try{
      const response=await fetch('/.netlify/functions/caller-locations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids}),signal:AbortSignal.timeout(25000)});
      const data=await response.json();if(!response.ok)throw Error(data.error||'Locations are unavailable.');
      if(!Array.isArray(data.players))throw Error('Unexpected location response.');
      if(state.players!==roster||binding.some(([p,id])=>p.governorId!==id||!selectedPlayers().includes(p)))throw Error('The roster or target changed during lookup. Refresh again to use the new setup.');
      let applied=0;
      for(const p of players){
        const l=data.players.find(row=>row.governorId===p.governorId);
        if(!l){positions.set(p.governorId,{message:'Missing or still updating; time kept'});continue}
        const location={...l};
        if(!Number.isInteger(l.x)||!Number.isInteger(l.y)||l.x<0||l.y<0||l.x>1199||l.y>1199)location.message='No valid location; time kept';
        else if(!Number.isSafeInteger(l.kingdom)||l.kingdom<1)location.message='Unknown kingdom; time kept';
        else if(l.fresh!==true||typeof l.ageSeconds!=='number'||l.ageSeconds<0||l.ageSeconds>60)location.message='Stale / updating; time kept';
        else {try{const times=castleTimes(l.x,l.y);num(times.normal,'Calculated normal time');num(times.pet,'Calculated pet time');p.duration=times.normal;p.petDuration=times.pet;location.times=times;location.message='Updated · estimated';applied++}catch{location.message='Cannot calculate route; time kept'}}
        positions.set(p.governorId,location);
      }
      if(applied){render();document.dispatchEvent(new Event('march-setup-loaded'));}else draw();
      status.textContent=`Updated ${applied} of ${players.length} callers. ${applied?'Check estimated times in-game. Save your preset to keep these changes.':'Existing march times kept. If an update is pending, refresh again in a minute.'}`;
    }catch(error){status.textContent=error.name==='TimeoutError'?'Lookup timed out. Existing march times kept.':error.message}
    finally{busy=false;refresh.disabled=false}
  };
  draw();
})();
