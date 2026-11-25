const $=id=>document.getElementById(id);
const v=$('v'),box=$('box'),stage=$('stage');
const MAX=10;
let url=null,dur=0,crop={x:0,y:0,s:0},out=null,ac=null,gain=null,dest=null,busy=false;
const fmt=n=>n.toFixed(1).replace('.',',')+' s';

$('pick').onclick=()=>$('file').click();
$('file').onchange=e=>{
  const f=e.target.files[0]; if(!f) return;
  if(url) URL.revokeObjectURL(url);
  url=URL.createObjectURL(f); v.src=url; v.muted=false;
  $('res').classList.add('hide');
};
v.onloadedmetadata=()=>{
  dur=v.duration;
  const s=Math.min(v.videoWidth,v.videoHeight);
  crop={x:(v.videoWidth-s)/2,y:(v.videoHeight-s)/2,s};
  $('zoom').value=100;
  ['st','en'].forEach(i=>{$(i).max=dur});
  $('st').value=0; $('en').value=Math.min(dur,MAX);
  $('ed').classList.remove('hide');
  upTrim(); requestAnimationFrame(drawBox);
};
window.addEventListener('resize',drawBox);

/* ---- recorte ---- */
function drawBox(){
  if(!v.videoWidth) return;
  const k=v.clientWidth/v.videoWidth;
  const ox=(stage.clientWidth-v.clientWidth)/2;
  box.style.left=(ox+crop.x*k)+'px'; box.style.top=(crop.y*k)+'px';
  box.style.width=box.style.height=(crop.s*k)+'px';
}
let drag=null;
box.onpointerdown=e=>{box.setPointerCapture(e.pointerId);drag={px:e.clientX,py:e.clientY,x:crop.x,y:crop.y}};
box.onpointermove=e=>{
  if(!drag) return;
  const k=v.clientWidth/v.videoWidth;
  crop.x=clamp(drag.x+(e.clientX-drag.px)/k,0,v.videoWidth-crop.s);
  crop.y=clamp(drag.y+(e.clientY-drag.py)/k,0,v.videoHeight-crop.s);
  drawBox();
};
box.onpointerup=box.onpointercancel=()=>{drag=null};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
$('zoom').oninput=e=>{
  const m=Math.min(v.videoWidth,v.videoHeight),ns=m*e.target.value/100;
  const cx=crop.x+crop.s/2,cy=crop.y+crop.s/2;
  crop.s=ns;
  crop.x=clamp(cx-ns/2,0,v.videoWidth-ns);
  crop.y=clamp(cy-ns/2,0,v.videoHeight-ns);
  drawBox();
};

/* ---- corte ---- */
function upTrim(which){
  let s=+$('st').value,e=+$('en').value;
  if(which==='st'&&e-s>MAX) e=s+MAX;
  if(which==='en'&&e-s>MAX) s=e-MAX;
  if(e-s<0.5){ if(which==='st') s=Math.max(0,e-0.5); else e=Math.min(dur,s+0.5); }
  $('st').value=s;$('en').value=e;
  $('sv').textContent=fmt(s);$('ev').textContent=fmt(e);
  $('dur').textContent=mode==='still'?'Quadro escolhido em '+fmt(s)+' do vídeo':'Duração da figurinha: '+fmt(e-s)+' (máx. '+MAX+' s)';
  if(!busy){v.pause();v.currentTime=which==='en'?e-0.05:s;}
}
$('st').oninput=()=>upTrim('st');
$('en').oninput=()=>upTrim('en');
const T=()=>({s:+$('st').value,e:+$('en').value});

