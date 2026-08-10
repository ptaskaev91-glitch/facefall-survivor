import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const rnd=(a,b)=>a+Math.random()*(b-a);
const TAU=Math.PI*2;
const isTouch=matchMedia('(hover:none),(pointer:coarse)').matches;

const ui={
  stage:$('#stage'),start:$('#start'),over:$('#over'),hud:$('#hud'),touch:$('#touch'),preview:$('#preview'),plus:$('#plus'),portrait:$('#portrait'),
  hp:$('#hp'),hpFill:$('#hpFill'),wave:$('#wave'),kills:$('#kills'),score:$('#score'),ammo:$('#ammo'),reserve:$('#reserve'),weaponName:$('#weaponName'),
  cameraLabel:$('#cameraLabel'),toast:$('#toast'),danger:$('#danger'),waveBanner:$('#waveBanner')
};

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x050806);
scene.fog=new THREE.FogExp2(0x07100b,isTouch?0.023:0.019);

const camera=new THREE.PerspectiveCamera(isTouch?64:58,innerWidth/innerHeight,.1,260);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,isTouch?1.45:1.8));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.92;
renderer.outputColorSpace=THREE.SRGBColorSpace;
ui.stage.appendChild(renderer.domElement);
renderer.domElement.tabIndex=0;

const clock=new THREE.Clock();
const keys=new Set();
const pointer=new THREE.Vector2();
const raycaster=new THREE.Raycaster();
const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const hitPoint=new THREE.Vector3();
const tmpV=new THREE.Vector3(),tmpM=new THREE.Matrix4(),tmpQ=new THREE.Quaternion(),tmpS=new THREE.Vector3();

let running=false,gameOver=false,cameraMode='top',selectedCamera='top',player=null,faceTexture=null;
let enemies=[],shots=[],pickups=[],effects=[],bloodDecals=[],obstacles=[];
let wave=1,kills=0,score=0,spawnLeft=0,spawnTimer=0,nextWave=1.5;
let moveTouch={x:0,y:0},joyId=null,fireHeld=false,toastTimer=0,bannerTimer=0;
let recoil=0,screenShake=0;

const WEAPONS={
  pistol:{name:'PISTOL',mag:12,reserve:84,damage:38,rate:.20,speed:54,spread:.012,pellets:1,reload:.9,recoil:.08,color:0xffe2a2},
  shotgun:{name:'SHOTGUN',mag:6,reserve:32,damage:24,rate:.72,speed:48,spread:.12,pellets:7,reload:1.3,recoil:.18,color:0xffc789},
  bow:{name:'BOW',mag:1,reserve:34,damage:112,rate:.78,speed:36,spread:.005,pellets:1,reload:.46,recoil:.035,color:0xd7edb8,arrow:true}
};

