(()=>{
'use strict';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const TAU=Math.PI*2, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,t)=>a+(b-a)*t;
const rnd=(a,b)=>a+Math.random()*(b-a), irnd=(a,b)=>Math.floor(rnd(a,b+1));
const canvas=$('#game'), ctx=canvas.getContext('2d',{alpha:false});
const lightCanvas=document.createElement('canvas'), lctx=lightCanvas.getContext('2d');
const ui={
 start:$('#start'), over:$('#over'), hud:$('#hud'), touch:$('#touch'), preview:$('#preview'), plus:$('#plus'), portrait:$('#portrait'),
 hp:$('#hp'), hpFill:$('#hpFill'), wave:$('#wave'), waveBig:$('#waveBig'), kills:$('#kills'), score:$('#score'),
 ammo:$('#ammo'), reserve:$('#reserve'), weaponName:$('#weaponName'), weaponIcon:$('#weaponIcon'), toast:$('#toast'),
 waveBanner:$('#waveBanner'), dangerText:$('#dangerText')
};

const isTouch=matchMedia('(hover:none),(pointer:coarse)').matches;
let DPR=1,W=innerWidth,H=innerHeight,last=performance.now(),running=false,faceImg=null,toastTimer=0,bannerTimer=0;
let player,enemies=[],shots=[],particles=[],decals=[],props=[],lights=[],pickups=[],floaters=[],wave=1,kills=0,score=0,nextWave=0,spawnLeft=0,spawnTimer=0;
let camera={x:0,y:0,shake:0,kickX:0,kickY:0}, storm={flash:0,next:rnd(12,28)};
let rain=[],fog=[];
const keys=new Set(),mouse={x:W/2,y:H/2,down:false,moved:false},moveTouch={x:0,y:0},aimTouch={x:1,y:0};
const WORLD={w:3000,h:2200};

const WEAPONS={
 pistol:{name:'ПИСТОЛЕТ',icon:'⌁',mag:12,reserve:84,damage:36,rate:.2,speed:1250,spread:.018,pellets:1,reload:.95,color:'#fff1b0',recoil:4,flash:1},
 shotgun:{name:'ДРОБОВИК',icon:'≋',mag:6,reserve:32,damage:24,rate:.7,speed:980,spread:.19,pellets:7,reload:1.35,color:'#ffd0a0',recoil:9,flash:1.5},
 bow:{name:'ЛУК',icon:'➳',mag:1,reserve:34,damage:105,rate:.78,speed:800,spread:.006,pellets:1,reload:.48,color:'#d9efbd',arrow:true,recoil:2,flash:0}
};

function resize(){
 DPR=Math.min(isTouch?1.45:2,devicePixelRatio||1);W=innerWidth;H=innerHeight;
 canvas.width=Math.floor(W*DPR);canvas.height=Math.floor(H*DPR);canvas.style.width=W+'px';canvas.style.height=H+'px';
 lightCanvas.width=canvas.width;lightCanvas.height=canvas.height;ctx.setTransform(DPR,0,0,DPR,0,0);initWeather();
}
addEventListener('resize',resize);resize();

function neutralFace(){
 const c=document.createElement('canvas');c.width=c.height=180;const x=c.getContext('2d');
 const g=x.createRadialGradient(80,55,12,90,90,100);g.addColorStop(0,'#b7c1b4');g.addColorStop(1,'#505c52');x.fillStyle=g;x.fillRect(0,0,180,180);
 x.fillStyle='#202722';x.beginPath();x.arc(90,90,60,0,TAU);x.fill();x.fillStyle='#aeb7ac';x.beginPath();x.arc(90,72,35,0,TAU);x.fill();
 x.fillStyle='#2b342d';x.fillRect(65,67,14,5);x.fillRect(101,67,14,5);x.fillStyle='#6e796f';x.fillRect(86,75,8,18);x.fillStyle='#364138';x.fillRect(76,101,29,5);
 return c.toDataURL('image/jpeg',.85);
}
function setFace(src){const img=new Image();img.onload=()=>{faceImg=img;ui.preview.src=src;ui.preview.style.display='block';ui.plus.style.display='none';ui.portrait.src=src};img.src=src}
setFace(localStorage.getItem('facefall-face')||neutralFace());
$('#face').addEventListener('change',e=>{
 const f=e.target.files&&e.target.files[0];if(!f)return;const r=new FileReader();
 r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),s=360;c.width=c.height=s;const x=c.getContext('2d');
 const scale=Math.max(s/im.width,s/im.height),dw=im.width*scale,dh=im.height*scale;x.drawImage(im,(s-dw)/2,(s-dh)/2,dw,dh);
 const data=c.toDataURL('image/jpeg',.86);try{localStorage.setItem('facefall-face',data)}catch{}setFace(data);toast('ЛИЦО СОХРАНЕНО НА УСТРОЙСТВЕ')};im.src=r.result};r.readAsDataURL(f)
});
function toast(t){clearTimeout(toastTimer);ui.toast.textContent=t;ui.toast.classList.remove('hidden');toastTimer=setTimeout(()=>ui.toast.classList.add('hidden'),1300)}
function banner(n){clearTimeout(bannerTimer);ui.waveBanner.querySelector('span').textContent=n;ui.waveBanner.classList.remove('hidden');bannerTimer=setTimeout(()=>ui.waveBanner.classList.add('hidden'),1600)}
function norm(x,y){const m=Math.hypot(x,y)||1;return{x:x/m,y:y/m}}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}

function initWeather(){
 rain=Array.from({length:Math.min(170,Math.floor(W*H/5000))},()=>({x:rnd(0,W),y:rnd(0,H),l:rnd(10,28),s:rnd(480,820),a:rnd(.08,.24)}));
 fog=Array.from({length:12},()=>({x:rnd(-W*.2,W*1.2),y:rnd(-H*.1,H*1.1),r:rnd(100,260),vx:rnd(2,8),a:rnd(.015,.045)}));
}

