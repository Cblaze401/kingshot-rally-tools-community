(() => {
  'use strict';
  const KEY='kingshot.planner.cities.v1', $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const targets=['castle','north','east','south','west'];
  const pid=v=>/^[1-9]\d{0,19}$/.test(v);
  const numeric=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v));
  const location=c=>Number.isInteger(c.x)&&Number.isInteger(c.y)&&MarchMapRules.townPlacement([c.x+1,c.y+1]).valid;
  const uid=()=>crypto.randomUUID();
  let cities=[],saves=[],selected=null,armed=false,busy=false;
  let restoreError=false;
  try {const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved){if(!Array.isArray(saved.cities)||!Array.isArray(saved.saves))throw Error();cities=saved.cities;saves=saved.saves;}}catch{restoreError=true;}
  const clean=list=>list.filter(c=>c&&typeof c.id==='string'&&typeof c.name==='string'&&Number.isFinite(c.base)&&c.base>0&&Number.isFinite(c.bonus)&&c.bonus>=0).map(c=>({...c,pid:String(c.pid||''),name:c.name.slice(0,120)}));
  cities=clean(cities);saves=saves.filter(s=>s&&typeof s.name==='string'&&Array.isArray(s.cities)).map(s=>({...s,cities:clean(s.cities)}));
  $('city-roster').innerHTML=`<h2>City roster</h2><p>Build your battle formation, save it, then refresh names and locations on battle day. Coordinates are each city's visible lower corner. Exports contain normal march times only.</p>
    <fieldset id="city-controls"><div class="city-toolbar"><input id="city-save-name" aria-label="Setup name" placeholder="Setup name"><button class="button" id="city-save">Save setup</button><select id="city-saves" aria-label="Saved setups"></select><button class="button" id="city-load">Load setup</button><button class="button" id="city-delete-save">Delete save</button></div>
    <div class="city-toolbar"><button class="button" id="city-import">Import March Command players</button><button class="button" id="city-refresh">Refresh names & locations</button><button class="button" id="city-export">Export CSV</button><select id="city-kingdom" aria-label="Kingdom shown on map"><option value="all">All kingdoms (planning)</option></select><button class="button" id="city-fit">Fit cities on map</button></div>
    <form id="city-form"><div class="city-fields">
    <label>Player name<input id="city-name" maxlength="120" required></label><label>Player ID (optional)<input id="city-pid" inputmode="numeric" pattern="[1-9][0-9]{0,19}"></label>
    <label>Kingdom (optional)<input id="city-k" type="number" min="1" step="1"></label><label>Normal speed bonus %<input id="city-bonus" type="number" min="0" step="any" value="25" required></label>
    <label>City X<input id="city-x" type="number" min="0" max="1198" step="1"></label><label>City Y<input id="city-y" type="number" min="0" max="1198" step="1"></label>
    <label>Base march speed<input id="city-base" type="number" min="0.001" step="any" value="11" required></label></div>
    <div class="city-toolbar"><button class="button" type="submit" id="city-apply">Add city</button><button class="button" type="button" id="city-place">Place on map</button><button class="button" type="button" id="city-cancel">New city / cancel</button></div></form>
    <p>Leave both coordinates blank for a PID-only player, then refresh. March times use the planner's whole-second rounding and the standard castle/turret positions. Speed settings stay unchanged during lookup.</p>
    <div class="city-scroll"><table><thead><tr><th>Player</th><th>Location</th><th>Castle</th><th>North</th><th>East</th><th>South</th><th>West</th><th>Location status</th><th>Actions</th></tr></thead><tbody id="city-rows"></tbody></table></div></fieldset><p id="city-status" role="status" aria-live="polite"></p>`;
  function say(text){$('city-status').textContent=text;}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify({version:1,cities,saves}));return true;}catch{say('Browser storage is full or unavailable. Export CSV before closing this tab.');return false;}}
  function times(c){if(!location(c))return targets.map(()=>null);return targets.map(key=>{try{return MarchTypes.calculateCenters({from:[c.x+1,c.y+1],to:MarchCalculation.PRESETS[key].center,marchType:key==='castle'?108:109,baseSpeed:c.base,normalBonusPercent:c.bonus,petEnabled:false,petBonusPercent:0}).clientPreviewSeconds;}catch{return null;}});}
  function map(){const k=$('city-kingdom').value;MarchMap.setCities(cities.filter(c=>location(c)&&(k==='all'||String(c.kingdom)===k)));}
  function render(){
    const chosen=$('city-saves').value;$('city-saves').innerHTML='<option value="">Choose saved setup</option>'+saves.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');$('city-saves').value=chosen;
    const k=$('city-kingdom').value;$('city-kingdom').innerHTML='<option value="all">All kingdoms (planning)</option>'+[...new Set(cities.map(c=>c.kingdom).filter(Boolean))].sort((a,b)=>a-b).map(v=>`<option value="${v}">Kingdom ${v}</option>`).join('');$('city-kingdom').value=[...$('city-kingdom').options].some(o=>o.value===k)?k:'all';
    $('city-rows').innerHTML=cities.map(c=>`<tr class="${selected===c.id?'city-active':''}"><td>${esc(c.name)}<br><small>${esc(c.pid||'No PID')}</small></td><td>${c.kingdom?'K'+esc(c.kingdom)+' · ':''}${location(c)?c.x+', '+c.y:'Not placed'}</td>${times(c).map(t=>`<td>${t===null?'—':t+'s'}</td>`).join('')}<td>${esc(c.status||'Planned location')}${c.updated?'<br><small>'+esc(c.updated)+'</small>':''}</td><td><button class="button" data-edit="${esc(c.id)}">Edit</button> <button class="button" data-remove="${esc(c.id)}">Remove</button></td></tr>`).join('')||'<tr><td colspan="9">Add a city or import your March Command players to begin.</td></tr>';
    $('city-export').disabled=!cities.length;map();
  }
  function reset(){selected=null;armed=false;$('city-form').reset();$('city-apply').textContent='Add city';$('city-place').textContent='Place on map';}
  function read(){
    const name=$('city-name').value.trim(), id=$('city-pid').value.trim(), x=$('city-x').value,y=$('city-y').value,k=$('city-k').value;
    if(!name)throw Error('Enter a player name.');if(id&&!pid(id))throw Error('Enter a valid numeric Player ID.');
    if(cities.some(c=>c.id!==selected&&id&&c.pid===id))throw Error('That PID is already in this roster. Edit the existing city.');
    const c={id:selected||uid(),name,pid:id,kingdom:k?Number(k):null,x:x===''?null:Number(x),y:y===''?null:Number(y),base:Number($('city-base').value),bonus:Number($('city-bonus').value),status:'Planned location',updated:null};
    if((x!==''||y!=='')&&!location(c))throw Error('Enter both valid coordinates outside the castle core.');
    if(!numeric($('city-base').value)||c.base<=0||!numeric($('city-bonus').value)||c.bonus<0)throw Error('Check the normal march speed settings.');
    if(k&&(!Number.isSafeInteger(c.kingdom)||c.kingdom<1))throw Error('Enter a valid kingdom.');return c;
  }
  $('city-form').onsubmit=e=>{e.preventDefault();try{const c=read(),i=cities.findIndex(p=>p.id===c.id);if(i<0)cities.push(c);else cities[i]=c;reset();render();say('City saved in this browser. Save the setup to update a named formation.');persist();}catch(e){say(e.message);}};
  $('city-cancel').onclick=()=>{reset();render();say('Ready to add another city.');};
  $('city-place').onclick=()=>{armed=!armed;$('city-place').textContent=armed?'Cancel map placement':'Place on map';if(armed){if($('map-collapse').getAttribute('aria-expanded')==='false')$('map-collapse').click();document.querySelector('[data-map-mode="town"]').click();$('battle-map').scrollIntoView({block:'start'});say('Tap the map to fill this city’s coordinates, then choose Add city or Update city.');}};
  window.CityRoster={placing:()=>armed,place(center){if(busy)return false;$('city-x').value=center[0]-1;$('city-y').value=center[1]-1;armed=false;$('city-place').textContent='Place on map';$('city-form').scrollIntoView({block:'center'});say('Position selected. Choose Add city or Update city to save it.');return true;}};
  $('city-rows').onclick=e=>{const b=e.target.closest('button');if(!b)return;const c=cities.find(c=>c.id===(b.dataset.edit||b.dataset.remove));if(!c)return;if(b.dataset.remove){cities=cities.filter(p=>p!==c);if(selected===c.id)reset();render();persist();return;}selected=c.id;armed=false;for(const [key,value]of Object.entries({name:c.name,pid:c.pid,k:c.kingdom,x:c.x,y:c.y,base:c.base,bonus:c.bonus}))$('city-'+key).value=value??'';$('city-apply').textContent='Update city';$('city-place').textContent='Place on map';render();$('city-form').scrollIntoView({block:'center'});};
  $('city-save').onclick=()=>{const name=$('city-save-name').value.trim();if(!name){say('Give this setup a name first.');return;}const old=saves.find(s=>s.name===name);if(old&&!confirm('Replace saved setup “'+name+'”?'))return;const s={id:old?.id||uid(),name,cities:structuredClone(cities)};if(old)saves[saves.indexOf(old)]=s;else saves.push(s);render();$('city-saves').value=s.id;say('Setup saved in this browser.');persist();};
  $('city-load').onclick=()=>{const s=saves.find(s=>s.id===$('city-saves').value);if(!s){say('Choose a saved setup.');return;}if(cities.length&&!confirm('Load “'+s.name+'” and replace the current roster? Save any changes you want to keep first.'))return;cities=structuredClone(s.cities);reset();$('city-save-name').value=s.name;render();MarchMap.fit();say('Setup loaded. Refresh locations on battle day.');persist();};
  $('city-delete-save').onclick=()=>{const s=saves.find(s=>s.id===$('city-saves').value);if(s&&confirm('Delete saved setup “'+s.name+'”?')){saves=saves.filter(p=>p!==s);render();persist();}};
  $('city-import').onclick=()=>{try{const data=JSON.parse(localStorage.getItem('kingshot.march.setup.v1')||'null');if(!Array.isArray(data?.players))throw Error('No saved March Command players found in this browser.');let added=0;for(const p of data.players){const id=String(p.governorId||'');if(cities.some(c=>id?c.pid===id:c.name===p.name))continue;cities.push({id:uid(),name:String(p.name||'Player'),pid:pid(id)?id:'',kingdom:null,x:null,y:null,base:11,bonus:25,status:'Needs location',updated:null});added++;}render();say(`Imported ${added} players. Confirm each player's normal speed settings, then place cities or refresh their PIDs.`);persist();}catch(e){say(e.message);}};
  $('city-kingdom').onchange=map;$('city-fit').onclick=()=>{map();MarchMap.fit();};
  function csvCell(v){let s=String(v??'');if(/^[\s]*[=+@-]/.test(s)||/^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
  function csv(){const rows=[['Player','PID','Kingdom','X','Y','Castle seconds','North Turret seconds','East Turret seconds','South Turret seconds','West Turret seconds','Normal speed bonus %','Base march speed','Location status','Location updated UTC']];for(const c of cities)rows.push([c.name,c.pid,c.kingdom,c.x,c.y,...times(c),c.bonus,c.base,c.status,c.updated]);return '\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');}
  $('city-export').onclick=()=>{const url=URL.createObjectURL(new Blob([csv()],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='kingshot-city-marches-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('CSV exported. Blank march times mean the city needs a valid location.');};
  $('city-refresh').onclick=async()=>{
    if(busy)return;const ids=[...new Set(cities.map(c=>c.pid).filter(pid))];if(!ids.length){say('Add a Player ID to at least one city first.');return;}
    busy=true;armed=false;$('city-place').textContent='Place on map';$('city-controls').disabled=true;let updated=0,failed=0,lookupError='';
    try{for(let i=0;i<ids.length;i+=50){const batch=ids.slice(i,i+50);say(`Refreshing players ${i+1}–${Math.min(i+50,ids.length)} of ${ids.length}…`);
      try{const response=await fetch('/.netlify/functions/caller-locations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:batch}),signal:AbortSignal.timeout(25000)});const data=await response.json();if(!response.ok)throw Error(data.error||'Lookup unavailable.');if(!Array.isArray(data.players))throw Error('Unexpected lookup response.');
        for(const c of cities.filter(c=>batch.includes(c.pid))){const found=data.players.find(p=>p.governorId===c.pid);if(typeof found?.name==='string'&&found.name.trim())c.name=found.name.trim().slice(0,120);
          const valid=found?.fresh===true&&Number.isSafeInteger(found.kingdom)&&found.kingdom>0&&location(found);
          if(valid){c.x=found.x;c.y=found.y;c.kingdom=found.kingdom;c.updated=typeof found.cachedAt==='string'?found.cachedAt:new Date().toISOString();c.status='Fresh at refresh';updated++;}else{c.status='Needs review · saved location kept';failed++;}}
      }catch(e){for(const c of cities.filter(c=>batch.includes(c.pid)))c.status='Lookup failed · saved location kept';const remaining=ids.slice(i);for(const c of cities.filter(c=>remaining.includes(c.pid)))c.status='Lookup unavailable · saved location kept';failed+=remaining.length;lookupError=e.message;break;}
    }}finally{busy=false;$('city-controls').disabled=false;reset();render();say(`${lookupError ? lookupError+' ' : ''}Updated ${updated} locations. ${failed} need review. Players without PIDs keep planned locations. Save the setup to keep these updates in your named formation.`);persist();}
  };
  render();say(restoreError?'Could not restore stored city data. Existing March Command data is unchanged.':'City roster saves automatically in this browser. Named setups keep separate formations.');
})();