function noiseTexture(kind,size=256){
  const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');
  const base=kind==='grass'?[27,43,27]:kind==='dirt'?[58,49,38]:kind==='asphalt'?[31,35,33]:[55,58,52];
  x.fillStyle=`rgb(${base[0]},${base[1]},${base[2]})`;x.fillRect(0,0,size,size);
  const img=x.getImageData(0,0,size,size),d=img.data;
  for(let i=0;i<d.length;i+=4){const n=rnd(-18,18);d[i]=clamp(base[0]+n,0,255);d[i+1]=clamp(base[1]+n*(kind==='grass'?1.15:.85),0,255);d[i+2]=clamp(base[2]+n*.7,0,255)}
  x.putImageData(img,0,0);
  if(kind==='grass'){
    for(let i=0;i<1100;i++){x.strokeStyle=`rgba(${40+rnd(0,30)},${65+rnd(0,40)},${36+rnd(0,24)},${rnd(.12,.28)})`;x.lineWidth=rnd(.35,1);const px=rnd(0,size),py=rnd(0,size);x.beginPath();x.moveTo(px,py);x.lineTo(px+rnd(-2,2),py-rnd(2,7));x.stroke()}
  }else if(kind==='dirt'){
    for(let i=0;i<260;i++){x.fillStyle=`rgba(20,18,15,${rnd(.04,.13)})`;x.beginPath();x.ellipse(rnd(0,size),rnd(0,size),rnd(1,5),rnd(.5,2),rnd(0,TAU),0,TAU);x.fill()}
  }else if(kind==='asphalt'){
    for(let i=0;i<420;i++){const v=Math.random()>.5?150:5;x.fillStyle=`rgba(${v},${v},${v},${rnd(.025,.08)})`;x.fillRect(rnd(0,size),rnd(0,size),rnd(.4,2),rnd(.4,2))}
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;
}
const texGrass=noiseTexture('grass'),texDirt=noiseTexture('dirt'),texAsphalt=noiseTexture('asphalt');
texGrass.repeat.set(28,28);texDirt.repeat.set(10,10);texAsphalt.repeat.set(9,3);

const hemi=new THREE.HemisphereLight(0xb7c8bb,0x10140f,.85);scene.add(hemi);
const moon=new THREE.DirectionalLight(0xbfd5c8,1.15);moon.position.set(-28,42,-14);moon.castShadow=true;moon.shadow.mapSize.set(isTouch?1024:2048,isTouch?1024:2048);moon.shadow.camera.left=-55;moon.shadow.camera.right=55;moon.shadow.camera.top=55;moon.shadow.camera.bottom=-55;scene.add(moon);
const rim=new THREE.DirectionalLight(0x577b61,.45);rim.position.set(25,12,30);scene.add(rim);

const world=new THREE.Group();scene.add(world);
const dynamic=new THREE.Group();scene.add(dynamic);

function addGround(){
  const groundMat=new THREE.MeshStandardMaterial({map:texGrass,color:0x9caa91,roughness:1,metalness:0});
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(220,220),groundMat);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;world.add(ground);

  const dirtMat=new THREE.MeshStandardMaterial({map:texDirt,color:0xa29478,roughness:1});
  for(let i=0;i<18;i++){
    const r=rnd(3,10),m=new THREE.Mesh(new THREE.CircleGeometry(r,28),dirtMat.clone());m.material.opacity=rnd(.42,.72);m.material.transparent=true;m.rotation.x=-Math.PI/2;m.position.set(rnd(-98,98),.012,rnd(-98,98));m.scale.y=rnd(.45,1);world.add(m);
  }

  const roadMat=new THREE.MeshStandardMaterial({map:texAsphalt,color:0x8b918c,roughness:.78,metalness:.06});
  const road=new THREE.Mesh(new THREE.PlaneGeometry(150,15),roadMat);road.rotation.x=-Math.PI/2;road.rotation.z=-.17;road.position.y=.018;road.receiveShadow=true;world.add(road);
  const lineMat=new THREE.MeshBasicMaterial({color:0xa6a790,transparent:true,opacity:.32});
  for(let x=-65;x<68;x+=11){const line=new THREE.Mesh(new THREE.PlaneGeometry(5,.16),lineMat);line.rotation.x=-Math.PI/2;line.rotation.z=-.17;line.position.set(x*Math.cos(.17),.026,-x*Math.sin(.17));world.add(line)}

  const puddleMat=new THREE.MeshPhysicalMaterial({color:0x6f8580,roughness:.18,metalness:.25,transparent:true,opacity:.34,clearcoat:1,clearcoatRoughness:.16});
  for(let i=0;i<26;i++){const p=new THREE.Mesh(new THREE.CircleGeometry(rnd(.8,3.6),24),puddleMat.clone());p.rotation.x=-Math.PI/2;p.position.set(rnd(-90,90),.035,rnd(-90,90));p.scale.y=rnd(.35,.8);world.add(p)}
}

function addGrass(){
  const count=isTouch?850:1900;
  const geo=new THREE.ConeGeometry(.045,.62,3,1);geo.translate(0,.31,0);
  const mat=new THREE.MeshStandardMaterial({color:0x496b3d,roughness:1,vertexColors:true});
  const mesh=new THREE.InstancedMesh(geo,mat,count);mesh.castShadow=false;mesh.receiveShadow=true;
  const color=new THREE.Color();let placed=0;
  while(placed<count){const x=rnd(-102,102),z=rnd(-102,102);const roadDist=Math.abs(z+.17*x);if(roadDist<9&&Math.random()<.96)continue;tmpQ.setFromAxisAngle(new THREE.Vector3(0,1,0),rnd(0,TAU));tmpS.set(rnd(.7,1.5),rnd(.65,1.55),rnd(.7,1.5));tmpM.compose(tmpV.set(x,.02,z),tmpQ,tmpS);mesh.setMatrixAt(placed,tmpM);color.setHSL(rnd(.25,.34),rnd(.26,.48),rnd(.18,.34));mesh.setColorAt(placed,color);placed++}
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;world.add(mesh);
}