function reset(){
 player={x:WORLD.w/2,y:WORLD.h/2,r:23,hp:100,maxHp:100,speed:255,angle:0,weapon:'pistol',cool:0,reloading:0,hitFlash:0,muzzle:0,step:0,walk:0,
 ammo:{pistol:{mag:12,reserve:84},shotgun:{mag:6,reserve:32},bow:{mag:1,reserve:34}}};
 enemies=[];shots=[];particles=[];decals=[];props=[];lights=[];pickups=[];floaters=[];wave=1;kills=0;score=0;nextWave=1.6;spawnLeft=0;spawnTimer=0;
 camera={x:player.x-W/2,y:player.y-H/2,shake:0,kickX:0,kickY:0};storm={flash:0,next:rnd(12,26)};makeWorld();updateHud();
}
function makeWorld(){
 for(let i=0;i<42;i++)decals.push({kind:Math.random()<.42?'puddle':'mud',x:rnd(70,WORLD.w-70),y:rnd(70,WORLD.h-70),r:rnd(22,90),a:rnd(.04,.12),rot:rnd(0,TAU)});
 for(let x=260;x<WORLD.w-220;x+=360){const y=WORLD.h*.47+Math.sin(x*.003)*85+(x%720===0?-105:105);props.push({kind:'lamp',x,y,r:16,rot:0});lights.push({x,y:y-10,r:210,a:.13,flick:rnd(0,TAU)})}
 for(let i=0;i<12;i++){const x=rnd(250,WORLD.w-250),base=WORLD.h*.47+Math.sin(x*.003)*85,side=Math.random()<.5?-1:1;props.push({kind:'car',x,y:base+side*rnd(50,130),r:36,rot:rnd(-.45,.45)+(Math.random()<.5?0:Math.PI),tone:Math.random()})}
 const kinds=['rock','bush','tree','tree','crate','barrel','fence'];
 for(let i=0;i<155;i++){const kind=kinds[irnd(0,kinds.length-1)],x=rnd(70,WORLD.w-70),y=rnd(70,WORLD.h-70);props.push({kind,x,y,r:kind==='tree'?rnd(24,44):kind==='fence'?rnd(24,48):rnd(8,24),rot:rnd(0,TAU),tone:Math.random()})}
 const cx=WORLD.w*.72,cy=WORLD.h*.72;
 for(let i=0;i<6;i++)props.push({kind:'crate',x:cx+rnd(-120,120),y:cy+rnd(-90,90),r:18,rot:rnd(0,TAU)});
 lights.push({x:cx,y:cy,r:170,a:.09,flick:1.2});props.push({kind:'fire',x:cx,y:cy,r:18,rot:0});
}

function start(){reset();running=true;last=performance.now();ui.start.classList.add('hidden');ui.over.classList.add('hidden');ui.hud.classList.remove('hidden');if(isTouch)ui.touch.classList.remove('hidden');audio.unlock();toast('ПЕРЕЖИВИ НОЧЬ')}
function end(){running=false;mouse.down=false;ui.hud.classList.add('hidden');ui.touch.classList.add('hidden');ui.dangerText.classList.add('hidden');$('#finalScore').textContent=score;$('#finalKills').textContent=kills;$('#finalWave').textContent=wave;ui.over.classList.remove('hidden');audio.over()}
$('#play').onclick=start;$('#again').onclick=start;

function selectWeapon(id){if(!player||!WEAPONS[id])return;player.weapon=id;player.reloading=0;$$('.slots button').forEach(b=>b.classList.toggle('active',b.dataset.w===id));updateHud();audio.swap()}
$$('.slots button').forEach(b=>b.onclick=()=>selectWeapon(b.dataset.w));
function reload(){if(!running||!player)return;const w=WEAPONS[player.weapon],a=player.ammo[player.weapon];if(player.reloading>0||a.mag>=w.mag||a.reserve<=0)return;player.reloading=w.reload;audio.reload();toast('ПЕРЕЗАРЯДКА')}
function finishReload(){const w=WEAPONS[player.weapon],a=player.ammo[player.weapon],need=w.mag-a.mag,take=Math.min(need,a.reserve);a.mag+=take;a.reserve-=take;updateHud()}
function autoAim(){if(!isTouch||!enemies.length)return;let best=null,bd=620;for(const e of enemies){const d=distance(player,e);if(d<bd){bd=d;best=e}}if(best){const dx=best.x-player.x,dy=best.y-player.y;const n=norm(dx,dy);aimTouch.x=n.x;aimTouch.y=n.y;player.angle=Math.atan2(n.y,n.x)}}
function shoot(){
 const w=WEAPONS[player.weapon],a=player.ammo[player.weapon];if(player.cool>0||player.reloading>0)return;if(isTouch)autoAim();
 if(a.mag<=0){reload();audio.empty();return}a.mag--;player.cool=w.rate;player.muzzle=w.flash;camera.shake+=w.recoil;camera.kickX-=Math.cos(player.angle)*w.recoil*1.8;camera.kickY-=Math.sin(player.angle)*w.recoil*1.8;
 for(let i=0;i<w.pellets;i++){const ang=player.angle+rnd(-w.spread,w.spread);shots.push({x:player.x+Math.cos(ang)*33,y:player.y+Math.sin(ang)*33,px:player.x,py:player.y,vx:Math.cos(ang)*w.speed,vy:Math.sin(ang)*w.speed,life:w.arrow?1.65:.72,damage:w.damage,arrow:!!w.arrow,color:w.color,angle:ang})}
 if(!w.arrow){for(let i=0;i<(player.weapon==='shotgun'?3:1);i++){const side=player.angle-Math.PI/2+rnd(-.25,.25),px=player.x-Math.cos(player.angle)*4,py=player.y-Math.sin(player.angle)*4;particles.push({type:'casing',x:px,y:py,vx:Math.cos(side)*rnd(80,150),vy:Math.sin(side)*rnd(80,150),life:rnd(.5,.85),max:.85,size:2,color:'#bd9b54',rot:rnd(0,TAU),vr:rnd(-8,8)})}}
 burst(player.x+Math.cos(player.angle)*35,player.y+Math.sin(player.angle)*35,w.arrow?'#d6e8bf':'#ffd889',w.arrow?3:8,w.arrow?70:120,'spark');
 if(!w.arrow)smoke(player.x+Math.cos(player.angle)*38,player.y+Math.sin(player.angle)*38,player.angle);
 audio.shot(player.weapon);updateHud();
}

