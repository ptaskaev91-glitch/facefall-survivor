import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

class NodeFileReader {
  result = null;
  onloadend = null;
  onerror = null;
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => { this.result = buffer; this.onloadend?.({ target: this }); }).catch((error) => this.onerror?.(error));
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => { this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`; this.onloadend?.({ target: this }); }).catch((error) => this.onerror?.(error));
  }
}
globalThis.FileReader = NodeFileReader;

const mat = (color, roughness, metalness) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const box = (x,y,z,m,name) => { const o = new THREE.Mesh(new THREE.BoxGeometry(x,y,z),m); o.name=name; return o; };
const cyl = (r,len,m,name,segments=12) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,segments),m); o.name=name; o.rotation.x=Math.PI/2; return o; };

function shotgunScene() {
  const root = new THREE.Group(); root.name = 'shotgun-glb-root';
  const steel=mat(0x202522,0.34,0.72), dark=mat(0x121614,0.48,0.58), polymer=mat(0x232824,0.82,0.08), wood=mat(0x4b2e1d,0.72,0.02);
  const receiver=box(0.074,0.092,0.285,steel,'shotgun-receiver'); receiver.position.set(0,0.005,0.105);
  const barrel=cyl(0.017,0.605,dark,'shotgun-barrel'); barrel.position.set(0,0.044,0.535);
  const tube=cyl(0.014,0.49,dark,'shotgun-magazine-tube',10); tube.position.set(0,-0.005,0.455);
  const pump=box(0.068,0.082,0.185,polymer,'shotgun-pump'); pump.position.set(0,-0.006,0.385);
  const grip=box(0.058,0.145,0.085,polymer,'shotgun-grip'); grip.position.set(0,-0.092,-0.035); grip.rotation.x=-0.22;
  const stock=box(0.078,0.105,0.34,wood,'shotgun-stock'); stock.position.set(0,-0.006,-0.245); stock.rotation.x=-0.035;
  const butt=box(0.085,0.118,0.025,polymer,'shotgun-butt'); butt.position.set(0,-0.012,-0.425);
  root.add(receiver,barrel,tube,pump,grip,stock,butt);
  return root;
}

function bowScene() {
  const root = new THREE.Group(); root.name='bow-glb-root';
  const riserMat=mat(0x443122,0.68,0.04), limbMat=mat(0x181d1a,0.52,0.2), shaftMat=mat(0x5f4931,0.78,0), pointMat=mat(0x777d78,0.28,0.72), fletchMat=mat(0x6e2f25,0.92,0);
  const riser=box(0.045,0.29,0.052,riserMat,'bow-riser'); riser.position.z=0.012;
  const grip=box(0.058,0.12,0.068,riserMat,'bow-grip'); grip.position.z=-0.012;
  const upperCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,0.13,0.02),new THREE.Vector3(0,0.43,0.115),new THREE.Vector3(0,0.70,0.065));
  const lowerCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,-0.13,0.02),new THREE.Vector3(0,-0.43,0.115),new THREE.Vector3(0,-0.70,0.065));
  const upper=new THREE.Mesh(new THREE.TubeGeometry(upperCurve,14,0.014,6,false),limbMat); upper.name='bow-upper-limb';
  const lower=new THREE.Mesh(new THREE.TubeGeometry(lowerCurve,14,0.014,6,false),limbMat); lower.name='bow-lower-limb';
  const arrow=new THREE.Group(); arrow.name='bow-arrow-glb';
  const shaft=cyl(0.006,0.82,shaftMat,'bow-arrow-shaft',8);
  const point=new THREE.Mesh(new THREE.ConeGeometry(0.015,0.045,8),pointMat); point.name='bow-arrow-point'; point.rotation.x=Math.PI/2; point.position.z=0.432;
  const fa=box(0.035,0.026,0.075,fletchMat,'bow-fletching-a'); fa.position.z=-0.345;
  const fb=box(0.026,0.035,0.075,fletchMat,'bow-fletching-b'); fb.position.z=-0.345;
  arrow.add(shaft,point,fa,fb); root.add(riser,grip,upper,lower,arrow); return root;
}

async function exportBinary(object, file) {
  const exporter = new GLTFExporter();
  const data = await new Promise((resolve,reject) => exporter.parse(object, resolve, reject, { binary: true, onlyVisible: true, truncateDrawRange: true }));
  if (!(data instanceof ArrayBuffer)) throw new Error(`Expected binary GLB for ${file}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(data));
}

await exportBinary(shotgunScene(), 'public/assets/weapons/shotgun.glb');
await exportBinary(bowScene(), 'public/assets/weapons/bow-arrow.glb');
console.log('generated', fs.statSync('public/assets/weapons/shotgun.glb').size, fs.statSync('public/assets/weapons/bow-arrow.glb').size);
