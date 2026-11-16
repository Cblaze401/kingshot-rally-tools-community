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
    // Rotate world coordinates so North (+x,+y) is straight up on screen.
    const project=(a,b)=>[(a-b)/Math.SQRT2,-(a+b-1200)/Math.SQRT2];
    const corners=[[552,552],[552,648],[648,648],[648,552]];
    const points=[...corners,[600,600],...shown.map(({location:l})=>[l.x+1,l.y+1])].map(p=>project(...p));
    const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0]));
    const minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
    const size=Math.max(140,maxX-minX+40,maxY-minY+40),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
    const screen=(a,b)=>{const [u,v]=project(a,b);return [300+(u-cx)/size*520,300+(v-cy)/size*520]};
    const [castleX,castleY]=screen(600,600);
    let svg=`<polygon points="${corners.map(p=>screen(...p).join(',')).join(' ')}" fill="#3c344d" opacity=".55"/><line x1="${castleX}" y1="40" x2="${castleX}" y2="560" stroke="#344555" stroke-dasharray="3 6"/><line x1="40" y1="${castleY}" x2="560" y2="${castleY}" stroke="#344555" stroke-dasharray="3 6"/>`;
    for(const {p,location:l} of shown){const [sx,sy]=screen(l.x+1,l.y+1);svg+=`<line x1="${sx}" y1="${sy}" x2="${castleX}" y2="${castleY}" stroke="${l.fresh?'#65e3bf':'#aebdcc'}" stroke-dasharray="5 5" opacity=".6"/><circle cx="${sx}" cy="${sy}" r="5" fill="${l.fresh?'#65e3bf':'#aebdcc'}"><title>${esc(p.name)}: ${l.x}, ${l.y}</title></circle><text x="${sx+8}" y="${sy-7}" font-size="13" fill="#e6edf4">${esc(p.name)}</text>`;}
    for(const [key,label,dx,dy] of [['north','N',0,-10],['east','E',12,4],['south','S',0,16],['west','W',-14,4]]){
      const turret=MarchCalculation.PRESETS[key], [tx,ty]=screen(...turret.center);
      svg+=`<circle cx="${tx}" cy="${ty}" r="3" fill="#a6caff"><title>${turret.name}</title></circle><text text-anchor="middle" x="${tx+dx}" y="${ty+dy}" font-size="12" fill="#a6caff">${label}</text>`;
    }
    svg+=`<rect x="${castleX-5}" y="${castleY-5}" width="10" height="10" fill="#ffd77b"><title>King's Castle</title></rect><text x="12" y="22" fill="#9aabba" font-size="12">K${esc(kingdom.value||'?')} · north ↑ · east →</text><text x="12" y="586" fill="#ffd77b" font-size="12">Gold: King's Castle · Blue: N / E / S / W turrets</text>`;
    $('caller-map-svg').innerHTML=svg;
    $('map-results').innerHTML=players.map(p=>{const l=positions.get(p.governorId);return `<tr><td>${esc(p.name)}<small>${esc(p.governorId||'No Player ID')}</small></td><td>${l&&Number.isInteger(l.x)&&Number.isInteger(l.y)?`K${esc(l.kingdom)} · ${l.x}, ${l.y}`:'—'}</td><td>${l?.times?l.times.normal+'s / '+l.times.pet+'s':'—'}</td><td>${esc(l?.message||(validId(p.governorId)?'Not refreshed':'Enter Player ID'))}${typeof l?.ageSeconds==='number'?'<small>Age at lookup: '+Math.ceil(l.ageSeconds)+'s</small>':''}${l?.cachedAt?'<small>Source: '+esc(l.cachedAt)+'</small>':''}</td></tr>`}).join('');
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
      let applied=0, namesUpdated=0;
      for(const p of players){
        const l=data.players.find(row=>row.governorId===p.governorId);
        if(!l){positions.set(p.governorId,{message:'Missing or still updating; time kept'});continue}
        const location={...l};
        // A known identity can be used even when its map location is stale.
        const foundName=typeof l.name==='string'?l.name.trim().slice(0,120):'';
        if(foundName && p.name!==foundName){p.name=foundName;namesUpdated++;}
        if(!Number.isInteger(l.x)||!Number.isInteger(l.y)||l.x<0||l.y<0||l.x>1199||l.y>1199)location.message='No valid location; time kept';
        else if(!Number.isSafeInteger(l.kingdom)||l.kingdom<1)location.message='Unknown kingdom; time kept';
        else if(l.fresh!==true||typeof l.ageSeconds!=='number'||l.ageSeconds<0||l.ageSeconds>60)location.message='Stale / updating; time kept';
        else {try{const times=castleTimes(l.x,l.y);num(times.normal,'Calculated normal time');num(times.pet,'Calculated pet time');p.duration=times.normal;p.petDuration=times.pet;location.times=times;location.message='Updated · estimated';applied++}catch{location.message='Cannot calculate route; time kept'}}
        positions.set(p.governorId,location);
      }
      if(applied||namesUpdated){render();document.dispatchEvent(new Event('march-setup-loaded'));}else draw();
      status.textContent=`Updated ${namesUpdated} player name${namesUpdated===1?'':'s'} and march times for ${applied} of ${players.length} callers. ${applied?'Check estimated times in-game. Save your preset to keep these changes.':'Existing march times kept. If an update is pending, refresh again in a minute. Save your preset to keep any name changes.'}`;
    }catch(error){status.textContent=error.name==='TimeoutError'?'Lookup timed out. Existing march times kept.':error.message}
    finally{busy=false;refresh.disabled=false}
  };
  draw();
})();
