const toolTabs=[...document.querySelectorAll('[role="tab"]')];
const toolHashes={'reinforcement-tab':'#reinforcement','march-tab':'#march-command','planner-tab':'#march-planner','builder-tab':'#map-builder','caller-map-tab':'#caller-map'};
const marchPanel=document.getElementById('march-panel'),marchFrame=marchPanel.querySelector('iframe');
function syncMarchView(){
 const map=location.hash==='#caller-map';
 try{if(marchFrame.contentDocument?.documentElement)marchFrame.contentDocument.documentElement.dataset.workspaceView=map?'map':'command';}catch{}
 marchFrame.title=map?'Rally Caller Map':'March Command';
 marchPanel.setAttribute('aria-labelledby',map?'caller-map-tab':'march-tab');
}
function selectTool(id,focus=false){
 const selected=toolTabs.find(tab=>tab.id===id)||toolTabs[0],panelId=selected.getAttribute('aria-controls');
 for(const tab of toolTabs){const active=tab===selected;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=tab.getAttribute('aria-controls')!==panelId;}
 if(focus)selected.focus();history.replaceState(null,'',toolHashes[selected.id]);syncMarchView();
}
for(const [index,tab] of toolTabs.entries()){tab.addEventListener('click',()=>selectTool(tab.id));tab.addEventListener('keydown',event=>{let target;if(event.key==='ArrowRight')target=toolTabs[(index+1)%toolTabs.length];if(event.key==='ArrowLeft')target=toolTabs[(index-1+toolTabs.length)%toolTabs.length];if(event.key==='Home')target=toolTabs[0];if(event.key==='End')target=toolTabs.at(-1);if(target){event.preventDefault();selectTool(target.id,true);}});}
function selectHash(){selectTool(Object.keys(toolHashes).find(id=>toolHashes[id]===location.hash));}
marchFrame.addEventListener('load',syncMarchView);window.addEventListener('hashchange',selectHash);selectHash();