function tree(x,z,s=1){
  const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.23,.34,3.6,7),new THREE.MeshStandardMaterial({color:0x3f3328,roughness:1}));trunk.position.y=1.8;trunk.castShadow=true;g.add(trunk);
  const crownMat=new THREE.MeshStandardMaterial({color:0x203c25,roughness:1});
  for(const [ox,oy,oz,sc] of [[0,4,0,1.4],[-.7,3.6,.2,1],[.65,3.55,.1,1.05],[.1,3.7,-.7,.9]]){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.25,1),crownMat);crown.position.set(ox,oy,oz);crown.scale.setScalar(sc);crown.castShadow=true;g.add(crown)}
  world.add(g);obstacles.push({x,z,r:1.25*s});
}
function rock(x,z,s=1){const m=new THREE.Mesh(new THREE.DodecahedronGeometry(.65*s,0),new THREE.MeshStandardMaterial({color:0x4d5550,roughness:.95}));m.position.set(x,.38*s,z);m.scale.y=.65;m.rotation.set(rnd(0,1),rnd(0,TAU),rnd(0,.4));m.castShadow=true;m.receiveShadow=true;world.add(m);obstacles.push({x,z,r:.6*s})}
function crate(x,z,r=0){const m=new THREE.Mesh(new THREE.BoxGeometry(1.3,1.15,1.3),new THREE.MeshStandardMaterial({color:0x6b5438,roughness:.9}));m.position.set(x,.58,z);m.rotation.y=r;m.castShadow=true;m.receiveShadow=true;world.add(m);obstacles.push({x,z,r:.85})}
function car(x,z,rot=0){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;
  const body=new THREE.Mesh(new THREE.BoxGeometry(3.3,.75,1.7),new THREE.MeshStandardMaterial({color:Math.random()>.5?0x33443c:0x4a3c37,roughness:.68,metalness:.25}));body.position.y=.65;body.castShadow=true;body.receiveShadow=true;g.add(body);
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.7,.72,1.5),new THREE.MeshStandardMaterial({color:0x18211d,roughness:.28,metalness:.3}));cabin.position.set(-.2,1.32,0);cabin.castShadow=true;g.add(cabin);
  const wheelMat=new THREE.MeshStandardMaterial({color:0x111312,roughness:1});for(const wx of [-1.05,1.05])for(const wz of [-.86,.86]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.22,12),wheelMat);w.rotation.x=Math.PI/2;w.position.set(wx,.35,wz);g.add(w)}
  world.add(g);obstacles.push({x,z,r:2.1});
}
function lamp(x,z){
  const g=new THREE.Group();g.position.set(x,0,z);const pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,5.4,8),new THREE.MeshStandardMaterial({color:0x2e3431,metalness:.65,roughness:.5}));pole.position.y=2.7;g.add(pole);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.65,.16,.28),new THREE.MeshStandardMaterial({color:0x989d89,emissive:0x9fbb76,emissiveIntensity:1.6}));head.position.set(.24,5.35,0);g.add(head);
  const light=new THREE.PointLight(0xc6db91,8,14,2);light.position.set(.2,5.1,0);g.add(light);world.add(g);
}
function addProps(){
  for(let i=0;i<34;i++){let x=rnd(-98,98),z=rnd(-98,98);if(Math.abs(z+.17*x)<10){i--;continue}tree(x,z,rnd(.65,1.25))}
  for(let i=0;i<65;i++){let x=rnd(-100,100),z=rnd(-100,100);if(Math.abs(z+.17*x)<9&&Math.random()<.8){i--;continue}rock(x,z,rnd(.55,1.25))}
  for(let i=0;i<18;i++)crate(rnd(-85,85),rnd(-85,85),rnd(0,TAU));
  for(let i=-3;i<=3;i++){const x=i*18;const z=-.17*x+(i%2?5.6:-5.8);car(x,z,-.17+(i%2?0:Math.PI)+rnd(-.12,.12))}
  for(let i=-2;i<=2;i++)lamp(i*28,-.17*(i*28)+8.5);
}

function createRain(){
  const n=isTouch?360:720;const pos=new Float32Array(n*3);for(let i=0;i<n;i++){pos[i*3]=rnd(-70,70);pos[i*3+1]=rnd(1,35);pos[i*3+2]=rnd(-70,70)}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const mat=new THREE.PointsMaterial({color:0xa8c1b8,size:.045,transparent:true,opacity:.4,depthWrite:false});const pts=new THREE.Points(geo,mat);scene.add(pts);return pts;
}
let rainSystem;
function buildWorld(){addGround();addGrass();addProps();rainSystem=createRain()}
buildWorld();

const bodyMat=new THREE.MeshStandardMaterial({color:0x34453b,roughness:.72});
const clothDark=new THREE.MeshStandardMaterial({color:0x18211d,roughness:.86});
const skinMat=new THREE.MeshStandardMaterial({color:0xb1a48d,roughness:.78});

