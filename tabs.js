const toolTabs=[...document.querySelectorAll('[role="tab"]')];
const toolHashes={'reinforcement-tab':'#reinforcement','march-tab':'#march-command','planner-tab':'#march-planner'};
function selectTool(id,focus=false){const selected=toolTabs.find(tab=>tab.id===id)||toolTabs[0];for(const tab of toolTabs){const active=tab===selected;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=!active;}if(focus)selected.focus();history.replaceState(null,'',toolHashes[selected.id]);}
for(const [index,tab] of toolTabs.entries()){tab.addEventListener('click',()=>selectTool(tab.id));tab.addEventListener('keydown',event=>{let target;if(event.key==='ArrowRight')target=toolTabs[(index+1)%toolTabs.length];if(event.key==='ArrowLeft')target=toolTabs[(index-1+toolTabs.length)%toolTabs.length];if(event.key==='Home')target=toolTabs[0];if(event.key==='End')target=toolTabs.at(-1);if(target){event.preventDefault();selectTool(target.id,true);}});}
function selectHash(){selectTool(Object.keys(toolHashes).find(id=>toolHashes[id]===location.hash));}
window.addEventListener('hashchange',selectHash);selectHash();
