import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { COUNTRIES } from "@/data/music";
import type { Country } from "@/lib/types";

type Props = {
  onSelect: (country: Country) => void;
  onOpen: (country: Country) => void;
  selected?: string;
};

function latLngToVec3(lat: number, lng: number, r: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

export default function Globe({ onSelect, onOpen, selected }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;
    const w = mount.clientWidth, h = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, 0, 280);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    mount.appendChild(renderer.domElement);

    // Starfield
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1500;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 400 + Math.random() * 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i*3+2] = r * Math.cos(phi);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: true, transparent: true, opacity: 0.85 }));
    scene.add(stars);

    // Procedural earth-like texture
    const tex = makeEarthTexture();
    const globeMat = new THREE.MeshPhongMaterial({
      map: tex,
      emissive: new THREE.Color(0x002211),
      emissiveIntensity: 0.4,
      shininess: 18,
      specular: new THREE.Color(0x00ff66),
    });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(80, 64, 64), globeMat);
    scene.add(globe);

    // Glow halo
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(84, 48, 48),
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        uniforms: { c: { value: new THREE.Color(0x00ff41) } },
        vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);}`,
        fragmentShader: `uniform vec3 c; varying vec3 vN; void main(){ float i = pow(0.7 - dot(vN, vec3(0,0,1.0)), 3.0); gl_FragColor = vec4(c, 1.0) * i;}`,
      })
    );
    globe.add(halo);

    // Lights
    scene.add(new THREE.AmbientLight(0x445577, 0.7));
    const dir = new THREE.DirectionalLight(0x00ffaa, 1.0);
    dir.position.set(150, 100, 200);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xff44aa, 0.6);
    dir2.position.set(-200, -50, 100);
    scene.add(dir2);

    // Country pins
    const pinGroup = new THREE.Group();
    globe.add(pinGroup);
    const pinMeshes: { mesh: THREE.Mesh; ring: THREE.Mesh; country: Country }[] = [];

    COUNTRIES.forEach((c) => {
      const pos = latLngToVec3(c.lat, c.lng, 80.5);
      const pin = new THREE.Mesh(
        new THREE.SphereGeometry(1.4, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x00ff41 }),
      );
      pin.position.copy(pos);
      pin.userData.country = c;
      pinGroup.add(pin);

      const ringGeo = new THREE.RingGeometry(2.2, 3.0, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xff006e, side: THREE.DoubleSide, transparent: true, opacity: 0 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(0, 0, 0);
      ring.rotateY(Math.PI);
      pinGroup.add(ring);

      pinMeshes.push({ mesh: pin, ring, country: c });
    });

    // Interaction
    const ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false, prevX = 0, prevY = 0;
    let velX = 0.0015, velY = 0;
    let lastInteraction = performance.now();
    const targetRot = { x: 0.2, y: 0 };
    const curRot = { x: 0.2, y: 0 };
    let zoom = 280;

    const onDown = (e: PointerEvent) => { isDragging = true; prevX = e.clientX; prevY = e.clientY; lastInteraction = performance.now(); };
    const onUp = () => { isDragging = false; };
    const onMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      if (isDragging) {
        targetRot.y += (e.clientX - prevX) * 0.005;
        targetRot.x += (e.clientY - prevY) * 0.005;
        targetRot.x = Math.max(-1.2, Math.min(1.2, targetRot.x));
        prevX = e.clientX; prevY = e.clientY;
        lastInteraction = performance.now();
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom = Math.max(160, Math.min(450, zoom + e.deltaY * 0.3));
      lastInteraction = performance.now();
    };
    const onClick = () => {
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObjects(pinMeshes.map(p => p.mesh));
      if (hits.length > 0) {
        const c = hits[0].object.userData.country as Country;
        onSelect(c);
      }
    };
    const onDouble = () => {
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObjects(pinMeshes.map(p => p.mesh));
      if (hits.length > 0) onOpen(hits[0].object.userData.country as Country);
    };

    renderer.domElement.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("click", onClick);
    renderer.domElement.addEventListener("dblclick", onDouble);

    // Hover detection
    const hoverCheck = () => {
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObjects(pinMeshes.map(p => p.mesh));
      const name = hits[0]?.object.userData.country?.name ?? null;
      setHovered(name);
      renderer.domElement.style.cursor = name ? "pointer" : "grab";
    };

    let raf = 0;
    const tick = () => {
      const t = performance.now();
      // auto rotate after 3s idle
      if (!isDragging && t - lastInteraction > 3000) targetRot.y += 0.0018;

      curRot.x += (targetRot.x - curRot.x) * 0.08;
      curRot.y += (targetRot.y - curRot.y) * 0.08;
      globe.rotation.x = curRot.x;
      globe.rotation.y = curRot.y;
      stars.rotation.y += 0.0003;

      camera.position.z += (zoom - camera.position.z) * 0.08;

      // pulse pins / highlight selected & hovered
      pinMeshes.forEach(({ mesh, ring, country }) => {
        const isSel = selected === country.name;
        const isHov = hovered === country.name;
        const target = isSel ? 0.9 : isHov ? 0.7 : 0;
        const m = ring.material as THREE.MeshBasicMaterial;
        m.opacity += (target - m.opacity) * 0.15;
        const scale = 1 + (isSel || isHov ? 0.4 + Math.sin(t * 0.005) * 0.15 : 0);
        mesh.scale.setScalar(scale);
        (mesh.material as THREE.MeshBasicMaterial).color.set(isSel ? 0xff006e : isHov ? 0x00d4ff : 0x00ff41);
      });

      hoverCheck();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    // Resize
    const onResize = () => {
      const W = mount.clientWidth, H = mount.clientHeight;
      camera.aspect = W / H; camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("dblclick", onDouble);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="absolute inset-0" aria-label="Globe interactif des pays" />
      {hovered && (
        <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 glass rounded-md font-mono text-sm glow-cyan">
          {hovered}
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 left-3 text-[10px] font-mono text-muted-foreground">
        DRAG · SCROLL · CLICK · DOUBLE-CLICK
      </div>
    </div>
  );
}

// Procedural Earth-ish texture (continents blobs + grid)
function makeEarthTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 2048; c.height = 1024;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#03061a");
  grad.addColorStop(1, "#070d2b");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);

  // grid lines
  g.strokeStyle = "rgba(0,255,65,0.08)"; g.lineWidth = 1;
  for (let x = 0; x < 2048; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1024); g.stroke(); }
  for (let y = 0; y < 1024; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(2048, y); g.stroke(); }

  // simplified continent silhouettes (rough rectangles + blobs)
  const land = (x: number, y: number, w: number, h: number) => {
    g.fillStyle = "rgba(0,255,65,0.55)";
    g.beginPath();
    const pts = 18;
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const rr = 0.8 + Math.sin(i * 1.7) * 0.25;
      const px = x + Math.cos(a) * (w / 2) * rr;
      const py = y + Math.sin(a) * (h / 2) * rr;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.fill();
  };
  // North America
  land(380, 380, 360, 280);
  // South America
  land(580, 720, 200, 260);
  // Europe
  land(1020, 360, 200, 180);
  // Africa
  land(1080, 620, 240, 320);
  // Asia
  land(1400, 380, 480, 320);
  // Australia
  land(1700, 760, 240, 160);

  // glow dots
  for (let i = 0; i < 200; i++) {
    g.fillStyle = `rgba(0,212,255,${Math.random()*0.5})`;
    g.fillRect(Math.random()*2048, Math.random()*1024, 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
