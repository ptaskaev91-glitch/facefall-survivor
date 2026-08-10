const boot = window.FacefallBoot || (window.FacefallBoot = {selectedCamera:'top',pendingStart:false});

async function loadThree(){
  const sources=[
    'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js',
    'https://unpkg.com/three@0.160.0/build/three.module.min.js'
  ];
  let lastError;
  for(const src of sources){
    try{return await import(src)}catch(err){lastError=err;console.warn('Three.js source failed:',src,err)}
  }
  throw lastError || new Error('Three.js unavailable');
}

(async()=>{
  try{
    const THREE=await loadThree();
    const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
    const rnd=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const isTouch=matchMedia('(hover:none),(pointer:coarse)').matches;
    const ui={stage:$('#stage'),start:$('#start'),over:$('#over'),hud:$('#hud'),touch:$('#touch'),preview:$('#preview'),plus:$('#plus'),portrait:$('#portrait'),hp:$('#hp'),hpFill:$('#hpFill'),wave:$('#wave'),kills:$('#kills'),score:$('#score'),ammo:$('#ammo'),reserve:$('#reserve'),weaponName:$('#weaponName'),cameraLabel:$('#cameraLabel'),danger:$('#danger'),waveBanner:$('#waveBanner'),toast:$('#toast')};

    const renderer=new THREE.WebGLRenderer({antialias:!isTouch,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,isTouch?1.2:1.7));
    renderer.setSize(innerWidth,innerHeight);
    renderer.shadowMap.enabled=!isTouch;
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=.9;
    ui.stage.replaceChildren(renderer.domElement);

    const scene=new THREE.Scene();scene.background=new THREE.Color(0x050806);scene.fog=new THREE.FogExp2(0x07100b,isTouch?.026:.019);
    const camera=new THREE.PerspectiveCamera(isTouch?68:58,innerWidth/innerHeight,.1,240);
    scene.add(new THREE.HemisphereLight(0xb8c8bb,0x10140f,1.15));
    const moon=new THREE.DirectionalLight(0xc5d7ca,1.45);moon.position.set(-18,35,-12);moon.castShadow=!isTouch;scene.add(moon);
    const clock=new THREE.Clock();
    const world=new THREE.Group(),dynamic=new THREE.Group();scene.add(world,dynamic);

    function texture(kind){
      const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
      const base=kind==='grass'?[30,49,29]:kind==='road'?[35,39,37]:[65,53,39];x.fillStyle=`rgb(${base.join(',')})`;x.fillRect(0,0,256,256);
      for(let i=0;i<5000;i++){const v=rnd(-18,18);x.fillStyle=`rgba(${clamp(base[0]+v,0,255)},${clamp(base[1]+v,0,255)},${clamp(base[2]+v,0,255)},${rnd(.05,.18)})`;x.fillRect(rnd(0,256),rnd(0,256),rnd(.5,2.2),rnd(.5,2.2))}
      if(kind==='grass')for(let i=0;i<550;i++){x.strokeStyle=`rgba(72,104,58,${rnd(.12,.3)})`;x.beginPath();const px=rnd(0,256),py=rnd(0,256);x.moveTo(px,py);x.lineTo(px+rnd(-2,2),py-rnd(2,8));x.stroke()}
      const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==='grass'?24:10,kind==='grass'?24:4);t.colorSpace=THREE.SRGBColorSpace;return t;
    }
    const grassTex=texture('grass'),roadTex=texture('road'),dirtTex=texture('dirt');
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({map:grassTex,color:0xa1ae96,roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;world.add(ground);
    const road=new THREE.Mesh(new THREE.PlaneGeometry(135,14),new THREE.MeshStandardMaterial({map:roadTex,color:0x8d928e,roughness:.72,metalness:.08}));road.rotation.x=-Math.PI/2;road.rotation.z=-.16;road.position.y=.018;world.add(road);
    for(let i=0;i<16;i++){const p=new THREE.Mesh(new THREE.CircleGeometry(rnd(1.2,4),20),new THREE.MeshPhysicalMaterial({color:0x62736f,roughness:.2,metalness:.2,transparent:true,opacity:.36}));p.rotation.x=-Math.PI/2;p.position.set(rnd(-70,70),.03,rnd(-70,70));p.scale.y=rnd(.35,.8);world.add(p)}
    for(let i=0;i<20;i++){const p=new THREE.Mesh(new THREE.CircleGeometry(rnd(2,7),18),new THREE.MeshStandardMaterial({map:dirtTex,color:0x8b765d,roughness:1,transparent:true,opacity:.62}));p.rotation.x=-Math.PI/2;p.position.set(rnd(-75,75),.025,rnd(-75,75));p.scale.y=rnd(.5,1);world.add(p)}

    const grassCount=isTouch?650:1500,bladeGeo=new THREE.ConeGeometry(.05,.7,3);bladeGeo.translate(0,.35,0),bladeMat=new THREE.MeshStandardMaterial({color:0x456a3b,roughness:1});
    const blades=new THREE.InstancedMesh(bladeGeo,bladeMat,grassCount),m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),pos=new THREE.Vector3();
    for(let i=0;i<grassCount;i++){let x,z;do{x=rnd(-86,86);z=rnd(-86,86)}while(Math.abs(z+.16*x)<8);q.setFromAxisAngle(new THREE.Vector3(0,1,0),rnd(0,Math.PI*2));s.set(rnd(.7,1.5),rnd(.55,1.6),rnd(.7,1.5));m.compose(pos.set(x,.02,z),q,s);blades.setMatrixAt(i,m)}world.add(blades);

    function tree(x,z,sc=1){const g=new THREE.Group(),tr=new THREE.Mesh(new THREE.CylinderGeometry(.2,.35,3.6,7),new THREE.MeshStandardMaterial({color:0x423426,roughness:1}));tr.position.y=1.8;g.add(tr);const mat=new THREE.MeshStandardMaterial({color:0x244428,roughness:1});for(const [ox,oy,oz,k] of [[0,4,0,1.4],[-.7,3.6,.2,1],[.6,3.6,-.1,1]]){const c=new THREE.Mesh(new THREE.IcosahedronGeometry(1.25,1),mat);c.position.set(ox,oy,oz);c.scale.setScalar(k);g.add(c)}g.position.set(x,0,z);g.scale.setScalar(sc);world.add(g)}
    for(let i=0;i<25;i++){let x=rnd(-82,82),z=rnd(-82,82);if(Math.abs(z+.16*x)<9){i--;continue}tree(x,z,rnd(.7,1.2))}
    for(let i=-2;i<=2;i++){const x=i*25,z=-.16*x+8;const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.1,5,8),new THREE.MeshStandardMaterial({color:0x303733,metalness:.5}));pole.position.set(x,2.5,z);world.add(pole);const light=new THREE.PointLight(0xc7dd99,8,13,2);light.position.set(x,4.8,z);scene.add(light)}

    const rainN=isTouch?260:520,rainPos=new Float32Array(rainN*3);for(let i=0;i<rainN;i++){rainPos[i*3]=rnd(-55,55);rainPos[i*3+1]=rnd(2,30);rainPos[i*3+2]=rnd(-55,55)}const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));const rain=new THREE.Points(rainGeo,new THREE.PointsMaterial({color:0xabc4bb,size:.05,transparent:true,opacity:.38,depthWrite:false}));scene.add(rain);

    let faceTexture=null,player=null,running=false,gameOver=false,cameraMode=boot.selectedCamera||'top',enemies=[],shots=[],wave=1,kills=0,score=0,spawnLeft=0,spawnTimer=0,nextWave=1.2,fireHeld=false;
    const keys=new Set(),pointer=new THREE.Vector2(),raycaster=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();
    const WEAPONS={pistol:{name:'PISTOL',mag:12,reserve:84,damage:38,rate:.21,speed:52,pellets:1,spread:.01},shotgun:{name:'SHOTGUN',mag:6,reserve:32,damage:24,rate:.72,speed:45,pellets:7,spread:.13},bow:{name:'BOW',mag:1,reserve:34,damage:110,rate:.76,speed:34,pellets:1,spread:.005}};

    function humanoid(zombie=false){const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(.9,1.35,.48),new THREE.MeshStandardMaterial({color:zombie?0x48544b:0x34453b,roughness:.9}));body.position.y=1.55;g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.38,12,8),new THREE.MeshStandardMaterial({color:zombie?0x778474:0xb1a48d,roughness:.8}));head.position.y=2.65;g.add(head);for(const side of [-1,1]){const arm=new THREE.Mesh(new THREE.BoxGeometry(.22,1.05,.24),new THREE.MeshStandardMaterial({color:zombie?0x3c473e:0x18211d,roughness:1}));arm.position.set(side*.58,1.5,0);g.add(arm);const leg=new THREE.Mesh(new THREE.BoxGeometry(.27,1.15,.32),arm.material);leg.position.set(side*.24,.55,0);g.add(leg)}if(!zombie){const face=new THREE.Mesh(new THREE.PlaneGeometry(.54,.62),new THREE.MeshBasicMaterial({color:0xd8d8d8,map:faceTexture||null}));face.position.set(0,2.67,.382);g.add(face);g.userData.face=face;const gun=new THREE.Mesh(new THREE.BoxGeometry(.13,.13,1),new THREE.MeshStandardMaterial({color:0x222a26,metalness:.6}));gun.position.set(.42,1.75,.72);g.add(gun)}return g}

    function safeGetFace(){try{return localStorage.getItem('facefall-face')}catch{return null}}
    function setFace(src){ui.preview.src=src;ui.preview.style.display='block';ui.plus.style.display='none';ui.portrait.src=src;new THREE.TextureLoader().load(src,t=>{t.colorSpace=THREE.SRGBColorSpace;faceTexture=t;if(player?.mesh?.userData.face){player.mesh.userData.face.material.map=t;player.mesh.userData.face.material.needsUpdate=true}})}
    function neutralFace(){const c=document.createElement('canvas');c.width=c.height=180;const x=c.getContext('2d');x.fillStyle='#59645b';x.fillRect(0,0,180,180);x.fillStyle='#aeb7ac';x.beginPath();x.arc(90,80,38,0,Math.PI*2);x.fill();x.fillStyle='#263029';x.fillRect(60,68,16,5);x.fillRect(104,68,16,5);x.fillRect(73,106,34,6);return c.toDataURL('image/jpeg',.82)}
    setFace(safeGetFace()||neutralFace());
    $('#face').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=c.height=320;const x=c.getContext('2d'),sc=Math.max(320/im.width,320/im.height),w=im.width*sc,h=im.height*sc;x.drawImage(im,(320-w)/2,(320-h)/2,w,h);const data=c.toDataURL('image/jpeg',.84);try{localStorage.setItem('facefall-face',data)}catch{}setFace(data);toast('ЛИЦО ГОТОВО')};im.src=r.result};r.readAsDataURL(f)});

    function toast(t){ui.toast.textContent=t;ui.toast.classList.remove('hidden');clearTimeout(toast._t);toast._t=setTimeout(()=>ui.toast.classList.add('hidden'),1100)}
    function reset(){dynamic.clear();enemies=[];shots=[];wave=1;kills=0;score=0;spawnLeft=0;spawnTimer=0;nextWave=1.2;gameOver=false;const mesh=humanoid(false);dynamic.add(mesh);player={mesh,x:0,z:0,yaw:0,hp:100,speed:8.2,weapon:'pistol',cool:0,ammo:{pistol:{mag:12,reserve:84},shotgun:{mag:6,reserve:32},bow:{mag:1,reserve:34}}};updateHud()}
    function updateHud(){if(!player)return;ui.hp.textContent=Math.ceil(player.hp);ui.hpFill.style.width=clamp(player.hp,0,100)+'%';ui.wave.textContent=wave;ui.kills.textContent=kills;ui.score.textContent=String(score).padStart(6,'0');const a=player.ammo[player.weapon],w=WEAPONS[player.weapon];ui.weaponName.textContent=w.name;ui.ammo.textContent=a.mag;ui.reserve.textContent=' / '+a.reserve;ui.cameraLabel.textContent=cameraMode==='third'?'THIRD PERSON':'TOP-DOWN'}
    function setCamera(mode,announce=true){cameraMode=mode==='third'?'third':'top';boot.selectedCamera=cameraMode;$$('[data-camera]').forEach(b=>b.classList.toggle('active',b.dataset.camera===cameraMode));updateHud();if(announce&&running)toast(cameraMode==='third'?'THIRD PERSON':'TOP-DOWN')}
    function start(){reset();setCamera(boot.selectedCamera||cameraMode,false);running=true;ui.start.classList.add('hidden');ui.over.classList.add('hidden');ui.hud.classList.remove('hidden');if(isTouch)ui.touch.classList.remove('hidden');clock.start();toast('SURVIVE THE NIGHT')}
    function end(){if(gameOver)return;gameOver=true;running=false;fireHeld=false;ui.hud.classList.add('hidden');ui.touch.classList.add('hidden');$('#finalScore').textContent=score;$('#finalKills').textContent=kills;$('#finalWave').textContent=wave;ui.over.classList.remove('hidden')}
    function spawnEnemy(){const a=rnd(0,Math.PI*2),d=rnd(32,45),mesh=humanoid(true),x=player.x+Math.sin(a)*d,z=player.z+Math.cos(a)*d;mesh.position.set(x,0,z);dynamic.add(mesh);enemies.push({mesh,x,z,hp:75+wave*7,speed:2.8+wave*.06,damage:14,attack:0})}
    function beginWave(){spawnLeft=5+wave*3;spawnTimer=.1;ui.waveBanner.querySelector('b').textContent=wave;ui.waveBanner.classList.remove('hidden');setTimeout(()=>ui.waveBanner.classList.add('hidden'),1200)}
    function selectWeapon(id){if(!player||!WEAPONS[id])return;player.weapon=id;$$('.slots button').forEach(b=>b.classList.toggle('active',b.dataset.w===id));updateHud()}
    function shoot(){if(!running||gameOver||player.cool>0)return;const w=WEAPONS[player.weapon],a=player.ammo[player.weapon];if(a.mag<=0){toast('НЕТ ПАТРОНОВ');return}if(isTouch&&enemies.length){let e=enemies[0],bd=999;for(const q of enemies){const d=Math.hypot(q.x-player.x,q.z-player.z);if(d<bd){bd=d;e=q}}player.yaw=Math.atan2(e.x-player.x,e.z-player.z)}a.mag--;player.cool=w.rate;for(let i=0;i<w.pellets;i++){const ang=player.yaw+rnd(-w.spread,w.spread),dir=new THREE.Vector3(Math.sin(ang),0,Math.cos(ang)),mesh=new THREE.Mesh(new THREE.SphereGeometry(.06,5,4),new THREE.MeshBasicMaterial({color:0xffe3a0}));mesh.position.set(player.x,1.75,player.z).addScaledVector(dir,1);dynamic.add(mesh);shots.push({mesh,dir,speed:w.speed,damage:w.damage,life:1.25})}updateHud()}

    function update(dt){
      const rp=rain.geometry.attributes.position.array;for(let i=1;i<rp.length;i+=3){rp[i]-=dt*18;if(rp[i]<0)rp[i]=rnd(15,30)}rain.geometry.attributes.position.needsUpdate=true;
      if(!running||!player)return;player.cool=Math.max(0,player.cool-dt);
      let mx=(keys.has('d')?1:0)-(keys.has('a')?1:0),mz=(keys.has('s')?1:0)-(keys.has('w')?1:0);if(moveTouch.x||moveTouch.y){mx+=moveTouch.x;mz+=moveTouch.y}const len=Math.hypot(mx,mz)||1;if(mx||mz){mx/=len;mz/=len;player.x=clamp(player.x+mx*player.speed*dt,-82,82);player.z=clamp(player.z+mz*player.speed*dt,-82,82)}
      if(cameraMode==='top'&&!isTouch){raycaster.setFromCamera(pointer,camera);if(raycaster.ray.intersectPlane(plane,hit))player.yaw=Math.atan2(hit.x-player.x,hit.z-player.z)}player.mesh.position.set(player.x,0,player.z);player.mesh.rotation.y=player.yaw;if(fireHeld)shoot();
      if(nextWave>0){nextWave-=dt;if(nextWave<=0)beginWave()}if(spawnLeft>0){spawnTimer-=dt;if(spawnTimer<=0){spawnEnemy();spawnLeft--;spawnTimer=.55}}
      let closest=999;for(let i=enemies.length-1;i>=0;i--){const e=enemies[i],dx=player.x-e.x,dz=player.z-e.z,d=Math.hypot(dx,dz)||1;closest=Math.min(closest,d);e.attack=Math.max(0,e.attack-dt);if(d>1.25){e.x+=dx/d*e.speed*dt;e.z+=dz/d*e.speed*dt}else if(e.attack<=0){e.attack=.8;player.hp-=e.damage;if(player.hp<=0){player.hp=0;updateHud();end();return}}e.mesh.position.set(e.x,0,e.z);e.mesh.rotation.y=Math.atan2(dx,dz)}ui.danger.classList.toggle('hidden',closest>8);
      for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.life-=dt;s.mesh.position.addScaledVector(s.dir,s.speed*dt);let victim=null;for(const e of enemies)if(Math.hypot(s.mesh.position.x-e.x,s.mesh.position.z-e.z)<.9){victim=e;break}if(victim){victim.hp-=s.damage;dynamic.remove(s.mesh);shots.splice(i,1);if(victim.hp<=0){dynamic.remove(victim.mesh);enemies.splice(enemies.indexOf(victim),1);kills++;score+=100}continue}if(s.life<=0){dynamic.remove(s.mesh);shots.splice(i,1)}}
      if(spawnLeft===0&&enemies.length===0&&nextWave<=0){wave++;nextWave=2;player.hp=Math.min(100,player.hp+10)}updateHud();
    }
    const moveTouch={x:0,y:0};
    function updateCamera(){if(!player){camera.position.set(0,30,18);camera.lookAt(0,0,0);return}const f=new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw));if(cameraMode==='third'){camera.position.lerp(new THREE.Vector3(player.x-f.x*7,4.4,player.z-f.z*7),.12);camera.lookAt(player.x+f.x*6,1.6,player.z+f.z*6)}else{camera.position.lerp(new THREE.Vector3(player.x,30,player.z+17),.14);camera.lookAt(player.x,0,player.z-2)}}
    function loop(){const dt=Math.min(.034,clock.getDelta()||.016);update(dt);updateCamera();renderer.render(scene,camera);requestAnimationFrame(loop)}

    addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
    addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys.add(k);if(k==='1')selectWeapon('pistol');if(k==='2')selectWeapon('shotgun');if(k==='3')selectWeapon('bow');if(k==='c')setCamera(cameraMode==='top'?'third':'top')});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
    renderer.domElement.addEventListener('pointermove',e=>{pointer.x=e.clientX/innerWidth*2-1;pointer.y=-(e.clientY/innerHeight)*2+1});renderer.domElement.addEventListener('pointerdown',e=>{if(e.button===0){fireHeld=true;shoot()}});addEventListener('pointerup',()=>fireHeld=false);
    $('#cameraToggle').addEventListener('click',()=>setCamera(cameraMode==='top'?'third':'top'));$$('.slots button').forEach(b=>b.addEventListener('click',()=>selectWeapon(b.dataset.w)));$('#swap').addEventListener('click',()=>{const ids=['pistol','shotgun','bow'];selectWeapon(ids[(ids.indexOf(player?.weapon||'pistol')+1)%3])});$('#reload').addEventListener('click',()=>toast('AUTO RELOAD IN SAFE BUILD'));
    const joy=$('#joy'),stick=$('#stick');let joyId=null;function joyMove(t){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=r.width*.3;let dx=t.clientX-cx,dy=t.clientY-cy,dist=Math.hypot(dx,dy);if(dist>max){dx=dx/dist*max;dy=dy/dist*max}moveTouch.x=dx/max;moveTouch.y=dy/max;stick.style.transform=`translate(${dx}px,${dy}px)`}joy.addEventListener('touchstart',e=>{joyId=e.changedTouches[0].identifier;joyMove(e.changedTouches[0]);e.preventDefault()},{passive:false});joy.addEventListener('touchmove',e=>{for(const t of e.changedTouches)if(t.identifier===joyId)joyMove(t);e.preventDefault()},{passive:false});joy.addEventListener('touchend',e=>{moveTouch.x=moveTouch.y=0;stick.style.transform='translate(0,0)';e.preventDefault()},{passive:false});$('#fire').addEventListener('touchstart',e=>{fireHeld=true;shoot();e.preventDefault()},{passive:false});$('#fire').addEventListener('touchend',e=>{fireHeld=false;e.preventDefault()},{passive:false});

    reset();running=false;ui.hud.classList.add('hidden');
    window.FacefallEngine={start,setCamera,ready:true};
    window.dispatchEvent(new CustomEvent('facefall-engine-ready'));
    loop();
  }catch(err){
    console.error('Facefall engine failed',err);
    window.dispatchEvent(new CustomEvent('facefall-engine-error',{detail:'Не удалось запустить 3D. Проверяем WebGL/CDN — нажми «Повторить загрузку».'}));
  }
})();