function makeHumanoid({zombie=false,brute=false,runner=false}={}){
  const g=new THREE.Group();g.userData.parts={};
  const body=new THREE.Mesh(new THREE.BoxGeometry(brute?1.25:.9,brute?1.6:1.35,brute?.62:.48),zombie?new THREE.MeshStandardMaterial({color:brute?0x4e4d36:runner?0x475341:0x48534a,roughness:.92}):bodyMat);body.position.y=1.55;body.castShadow=true;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(brute?.48:.38,12,8),zombie?new THREE.MeshStandardMaterial({color:brute?0x87906b:0x778474,roughness:.92}):skinMat);head.position.y=2.65;head.castShadow=true;g.add(head);g.userData.head=head;
  const limbMat=zombie?new THREE.MeshStandardMaterial({color:0x3e483f,roughness:1}):clothDark;
  for(const side of [-1,1]){
    const arm=new THREE.Mesh(new THREE.BoxGeometry(.22,1.1,.24),limbMat);arm.position.set(side*(brute?.78:.58),1.5,.05);arm.castShadow=true;g.add(arm);g.userData.parts[`arm${side}`]=arm;
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.28,1.2,.34),limbMat);leg.position.set(side*.25,.55,0);leg.castShadow=true;g.add(leg);g.userData.parts[`leg${side}`]=leg;
  }
  if(!zombie){
    const gun=new THREE.Mesh(new THREE.BoxGeometry(.15,.15,1.05),new THREE.MeshStandardMaterial({color:0x252c28,metalness:.6,roughness:.4}));gun.position.set(.42,1.78,.7);gun.castShadow=true;g.add(gun);g.userData.weapon=gun;
    const faceMat=new THREE.MeshBasicMaterial({color:0xd7d7d7,transparent:true});const face=new THREE.Mesh(new THREE.PlaneGeometry(.54,.62),faceMat);face.position.set(0,2.67,.382);g.add(face);g.userData.face=face;
    const muzzle=new THREE.PointLight(0xffd27b,0,8,2);muzzle.position.set(.42,1.78,1.25);g.add(muzzle);g.userData.muzzle=muzzle;
  }
  g.userData.phase=rnd(0,TAU);return g;
}

function setFaceTexture(src){
  ui.preview.src=src;ui.preview.style.display='block';ui.plus.style.display='none';ui.portrait.src=src;
  new THREE.TextureLoader().load(src,t=>{t.colorSpace=THREE.SRGBColorSpace;faceTexture=t;if(player?.mesh?.userData.face){player.mesh.userData.face.material.map=t;player.mesh.userData.face.material.color.set(0xffffff);player.mesh.userData.face.material.needsUpdate=true}});
}
function neutralFace(){const c=document.createElement('canvas');c.width=c.height=220;const x=c.getContext('2d');const gr=x.createRadialGradient(110,70,12,110,110,120);gr.addColorStop(0,'#c4cbbf');gr.addColorStop(1,'#525c54');x.fillStyle=gr;x.fillRect(0,0,220,220);x.fillStyle='#2a322c';x.beginPath();x.arc(110,112,72,0,TAU);x.fill();x.fillStyle='#aab3a8';x.beginPath();x.arc(110,92,45,0,TAU);x.fill();x.fillStyle='#29312b';x.fillRect(78,84,18,6);x.fillRect(124,84,18,6);x.fillRect(96,126,29,6);return c.toDataURL('image/jpeg',.84)}
setFaceTexture(localStorage.getItem('facefall-face')||neutralFace());
$('#face').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=c.height=360;const x=c.getContext('2d'),s=Math.max(360/im.width,360/im.height),w=im.width*s,h=im.height*s;x.drawImage(im,(360-w)/2,(360-h)/2,w,h);const data=c.toDataURL('image/jpeg',.86);try{localStorage.setItem('facefall-face',data)}catch{}setFaceTexture(data);toast('ЛИЦО ГОТОВО')};im.src=r.result};r.readAsDataURL(f)});

function newPlayer(){
  const mesh=makeHumanoid();mesh.position.set(0,0,0);mesh.userData.face.material.map=faceTexture;mesh.userData.face.material.color.set(faceTexture?0xffffff:0xd7d7d7);mesh.userData.face.material.needsUpdate=true;dynamic.add(mesh);
  return {mesh,x:0,z:0,yaw:0,hp:100,maxHp:100,speed:8.3,weapon:'pistol',cool:0,reloading:0,walk:0,muzzle:0,ammo:{pistol:{mag:12,reserve:84},shotgun:{mag:6,reserve:32},bow:{mag:1,reserve:34}}};
}

function enemyData(type){if(type==='runner')return{hp:58+wave*4,speed:5.4+wave*.08,damage:10,scale:.86};if(type==='brute')return{hp:210+wave*14,speed:2.35+wave*.045,damage:26,scale:1.25};return{hp:78+wave*6,speed:3.05+wave*.055,damage:14,scale:1}}
function spawnEnemy(){
  const a=rnd(0,TAU),d=rnd(42,58),x=player.x+Math.sin(a)*d,z=player.z+Math.cos(a)*d;const r=Math.random();let type='walker';if(wave>=2&&r<Math.min(.28,.08+wave*.018))type='runner';if(wave>=3&&r>.91)type='brute';const dat=enemyData(type);const mesh=makeHumanoid({zombie:true,runner:type==='runner',brute:type==='brute'});mesh.scale.setScalar(dat.scale);mesh.position.set(x,0,z);dynamic.add(mesh);enemies.push({mesh,x,z,type,hp:dat.hp,maxHp:dat.hp,speed:dat.speed,damage:dat.damage,attack:0,hit:0,phase:rnd(0,TAU),r:type==='brute'?1.2:.7});
}

