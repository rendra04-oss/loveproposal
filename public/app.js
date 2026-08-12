const KEY='loveQuestState.v1';
const ADMIN_KEY='loveQuestAdmin.v1';
const defaultState={consent:true,startedAt:null,lastSeen:null,current:0,done:{game:false,quiz:false,effort:0,letter:false,answer:null},gameBest:0,gameLast:0,quizAnswers:[],challengeDone:[],history:[],totalSeconds:0};

let state=JSON.parse(localStorage.getItem(KEY)||'null')||structuredClone(defaultState);
state.done=Object.assign({},defaultState.done,state.done||{});
state.history=state.history||[];
state.challengeDone=state.challengeDone||[];
state.quizAnswers=state.quizAnswers||[];

const steps=[
 ['1','Game Cinta','Mainkan Love Catcher dan bawa skor terbaikmu.'],
 ['2','Uji Cinta','Jawab pertanyaan kecil tentang kalian.'],
 ['3','Tantangan Effort','Selesaikan tiga challenge sederhana.'],
 ['4','Surat Spesial','Baca surat yang sudah aku tulis.'],
 ['5','Jawaban Kamu','Bagian paling penting… jawab dengan jujur.']
];

const questions=[
 {q:'Kalau kita punya satu hari berdua tanpa gangguan, kamu paling pengin…',o:['Jalan-jalan dan cari makanan','Nonton & ngobrol sampai malam','Petualangan random tanpa rencana','Apa pun, asal bareng kamu']},
 {q:'Menurut kamu, hal paling lucu dari aku adalah…',o:['Cara aku chat','Kebiasaan randomku','Muka panikku','Semuanya 😭']},
 {q:'Mana yang paling menggambarkan hubungan kita sekarang?',o:['Teman dekat','Partner ngobrol','Orang favoritku','Kayaknya… ada sesuatu 👀']},
 {q:'Kalau ada satu hal yang ingin kamu ulang dari kebersamaan kita…',o:['Pertama kali kenal','Momen paling kocak','Obrolan tengah malam','Semua, dari awal']}
];

const challenges=[
 ['💌','Tulis satu kalimat jujur tentang perasaanmu.','Ketik sesuatu yang benar-benar kamu rasakan.'],
 ['📸','Pilih satu momen favorit kita.','Nggak perlu upload apa-apa—cukup pilih dari daftar.'],
 ['🌙','Kirim emoji yang paling menggambarkan hubungan kita.','Satu emoji. Jangan overthinking 😭']
];