function beginWave(){spawnLeft=5+wave*3+Math.floor(wave*.8);spawnTimer=.12;banner(wave);audio.wave()}
function spawnEnemy(){
 let x,y;const edge=irnd(0,3);if(edge===0){x=rnd(20,WORLD.w-20);y=20}else if(edge===1){x=WORLD.w-20;y=rnd(20,WORLD.h-20)}else if(edge===2){x=rnd(20,WORLD.w-20);y=WORLD.h-20}else{x=20;y=rnd(20,WORLD.h-20)};
 if(Math.hypot(x-player.x,y-player.y)<620)return spawnEnemy();
 const roll=Math.random();let type='walker';if(wave>=2&&roll<Math.min(.22,.05+wave*.018))type='runner';if(wave>=3&&roll>1-Math.min(.13,.025+wave*.008))type='brute';
 const data=type==='runner'?{r:19,hp:52+wave*4,speed:145+wave*2.2,damage:11}:type==='brute'?{r:32,hp:190+wave*14,speed:68+wave*1.3,damage:26}:{r:23,hp:72+wave*6,speed:88+wave*1.6,damage:14};
 enemies.push({x,y,r:data.r,hp:data.hp,maxHp:data.hp,speed:data.speed+rnd(-7,12),damage:data.damage,attack:0,type,phase:rnd(0,TAU),stagger:0,hit:0,skin:Math.random(),cloth:Math.random(),rot:rnd(-.3,.3)});
}
function burst(x,y,color,n=8,spd=120,type='blood'){for(let i=0;i<n;i++){const a=rnd(0,TAU),v=rnd(spd*.25,spd);particles.push({type,x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.18,.58),max:.58,size:rnd(1,3.8),color,rot:rnd(0,TAU),vr:rnd(-6,6)})}}
function smoke(x,y,a){for(let i=0;i<4;i++)particles.push({type:'smoke',x:x+rnd(-4,4),y:y+rnd(-4,4),vx:Math.cos(a)*rnd(15,45)+rnd(-15,15),vy:Math.sin(a)*rnd(15,45)+rnd(-15,15),life:rnd(.35,.7),max:.7,size:rnd(5,10),color:'#899287'})}
function blood(x,y,n=10){burst(x,y,'#6e1517',n,155,'blood');if(decals.length<190)decals.push({kind:'blood',x:x+rnd(-9,9),y:y+rnd(-9,9),r:rnd(5,15),a:rnd(.2,.36),rot:rnd(0,TAU)})}
function addFloater(x,y,text,color='#e8eee9'){floaters.push({x,y,text,color,life:.65,max:.65,vy:-28})}
function maybeDrop(e){const r=Math.random();if(r<.055)pickups.push({kind:'med',x:e.x,y:e.y,r:13,life:18,pulse:rnd(0,TAU)});else if(r<.13)pickups.push({kind:'ammo',x:e.x,y:e.y,r:13,life:18,pulse:rnd(0,TAU)})}