function makePickup(kind,x,z){const g=new THREE.Group();const mat=new THREE.MeshStandardMaterial({color:kind==='med'?0xb9ff65:0xffc768,emissive:kind==='med'?0x355a18:0x5c3512,emissiveIntensity:1.1,roughness:.45});const core=new THREE.Mesh(kind==='med'?new THREE.BoxGeometry(.7,.26,.7):new THREE.CylinderGeometry(.28,.28,.75,8),mat);core.position.y=.5;core.rotation.z=kind==='ammo'?Math.PI/2:0;g.add(core);const glow=new THREE.PointLight(kind==='med'?0xb9ff65:0xffb65c,2.2,5);glow.position.y=.55;g.add(glow);g.position.set(x,0,z);dynamic.add(g);pickups.push({mesh:g,kind,x,z,life:20,p:0})}

function resetGame(){
  for(const e of enemies)dynamic.remove(e.mesh);for(const s of shots)dynamic.remove(s.mesh);for(const p of pickups)dynamic.remove(p.mesh);for(const e of effects)dynamic.remove(e.mesh);for(const d of bloodDecals)dynamic.remove(d);
  if(player)dynamic.remove(player.mesh);enemies=[];shots=[];pickups=[];effects=[];bloodDecals=[];wave=1;kills=0;score=0;spawnLeft=0;spawnTimer=0;nextWave=1.2;gameOver=false;player=newPlayer();updateHud();
}

function toast(text){clearTimeout(toastTimer);ui.toast.textContent=text;ui.toast.classList.remove('hidden');toastTimer=setTimeout(()=>ui.toast.classList.add('hidden'),1200)}
function banner(n){clearTimeout(bannerTimer);ui.waveBanner.querySelector('b').textContent=n;ui.waveBanner.classList.remove('hidden');bannerTimer=setTimeout(()=>ui.waveBanner.classList.add('hidden'),1450)}
function beginWave(){spawnLeft=5+wave*3+Math.floor(wave*.65);spawnTimer=.15;banner(wave)}
function selectWeapon(id){if(!player||!WEAPONS[id])return;player.weapon=id;player.reloading=0;$$('.slots button').forEach(b=>b.classList.toggle('active',b.dataset.w===id));updateHud();toast(WEAPONS[id].name)}
function reload(){if(!running||!player)return;const w=WEAPONS[player.weapon],a=player.ammo[player.weapon];if(player.reloading>0||a.mag>=w.mag||a.reserve<=0)return;player.reloading=w.reload;toast('RELOADING')}
function finishReload(){const w=WEAPONS[player.weapon],a=player.ammo[player.weapon],need=w.mag-a.mag,take=Math.min(need,a.reserve);a.mag+=take;a.reserve-=take;updateHud()}

function nearestEnemy(max=38){let best=null,bd=max;for(const e of enemies){const d=Math.hypot(e.x-player.x,e.z-player.z);if(d<bd){bd=d;best=e}}return best}
function autoAim(){const e=nearestEnemy(42);if(!e)return false;player.yaw=Math.atan2(e.x-player.x,e.z-player.z);return true}
function shoot(){
  if(!running||gameOver)return;const w=WEAPONS[player.weapon],a=player.ammo[player.weapon];if(player.cool>0||player.reloading>0)return;if(isTouch)autoAim();if(a.mag<=0){reload();return}a.mag--;player.cool=w.rate;player.muzzle=w.arrow?0:.07;recoil=Math.min(.35,recoil+w.recoil);screenShake=Math.min(.22,screenShake+w.recoil*.8);
  const forward=new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw));
  for(let i=0;i<w.pellets;i++){const ang=player.yaw+rnd(-w.spread,w.spread),dir=new THREE.Vector3(Math.sin(ang),0,Math.cos(ang));const mesh=new THREE.Mesh(w.arrow?new THREE.CylinderGeometry(.025,.025,.8,5):new THREE.SphereGeometry(.045,5,4),new THREE.MeshBasicMaterial({color:w.color}));if(w.arrow){mesh.rotation.x=Math.PI/2;mesh.rotation.y=ang}mesh.position.copy(player.mesh.position).add(new THREE.Vector3(0,1.75,0)).addScaledVector(forward,1.15);dynamic.add(mesh);shots.push({mesh,dir,speed:w.speed,damage:w.damage,life:w.arrow?2.2:1.2,arrow:!!w.arrow})}
  player.mesh.userData.muzzle.intensity=w.arrow?0:16;spawnSparks(player.mesh.position.clone().add(new THREE.Vector3(forward.x*1.2,1.75,forward.z*1.2)),w.arrow?0:5);updateHud();
}