let quizIndex=0, game=null, soundOn=false;
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function toast(msg){const t=$('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),2600);}
function log(type,detail){
 if(!state.consent)return;
 state.history.push({ts:new Date().toISOString(),type,detail});
 if(state.history.length>500)state.history.shift();
 state.lastSeen=Date.now();
 save();
 renderAdminSummary();
}
function ensureStart(){
 if(!state.startedAt){state.startedAt=Date.now();save();log('visit','Memulai perjalanan');}
 state.lastSeen=Date.now();
}
function scrollToStage(id){
 const el=document.getElementById(id);
 if(!el){toast('Bagian berikutnya belum ditemukan.');return;}
 el.scrollIntoView({behavior:'smooth',block:'start'});
 try{history.replaceState(null,'','#'+id);}catch(e){}
}
function nextStage(id,message){
 if(message)toast(message);
 setTimeout(()=>scrollToStage(id),350);
}
function resetToFirstQuiz(){quizIndex=0;}

function renderSteps(){
 const unlocked=[state.done.game,state.done.quiz,state.done.effort>=3,state.done.letter,state.done.answer!==null];
 $('#stepGrid').innerHTML=steps.map((s,i)=>{
   const available=i===0||unlocked[i-1];
   return `<div class="step"><div class="num">${s[0]} / 05</div><h3>${s[1]}</h3><p>${s[2]}</p><strong style="color:${unlocked[i]?'#2ab56f':'#b2a4b0'}">${unlocked[i]?'✓ Selesai':available?'• Bisa dibuka':'🔒 Terkunci'}</strong></div>`;
 }).join('');
 $('#progressNodes').innerHTML=steps.map((s,i)=>`<div class="node ${unlocked[i]?'done':''} ${!unlocked[i]&&(i===0||unlocked[i-1])?'active':''}"><div class="node-dot">${unlocked[i]?'✓':s[0]}</div><div class="node-label">${s[1]}</div></div>`).join('');
 const count=unlocked.filter(Boolean).length;
 $('#progressBar').style.width=(count/5*100)+'%';
 $('#completionStat').textContent=Math.round(count/5*100)+'%';
}

function renderQuiz(){
 const card=$('#quizCard');
 if(!state.done.game){
   card.innerHTML=`<div class="tiny">STAGE 2 TERKUNCI</div><div class="q">Selesaikan Love Catcher dulu ya ♡</div><div class="quiz-nav"><button class="btn primary" id="goGameBtn">Ke Game →</button></div>`;
   $('#goGameBtn').onclick=()=>scrollToStage('game');
   return;
 }
 if(state.done.quiz){
   card.innerHTML=`<div class="tiny">SELESAI ♡</div><div class="q">Uji cinta sudah selesai.</div><div class="quiz-nav"><button class="btn primary" id="goChallengeBtn">Lanjut ke Challenge →</button></div>`;
   $('#goChallengeBtn').onclick=()=>scrollToStage('effort');
   return;
 }
 const q=questions[quizIndex];
 card.innerHTML=`<div class="tiny">Pertanyaan ${quizIndex+1} dari ${questions.length}</div><div class="q">${q.q}</div><div class="options">${q.o.map((x,i)=>`<button class="option ${state.quizAnswers[quizIndex]===i?'selected':''}" data-i="${i}">${x}</button>`).join('')}</div><div class="quiz-nav"><button class="btn ghost" id="prevQ" ${quizIndex===0?'disabled':''}>← Kembali</button><button class="btn primary" id="nextQ">${quizIndex===questions.length-1?'Selesai':'Lanjut'} →</button></div>`;
 $$('.option').forEach(b=>b.onclick=()=>{state.quizAnswers[quizIndex]=+b.dataset.i;save();renderQuiz();});
 $('#prevQ').onclick=()=>{if(quizIndex>0){quizIndex--;renderQuiz();}};
 $('#nextQ').onclick=()=>{
   if(state.quizAnswers[quizIndex]==null){toast('Pilih satu jawaban dulu ya ♡');return;}
   if(quizIndex<questions.length-1){quizIndex++;renderQuiz();return;}
   state.done.quiz=true;
   save();
   log('quiz','Quiz selesai');
   renderAll();
   nextStage('effort','Quiz selesai! Challenge berikutnya kebuka 💕');
 };
}

function renderChallenges(){
 const unlocked=state.done.game&&state.done.quiz;
 $('#challengeGrid').innerHTML=challenges.map((c,i)=>{
   const done=state.challengeDone.includes(i);
   return `<div class="challenge ${done?'done':''} ${!unlocked?'locked':''}"><div class="icon">${c[0]}</div><h3>${c[1]}</h3><p class="tiny">${c[2]}</p>${done?'<strong style="color:#28af69">✓ Selesai</strong>':`<button class="btn primary challenge-btn" data-i="${i}" ${!unlocked?'disabled':''}>${unlocked?'Buka Challenge':'🔒 Terkunci'}</button>`}</div>`;
 }).join('');
 $$('.challenge-btn').forEach(b=>b.onclick=()=>doChallenge(+b.dataset.i));
}

function doChallenge(i){
 if(!state.done.game||!state.done.quiz)return toast('Selesaikan Game dan Quiz dulu ya ♡');
 if(state.challengeDone.includes(i))return;
 const answers=[
   ()=>prompt('Tulis satu kalimat jujur tentang perasaanmu:')||'',
   ()=>prompt('Pilih momen favorit: 1) pertama kenal  2) paling kocak  3) ngobrol malam  4) lainnya')||'',
   ()=>prompt('Kirim satu emoji untuk menggambarkan hubungan kita:')||''
 ];
 const a=answers[i]();
 if(!a.trim())return toast('Belum ada jawaban—coba lagi 😚');
 state.challengeDone.push(i);
 state.done.effort=state.challengeDone.length;
 save();
 log('challenge',`Challenge ${i+1} selesai: ${a.slice(0,100)}`);
 renderAll();
 if(state.done.effort>=3)nextStage('letter','Semua challenge selesai! Suratmu sudah terbuka 💌');
 else toast(`Challenge ${state.done.effort}/3 selesai ✨`);
}

function canLetter(){return state.done.game&&state.done.quiz&&state.done.effort>=3;}
function updateLock(){
 const overlay=$('#lockOverlay');
 const can=canLetter();
 if(overlay)overlay.style.display=can?'none':'grid';
 const open=$('#openLetterBtn');
 if(open)open.disabled=!can;
}
function updateFinalLock(){
 const unlocked=state.done.letter;
 ['#yesBtn','#thinkBtn'].forEach(sel=>{const b=$(sel);if(b)b.disabled=!unlocked;});
 const result=$('#answerResult');
 if(result&&!unlocked)result.textContent='Surat belum dibuka. Selesaikan perjalananmu dulu ya ♡';
}
function openLetter(){
 if(!canLetter())return toast('Selesaikan Game, Quiz, dan 3 Challenge dulu ya ♡');
 if(!state.done.letter){state.done.letter=true;save();log('letter','Surat dibuka');}
 updateLock();
 renderAll();
 nextStage('final','Suratnya sudah terbuka… sekarang tinggal satu pertanyaan 💗');
}

function renderAll(){
 renderSteps();
 renderQuiz();
 renderChallenges();
 updateLock();
 updateFinalLock();
 $('#gameStat').textContent=state.gameBest||0;
 $('#timeStat').textContent=formatTime(state.totalSeconds);
}
function formatTime(sec){const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return(h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}

function startGame(){
 if(game)return;
 if(state.done.game){toast('Boleh main lagi untuk mengejar skor terbaik ♡');}
 ensureStart();
 const start=$('#gameBoard .game-start');if(start)start.style.display='none';
 let score=0,lives=3,time=30;
 $('#score').textContent=0;$('#lives').textContent=3;$('#timer').textContent=30;
 game={score,lives,time,active:true};
 log('game_start','Love Catcher dimulai');
 game.tick=setInterval(()=>{if(!game?.active)return;game.time--;$('#timer').textContent=game.time;if(game.time<=0)endGame();},1000);
 game.spawn=setInterval(spawnHeart,500);
 spawnHeart();
}
function spawnHeart(){
 if(!game?.active)return;
 const board=$('#gameBoard');if(!board)return;
 const el=document.createElement('button');
 const good=Math.random()>.17;const golden=good&&Math.random()<.12;
 el.className='falling';el.type='button';el.textContent=good?(golden?'💖':'♡'):'🖤';el.dataset.value=good?(golden?25:10):-15;
 el.style.left=(5+Math.random()*88)+'%';el.style.top='-50px';board.appendChild(el);
 const fall=el.animate([{transform:'translateY(0)'},{transform:'translateY('+(board.clientHeight+70)+'px)'}],{duration:1800+Math.random()*900,easing:'linear'});
 fall.onfinish=()=>{if(el.isConnected)el.remove();};
 el.onclick=()=>{if(!game?.active)return;const v=+el.dataset.value;game.score+=v;if(v<0){game.lives--;toast('Aduh, hati patah 😭');}el.remove();$('#score').textContent=game.score;$('#lives').textContent=game.lives;if(game.lives<=0)endGame();};
}
function endGame(){
 if(!game?.active)return;
 game.active=false;clearInterval(game.tick);clearInterval(game.spawn);$$('.falling').forEach(x=>x.remove());
 state.gameLast=game.score;state.gameBest=Math.max(state.gameBest,game.score);state.done.game=true;save();
 const finalScore=game.score;log('game_end',`Skor ${finalScore}`);game=null;renderAll();
 toast(`Game selesai! Skor kamu ${finalScore} 💗`);
 nextStage('quiz','Bagus! Sekarang masuk ke Uji Cinta →');
}

function finishAnswer(answer){
 if(!state.done.letter)return toast('Buka suratnya dulu ya ♡');
 state.done.answer=answer;save();
 log('answer',answer==='yes'?'Jawaban: MAU ❤️':'Jawaban: masih mikir dulu 🥹');
 $('#answerResult').textContent=answer==='yes'?'Aku bakal simpan momen ini baik-baik. Jadi… resmi ya? 🥹❤️':'Nggak apa-apa. Aku tetap menghargai jawabanmu. Waktumu aman di sini. ♡';
 renderAll();
 if(answer==='yes')celebrate();
}
function celebrate(){for(let i=0;i<26;i++){setTimeout(()=>{const e=document.createElement('div');e.textContent=['💗','💕','✨','🌸'][Math.floor(Math.random()*4)];e.style.cssText=`position:fixed;left:${Math.random()*100}vw;top:-40px;font-size:${18+Math.random()*20}px;z-index:200;pointer-events:none`;document.body.appendChild(e);e.animate([{transform:'translateY(0) rotate(0)'},{transform:`translateY(110vh) rotate(${Math.random()*600-300}deg)`}],{duration:2600+Math.random()*1600,easing:'ease-in'}).onfinish=()=>e.remove();},i*80);}}

function buildAdmin(){const pass=prompt('Masukkan password admin:');if(pass===null)return;if(pass!==(localStorage.getItem(ADMIN_KEY)||'love123')){toast('Password admin salah.');return;}$('#adminDialog').showModal();renderAdmin();}
function renderAdminSummary(){if(!$('#adminDialog')?.open)return;renderAdmin();}
function renderAdmin(){
 const history=state.history.slice().reverse();
 $('#adminApp').innerHTML=`<div class="admin-top"><div><p class="eyebrow">PRIVATE DASHBOARD</p><h2>History Perjalanan</h2><p class="tiny">Data hanya dari aktivitas yang dicatat di perangkat ini.</p></div><div class="admin-tools"><button class="btn ghost" id="exportBtn">Export JSON</button><button class="btn ghost" id="resetBtn">Reset</button></div></div><div class="admin-summary"><div><b>${Math.round((state.done.game+state.done.quiz+(state.done.effort>=3?1:0)+(state.done.letter?1:0)+(state.done.answer!==null?1:0))/5*100)}%</b><span class="tiny">Completion</span></div><div><b>${state.gameBest}</b><span class="tiny">Best score</span></div><div><b>${state.history.length}</b><span class="tiny">Events</span></div><div><b>${formatTime(state.totalSeconds)}</b><span class="tiny">Total time</span></div></div>${history.length?`<div class="history-list">${history.map(h=>`<div class="history-row"><span>${new Date(h.ts).toLocaleString('id-ID')}</span><strong>${h.type}</strong><span>${escapeHtml(h.detail)}</span></div>`).join('')}</div>`:'<div class="history-empty">Belum ada riwayat yang tercatat.</div>'}`;
 $('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='love-quest-history.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
 $('#resetBtn').onclick=()=>{if(confirm('Reset semua progress dan history di browser ini?')){localStorage.removeItem(KEY);location.reload();}};
}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

$('#startBtn').onclick=()=>{ensureStart();log('nav','Mulai perjalanan ditekan');scrollToStage('game');};
$('#howBtn').onclick=()=>$('#howDialog').showModal();
$('#playGameBtn').onclick=startGame;
$('#openLetterBtn').onclick=openLetter;
$('#yesBtn').onclick=()=>finishAnswer('yes');
$('#thinkBtn').onclick=()=>finishAnswer('think');
$('#adminOpen').onclick=buildAdmin;
$('#consentToggle').checked=state.consent;
$('#consentToggle').onchange=e=>{state.consent=e.target.checked;save();toast(e.target.checked?'Riwayat diaktifkan.':'Riwayat dimatikan.');};
$('#soundBtn').onclick=()=>{soundOn=!soundOn;$('#soundBtn').textContent=soundOn?'♫':'♪';toast(soundOn?'Sound UI aktif':'Sound UI mati');};

setInterval(()=>{if(document.visibilityState==='visible'&&state.startedAt){state.totalSeconds++;state.lastSeen=Date.now();save();$('#timeStat').textContent=formatTime(state.totalSeconds);}},1000);
window.addEventListener('beforeunload',()=>{if(state.startedAt){state.lastSeen=Date.now();save();}});

ensureStart();
renderAll();