function update(dt){
 if(!running){updateWeather(dt);return}
 player.cool=Math.max(0,player.cool-dt);player.hitFlash=Math.max(0,player.hitFlash-dt);player.muzzle=Math.max(0,player.muzzle-dt*9);
 if(player.reloading>0){player.reloading-=dt;if(player.reloading<=0)finishReload()}
 let mx=(keys.has('d')?1:0)-(keys.has('a')?1:0)+moveTouch.x,my=(keys.has('s')?1:0)-(keys.has('w')?1:0)+moveTouch.y;
 player.walk=Math.hypot(mx,my);if(mx||my){const n=norm(mx,my);player.x=clamp(player.x+n.x*player.speed*dt,35,WORLD.w-35);player.y=clamp(player.y+n.y*player.speed*dt,35,WORLD.h-35);player.step+=dt*10}
 const sx=player.x-camera.x,sy=player.y-camera.y;if(isTouch&&!mouse.moved){if(mouse.down)autoAim();player.angle=Math.atan2(aimTouch.y,aimTouch.x)}else player.angle=Math.atan2(mouse.y-sy,mouse.x-sx);if(mouse.down)shoot();
 if(nextWave>0){nextWave-=dt;if(nextWave<=0)beginWave()}if(spawnLeft>0){spawnTimer-=dt;if(spawnTimer<=0){spawnEnemy();spawnLeft--;spawnTimer=Math.max(.16,.68-wave*.024)}}

 for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.px=s.x;s.py=s.y;s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;let hit=false;
  for(let j=enemies.length-1;j>=0&&!hit;j--){const e=enemies[j];if(Math.hypot(s.x-e.x,s.y-e.y)<e.r+4){e.hp-=s.damage;e.stagger=.08;e.hit=.1;blood(s.x,s.y,s.arrow?5:9);addFloater(e.x,e.y-e.r,String(Math.round(s.damage)),s.arrow?'#d6efb6':'#f0e2ca');hit=true;
   if(e.hp<=0){kills++;score+=e.type==='brute'?300:e.type==='runner'?140:100;blood(e.x,e.y,e.type==='brute'?28:17);decals.push({kind:'corpse',x:e.x,y:e.y,r:e.r,a:.48,rot:Math.atan2(player.y-e.y,player.x-e.x),type:e.type});maybeDrop(e);audio.down();enemies.splice(j,1)}}}
  if(hit||s.life<=0||s.x<0||s.y<0||s.x>WORLD.w||s.y>WORLD.h)shots.splice(i,1)
 }

 let close=9999;
 for(let i=enemies.length-1;i>=0;i--){const e=enemies[i];e.phase+=dt*(e.type==='runner'?11:6);e.attack=Math.max(0,e.attack-dt);e.stagger=Math.max(0,e.stagger-dt);e.hit=Math.max(0,e.hit-dt);const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;close=Math.min(close,d);
  if(e.stagger<=0&&d>player.r+e.r-2){const wob=Math.sin(e.phase)*.05;e.x+=(dx/d*Math.cos(wob)-dy/d*Math.sin(wob))*e.speed*dt;e.y+=(dy/d*Math.cos(wob)+dx/d*Math.sin(wob))*e.speed*dt}
  else if(d<=player.r+e.r+4&&e.attack<=0){player.hp-=e.damage;e.attack=e.type==='runner'?.62:e.type==='brute'?1.05:.78;player.hitFlash=.16;camera.shake+=e.type==='brute'?14:8;blood(player.x,player.y,5);audio.hurt();if(player.hp<=0){player.hp=0;updateHud();end();return}}
 }
 ui.dangerText.classList.toggle('hidden',close>145);

 for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.life-=dt;p.pulse+=dt*3;if(distance(player,p)<player.r+p.r+8){if(p.kind==='med'){player.hp=Math.min(player.maxHp,player.hp+28);addFloater(player.x,player.y-36,'+28 HP','#c4ff67');toast('АПТЕЧКА +28 HP')}else{for(const id of Object.keys(player.ammo))player.ammo[id].reserve+=id==='pistol'?14:id==='shotgun'?6:7;toast('БОЕПРИПАСЫ ПОПОЛНЕНЫ')}audio.pickup();pickups.splice(i,1);continue}if(p.life<=0)pickups.splice(i,1)}

 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot=(p.rot||0)+(p.vr||0)*dt;if(p.type==='casing'){p.vx*=Math.pow(.12,dt);p.vy*=Math.pow(.12,dt)}else{p.vx*=Math.pow(.045,dt);p.vy*=Math.pow(.045,dt)}p.life-=dt;if(p.life<=0)particles.splice(i,1)}
 for(let i=floaters.length-1;i>=0;i--){const f=floaters[i];f.y+=f.vy*dt;f.life-=dt;if(f.life<=0)floaters.splice(i,1)}

 if(spawnLeft===0&&enemies.length===0&&nextWave<=0){wave++;nextWave=2.5;player.hp=Math.min(player.maxHp,player.hp+10);for(const id of Object.keys(player.ammo))player.ammo[id].reserve+=id==='pistol'?10:id==='shotgun'?4:5;toast('ПЕРЕДЫШКА · +10 HP')}
 const tx=player.x-W/2+camera.kickX,ty=player.y-H/2+camera.kickY;camera.x+= (tx-camera.x)*Math.min(1,dt*5.8);camera.y+=(ty-camera.y)*Math.min(1,dt*5.8);camera.x=clamp(camera.x,0,Math.max(0,WORLD.w-W));camera.y=clamp(camera.y,0,Math.max(0,WORLD.h-H));camera.shake=Math.max(0,camera.shake-dt*30);camera.kickX*=Math.pow(.02,dt);camera.kickY*=Math.pow(.02,dt);
 updateWeather(dt);updateHud();
}
function updateWeather(dt){
 for(const r of rain){r.y+=r.s*dt;r.x-=r.s*.18*dt;if(r.y>H+30){r.y=-30;r.x=rnd(0,W+100)}if(r.x<-30)r.x=W+30}
 for(const f of fog){f.x+=f.vx*dt;if(f.x-f.r>W)f.x=-f.r}
 storm.next-=dt;if(storm.next<=0){storm.flash=1;storm.next=rnd(16,32);setTimeout(()=>audio.thunder(),rnd(120,500))}storm.flash=Math.max(0,storm.flash-dt*4.2);
}
function updateHud(){if(!player)return;ui.hp.textContent=Math.ceil(player.hp);ui.hpFill.style.width=clamp(player.hp,0,100)+'%';ui.wave.textContent=wave;ui.waveBig.textContent=wave;ui.kills.textContent=kills;ui.score.textContent=String(score).padStart(6,'0');const w=WEAPONS[player.weapon],a=player.ammo[player.weapon];ui.weaponName.textContent=w.name;ui.weaponIcon.textContent=w.icon;ui.ammo.textContent=a.mag;ui.reserve.textContent=' / '+a.reserve}