function spawnSparks(pos,n=5){for(let i=0;i<n;i++){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.025,4,3),new THREE.MeshBasicMaterial({color:0xffd386}));mesh.position.copy(pos);dynamic.add(mesh);effects.push({mesh,vel:new THREE.Vector3(rnd(-2,2),rnd(.5,2.8),rnd(-2,2)),life:rnd(.12,.28),max:.28})}}
function bloodAt(x,z){const mat=new THREE.MeshBasicMaterial({color:0x541013,transparent:true,opacity:rnd(.45,.7),depthWrite:false});const m=new THREE.Mesh(new THREE.CircleGeometry(rnd(.25,.7),16),mat);m.rotation.x=-Math.PI/2;m.position.set(x,.045,z);m.scale.y=rnd(.45,.9);m.rotation.z=rnd(0,TAU);dynamic.add(m);bloodDecals.push(m);if(bloodDecals.length>80){const old=bloodDecals.shift();dynamic.remove(old)}}
function hitEnemy(e,damage){e.hp-=damage;e.hit=.1;bloodAt(e.x+rnd(-.3,.3),e.z+rnd(-.3,.3));spawnSparks(new THREE.Vector3(e.x,1.4,e.z),2);if(e.hp<=0){kills++;score+=e.type==='brute'?300:e.type==='runner'?140:100;dynamic.remove(e.mesh);enemies.splice(enemies.indexOf(e),1);if(Math.random()<.12)makePickup(Math.random()<.45?'med':'ammo',e.x,e.z)}}

function obstacleResolve(nx,nz,r=.55){let x=clamp(nx,-104,104),z=clamp(nz,-104,104);for(const o of obstacles){const dx=x-o.x,dz=z-o.z,d=Math.hypot(dx,dz),min=o.r+r;if(d<min&&d>.001){x=o.x+dx/d*min;z=o.z+dz/d*min}}return{x,z}}

function updateInput(dt){
  let mx=(keys.has('d')?1:0)-(keys.has('a')?1:0)+moveTouch.x,mz=(keys.has('w')?1:0)-(keys.has('s')?1:0)-moveTouch.y;let len=Math.hypot(mx,mz);if(len>1){mx/=len;mz/=len}
  let vx=0,vz=0;
  if(cameraMode==='third'){
    const fX=Math.sin(player.yaw),fZ=Math.cos(player.yaw),rX=Math.cos(player.yaw),rZ=-Math.sin(player.yaw);vx=fX*mz+rX*mx;vz=fZ*mz+rZ*mx;
  }else{vx=mx;vz=mz}
  if(Math.hypot(vx,vz)>.05){const n=obstacleResolve(player.x+vx*player.speed*dt,player.z+vz*player.speed*dt);player.x=n.x;player.z=n.z;player.walk+=dt*9}else player.walk=lerp(player.walk,0,dt*8);
  player.mesh.position.set(player.x,0,player.z);

  if(cameraMode==='top'&&!isTouch){raycaster.setFromCamera(pointer,camera);if(raycaster.ray.intersectPlane(groundPlane,hitPoint))player.yaw=Math.atan2(hitPoint.x-player.x,hitPoint.z-player.z)}
  if(isTouch&&fireHeld)autoAim();
  player.mesh.rotation.y=player.yaw;
  const swing=Math.sin(player.walk)*.55;const p=player.mesh.userData.parts;if(p['leg-1']){p['leg-1'].rotation.x=swing;p['leg1'].rotation.x=-swing;p['arm-1'].rotation.x=-swing*.65;p['arm1'].rotation.x=swing*.65}
}

function updateEnemies(dt){
  let closest=999;
  for(let i=enemies.length-1;i>=0;i--){const e=enemies[i],dx=player.x-e.x,dz=player.z-e.z,d=Math.hypot(dx,dz)||1;closest=Math.min(closest,d);e.attack=Math.max(0,e.attack-dt);e.hit=Math.max(0,e.hit-dt);e.phase+=dt*(e.type==='runner'?9:5.5);e.mesh.position.y=e.type==='runner'?Math.abs(Math.sin(e.phase))*0.04:0;e.mesh.rotation.y=Math.atan2(dx,dz);if(d>1.2+e.r){e.x+=dx/d*e.speed*dt;e.z+=dz/d*e.speed*dt}else if(e.attack<=0){e.attack=e.type==='runner'?.58:.82;player.hp-=e.damage;screenShake=.2;ui.hp.textContent=Math.max(0,Math.ceil(player.hp));ui.hpFill.style.width=clamp(player.hp,0,100)+'%';if(player.hp<=0){endGame();return}}
    e.mesh.position.x=e.x;e.mesh.position.z=e.z;const swing=Math.sin(e.phase)*(e.type==='runner'?.85:.48),p=e.mesh.userData.parts;if(p['leg-1']){p['leg-1'].rotation.x=swing;p['leg1'].rotation.x=-swing;p['arm-1'].rotation.x=-swing*.7;p['arm1'].rotation.x=swing*.7}e.mesh.traverse(o=>{if(o.material&&o.isMesh&&o!==e.mesh.userData.head)o.material.emissive?.setHex(e.hit>0?0x4a0909:0x000000)})}
  ui.danger.classList.toggle('hidden',closest>8);
}

