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
    // three-globe expose des accessors typés `object` — on cast vers GlobePoint
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

    // Méthodes non typées dans le .d.ts fourni — accès via cast
    const g = globe as unknown as {
      pointLabel: (fn: (d: object) => string) => void;
      onPointClick: (fn: (d: object) => void) => void;
    };
    g.pointLabel((d: object) => {
      const p = d as GlobePoint;
      return `<div style="padding:6px 10px;background:rgba(5,10,25,.92);border:1px solid #00ff66;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#e8f0ff"><strong style="color:#00ff66">${p.name}</strong> · ${p.count} artistes</div>`;
    });
    g.onPointClick((d: object) => {
      const p = d as GlobePoint;
      navigate({ to: "/country/$country", params: { country: p.name } });
    });

    // Fallback si la texture locale échoue (404)
    const probe = new Image();
    probe.onerror = () => globe.globeImageUrl(EARTH_FALLBACK);
    probe.src = EARTH_LOCAL;

    scene.add(globe);

    // ---- Interactions custom (drag + wheel + auto-rotate) ----
    let isDragging = false;
    let lastX = 0,
      lastY = 0;
    let velX = 0,
      velY = 0;
    let lastInteract = performance.now();
    const ROT_SPEED = 0.0008; // auto-rotation lente

    const el = renderer.domElement;
    el.style.cursor = "grab";

    const onDown = (e: PointerEvent) => {
      isDragging = true;
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
    const onUp = () => {
      isDragging = false;
      el.style.cursor = "grab";
    };
    const onWheel = (e: WheelEvent) => {
      if (!innerExpanded.current) return; // pas de zoom en mode compact
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
    const ro = new ResizeObserver(resize);
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
    "relative w-full h-full rounded-2xl overflow-hidden cursor-pointer transition-transform duration-500 ease-out hover:scale-[1.02] box-glow-green";
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
