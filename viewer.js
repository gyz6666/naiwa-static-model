import * as THREE from 'three';
import { GLTFLoader } from './GLTFLoader.js';
const canvas=document.querySelector('#model');
const scene=new THREE.Scene();
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.LinearToneMapping;
renderer.toneMappingExposure=.80;
const camera=new THREE.PerspectiveCamera(27,1,.1,80);
let modelCenterY=2.25;
camera.position.set(0,modelCenterY+.95,13.2);camera.lookAt(0,modelCenterY-.20,0);
scene.add(new THREE.HemisphereLight(0xfff9e9,0xe4cd8d,2.35));
const key=new THREE.DirectionalLight(0xfff4dd,2.05);key.position.set(-3,7,5);scene.add(key);
const fill=new THREE.DirectionalLight(0xffffff,1.05);fill.position.set(4,4,-3);scene.add(fill);
const pivot=new THREE.Group();pivot.position.y=2.25;scene.add(pivot);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(5.5,5.5),new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;void main(){float d=length((vUv-.5)*vec2(1.,1.7));float a=.15*exp(-d*d*28.);gl_FragColor=vec4(.35,.31,.16,a);}'}));
ground.rotation.x=-Math.PI/2;ground.position.set(0,.003,0);scene.add(ground);
function resize(){const r=canvas.parentElement.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.position.set(0,modelCenterY+.95,camera.aspect<.8?14.6:13.2);camera.lookAt(0,modelCenterY-.20,0);camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(canvas.parentElement);resize();
let drag=null,spin=false,loaded=false,last=performance.now();
function turn(yaw,pitch=0){pivot.rotation.set(pitch,yaw,0);canvas.dataset.yaw=String(yaw);}
function stopSpin(){spin=false;document.querySelector('#spin').setAttribute('aria-pressed','false');}
document.querySelector('#reset').onclick=()=>{stopSpin();turn(.88);};
document.querySelector('#front').onclick=()=>{stopSpin();turn(.88);};
document.querySelector('#side').onclick=()=>{stopSpin();turn(.88+Math.PI/2);};
document.querySelector('#back').onclick=()=>{stopSpin();turn(.88+Math.PI);};
document.querySelector('#spin').onclick=()=>{spin=!spin;document.querySelector('#spin').setAttribute('aria-pressed',String(spin));};
canvas.addEventListener('pointerdown',e=>{stopSpin();drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:pivot.rotation.y,pitch:pivot.rotation.x};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;turn(drag.yaw+(e.clientX-drag.x)*.009,THREE.MathUtils.clamp(drag.pitch+(e.clientY-drag.y)*.006,-1.15,1.15));});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{drag=null;});
canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();stopSpin();if(e.key==='Home')turn(0);else turn(pivot.rotation.y+(e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0),THREE.MathUtils.clamp(pivot.rotation.x+(e.key==='ArrowUp'?-.10:e.key==='ArrowDown'?.10:0),-1.15,1.15));});
try{const gltf=await new GLTFLoader().loadAsync('./naiwa-refined.glb');const bounds=new THREE.Box3().setFromObject(gltf.scene);modelCenterY=(bounds.min.y+bounds.max.y)/2;pivot.position.y=modelCenterY;gltf.scene.position.y=-modelCenterY;pivot.add(gltf.scene);resize();loaded=true;canvas.dataset.loaded='true';let meshes=0;gltf.scene.traverse(o=>{if(o.isMesh)meshes++;});canvas.dataset.meshes=String(meshes);}catch(e){const error=document.querySelector('#error');error.hidden=false;error.textContent='模型暂时无法加载，请刷新重试。';canvas.dataset.error=e.message;console.error(e);}finally{document.querySelector('#loading').hidden=true;}
// Start face-on so both updated hands are visible as soon as the page opens.
turn(.88);
function frame(now){const dt=Math.min((now-last)/1000,.04);last=now;if(spin&&loaded)turn(pivot.rotation.y+dt*.38,pivot.rotation.x);renderer.render(scene,camera);requestAnimationFrame(frame);}requestAnimationFrame(frame);