function updateShots(dt){for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.life-=dt;s.mesh.position.addScaledVector(s.dir,s.speed*dt);let hit=null;for(const e of enemies){const dx=s.mesh.position.x-e.x,dz=s.mesh.position.z-e.z;if(dx*dx+dz*dz<(e.r+.35)*(e.r+.35)){hit=e;break}}if(hit){hitEnemy(hit,s.damage);dynamic.remove(s.mesh);shots.splice(i,1);continue}if(s.life<=0||Math.abs(s.mesh.position.x)>110||Math.abs(s.mesh.position.z)>110){dynamic.remove(s.mesh);shots.splice(i,1)}}}
function updatePickups(dt){for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.life-=dt;p.p+=dt*3;p.mesh.position.y=.12+Math.sin(p.p)*.12;p.mesh.rotation.y+=dt*1.6;if(Math.hypot(p.x-player.x,p.z-player.z)<1.35){if(p.kind==='med'){player.hp=Math.min(player.maxHp,player.hp+34);toast('+34 HEALTH')}else{for(const id of Object.keys(player.ammo))player.ammo[id].reserve+=id==='pistol'?16:id==='shotgun'?6:7;toast('AMMO FOUND')}dynamic.remove(p.mesh);pickups.splice(i,1);updateHud()}else if(p.life<=0){dynamic.remove(p.mesh);pickups.splice(i,1)}}}
function updateEffects(dt){for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;e.vel.y-=7*dt;e.mesh.position.addScaledVector(e.vel,dt);e.mesh.material.opacity=clamp(e.life/e.max,0,1);e.mesh.material.transparent=true;if(e.life<=0){dynamic.remove(e.mesh);effects.splice(i,1)}}}

function updateRain(dt){if(!rainSystem)return;const a=rainSystem.geometry.attributes.position.array;for(let i=0;i<a.length;i+=3){a[i+1]-=dt*(18+(i%17));a[i]+=.12*dt;if(a[i+1]<0){a[i+1]=rnd(18,35);a[i]=player?player.x+rnd(-65,65):rnd(-65,65);a[i+2]=player?player.z+rnd(-65,65):rnd(-65,65)}}rainSystem.geometry.attributes.position.needsUpdate=true}

function updateCamera(dt){
  const f=new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw));let desired,look;
  if(cameraMode==='third'){
    desired=new THREE.Vector3(player.x-f.x*7.7,4.5+recoil*2.2,player.z-f.z*7.7);look=new THREE.Vector3(player.x+f.x*6,1.7,player.z+f.z*6);
  }else{
    desired=new THREE.Vector3(player.x,31,player.z+17);look=new THREE.Vector3(player.x,0,player.z-2.5);
  }
  const t=1-Math.pow(.0001,dt);camera.position.lerp(desired,t);if(screenShake>0){camera.position.x+=rnd(-screenShake,screenShake);camera.position.y+=rnd(-screenShake,screenShake);camera.position.z+=rnd(-screenShake,screenShake)}camera.lookAt(look);recoil=lerp(recoil,0,dt*8);screenShake=lerp(screenShake,0,dt*12);
}

function updateHud(){if(!player)return;ui.hp.textContent=Math.max(0,Math.ceil(player.hp));ui.hpFill.style.width=clamp(player.hp,0,100)+'%';ui.wave.textContent=wave;ui.kills.textContent=kills;ui.score.textContent=String(score).padStart(6,'0');const a=player.ammo[player.weapon],w=WEAPONS[player.weapon];ui.ammo.textContent=a.mag;ui.reserve.textContent=' / '+a.reserve;ui.weaponName.textContent=w.name;ui.cameraLabel.textContent=cameraMode==='third'?'THIRD PERSON':'TOP-DOWN'}

function setCameraMode(mode,announce=true){cameraMode=mode;selectedCamera=mode;$$('[data-camera]').forEach(b=>b.classList.toggle('active',b.dataset.camera===mode));if(announce&&running)toast(mode==='third'?'THIRD PERSON':'TOP-DOWN');updateHud();if(mode==='third'&&running&&!isTouch)renderer.domElement.requestPointerLock?.()}
function toggleCamera(){setCameraMode(cameraMode==='top'?'third':'top')}

