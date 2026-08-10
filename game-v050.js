const boot = window.FacefallBoot || (window.FacefallBoot = { selectedCamera: 'top', pendingStart: false });

async function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

(async () => {
  try {
    const THREE = await withTimeout(import('/vendor/three.js'), 9000, 'Three.js');
    const { GLTFLoader } = await withTimeout(import('/vendor/GLTFLoader.js'), 9000, 'GLTFLoader');

    const $ = (s) => document.querySelector(s);
    const $$ = (s) => [...document.querySelectorAll(s)];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const isTouch = matchMedia('(hover:none),(pointer:coarse)').matches;

    const ui = {
      stage: $('#stage'), start: $('#start'), over: $('#over'), hud: $('#hud'), touch: $('#touch'),
      preview: $('#preview'), plus: $('#plus'), portrait: $('#portrait'), hp: $('#hp'), hpFill: $('#hpFill'),
      wave: $('#wave'), kills: $('#kills'), score: $('#score'), ammo: $('#ammo'), reserve: $('#reserve'),
      weaponName: $('#weaponName'), cameraLabel: $('#cameraLabel'), danger: $('#danger'), waveBanner: $('#waveBanner'),
      toast: $('#toast')
    };

    const renderer = new THREE.WebGLRenderer({ antialias: !isTouch, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isTouch ? 1.15 : 1.65));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = !isTouch;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    ui.stage.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07100b);
    scene.fog = new THREE.FogExp2(0x0a1510, isTouch ? 0.020 : 0.015);
    const camera = new THREE.PerspectiveCamera(isTouch ? 66 : 58, innerWidth / innerHeight, 0.1, 240);
    const clock = new THREE.Clock();
    const world = new THREE.Group();
    const dynamic = new THREE.Group();
    scene.add(world, dynamic);

    scene.add(new THREE.HemisphereLight(0xc9d8ca, 0x1a211b, 1.75));
    const moon = new THREE.DirectionalLight(0xd6e3da, 2.1);
    moon.position.set(-18, 35, -12);
    moon.castShadow = !isTouch;
    scene.add(moon);
    const fill = new THREE.DirectionalLight(0x6f8e78, 0.9);
    fill.position.set(22, 12, 18);
    scene.add(fill);

    function texture(kind) {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const x = c.getContext('2d');
      const base = kind === 'grass' ? [36, 58, 34] : kind === 'road' ? [42, 47, 44] : [72, 58, 42];
      x.fillStyle = `rgb(${base.join(',')})`; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 4800; i++) {
        const n = rnd(-20, 20);
        x.fillStyle = `rgba(${clamp(base[0] + n, 0, 255)},${clamp(base[1] + n, 0, 255)},${clamp(base[2] + n, 0, 255)},${rnd(.05,.18)})`;
        x.fillRect(rnd(0, 256), rnd(0, 256), rnd(.5, 2.4), rnd(.5, 2.4));
      }
      if (kind === 'grass') for (let i = 0; i < 620; i++) {
        x.strokeStyle = `rgba(82,122,65,${rnd(.1,.3)})`;
        x.beginPath(); const px = rnd(0, 256), py = rnd(0, 256); x.moveTo(px, py); x.lineTo(px + rnd(-2, 2), py - rnd(2, 8)); x.stroke();
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(kind === 'grass' ? 25 : 10, kind === 'grass' ? 25 : 4);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }

    const grassTex = texture('grass'), roadTex = texture('road'), dirtTex = texture('dirt');
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), new THREE.MeshStandardMaterial({ map: grassTex, color: 0xa6b49a, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(138, 15), new THREE.MeshStandardMaterial({ map: roadTex, color: 0x9aa09b, roughness: .68, metalness: .08 }));
    road.rotation.x = -Math.PI / 2; road.rotation.z = -.16; road.position.y = .018; world.add(road);
    for (let i = 0; i < 22; i++) {
      const p = new THREE.Mesh(new THREE.CircleGeometry(rnd(1.2, 4), 18), new THREE.MeshPhysicalMaterial({ color: 0x748782, roughness: .14, metalness: .28, transparent: true, opacity: .34 }));
      p.rotation.x = -Math.PI / 2; p.position.set(rnd(-72, 72), .03, rnd(-72, 72)); p.scale.y = rnd(.35, .8); world.add(p);
    }
    for (let i = 0; i < 26; i++) {
      const p = new THREE.Mesh(new THREE.CircleGeometry(rnd(2, 7), 18), new THREE.MeshStandardMaterial({ map: dirtTex, color: 0x8f795f, roughness: 1, transparent: true, opacity: .64 }));
      p.rotation.x = -Math.PI / 2; p.position.set(rnd(-78, 78), .024, rnd(-78, 78)); p.scale.y = rnd(.45, 1); world.add(p);
    }

    const grassCount = isTouch ? 820 : 1800;
    const bladeGeo = new THREE.ConeGeometry(.055, .82, 3); bladeGeo.translate(0, .41, 0);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x527c43, roughness: 1 });
    const blades = new THREE.InstancedMesh(bladeGeo, bladeMat, grassCount);
    const mat = new THREE.Matrix4(), quat = new THREE.Quaternion(), scl = new THREE.Vector3(), pos = new THREE.Vector3();
    for (let i = 0; i < grassCount; i++) {
      let x, z; do { x = rnd(-86, 86); z = rnd(-86, 86); } while (Math.abs(z + .16 * x) < 8.5);
      quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd(0, Math.PI * 2));
      scl.set(rnd(.65, 1.6), rnd(.55, 1.9), rnd(.65, 1.6));
      mat.compose(pos.set(x, .02, z), quat, scl); blades.setMatrixAt(i, mat);
    }
    world.add(blades);

    function tree(x, z, sc = 1) {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.18, .34, 3.8, 8), new THREE.MeshStandardMaterial({ color: 0x47382b, roughness: 1 }));
      trunk.position.y = 1.9; g.add(trunk);
      const crownMat = new THREE.MeshStandardMaterial({ color: 0x2b4d2e, roughness: 1 });
      for (const [ox, oy, oz, k] of [[0,4.15,0,1.35],[-.7,3.72,.15,1],[.65,3.65,-.1,1.05]]) {
        const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 1), crownMat); crown.position.set(ox, oy, oz); crown.scale.setScalar(k); g.add(crown);
      }
      g.position.set(x, 0, z); g.scale.setScalar(sc); world.add(g);
    }
    for (let i = 0; i < 28; i++) { let x = rnd(-82,82), z = rnd(-82,82); if (Math.abs(z + .16*x) < 9) { i--; continue; } tree(x,z,rnd(.72,1.25)); }
    for (let i = -2; i <= 2; i++) {
      const x = i * 25, z = -.16 * x + 8;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.07, .1, 5, 8), new THREE.MeshStandardMaterial({ color: 0x303733, metalness: .5 })); pole.position.set(x, 2.5, z); world.add(pole);
      const light = new THREE.PointLight(0xd5e9a5, 12, 16, 2); light.position.set(x, 4.8, z); scene.add(light);
    }

    const rainN = isTouch ? 300 : 600;
    const rainPos = new Float32Array(rainN * 3);
    for (let i = 0; i < rainN; i++) { rainPos[i*3]=rnd(-55,55); rainPos[i*3+1]=rnd(2,30); rainPos[i*3+2]=rnd(-55,55); }
    const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xb7d1c6, size: .052, transparent: true, opacity: .42, depthWrite: false })); scene.add(rain);

    let faceTexture = null;
    let player = null, running = false, gameOver = false, cameraMode = boot.selectedCamera || 'top';
    let enemies = [], shots = [], wave = 1, kills = 0, score = 0, spawnLeft = 0, spawnTimer = 0, nextWave = 1.2, fireHeld = false;
    const keys = new Set(), pointer = new THREE.Vector2(), raycaster = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0,1,0),0), hit = new THREE.Vector3();
    const moveTouch = { x: 0, y: 0 };
    const WEAPONS = {
      pistol: { name:'PISTOL', mag:12, reserve:84, damage:38, rate:.21, speed:52, pellets:1, spread:.01 },
      shotgun:{ name:'SHOTGUN',mag:6,reserve:32,damage:24,rate:.72,speed:45,pellets:7,spread:.13 },
      bow:{ name:'BOW',mag:1,reserve:34,damage:110,rate:.76,speed:34,pellets:1,spread:.005 }
    };

    function makeMaskedFace(src) {
      return new Promise((resolve) => {
        const im = new Image();
        im.onload = () => {
          const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
          x.clearRect(0,0,256,256); x.save(); x.beginPath(); x.ellipse(128,130,92,112,0,0,Math.PI*2); x.clip();
          const sc = Math.max(256/im.width,256/im.height), w=im.width*sc,h=im.height*sc; x.drawImage(im,(256-w)/2,(256-h)/2,w,h); x.restore();
          const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; resolve(t);
        };
        im.src = src;
      });
    }
    function neutralFaceData() {
      const c=document.createElement('canvas'); c.width=c.height=180; const x=c.getContext('2d'); x.fillStyle='#6a756c'; x.fillRect(0,0,180,180);
      x.fillStyle='#b9c0b7'; x.beginPath(); x.ellipse(90,86,42,52,0,0,Math.PI*2); x.fill(); x.fillStyle='#263029'; x.fillRect(60,72,16,5); x.fillRect(104,72,16,5); x.fillRect(73,112,34,6); return c.toDataURL('image/jpeg',.84);
    }
    function safeGetFace(){ try { return localStorage.getItem('facefall-face'); } catch { return null; } }
    async function setFace(src) {
      ui.preview.src = src; ui.preview.style.display='block'; ui.plus.style.display='none'; ui.portrait.src=src;
      faceTexture = await makeMaskedFace(src);
      if (player?.faceMesh) { player.faceMesh.material.map = faceTexture; player.faceMesh.material.needsUpdate = true; }
    }
    await setFace(safeGetFace() || neutralFaceData());
    $('#face').addEventListener('change', e => {
      const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{const im=new Image(); im.onload=async()=>{const c=document.createElement('canvas'); c.width=c.height=360; const x=c.getContext('2d'),sc=Math.max(360/im.width,360/im.height),w=im.width*sc,h=im.height*sc; x.drawImage(im,(360-w)/2,(360-h)/2,w,h); const data=c.toDataURL('image/jpeg',.86); try{localStorage.setItem('facefall-face',data)}catch{} await setFace(data); toast('ЛИЦО ГОТОВО');}; im.src=r.result;}; r.readAsDataURL(f);
    });

    function makeWeapon(type) {
      const g = new THREE.Group();
      const metal = new THREE.MeshStandardMaterial({ color:0x202622, metalness:.72, roughness:.34 });
      const wood = new THREE.MeshStandardMaterial({ color:0x5a3d24, roughness:.82 });
      if (type === 'pistol') {
        const slide=new THREE.Mesh(new THREE.BoxGeometry(.16,.16,.72),metal); slide.position.z=.25; g.add(slide);
        const grip=new THREE.Mesh(new THREE.BoxGeometry(.15,.34,.18),metal); grip.position.set(0,-.22,-.02); grip.rotation.x=-.2; g.add(grip);
      } else if (type === 'shotgun') {
        const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,1.55,8),metal); barrel.rotation.x=Math.PI/2; barrel.position.z=.45; g.add(barrel);
        const stock=new THREE.Mesh(new THREE.BoxGeometry(.16,.22,.7),wood); stock.position.z=-.55; g.add(stock);
      } else {
        const bow=new THREE.Mesh(new THREE.TorusGeometry(.56,.025,7,32,Math.PI),wood); bow.rotation.y=Math.PI/2; bow.rotation.z=Math.PI/2; g.add(bow);
        const string=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,1.1,5),new THREE.MeshBasicMaterial({color:0xd9ded9})); g.add(string);
      }
      g.scale.setScalar(type==='shotgun'?.9:type==='bow'?1:.95); return g;
    }

    const loader = new GLTFLoader();
    let heroTemplate = null, heroAnimations = [];
    try {
      const gltf = await withTimeout(loader.loadAsync('/assets/models/hero.glb'), 12000, 'Hero GLB');
      heroTemplate = gltf.scene;
      heroAnimations = gltf.animations;
      heroTemplate.traverse(o => { if (o.isMesh) { o.castShadow = !isTouch; o.receiveShadow = true; } });
    } catch (e) {
      console.warn('Hero GLB unavailable, using fallback', e);
    }

    function fallbackHero() {
      const g=new THREE.Group(),cloth=new THREE.MeshStandardMaterial({color:0x35473d,roughness:.85}),skin=new THREE.MeshStandardMaterial({color:0xb5aa93,roughness:.82});
      const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.42,.72,6,10),cloth); torso.position.y=1.45; g.add(torso);
      const head=new THREE.Mesh(new THREE.SphereGeometry(.34,18,12),skin); head.position.y=2.45; g.add(head);
      for(const s of [-1,1]){const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.62,4,8),cloth); arm.position.set(s*.52,1.55,.12); arm.rotation.z=s*.16; g.add(arm); const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.72,4,8),cloth); leg.position.set(s*.2,.55,0); g.add(leg);}
      return g;
    }

    function buildPlayerModel() {
      const root = new THREE.Group();
      const visual = heroTemplate ? heroTemplate.clone(true) : fallbackHero();
      if (heroTemplate) { visual.scale.setScalar(1.15); visual.rotation.y = Math.PI; }
      root.add(visual);
      let mixer=null, actions={};
      if (heroTemplate && heroAnimations.length) {
        mixer=new THREE.AnimationMixer(visual);
        for(const name of ['Idle','Walk','Run']) { const clip=THREE.AnimationClip.findByName(heroAnimations,name); if(clip) actions[name]=mixer.clipAction(clip); }
        actions.Idle?.play();
      }
      const headBone = visual.getObjectByName('mixamorigHead') || visual.getObjectByName('Head') || visual;
      const faceMesh = new THREE.Mesh(new THREE.PlaneGeometry(.33,.42), new THREE.MeshBasicMaterial({ map:faceTexture, transparent:true, depthWrite:false, side:THREE.DoubleSide }));
      if (headBone !== visual) { faceMesh.position.set(0,.02,.165); faceMesh.rotation.y=Math.PI; faceMesh.scale.setScalar(.7); headBone.add(faceMesh); }
      else { faceMesh.position.set(0,2.47,.35); root.add(faceMesh); }
      const weaponMount=new THREE.Group(); weaponMount.position.set(.36,1.58,.62); weaponMount.rotation.set(-.08,0,0); root.add(weaponMount);
      const weaponMeshes={}; for(const id of Object.keys(WEAPONS)){const w=makeWeapon(id); weaponMount.add(w); w.visible=id==='pistol'; weaponMeshes[id]=w;}
      return { root, visual, mixer, actions, faceMesh, weaponMount, weaponMeshes, currentAction:'Idle' };
    }

    function zombieModel(type='walker') {
      const g=new THREE.Group(),skin=new THREE.MeshStandardMaterial({color:type==='brute'?0x6c745d:0x71806e,roughness:1}),cloth=new THREE.MeshStandardMaterial({color:type==='runner'?0x443b35:0x3d493f,roughness:1});
      const scale=type==='brute'?1.35:type==='runner'?.88:1;
      const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.42,.75,5,9),cloth); torso.position.y=1.42; torso.rotation.z=type==='runner'?.14:0; g.add(torso);
      const head=new THREE.Mesh(new THREE.SphereGeometry(.33,12,9),skin); head.position.set(type==='runner'?.08:0,2.42,0); g.add(head);
      for(const s of [-1,1]){const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.1,.62,4,7),skin); arm.position.set(s*.52,1.48,.18); arm.rotation.x=-.55; arm.rotation.z=s*.22; g.add(arm); const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.7,4,7),cloth); leg.position.set(s*.2,.52,0); g.add(leg);}
      g.scale.setScalar(scale); return g;
    }

    const playerLight = new THREE.SpotLight(0xe4f0cf, 24, 30, Math.PI/6, .45, 1.2);
    const playerLightTarget = new THREE.Object3D(); scene.add(playerLight, playerLightTarget); playerLight.target = playerLightTarget;

    function toast(t){ui.toast.textContent=t;ui.toast.classList.remove('hidden');clearTimeout(toast._t);toast._t=setTimeout(()=>ui.toast.classList.add('hidden'),1100)}
    function reset(){
      dynamic.clear(); enemies=[]; shots=[]; wave=1;kills=0;score=0;spawnLeft=0;spawnTimer=0;nextWave=1.2;gameOver=false;
      const rig=buildPlayerModel(); dynamic.add(rig.root); player={...rig,x:0,z:0,yaw:0,hp:100,speed:7.8,weapon:'pistol',cool:0,ammo:{pistol:{mag:12,reserve:84},shotgun:{mag:6,reserve:32},bow:{mag:1,reserve:34}}}; updateHud();
    }
    function setAnim(name){if(!player?.mixer||player.currentAction===name)return;const next=player.actions[name];const prev=player.actions[player.currentAction];if(!next)return;prev?.fadeOut(.18);next.reset().fadeIn(.18).play();player.currentAction=name;}
    function updateHud(){if(!player)return;ui.hp.textContent=Math.ceil(player.hp);ui.hpFill.style.width=clamp(player.hp,0,100)+'%';ui.wave.textContent=wave;ui.kills.textContent=kills;ui.score.textContent=String(score).padStart(6,'0');const a=player.ammo[player.weapon],w=WEAPONS[player.weapon];ui.weaponName.textContent=w.name;ui.ammo.textContent=a.mag;ui.reserve.textContent=' / '+a.reserve;ui.cameraLabel.textContent=cameraMode==='third'?'THIRD PERSON':'TOP-DOWN';}
    function setCamera(mode,announce=true){cameraMode=mode==='third'?'third':'top';boot.selectedCamera=cameraMode;$$('[data-camera]').forEach(b=>b.classList.toggle('active',b.dataset.camera===cameraMode));updateHud();if(announce&&running)toast(cameraMode==='third'?'THIRD PERSON':'TOP-DOWN');}
    function start(){reset();setCamera(boot.selectedCamera||cameraMode,false);running=true;ui.start.classList.add('hidden');ui.over.classList.add('hidden');ui.hud.classList.remove('hidden');if(isTouch)ui.touch.classList.remove('hidden');clock.start();toast(heroTemplate?'HUMANOID RIG ONLINE':'FALLBACK RIG');}
    function end(){if(gameOver)return;gameOver=true;running=false;fireHeld=false;ui.hud.classList.add('hidden');ui.touch.classList.add('hidden');$('#finalScore').textContent=score;$('#finalKills').textContent=kills;$('#finalWave').textContent=wave;ui.over.classList.remove('hidden');}
    function spawnEnemy(){const a=rnd(0,Math.PI*2),d=rnd(30,44),r=Math.random();const type=wave>3&&r>.9?'brute':wave>1&&r<.18?'runner':'walker';const mesh=zombieModel(type),x=player.x+Math.sin(a)*d,z=player.z+Math.cos(a)*d;mesh.position.set(x,0,z);dynamic.add(mesh);enemies.push({mesh,x,z,type,hp:type==='brute'?190+wave*10:type==='runner'?55+wave*4:76+wave*6,speed:type==='runner'?4.8:type==='brute'?2.1:2.9,damage:type==='brute'?25:type==='runner'?10:14,attack:0,phase:rnd(0,Math.PI*2)});}
    function beginWave(){spawnLeft=5+wave*3;spawnTimer=.1;ui.waveBanner.querySelector('b').textContent=wave;ui.waveBanner.classList.remove('hidden');setTimeout(()=>ui.waveBanner.classList.add('hidden'),1200);}
    function selectWeapon(id){if(!player||!WEAPONS[id])return;player.weapon=id;Object.entries(player.weaponMeshes).forEach(([k,m])=>m.visible=k===id);$$('.slots button').forEach(b=>b.classList.toggle('active',b.dataset.w===id));updateHud();}
    function shoot(){if(!running||gameOver||player.cool>0)return;const w=WEAPONS[player.weapon],a=player.ammo[player.weapon];if(a.mag<=0){toast('НЕТ ПАТРОНОВ');return;}if(isTouch&&enemies.length){let e=enemies[0],bd=999;for(const q of enemies){const d=Math.hypot(q.x-player.x,q.z-player.z);if(d<bd){bd=d;e=q;}}player.yaw=Math.atan2(e.x-player.x,e.z-player.z);}a.mag--;player.cool=w.rate;for(let i=0;i<w.pellets;i++){const ang=player.yaw+rnd(-w.spread,w.spread),dir=new THREE.Vector3(Math.sin(ang),0,Math.cos(ang)),mesh=new THREE.Mesh(new THREE.SphereGeometry(.055,5,4),new THREE.MeshBasicMaterial({color:player.weapon==='bow'?0xd8efb5:0xffe3a0}));mesh.position.set(player.x,1.55,player.z).addScaledVector(dir,1.1);dynamic.add(mesh);shots.push({mesh,dir,speed:w.speed,damage:w.damage,life:1.4});}const flash=new THREE.PointLight(0xffd48a,18,7,2);flash.position.set(player.x+Math.sin(player.yaw),1.65,player.z+Math.cos(player.yaw));scene.add(flash);setTimeout(()=>scene.remove(flash),55);updateHud();}

    function update(dt){
      const rp=rain.geometry.attributes.position.array;for(let i=1;i<rp.length;i+=3){rp[i]-=dt*19;if(rp[i]<0)rp[i]=rnd(15,30);}rain.geometry.attributes.position.needsUpdate=true;
      if(!running||!player)return;
      player.cool=Math.max(0,player.cool-dt);
      let mx=(keys.has('d')?1:0)-(keys.has('a')?1:0),mz=(keys.has('s')?1:0)-(keys.has('w')?1:0); if(moveTouch.x||moveTouch.y){mx+=moveTouch.x;mz+=moveTouch.y;}const len=Math.hypot(mx,mz)||1;const moving=!!(mx||mz);if(moving){mx/=len;mz/=len;const run=keys.has('shift')&&!isTouch;const sp=player.speed*(run?1.42:1);player.x=clamp(player.x+mx*sp*dt,-82,82);player.z=clamp(player.z+mz*sp*dt,-82,82);setAnim(run?'Run':'Walk');}else setAnim('Idle');
      if(cameraMode==='top'&&!isTouch){raycaster.setFromCamera(pointer,camera);if(raycaster.ray.intersectPlane(plane,hit))player.yaw=Math.atan2(hit.x-player.x,hit.z-player.z);}else if(moving&&isTouch&&!fireHeld){player.yaw=Math.atan2(mx,mz);}player.root.position.set(player.x,0,player.z);player.root.rotation.y=player.yaw;if(player.mixer)player.mixer.update(dt);if(fireHeld)shoot();
      const f=new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw));playerLight.position.set(player.x,2.15,player.z);playerLightTarget.position.set(player.x+f.x*12,1.0,player.z+f.z*12);
      if(nextWave>0){nextWave-=dt;if(nextWave<=0)beginWave();}if(spawnLeft>0){spawnTimer-=dt;if(spawnTimer<=0){spawnEnemy();spawnLeft--;spawnTimer=Math.max(.32,.58-wave*.012);}}
      let closest=999;for(let i=enemies.length-1;i>=0;i--){const e=enemies[i],dx=player.x-e.x,dz=player.z-e.z,d=Math.hypot(dx,dz)||1;closest=Math.min(closest,d);e.attack=Math.max(0,e.attack-dt);e.phase+=dt*(e.type==='runner'?9:5);if(d>1.2){e.x+=dx/d*e.speed*dt;e.z+=dz/d*e.speed*dt;}else if(e.attack<=0){e.attack=e.type==='runner'?.6:.82;player.hp-=e.damage;if(player.hp<=0){player.hp=0;updateHud();end();return;}}e.mesh.position.set(e.x,Math.abs(Math.sin(e.phase))*0.025,e.z);e.mesh.rotation.y=Math.atan2(dx,dz);}ui.danger.classList.toggle('hidden',closest>8);
      for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.life-=dt;s.mesh.position.addScaledVector(s.dir,s.speed*dt);let victim=null;for(const e of enemies)if(Math.hypot(s.mesh.position.x-e.x,s.mesh.position.z-e.z)<(e.type==='brute'?1.2:.8)){victim=e;break;}if(victim){victim.hp-=s.damage;dynamic.remove(s.mesh);shots.splice(i,1);if(victim.hp<=0){dynamic.remove(victim.mesh);enemies.splice(enemies.indexOf(victim),1);kills++;score+=victim.type==='brute'?250:victim.type==='runner'?150:100;}continue;}if(s.life<=0){dynamic.remove(s.mesh);shots.splice(i,1);}}
      if(spawnLeft===0&&enemies.length===0&&nextWave<=0){wave++;nextWave=2;player.hp=Math.min(100,player.hp+10);}updateHud();
    }

    const camPos=new THREE.Vector3(),lookAt=new THREE.Vector3(),forward=new THREE.Vector3(),right=new THREE.Vector3();
    function updateCamera(dt){
      if(!player){camera.position.set(0,26,16);camera.lookAt(0,0,0);return;}
      forward.set(Math.sin(player.yaw),0,Math.cos(player.yaw));right.set(forward.z,0,-forward.x);
      if(cameraMode==='third'){
        camPos.set(player.x,0,player.z).addScaledVector(forward,-5.4).addScaledVector(right,1.15);camPos.y=3.35;
        lookAt.set(player.x,1.45,player.z).addScaledVector(forward,7.5).addScaledVector(right,.3);
        camera.fov += ((isTouch?68:61)-camera.fov)*.08;
      }else{
        camPos.set(player.x+7.5,24.5,player.z+14.5);lookAt.set(player.x,0.7,player.z-2.5);camera.fov += ((isTouch?62:56)-camera.fov)*.08;
      }
      camera.updateProjectionMatrix();const t=1-Math.pow(.0008,dt);camera.position.lerp(camPos,t);camera.lookAt(lookAt);
    }

    function loop(){const dt=Math.min(.034,clock.getDelta()||.016);update(dt);updateCamera(dt);renderer.render(scene,camera);requestAnimationFrame(loop);}
    addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
    addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys.add(k);if(k==='1')selectWeapon('pistol');if(k==='2')selectWeapon('shotgun');if(k==='3')selectWeapon('bow');if(k==='c')setCamera(cameraMode==='top'?'third':'top');}); addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
    renderer.domElement.addEventListener('pointermove',e=>{pointer.x=e.clientX/innerWidth*2-1;pointer.y=-(e.clientY/innerHeight)*2+1;});renderer.domElement.addEventListener('pointerdown',e=>{if(e.button===0){fireHeld=true;shoot();}});addEventListener('pointerup',()=>fireHeld=false);
    $('#cameraToggle').addEventListener('click',()=>setCamera(cameraMode==='top'?'third':'top'));$$('.slots button').forEach(b=>b.addEventListener('click',()=>selectWeapon(b.dataset.w)));$('#swap').addEventListener('click',()=>{const ids=['pistol','shotgun','bow'];selectWeapon(ids[(ids.indexOf(player?.weapon||'pistol')+1)%3]);});$('#reload').addEventListener('click',()=>toast('RELOAD PASS — NEXT')); 
    const joy=$('#joy'),stick=$('#stick');let joyId=null;function joyMove(t){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=r.width*.3;let dx=t.clientX-cx,dy=t.clientY-cy,dist=Math.hypot(dx,dy);if(dist>max){dx=dx/dist*max;dy=dy/dist*max;}moveTouch.x=dx/max;moveTouch.y=dy/max;stick.style.transform=`translate(${dx}px,${dy}px)`;}joy.addEventListener('touchstart',e=>{joyId=e.changedTouches[0].identifier;joyMove(e.changedTouches[0]);e.preventDefault();},{passive:false});joy.addEventListener('touchmove',e=>{for(const t of e.changedTouches)if(t.identifier===joyId)joyMove(t);e.preventDefault();},{passive:false});joy.addEventListener('touchend',e=>{moveTouch.x=moveTouch.y=0;stick.style.transform='translate(0,0)';e.preventDefault();},{passive:false});$('#fire').addEventListener('touchstart',e=>{fireHeld=true;shoot();e.preventDefault();},{passive:false});$('#fire').addEventListener('touchend',e=>{fireHeld=false;e.preventDefault();},{passive:false});

    reset(); running=false; ui.hud.classList.add('hidden');
    window.FacefallEngine={start,setCamera,ready:true,heroGLB:!!heroTemplate};
    window.dispatchEvent(new CustomEvent('facefall-engine-ready'));
    loop();
  } catch (err) {
    console.error('Facefall 0.5 engine failed', err);
    window.dispatchEvent(new CustomEvent('facefall-engine-error',{detail:`0.5 engine: ${err?.message||'startup error'}`}));
  }
})();
