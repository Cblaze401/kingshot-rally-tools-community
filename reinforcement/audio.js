// One audio channel follows the next launch; simultaneous launches share a cue.
class RallyAudio {
  constructor(){this.enabled=true;this.context=null;this.lastKey=null;this.previewTimer=null;this.nodes=[];}
  unlock(){try{this.context??=new(window.AudioContext||window.webkitAudioContext)();this.context.resume().catch(()=>{});}catch{} }
  silence(){try{window.speechSynthesis?.cancel();}catch{}for(const node of this.nodes){try{node.stop();}catch{}}this.nodes=[];}
  tone(launch){try{const ctx=this.context;if(!ctx||ctx.state!=='running')return;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);const now=ctx.currentTime;osc.frequency.setValueAtTime(launch?660:440,now);if(launch)osc.frequency.setValueAtTime(1100,now+.12);gain.gain.setValueAtTime(launch?.16:.07,now);gain.gain.exponentialRampToValueAtTime(.001,now+(launch?.55:.12));osc.start(now);osc.stop(now+(launch?.6:.15));this.nodes.push(osc);osc.onended=()=>{this.nodes=this.nodes.filter(n=>n!==osc);};}catch{} }
  say(text,launch=false){if(!this.enabled)return;this.silence();this.tone(launch);try{if(window.speechSynthesis&&window.SpeechSynthesisUtterance){const speech=new SpeechSynthesisUtterance(text);speech.lang='en-US';speech.rate=1.25;speech.volume=1;window.speechSynthesis.speak(speech);}}catch{} }
  setEnabled(enabled){this.enabled=enabled;this.unlock();this.stopPreview();this.silence();}
  stopPreview(){clearInterval(this.previewTimer);this.previewTimer=null;const button=document.getElementById('test-audio');if(button)button.textContent='Test countdown';}
  test(){this.unlock();if(this.previewTimer){this.stopPreview();this.silence();return;}this.enabled=true;document.getElementById('audio-enabled').checked=true;let count=10;this.say(String(count));document.getElementById('test-audio').textContent='Stop test';this.previewTimer=setInterval(()=>{count--;if(count>0)this.say(String(count));else{this.say('Launch!',true);this.stopPreview();}},1000);}
  update(rallies,now){const cue=nextAudioCue(rallies,now);if(!cue){if(this.lastKey!==null){this.lastKey=null;this.silence();}return;}if(this.previewTimer)this.stopPreview();if(cue.key===this.lastKey)return;this.lastKey=cue.key;this.say(cue.text,cue.launch);}
}
function nextAudioCue(rallies,now){const next=rallies.filter(r=>r.launch>now-1000).sort((a,b)=>a.launch-b.launch)[0];if(!next)return null;const left=(next.launch-now)/1000;if(left>10)return null;const second=Math.max(0,Math.ceil(left));return {key:next.id+':'+next.launch+':'+second,text:second===0?'Launch!':String(second),launch:second===0};}
const rallyAudio=new RallyAudio();
window.addEventListener('pagehide',()=>{rallyAudio.stopPreview();rallyAudio.silence();});