function draw(){
 ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#0b100c';ctx.fillRect(0,0,W,H);
 if(!player){menuBackdrop();drawRain();return}
 const shx=rnd(-camera.shake,camera.shake),shy=rnd(-camera.shake,camera.shake);ctx.save();ctx.translate(-camera.x+shx,-camera.y+shy);
 ground();for(const d of decals)drawDecal(d);for(const p of props)drawPropShadow(p);for(const p of props)drawProp(p);for(const p of pickups)drawPickup(p);for(const s of shots)drawShot(s);for(const e of enemies)drawEnemy(e);drawPlayer();for(const p of particles)drawParticle(p);for(const f of floaters)drawFloater(f);ctx.restore();
 lighting(shx,shy);drawFog();drawRain();screenFX();if(!isTouch)crosshair();
}
function menuBackdrop(){
 const g=ctx.createRadialGradient(W*.64,H*.34,20,W*.64,H*.34,Math.max(W,H)*.8);g.addColorStop(0,'#1c2a20');g.addColorStop(.5,'#0b120d');g.addColorStop(1,'#050806');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='rgba(196,255,103,.035)';ctx.lineWidth=1;for(let x=-H;x<W+H;x+=90){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x-H,H);ctx.stroke()}
 drawFog();
}
function roadY(x){return WORLD.h*.47+Math.sin(x*.003)*85}
function ground(){
 ctx.fillStyle='#121913';ctx.fillRect(0,0,WORLD.w,WORLD.h);
 const size=128;for(let y=0;y<WORLD.h;y+=size)for(let x=0;x<WORLD.w;x+=size){const n=((x*17+y*11)%131)/131;ctx.fillStyle=`rgba(${20+Math.floor(n*10)},${29+Math.floor(n*11)},${21+Math.floor(n*8)},.2)`;ctx.fillRect(x,y,size,size)}
 ctx.lineCap='round';ctx.strokeStyle='#1a211c';ctx.lineWidth=170;ctx.beginPath();for(let x=0;x<=WORLD.w;x+=40){const y=roadY(x);if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke();
 ctx.strokeStyle='rgba(104,116,107,.08)';ctx.lineWidth=152;ctx.stroke();ctx.setLineDash([34,26]);ctx.strokeStyle='rgba(208,210,184,.12)';ctx.lineWidth=2;ctx.beginPath();for(let x=0;x<=WORLD.w;x+=40){const y=roadY(x);if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke();ctx.setLineDash([]);
 ctx.globalCompositeOperation='screen';ctx.strokeStyle='rgba(93,123,101,.025)';ctx.lineWidth=125;ctx.beginPath();for(let x=0;x<=WORLD.w;x+=60){const y=roadY(x)-7;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke();ctx.globalCompositeOperation='source-over';
}
function drawDecal(d){
 ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.rot||0);ctx.globalAlpha=d.a;
 if(d.kind==='blood'){ctx.fillStyle='#5e1316';for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(rnd(-d.r*.3,d.r*.3),rnd(-d.r*.2,d.r*.2),d.r*rnd(.5,1),d.r*rnd(.25,.55),rnd(0,TAU),0,TAU);ctx.fill()}}
 else if(d.kind==='puddle'){ctx.fillStyle='#26312a';ctx.beginPath();ctx.ellipse(0,0,d.r,d.r*.37,0,0,TAU);ctx.fill();ctx.strokeStyle='rgba(155,177,161,.14)';ctx.lineWidth=1;ctx.stroke();ctx.globalCompositeOperation='screen';ctx.fillStyle='rgba(106,135,115,.08)';ctx.beginPath();ctx.ellipse(-d.r*.2,-d.r*.08,d.r*.52,d.r*.1,-.1,0,TAU);ctx.fill()}
 else if(d.kind==='corpse'){ctx.fillStyle='#151a16';ctx.beginPath();ctx.ellipse(0,3,d.r*1.15,d.r*.58,0,0,TAU);ctx.fill();ctx.fillStyle=d.type==='brute'?'#403d34':'#343b35';ctx.fillRect(-d.r*.75,-d.r*.4,d.r*1.35,d.r*.75);ctx.beginPath();ctx.arc(d.r*.72,-d.r*.12,d.r*.38,0,TAU);ctx.fill()}
 else{ctx.fillStyle='#080b09';ctx.beginPath();ctx.ellipse(0,0,d.r,d.r*.52,0,0,TAU);ctx.fill()}
 ctx.restore();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
}
function drawPropShadow(p){ctx.save();ctx.translate(p.x+9,p.y+13);ctx.rotate(p.rot||0);ctx.fillStyle='rgba(0,0,0,.28)';if(p.kind==='tree'){ctx.beginPath();ctx.ellipse(0,0,p.r*1.2,p.r*.52,0,0,TAU);ctx.fill()}else if(p.kind==='car'){ctx.fillRect(-42,-18,84,36)}else if(p.kind==='fence'){ctx.fillRect(-p.r,-4,p.r*2,8)}else{ctx.beginPath();ctx.ellipse(0,0,p.r*1.05,p.r*.55,0,0,TAU);ctx.fill()}ctx.restore()}
function drawProp(p){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot||0);
 if(p.kind==='rock'){ctx.fillStyle='#282f2a';ctx.beginPath();ctx.ellipse(0,0,p.r,p.r*.72,0,0,TAU);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.055)';ctx.stroke();ctx.fillStyle='rgba(255,255,255,.025)';ctx.beginPath();ctx.ellipse(-p.r*.22,-p.r*.22,p.r*.45,p.r*.13,-.2,0,TAU);ctx.fill()}
 else if(p.kind==='bush'){ctx.fillStyle='#253627';for(let i=0;i<6;i++){const a=i/6*TAU;ctx.beginPath();ctx.ellipse(Math.cos(a)*p.r*.35,Math.sin(a)*p.r*.25,p.r*.65,p.r*.26,a,0,TAU);ctx.fill()}ctx.fillStyle='rgba(103,130,103,.09)';ctx.beginPath();ctx.arc(-p.r*.15,-p.r*.18,p.r*.35,0,TAU);ctx.fill()}
 else if(p.kind==='tree'){ctx.fillStyle='#1f281f';ctx.beginPath();ctx.arc(0,0,p.r,0,TAU);ctx.fill();ctx.fillStyle='#293629';for(let i=0;i<7;i++){const a=i/7*TAU;ctx.beginPath();ctx.arc(Math.cos(a)*p.r*.45,Math.sin(a)*p.r*.42,p.r*.58,0,TAU);ctx.fill()}ctx.fillStyle='#171d18';ctx.beginPath();ctx.arc(0,0,p.r*.2,0,TAU);ctx.fill()}
 else if(p.kind==='crate'){ctx.fillStyle='#4a4030';ctx.fillRect(-p.r,-p.r*.78,p.r*2,p.r*1.56);ctx.strokeStyle='#6a5940';ctx.lineWidth=2;ctx.strokeRect(-p.r,-p.r*.78,p.r*2,p.r*1.56);ctx.beginPath();ctx.moveTo(-p.r,-p.r*.78);ctx.lineTo(p.r,p.r*.78);ctx.moveTo(p.r,-p.r*.78);ctx.lineTo(-p.r,p.r*.78);ctx.stroke()}
 else if(p.kind==='barrel'){ctx.fillStyle='#3d473d';ctx.beginPath();ctx.ellipse(0,0,p.r*.7,p.r,0,0,TAU);ctx.fill();ctx.strokeStyle='#667066';ctx.beginPath();ctx.ellipse(0,-p.r*.55,p.r*.65,p.r*.18,0,0,TAU);ctx.stroke();ctx.beginPath();ctx.ellipse(0,p.r*.55,p.r*.65,p.r*.18,0,0,TAU);ctx.stroke()}
 else if(p.kind==='fence'){ctx.strokeStyle='#3a423c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-p.r,0);ctx.lineTo(p.r,0);ctx.stroke();ctx.lineWidth=2;for(let x=-p.r;x<=p.r;x+=10){ctx.beginPath();ctx.moveTo(x,-9);ctx.lineTo(x,9);ctx.stroke()}}
 else if(p.kind==='car'){const tint=p.tone<.33?'#403d35':p.tone<.66?'#343f3d':'#3e3535';ctx.fillStyle=tint;roundRect(ctx,-42,-19,84,38,7);ctx.fill();ctx.fillStyle='#18211d';roundRect(ctx,-20,-15,40,30,4);ctx.fill();ctx.fillStyle='rgba(130,155,143,.16)';ctx.fillRect(-17,-12,34,10);ctx.fillStyle='#171a18';ctx.fillRect(-36,-24,20,7);ctx.fillRect(16,-24,20,7);ctx.fillRect(-36,17,20,7);ctx.fillRect(16,17,20,7);ctx.fillStyle='#817b62';ctx.fillRect(35,-12,4,8);ctx.fillRect(35,4,4,8)}
 else if(p.kind==='lamp'){ctx.strokeStyle='#303b34';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,16);ctx.lineTo(0,-20);ctx.stroke();ctx.fillStyle='#617064';ctx.fillRect(-8,-25,16,8);ctx.fillStyle='#d6e3bd';ctx.globalAlpha=.6;ctx.fillRect(-5,-23,10,4)}
 else if(p.kind==='fire'){ctx.fillStyle='#2c2118';ctx.beginPath();ctx.arc(0,0,15,0,TAU);ctx.fill();const g=ctx.createRadialGradient(0,0,1,0,0,18);g.addColorStop(0,'#ffe5a3');g.addColorStop(.4,'#e88843');g.addColorStop(1,'rgba(116,43,22,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,18,0,TAU);ctx.fill()}
 ctx.restore();
}
function roundRect(c,x,y,w,h,r){c.beginPath();c.roundRect?c.roundRect(x,y,w,h,r):(c.rect(x,y,w,h));}
function drawPickup(p){ctx.save();ctx.translate(p.x,p.y);const pulse=1+Math.sin(p.pulse)*.08;ctx.scale(pulse,pulse);ctx.globalCompositeOperation='screen';const g=ctx.createRadialGradient(0,0,1,0,0,34);g.addColorStop(0,p.kind==='med'?'rgba(174,255,113,.22)':'rgba(255,206,108,.18)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,34,0,TAU);ctx.fill();ctx.globalCompositeOperation='source-over';ctx.fillStyle='#182119';ctx.strokeStyle=p.kind==='med'?'#b8ef6a':'#d0a958';ctx.lineWidth=1.5;if(p.kind==='med'){ctx.fillRect(-10,-8,20,16);ctx.strokeRect(-10,-8,20,16);ctx.fillStyle='#b8ef6a';ctx.fillRect(-2,-6,4,12);ctx.fillRect(-6,-2,12,4)}else{ctx.fillRect(-12,-7,24,14);ctx.strokeRect(-12,-7,24,14);ctx.fillStyle='#d0a958';ctx.fillRect(-7,-2,14,4)}ctx.restore()}
function drawPlayer(){
 const bob=player.walk?Math.sin(player.step)*1.7:0;ctx.save();ctx.translate(player.x,player.y+bob);ctx.rotate(player.angle);
 ctx.fillStyle='rgba(0,0,0,.38)';ctx.beginPath();ctx.ellipse(-7,12,31,17,0,0,TAU);ctx.fill();
 ctx.fillStyle='#252c28';ctx.fillRect(-16,8,11,20);ctx.fillRect(5,8,11,20);ctx.fillStyle='#141a16';ctx.fillRect(-18,23,14,8);ctx.fillRect(5,23,14,8);
 ctx.fillStyle='#39473d';roundRect(ctx,-17,-18,34,37,5);ctx.fill();ctx.fillStyle='#202823';ctx.fillRect(-20,-13,8,27);ctx.fillRect(12,-13,8,27);ctx.fillStyle='#566359';ctx.fillRect(-10,-11,20,18);ctx.fillStyle='#2a342e';ctx.fillRect(-8,-8,6,9);ctx.fillRect(2,-8,6,9);
 const gunLen=player.weapon==='shotgun'?48:player.weapon==='bow'?44:36;ctx.fillStyle=player.weapon==='bow'?'#6e5b3d':'#252d28';ctx.fillRect(7,-4,gunLen,8);if(player.weapon!=='bow'){ctx.fillStyle='#788078';ctx.fillRect(gunLen+2,-2,10,4)}else{ctx.strokeStyle='#a98a56';ctx.lineWidth=2;ctx.beginPath();ctx.arc(37,0,16,-1.3,1.3);ctx.stroke();ctx.strokeStyle='#b9c2b7';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(41,-15);ctx.lineTo(41,15);ctx.stroke()}
 ctx.rotate(-player.angle);ctx.save();ctx.beginPath();ctx.arc(0,-18,17,0,TAU);ctx.clip();if(faceImg)ctx.drawImage(faceImg,-18,-36,36,36);ctx.restore();ctx.strokeStyle='rgba(224,232,226,.28)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,-18,17.5,0,TAU);ctx.stroke();ctx.restore();
 ctx.save();ctx.translate(player.x,player.y);ctx.strokeStyle='rgba(196,255,103,.18)';ctx.beginPath();ctx.arc(0,0,29,0,TAU);ctx.stroke();ctx.restore();
}
function drawEnemy(e){
 ctx.save();ctx.translate(e.x,e.y);const a=Math.atan2(player.y-e.y,player.x-e.x);ctx.rotate(a);const step=Math.sin(e.phase)*(e.type==='runner'?4:2);
 ctx.fillStyle='rgba(0,0,0,.34)';ctx.beginPath();ctx.ellipse(-5,11,e.r*1.08,e.r*.58,0,0,TAU);ctx.fill();
 const body=e.type==='brute'?'#4d493b':e.cloth<.33?'#3e4840':e.cloth<.66?'#433b38':'#39413e';ctx.fillStyle=e.hit>0?'#72504b':body;roundRect(ctx,-e.r*.56,-e.r*.64,e.r*1.1,e.r*1.3,4);ctx.fill();
 ctx.fillStyle='#222a25';ctx.fillRect(-e.r*.72,-e.r*.3,e.r*.27,e.r*1.05);ctx.fillRect(e.r*.46,-e.r*.27,e.r*.27,e.r*1.02);
 ctx.fillStyle=e.skin<.33?'#7b8270':e.skin<.66?'#6b7569':'#7c7063';ctx.beginPath();ctx.arc(e.r*.14,-e.r*.78,e.r*.5,0,TAU);ctx.fill();
 ctx.fillStyle='#511b1d';ctx.fillRect(e.r*.38,-e.r*.88,4,3);ctx.fillStyle='rgba(30,10,10,.6)';ctx.fillRect(e.r*.22,-e.r*.62,e.r*.22,3);
 if(e.type==='runner'){ctx.fillStyle='#222a25';ctx.fillRect(-e.r*.3,e.r*.5,e.r*.24,e.r*.75+step);ctx.fillRect(e.r*.13,e.r*.5,e.r*.24,e.r*.75-step)}
 if(e.type==='brute'){ctx.strokeStyle='rgba(205,255,115,.28)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,e.r+4,0,TAU);ctx.stroke();ctx.fillStyle='#262b27';ctx.fillRect(-e.r*.8,-e.r*.35,e.r*.36,e.r*.9);ctx.fillRect(e.r*.48,-e.r*.35,e.r*.36,e.r*.9)}
 ctx.restore();if((e.type==='brute'||e.hp<e.maxHp*.55)&&e.hp>0){ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(e.x-22,e.y-e.r-14,44,4);ctx.fillStyle=e.type==='brute'?'#bdcf68':'#9fae9f';ctx.fillRect(e.x-22,e.y-e.r-14,44*(e.hp/e.maxHp),4)}
}
function drawShot(s){ctx.save();if(s.arrow){ctx.translate(s.x,s.y);ctx.rotate(s.angle);ctx.strokeStyle='#c6b78f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-18,0);ctx.lineTo(10,0);ctx.stroke();ctx.fillStyle='#e0dfd1';ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(5,-3);ctx.lineTo(5,3);ctx.closePath();ctx.fill()}else{ctx.globalCompositeOperation='screen';ctx.strokeStyle=s.color;ctx.lineWidth=1.3;ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(s.px,s.py);ctx.lineTo(s.x,s.y);ctx.stroke();ctx.fillStyle='#fff7d6';ctx.beginPath();ctx.arc(s.x,s.y,1.6,0,TAU);ctx.fill()}ctx.restore();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1}
function drawParticle(p){ctx.save();ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.translate(p.x,p.y);ctx.rotate(p.rot||0);if(p.type==='smoke'){ctx.fillStyle='rgba(122,134,124,.18)';ctx.beginPath();ctx.arc(0,0,p.size*(1+(1-p.life/p.max)*1.8),0,TAU);ctx.fill()}else if(p.type==='casing'){ctx.fillStyle='#b69853';ctx.fillRect(-3,-1,6,2)}else{ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(0,0,p.size,0,TAU);ctx.fill()}ctx.restore()}
function drawFloater(f){ctx.save();ctx.globalAlpha=clamp(f.life/f.max,0,1);ctx.fillStyle=f.color;ctx.font='700 11px ui-sans-serif,system-ui';ctx.textAlign='center';ctx.fillText(f.text,f.x,f.y);ctx.restore()}

function lighting(shx=0,shy=0){
 const px=player.x-camera.x+shx,py=player.y-camera.y+shy;
 lctx.setTransform(1,0,0,1,0,0);lctx.clearRect(0,0,lightCanvas.width,lightCanvas.height);lctx.setTransform(DPR,0,0,DPR,0,0);
 lctx.fillStyle='rgba(2,5,3,.59)';lctx.fillRect(0,0,W,H);lctx.globalCompositeOperation='destination-out';
 cutLight(lctx,px,py,Math.max(245,Math.min(W,H)*.43),.98);
 for(const l of lights){const x=l.x-camera.x+shx,y=l.y-camera.y+shy;if(x<-l.r||y<-l.r||x>W+l.r||y>H+l.r)continue;const flick=1+Math.sin(performance.now()*.003+l.flick)*.04;cutLight(lctx,x,y,l.r*flick,l.a*3.6)}
 lctx.globalCompositeOperation='source-over';ctx.drawImage(lightCanvas,0,0,W,H);
 ctx.save();ctx.globalCompositeOperation='screen';for(const l of lights){const x=l.x-camera.x+shx,y=l.y-camera.y+shy;if(x<-l.r||y<-l.r||x>W+l.r||y>H+l.r)continue;const g=ctx.createRadialGradient(x,y,0,x,y,l.r*.55);g.addColorStop(0,'rgba(210,224,166,.07)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-l.r,y-l.r,l.r*2,l.r*2)}
 if(player.muzzle>0){const mx=px+Math.cos(player.angle)*55,my=py+Math.sin(player.angle)*55,r=80*player.muzzle;const g=ctx.createRadialGradient(mx,my,0,mx,my,r);g.addColorStop(0,'rgba(255,226,143,.55)');g.addColorStop(.25,'rgba(255,162,72,.18)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(mx-r,my-r,r*2,r*2);ctx.fillStyle='rgba(255,226,160,.48)';ctx.beginPath();ctx.moveTo(px+Math.cos(player.angle)*38,py+Math.sin(player.angle)*38);ctx.lineTo(px+Math.cos(player.angle+.18)*95,py+Math.sin(player.angle+.18)*95);ctx.lineTo(px+Math.cos(player.angle-.18)*95,py+Math.sin(player.angle-.18)*95);ctx.closePath();ctx.fill()}
 ctx.restore();
}
function cutLight(c,x,y,r,strength){const g=c.createRadialGradient(x,y,10,x,y,r);g.addColorStop(0,`rgba(0,0,0,${strength})`);g.addColorStop(.55,`rgba(0,0,0,${strength*.72})`);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}
function drawFog(){ctx.save();ctx.globalCompositeOperation='screen';for(const f of fog){const g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r);g.addColorStop(0,`rgba(130,150,136,${f.a})`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(f.x-f.r,f.y-f.r,f.r*2,f.r*2)}ctx.restore()}
function drawRain(){ctx.save();ctx.strokeStyle='#c7d3cc';ctx.lineWidth=.7;for(const r of rain){ctx.globalAlpha=r.a;ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(r.x-r.l*.18,r.y+r.l);ctx.stroke()}ctx.restore();ctx.globalAlpha=1}
function screenFX(){
 const v=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.18,W/2,H/2,Math.max(W,H)*.72);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(.7,'rgba(0,0,0,.12)');v.addColorStop(1,'rgba(0,0,0,.62)');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
 ctx.fillStyle='rgba(15,40,25,.045)';ctx.fillRect(0,0,W,H);
 if(player.hitFlash>0){ctx.fillStyle=`rgba(150,18,20,${.18*player.hitFlash/.16})`;ctx.fillRect(0,0,W,H)}
 if(player.hp<35){const a=(35-player.hp)/35*.23;const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.25,W/2,H/2,Math.max(W,H)*.72);g.addColorStop(0,'rgba(100,0,0,0)');g.addColorStop(1,`rgba(118,10,14,${a})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
 if(storm.flash>0){ctx.fillStyle=`rgba(186,205,193,${storm.flash*.18})`;ctx.fillRect(0,0,W,H)}
}
function crosshair(){ctx.save();ctx.translate(mouse.x,mouse.y);ctx.strokeStyle='rgba(231,238,232,.78)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,8,0,TAU);ctx.moveTo(-15,0);ctx.lineTo(-7,0);ctx.moveTo(7,0);ctx.lineTo(15,0);ctx.moveTo(0,-15);ctx.lineTo(0,-7);ctx.moveTo(0,7);ctx.lineTo(0,15);ctx.stroke();ctx.fillStyle='rgba(196,255,103,.65)';ctx.beginPath();ctx.arc(0,0,1.4,0,TAU);ctx.fill();ctx.restore()}

addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys.add(k);if(k==='1')selectWeapon('pistol');if(k==='2')selectWeapon('shotgun');if(k==='3')selectWeapon('bow');if(k==='r')reload()});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));canvas.addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;mouse.moved=true});canvas.addEventListener('mousedown',e=>{if(e.button===0)mouse.down=true;audio.unlock()});addEventListener('mouseup',e=>{if(e.button===0)mouse.down=false});canvas.oncontextmenu=e=>e.preventDefault();

const joy=$('#joy'),stick=$('#stick');let joyId=null;
function joyMove(t){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=r.width*.32;let dx=t.clientX-cx,dy=t.clientY-cy,m=Math.hypot(dx,dy);if(m>max){dx=dx/m*max;dy=dy/m*max}stick.style.transform=`translate(${dx}px,${dy}px)`;moveTouch.x=dx/max;moveTouch.y=dy/max}
joy.addEventListener('touchstart',e=>{joyId=e.changedTouches[0].identifier;joyMove(e.changedTouches[0]);e.preventDefault()},{passive:false});joy.addEventListener('touchmove',e=>{for(const t of e.changedTouches)if(t.identifier===joyId)joyMove(t);e.preventDefault()},{passive:false});joy.addEventListener('touchend',e=>{for(const t of e.changedTouches)if(t.identifier===joyId){joyId=null;moveTouch.x=moveTouch.y=0;stick.style.transform='translate(0,0)'}e.preventDefault()},{passive:false});
$('#fire').addEventListener('touchstart',e=>{mouse.down=true;autoAim();audio.unlock();e.preventDefault()},{passive:false});$('#fire').addEventListener('touchend',e=>{mouse.down=false;e.preventDefault()},{passive:false});$('#reload').onclick=reload;$('#swap').onclick=()=>{if(!player)return;const ids=['pistol','shotgun','bow'];selectWeapon(ids[(ids.indexOf(player.weapon)+1)%ids.length])};

function audioSystem(){let ac,master;
 function unlock(){if(!ac){ac=new (window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=.13;master.connect(ac.destination)}if(ac.state==='suspended')ac.resume()}
 function tone(f,d,type='square',vol=.15,end=f,delay=0){if(!ac)return;const o=ac.createOscillator(),g=ac.createGain(),st=ac.currentTime+delay;o.type=type;o.frequency.setValueAtTime(f,st);o.frequency.exponentialRampToValueAtTime(Math.max(30,end),st+d);g.gain.setValueAtTime(.001,ac.currentTime);g.gain.setValueAtTime(vol,st);g.gain.exponentialRampToValueAtTime(.001,st+d);o.connect(g);g.connect(master);o.start(st);o.stop(st+d+.02)}
 function noise(d=.08,v=.16,delay=0){if(!ac)return;const n=Math.floor(ac.sampleRate*d),b=ac.createBuffer(1,n,ac.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);const s=ac.createBufferSource(),g=ac.createGain();s.buffer=b;g.gain.value=v;s.connect(g);g.connect(master);s.start(ac.currentTime+delay)}
 return{unlock,shot(id){if(id==='pistol'){noise(.055,.2);tone(145,.065,'square',.08,55)}else if(id==='shotgun'){noise(.16,.27);tone(92,.13,'sawtooth',.11,40);noise(.06,.08,.08)}else{tone(520,.055,'triangle',.05,210);tone(180,.06,'sine',.025,90,.045)}},reload(){tone(620,.035,'square',.02,430);tone(880,.04,'square',.018,610,.09)},empty(){tone(160,.03,'square',.02,110)},hurt(){tone(75,.15,'sawtooth',.05,42)},down(){tone(105,.13,'sawtooth',.032,48)},wave(){tone(390,.08,'sine',.045,560);tone(610,.12,'sine',.035,800,.09)},over(){tone(140,.55,'sawtooth',.055,58)},pickup(){tone(480,.05,'sine',.035,680);tone(760,.07,'sine',.03,980,.06)},swap(){tone(320,.025,'square',.015,240)},thunder(){noise(.55,.05);tone(58,.65,'sine',.035,32)}}
}
const audio=audioSystem();
function loop(now){const dt=Math.min(.035,(now-last)/1000||0);last=now;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
})();
