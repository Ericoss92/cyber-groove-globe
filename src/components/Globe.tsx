import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useGlobeData, type GlobePoint } from "@/hooks/useGlobeData";

/**
 * Globe 3D réaliste (NASA Blue Marble) avec deux états :
 *  - compact : sticky à droite, auto-rotation lente, clic = expand
 *  - expanded : fullscreen modal, drag/zoom/hover/Esc
 *
 * Texture locale : /earth-2k.jpg (placer manuellement dans /public).
 * Fallback : CDN three-globe (jsdelivr) si absent.
 */
const EARTH_LOCAL = "/earth-2k.jpg";
const EARTH_FALLBACK =
  "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
const BUMP_URL = "https://unpkg.com/three-globe/example/img/earth-topology.png";

type Props = {
  /** Mode contrôlé : si fourni, le composant ne gère pas son propre état. */
  expanded?: boolean;
  onExpandedChange?: (v: boolean) => void;
};

export default function Globe({ expanded: ctrl, onExpandedChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerExpanded = useRef(false);
  const [expanded, setExpandedState] = useState(false);
  const navigate = useNavigate();
  const points = useGlobeData();

  const isControlled = typeof ctrl === "boolean";
  const isExpanded = isControlled ? !!ctrl : expanded;

  const setExpanded = useCallback(
    (v: boolean) => {
      innerExpanded.current = v;
      if (isControlled) onExpandedChange?.(v);
      else setExpandedState(v);
    },
    [isControlled, onExpandedChange],
  );

  // Esc pour fermer
  useEffect(() => {
    if (!isExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isExpanded, setExpanded]);

  // Scene Three.js — montée une seule fois, attachée au container actif
  useEffect(() => {
    const mount = containerRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.z = 300;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.outline = "none";

    // Lumières — équilibre jour/nuit doux
    scene.add(new THREE.AmbientLight(0xbfd4ff, 0.55));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(200, 120, 200);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x00ffaa, 0.25);
    rim.position.set(-200, -50, -100);
    scene.add(rim);

    // Globe
    const globe = new ThreeGlobe()
      .globeImageUrl(EARTH_LOCAL)
      .bumpImageUrl(BUMP_URL)
      .showAtmosphere(true)
      .atmosphereColor("#3aa6ff")
      .atmosphereAltitude(0.18)
      .pointsData(points)
      .pointLat((d: object) => (d as GlobePoint).lat)
      .pointLng((d: object) => (d as GlobePoint).lng)
      .pointColor(() => "#00ff66")
      .pointAltitude(0.02)
      .pointRadius(0.55)
      .pointsMerge(false)
      .pointsTransitionDuration(0);

    // Hover label + click navigation (typed accessors not in d.ts)
    (globe as unknown as {
      pointLabel: (fn: (d: object) => string) => unknown;
      onPointClick: (fn: (d: object) => void) => unknown;
    }).pointLabel((d: object) => {
      const p = d as GlobePoint;
      return `<div style="background:rgba(10,14,39,0.92);border:1px solid #00ff66;padding:6px 10px;border-radius:6px;font-family:monospace;color:#fff;font-size:12px"><b style="color:#00ff66">${p.name}</b><br/><span style="color:#00d4ff">${p.count} artiste${p.count > 1 ? "s" : ""}</span></div>`;
    });
    (globe as unknown as {
      onPointClick: (fn: (d: object) => void) => unknown;
    }).onPointClick((d: object) => {
      const p = d as GlobePoint;
      navigate({ to: "/country/$country", params: { country: p.name } });
    });


    // Fallback si la texture locale échoue (404)
    const probe = new Image();
    probe.onerror = () => globe.globeImageUrl(EARTH_FALLBACK);
    probe.src = EARTH_LOCAL;

    scene.add(globe);

    // ---- Interactions custom (drag + wheel + auto-rotate + click) ----
    let isDragging = false;
    let downX = 0,
      downY = 0;
    let lastX = 0,
      lastY = 0;
    let velX = 0,
      velY = 0;
    let lastInteract = performance.now();
    const ROT_SPEED = 0.0008;

    const el = renderer.domElement;
    el.style.cursor = "grab";

    // Raycaster — three-globe exposes points via globe.children meshes,
    // but the simplest robust path is to raycast against the entire globe
    // subtree and resolve back to the nearest GlobePoint by lat/lng.
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    /** Resolve a screen-space click to the nearest country point, if hit. */
    const pickCountry = (clientX: number, clientY: number): GlobePoint | null => {
      const rect = el.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(globe, true);
      if (!hits.length) return null;
      // Convert the hit world-point back to lat/lng and match nearest point
      const hitWorld = hits[0].point.clone();
      globe.worldToLocal(hitWorld);
      const radius = hitWorld.length();
      if (radius === 0) return null;
      const lat = 90 - (Math.acos(hitWorld.y / radius) * 180) / Math.PI;
      const lng = (Math.atan2(hitWorld.z, -hitWorld.x) * 180) / Math.PI;
      let best: GlobePoint | null = null;
      let bestD = Infinity;
      for (const p of points) {
        const dLat = p.lat - lat;
        const dLng = p.lng - lng;
        const d = dLat * dLat + dLng * dLng;
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      // ~7° tolerance
      return best && bestD < 50 ? best : null;
    };

    const onDown = (e: PointerEvent) => {
      isDragging = true;
      downX = e.clientX;
      downY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
      el.style.cursor = "grabbing";
      lastInteract = performance.now();
    };
    const onMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      velY = dx * 0.005;
      velX = dy * 0.005;
      globe.rotation.y += velY;
      globe.rotation.x = Math.max(
        -1.2,
        Math.min(1.2, globe.rotation.x + velX),
      );
      lastX = e.clientX;
      lastY = e.clientY;
      lastInteract = performance.now();
    };
    const onUp = (e: PointerEvent) => {
      const wasClick =
        Math.abs(e.clientX - downX) < 4 && Math.abs(e.clientY - downY) < 4;
      isDragging = false;
      el.style.cursor = "grab";
      // Country click — only in expanded mode (compact mode = open fullscreen)
      if (wasClick && innerExpanded.current) {
        const p = pickCountry(e.clientX, e.clientY);
        if (p) navigate({ to: "/country/$country", params: { country: p.name } });
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (!innerExpanded.current) return;
      e.preventDefault();
      camera.position.z = Math.max(
        140,
        Math.min(450, camera.position.z + e.deltaY * 0.35),
      );
      lastInteract = performance.now();
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });


    // Resize observer — suit le container
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    // Debounce via rAF to avoid "ResizeObserver loop" warnings
    let resizeRaf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(resize);
    });
    ro.observe(mount);


    // Boucle d'animation
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      // Inertie + auto-rotation après 2s d'inactivité
      if (!isDragging) {
        velY *= 0.94;
        velX *= 0.94;
        globe.rotation.y += velY;
        globe.rotation.x += velX;
        if (now - lastInteract > 2000) globe.rotation.y += ROT_SPEED;
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("wheel", onWheel);
      mount.removeChild(el);
      renderer.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
    };
    // Recrée la scène quand on change de container (compact <-> expanded)
  }, [isExpanded, navigate, points]);

  // --- Rendu ---
  const compactClasses =
    "relative w-full h-full overflow-hidden cursor-pointer transition-[filter] duration-500 ease-out hover:[filter:drop-shadow(0_0_24px_color-mix(in_oklab,var(--neon-green)_50%,transparent))]";

  const expandedClasses = "relative w-full h-full";

  if (isExpanded) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-500"
        style={{
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Globe musical en plein écran"
      >
        <button
          onClick={() => setExpanded(false)}
          aria-label="Fermer le globe (Échap)"
          className="absolute top-4 right-4 z-[60] size-11 rounded-full flex items-center justify-center border border-[color:var(--neon-cyan)] bg-[color:var(--background)]/80 text-[color:var(--neon-cyan)] hover:bg-[color:var(--neon-cyan)] hover:text-[color:var(--background)] transition"
        >
          <X className="size-5" />
        </button>
        <div ref={containerRef} className={expandedClasses} />
        <p className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 text-xs font-mono text-[color:var(--neon-cyan)]/80">
          DRAG · SCROLL · HOVER · CLICK · ESC
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={() => setExpanded(true)}
      role="button"
      tabIndex={0}
      aria-label="Agrandir le globe interactif"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setExpanded(true);
      }}
      className={compactClasses}
      title="Clic pour explorer"
    />
  );
}