/* ---- modos ---- */
let mode='audio';
function setMode(m){
  mode=m; const still=m==='still';
  document.querySelectorAll('#seg button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
  ['l2','en','prev'].forEach(i=>$(i).classList.toggle('hide',still));
  $('l1').firstChild.nodeValue=still?'Quadro: ':'Início: ';
  $('exp').textContent=still?'Gerar figurinha estática':'Gerar figurinha';
  upTrim();
}
document.querySelectorAll('#seg button').forEach(b=>b.onclick=()=>setMode(b.dataset.m));
function show(img,extra){
  const u=URL.createObjectURL(out);
  $('rv').classList.toggle('hide',img); $('ri').classList.toggle('hide',!img);
  if(img){$('rv').pause();$('ri').src=u;}else{$('rv').src=u;$('rv').play().catch(()=>{});}
  $('info').textContent='512×512 · '+extra+(extra?' · ':'')+(out.size/1024).toFixed(0)+' KB · '+out.name.split('.').pop().toUpperCase();
  $('res').classList.remove('hide'); $('res').scrollIntoView({behavior:'smooth'});
}

/* ---- áudio ---- */
function audio(){
  if(!ac){
    ac=new (window.AudioContext||window.webkitAudioContext)();
    const src=ac.createMediaElementSource(v);
    gain=ac.createGain(); dest=ac.createMediaStreamDestination();
    src.connect(gain); gain.connect(ac.destination); src.connect(dest);
  }
  if(ac.state==='suspended') ac.resume();
}
const seek=t=>new Promise(r=>{v.onseeked=()=>{v.onseeked=null;r()};v.currentTime=t});

/* ---- pré-visualizar ---- */
$('prev').onclick=async()=>{
  if(busy) return;
  audio(); gain.gain.value=1;
  const {s,e}=T(); await seek(s); v.play();
  const chk=()=>{ if(v.currentTime>=e||v.ended){v.pause();v.currentTime=s;} else if(!v.paused) requestAnimationFrame(chk); };
  chk();
};

/* ---- exportar ---- */
function pickMime(){
  const c=['video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  return c.find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported(m))||'';
}
$('exp').onclick=async()=>{
  if(busy) return;
  if(mode==='still'){
    v.pause(); await seek(T().s);
    const cv=document.createElement('canvas'); cv.width=cv.height=512;
    cv.getContext('2d').drawImage(v,crop.x,crop.y,crop.s,crop.s,0,0,512,512);
    let b=await new Promise(r=>cv.toBlob(r,'image/webp',0.9)),ext='webp';
    if(!b||b.type!=='image/webp'){b=await new Promise(r=>cv.toBlob(r,'image/png'));ext='png';}
    out=new File([b],'figurinha.'+ext,{type:b.type});
    show(true,''); return;
  }
  if(!window.MediaRecorder){alert('Seu navegador não suporta gravação de vídeo. Tente o Chrome ou o Safari atualizado.');return;}
  busy=true; $('exp').disabled=$('prev').disabled=true;
  $('bar').classList.remove('hide'); $('bi').style.width='0';
  try{
    audio(); gain.gain.value=0;
    const {s,e}=T(); v.pause(); await seek(s);
    const cv=document.createElement('canvas'); cv.width=cv.height=512;
    const c=cv.getContext('2d');
    const stream=cv.captureStream(30);
    if(mode==='audio') dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
    const mime=pickMime();
    const rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:1400000}:{});
    const chunks=[]; rec.ondataavailable=ev=>ev.data.size&&chunks.push(ev.data);
    const done=new Promise(r=>rec.onstop=r);
    rec.start(200); await v.play();
    await new Promise(res=>{
      const draw=()=>{
        c.drawImage(v,crop.x,crop.y,crop.s,crop.s,0,0,512,512);
        $('bi').style.width=Math.min(100,(v.currentTime-s)/(e-s)*100)+'%';
        if(v.currentTime>=e||v.ended){res();return;}
        requestAnimationFrame(draw);
      };
      draw();
    });
    v.pause(); rec.stop(); await done;
    const type=(rec.mimeType||mime||'video/webm').split(';')[0];
    const ext=type.includes('mp4')?'mp4':'webm';
    out=new File(chunks,'figurinha.'+ext,{type});
    show(false,fmt(e-s));
    
    
  }catch(err){alert('Não foi possível gerar a figurinha: '+err.message);}
  gain.gain.value=1; busy=false; $('exp').disabled=$('prev').disabled=false;
  $('bar').classList.add('hide');
  v.currentTime=T().s;
};

/* ---- compartilhar / baixar ---- */
$('share').onclick=async()=>{
  if(!out) return;
  try{
    if(navigator.canShare&&navigator.canShare({files:[out]})){
      await navigator.share({files:[out],title:'Figurinha com áudio'});
    }else{ alert('Este navegador não abre o compartilhamento de arquivos. Use “Baixar” e envie pelo WhatsApp.'); }
  }catch(e){ if(e.name!=='AbortError') alert('Falha ao compartilhar: '+e.message); }
};
$('dl').onclick=()=>{
  if(!out) return;
  const a=document.createElement('a'); a.href=URL.createObjectURL(out); a.download=out.name;
  document.body.appendChild(a); a.click(); a.remove();
};
