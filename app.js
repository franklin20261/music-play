const DB_NAME='music-play-db', STORE='tracks';
const audio=document.getElementById('audio'), filesInput=document.getElementById('files');
const list=document.getElementById('list'), titleEl=document.getElementById('title'), artistEl=document.getElementById('artist');
const playBtn=document.getElementById('play'), seek=document.getElementById('seek'), statusEl=document.getElementById('status');
let db, tracks=[], current=-1, shuffle=false, repeat=false, currentUrl=null;

function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:'id',autoIncrement:true});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function transaction(mode){return db.transaction(STORE,mode).objectStore(STORE);}
function getAll(){return new Promise((resolve,reject)=>{const r=transaction('readonly').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function saveTrack(file){return new Promise((resolve,reject)=>{const r=transaction('readwrite').add({name:file.name,blob:file,type:file.type||'audio/mpeg'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function deleteTrack(id){return new Promise((resolve,reject)=>{const r=transaction('readwrite').delete(id);r.onsuccess=resolve;r.onerror=()=>reject(r.error);});}
function fmt(n){if(!Number.isFinite(n))return '0:00';return Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');}
function render(){document.getElementById('count').textContent=tracks.length+' música'+(tracks.length===1?'':'s');list.innerHTML='';if(!tracks.length){list.innerHTML='<li class="empty">Suas músicas aparecerão aqui.</li>';return;}tracks.forEach((t,i)=>{const li=document.createElement('li');li.className='song'+(i===current?' current':'');const name=document.createElement('span');name.className='songname';name.textContent='♫  '+t.name;name.onclick=()=>loadTrack(i,true);const del=document.createElement('button');del.textContent='×';del.title='Remover da biblioteca';del.onclick=async(e)=>{e.stopPropagation();if(i===current){audio.pause();audio.removeAttribute('src');current=-1;}await deleteTrack(t.id);tracks=await getAll();render();};li.append(name,del);li.onclick=()=>loadTrack(i,true);list.append(li);});}
async function loadTrack(i,autoplay=false){if(i<0||i>=tracks.length)return;current=i;const t=tracks[i];if(currentUrl)URL.revokeObjectURL(currentUrl);currentUrl=URL.createObjectURL(t.blob);audio.src=currentUrl;titleEl.textContent=t.name;artistEl.textContent='MUSIC PLAY';render();updateMediaSession(t);if(autoplay){try{await audio.play();}catch(e){statusEl.textContent='Toque em reproduzir para iniciar.';}}}
function updateMediaSession(track){if(!('mediaSession' in navigator))return;try{navigator.mediaSession.metadata=new MediaMetadata({title:track.name,artist:'MUSIC PLAY',album:'Minha biblioteca'});navigator.mediaSession.setActionHandler('play',()=>audio.play());navigator.mediaSession.setActionHandler('pause',()=>audio.pause());navigator.mediaSession.setActionHandler('previoustrack',previous);navigator.mediaSession.setActionHandler('nexttrack',next);navigator.mediaSession.setActionHandler('seekto',d=>{if(d.seekTime!=null)audio.currentTime=d.seekTime;});}catch(e){/* recurso opcional do navegador */}}
async function previous(){if(!tracks.length)return;if(audio.currentTime>3){audio.currentTime=0;return;}await loadTrack((current-1+tracks.length)%tracks.length,true);}
async function next(){if(!tracks.length)return;let i=shuffle&&tracks.length>1?Math.floor(Math.random()*tracks.length):(current+1)%tracks.length;await loadTrack(i,true);}
filesInput.addEventListener('change',async()=>{const chosen=[...filesInput.files].filter(f=>f.type.startsWith('audio/')||/\.(mp3|m4a|aac|ogg|wav|flac|opus)$/i.test(f.name));for(const f of chosen)await saveTrack(f);tracks=await getAll();render();statusEl.textContent=chosen.length+' música(s) adicionada(s).';if(current<0&&tracks.length)loadTrack(0,false);filesInput.value='';});
playBtn.onclick=async()=>{if(!tracks.length){statusEl.textContent='Adicione uma música primeiro.';return;}if(current<0)await loadTrack(0,false);if(audio.paused)audio.play();else audio.pause();};
document.getElementById('prev').onclick=previous;document.getElementById('next').onclick=next;
document.getElementById('shuffle').onclick=e=>{shuffle=!shuffle;e.currentTarget.classList.toggle('active',shuffle);};
document.getElementById('repeat').onclick=e=>{repeat=!repeat;audio.loop=repeat;e.currentTarget.classList.toggle('active',repeat);};
document.getElementById('vol').oninput=e=>audio.volume=Number(e.target.value);
seek.oninput=()=>{if(audio.duration)audio.currentTime=(Number(seek.value)/1000)*audio.duration;};
audio.onplay=()=>{playBtn.textContent='Ⅱ';statusEl.textContent='Reproduzindo';if('mediaSession'in navigator)navigator.mediaSession.playbackState='playing';};
audio.onpause=()=>{playBtn.textContent='▶';if('mediaSession'in navigator)navigator.mediaSession.playbackState='paused';};
audio.ontimeupdate=()=>{if(audio.duration){seek.value=String(Math.round(audio.currentTime/audio.duration*1000));document.getElementById('elapsed').textContent=fmt(audio.currentTime);document.getElementById('duration').textContent=fmt(audio.duration);}};
audio.onended=()=>{if(!repeat)next();};
(async()=>{try{db=await openDB();tracks=await getAll();render();if('serviceWorker'in navigator&&location.protocol!=='file:'){navigator.serviceWorker.register('./service-worker.js').catch(()=>{});}statusEl.textContent='Biblioteca carregada.';}catch(e){statusEl.textContent='Não foi possível abrir a biblioteca neste navegador.';}})();
