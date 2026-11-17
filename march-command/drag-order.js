(() => {
  let drag=null,frame=0;
  const selector=kind=>kind==='players'?'.player':'.group';
  function decorate(){
    for(const [kind,root,field]of [['players','roster','p'],['groups','groups','g']]){
      for(const card of document.getElementById(root).querySelectorAll(selector(kind))){
        const id=card.querySelector(`[data-${field}]`)?.dataset[field];if(!id)continue;
        card.dataset.orderId=id;card.dataset.orderKind=kind;
        if(card.querySelector('.order-handle'))continue;
        const button=document.createElement('button');button.type='button';button.className='order-handle';button.textContent='⠿';button.dataset.orderHandle=kind;button.dataset.id=id;
        button.setAttribute('aria-label',`Drag to reorder ${kind==='players'?'player':'group'}`);button.title='Drag to reorder; or use the arrow buttons';
        card.querySelector(kind==='players'?'.player-top':'.group-top').prepend(button);
      }
    }
  }
  function cleanup(){
    if(frame)cancelAnimationFrame(frame);frame=0;
    document.querySelectorAll('.order-dragging,.order-before,.order-after').forEach(el=>el.classList.remove('order-dragging','order-before','order-after'));
    const old=drag;drag=null;if(old?.handle.hasPointerCapture(old.pointer))old.handle.releasePointerCapture(old.pointer);return old;
  }
  function targetAt(x,y){
    document.querySelectorAll('.order-before,.order-after').forEach(el=>el.classList.remove('order-before','order-after'));
    const card=document.elementFromPoint(x,y)?.closest('[data-order-id]');
    drag.target=null;
    if(!card||card.dataset.orderKind!==drag.kind||Number(card.dataset.orderId)===drag.id)return;
    const box=card.getBoundingClientRect();drag.target={id:Number(card.dataset.orderId),after:y>box.top+box.height/2};
    card.classList.add(drag.target.after?'order-after':'order-before');
  }
  function scroll(){if(!drag)return;const y=drag.y,h=innerHeight;if(y<70)window.scrollBy(0,-14);else if(y>h-70)window.scrollBy(0,14);targetAt(drag.x,drag.y);frame=requestAnimationFrame(scroll);}
  document.addEventListener('pointerdown',e=>{const handle=e.target.closest('[data-order-handle]');if(!handle||e.button!==0||e.isPrimary===false||drag)return;e.preventDefault();drag={pointer:e.pointerId,handle,kind:handle.dataset.orderHandle,id:Number(handle.dataset.id),x:e.clientX,y:e.clientY,target:null};handle.closest('[data-order-id]').classList.add('order-dragging');handle.setPointerCapture(e.pointerId);frame=requestAnimationFrame(scroll);});
  document.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.pointer)return;e.preventDefault();drag.x=e.clientX;drag.y=e.clientY;targetAt(e.clientX,e.clientY);});
  document.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.pointer)return;targetAt(e.clientX,e.clientY);const d=cleanup();if(!d.target)return;const list=state[d.kind],from=list.findIndex(p=>p.id===d.id),to=list.findIndex(p=>p.id===d.target.id);if(from<0||to<0)return;const [item]=list.splice(from,1);const target=list.findIndex(p=>p.id===d.target.id);list.splice(target+(d.target.after?1:0),0,item);render();document.dispatchEvent(new Event('march-setup-loaded'));toast('Order updated. Copy the schedule again to use the new rally times.');});
  document.addEventListener('pointercancel',()=>cleanup());document.addEventListener('lostpointercapture',e=>{if(drag?.pointer===e.pointerId)cleanup();});window.addEventListener('blur',cleanup);document.addEventListener('keydown',e=>{if(e.key==='Escape')cleanup();});
  document.addEventListener('march-roster-rendered',()=>{cleanup();decorate();});decorate();
})();