function startGame(){resetGame();setCameraMode(selectedCamera,false);running=true;ui.start.classList.add('hidden');ui.over.classList.add('hidden');ui.hud.classList.remove('hidden');if(isTouch)ui.touch.classList.remove('hidden');clock.start();if(cameraMode==='third'&&!isTouch)setTimeout(()=>renderer.domElement.requestPointerLock?.(),180);toast('SURVIVE THE NIGHT')}
function endGame(){if(gameOver)return;gameOver=true;running=false;fireHeld=false;document.exitPointerLock?.();ui.hud.classList.add('hidden');ui.touch.classList.add('hidden');ui.danger.classList.add('hidden');$('#finalScore').textContent=score;$('#finalKills').textContent=kills;$('#finalWave').textContent=wave;ui.over.classList.remove('hidden')}

function update(dt){
  updateRain(dt);if(!running||!player)return;
  player.cool=Math.max(0,player.cool-dt);if(player.reloading>0){player.reloading-=dt;if(player.reloading<=0)finishReload()}player.muzzle=Math.max(0,player.muzzle-dt);player.mesh.userData.muzzle.intensity=player.muzzle>0?16:0;
  updateInput(dt);if(fireHeld)shoot();updateEnemies(dt);updateShots(dt);updatePickups(dt);updateEffects(dt);
  if(nextWave>0){nextWave-=dt;if(nextWave<=0)beginWave()}if(spawnLeft>0){spawnTimer-=dt;if(spawnTimer<=0){spawnEnemy();spawnLeft--;spawnTimer=Math.max(.18,.62-wave*.018)}}if(spawnLeft===0&&enemies.length===0&&nextWave<=0){wave++;nextWave=2.2;player.hp=Math.min(100,player.hp+10);for(const id of Object.keys(player.ammo))player.ammo[id].reserve+=id==='pistol'?10:id==='shotgun'?4:5;toast('+10 HEALTH · RESUPPLY')}
  updateCamera(dt);updateHud();
}

function animate(){const dt=Math.min(.034,clock.getDelta()||.016);update(dt);if(!running&&player)updateCamera(dt);renderer.render(scene,camera);requestAnimationFrame(animate)}

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio||1,isTouch?1.45:1.8));renderer.setSize(innerWidth,innerHeight)});
addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys.add(k);if(k==='1')selectWeapon('pistol');if(k==='2')selectWeapon('shotgun');if(k==='3')selectWeapon('bow');if(k==='r')reload();if(k==='c')toggleCamera()});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('mousemove',e=>{pointer.x=e.clientX/innerWidth*2-1;pointer.y=-(e.clientY/innerHeight)*2+1;if(running&&cameraMode==='third'&&document.pointerLockElement===renderer.domElement){player.yaw-=e.movementX*.00235}});
renderer.domElement.addEventListener('mousedown',e=>{if(e.button!==0||!running)return;if(cameraMode==='third'&&!isTouch&&document.pointerLockElement!==renderer.domElement){renderer.domElement.requestPointerLock?.();return}fireHeld=true;shoot()});addEventListener('mouseup',e=>{if(e.button===0)fireHeld=false});renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());

$('#play').addEventListener('click',startGame);$('#again').addEventListener('click',startGame);$('#cameraToggle').addEventListener('click',toggleCamera);$$('[data-camera]').forEach(b=>b.addEventListener('click',()=>setCameraMode(b.dataset.camera,false)));$$('.slots button').forEach(b=>b.addEventListener('click',()=>selectWeapon(b.dataset.w)));

const joy=$('#joy'),stick=$('#stick'];function joyMove(t){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=r.width*.31;let dx=t.clientX-cx,dy=t.clientY-cy,m=Math.hypot(dx,dy);if(m>max){dx=dx/m*max;dy=dy/m*max}stick.style.transform=`translate(${dx}px,${dy}px)`;moveTouch.x=dx/max;moveTouch.y=dy/max}
joy.addEventListener('touchstart',e=>{joyId=e.changedTouches[0].identifier;joyMove(e.changedTouches[0]);e.preventDefault()},{passive:false});joy.addEventListener('touchmove',e=>{for(const t of e.changedTouches)if(t.identifier===joyId)joyMove(t);e.preventDefault()},{passive:false});joy.addEventListener('touchend',e=>{for(const t of e.changedTouches)if(t.identifier===joyId){joyId=null;moveTouch={x:0,y:0};stick.style.transform='translate(0,0)'}e.preventDefault()},{passive:false});
$('#fire').addEventListener('touchstart',e=>{fireHeld=true;shoot();e.preventDefault()},{passive:false});$('#fire').addEventListener('touchend',e=>{fireHeld=false;e.preventDefault()},{passive:false});$('#reload').addEventListener('click',reload);$('#swap').addEventListener('click',()=>{const ids=['pistol','shotgun','bow'],i=ids.indexOf(player?.weapon||'pistol');selectWeapon(ids[(i+1)%ids.length])});

resetGame();camera.position.set(0,31,17);camera.lookAt(0,0,-2);updateHud();animate();
