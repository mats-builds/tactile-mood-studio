import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";
import { ArrowLeft, Upload, Camera, RotateCcw, Sparkles, Box } from "lucide-react";
import { userProductsStore } from "@/store/user-products";
import { useSelection } from "@/store/selection";
import { toast } from "sonner";
import { trimTransparentEdges } from "@/lib/alpha-cutout";
import JSZip from "jszip";

export const Route = createFileRoute("/3d-test")({
  component: ThreeDTestPage,
  head: () => ({
    meta: [
      { title: "Supermoods — 3D piece test" },
      { name: "description", content: "Upload a Collada (.dae) 3D model, frame it on the moodboard." },
    ],
  }),
});

function ThreeDTestPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasModel, setHasModel] = useState(false);
  const [bgTransparent, setBgTransparent] = useState(true);
  const blobUrlsRef = useRef<string[]>([]);
  const navigate = useNavigate();
  const { has, toggle } = useSelection();

  // Init three.js
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 5000);
    camera.position.set(3, 2.5, 4);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting — soft & editorial
    const hemi = new THREE.HemisphereLight(0xffffff, 0xb08968, 0.8);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(5, 8, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffe7c2, 0.5);
    fill.position.set(-6, 3, -4);
    scene.add(fill);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount || !rendererRef.current || !cameraRef.current) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update background color
  useEffect(() => {
    const r = rendererRef.current;
    const s = sceneRef.current;
    if (!r || !s) return;
    if (bgTransparent) {
      s.background = null;
      r.setClearColor(0x000000, 0);
    } else {
      const c = new THREE.Color(0xf5f0e8); // linen
      s.background = c;
      r.setClearColor(c, 1);
    }
  }, [bgTransparent]);

  function clearModel() {
    const scene = sceneRef.current;
    if (!scene || !modelRef.current) return;
    scene.remove(modelRef.current);
    modelRef.current.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) mat.dispose();
    });
    modelRef.current = null;
    setHasModel(false);
    // Revoke any blob URLs created for textures in a previous zip load.
    blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    blobUrlsRef.current = [];
  }

  function frameObject(obj: THREE.Object3D) {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    obj.position.x -= center.x;
    obj.position.y -= center.y;
    obj.position.z -= center.z;
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (maxDim / 2) / Math.tan(fov / 2);
    const offset = dist * 1.8;
    camera.position.set(offset * 0.7, offset * 0.55, offset * 0.9);
    camera.near = maxDim / 100;
    camera.far = maxDim * 100;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.update();
  }

  async function handleFile(file: File) {
    const lower = file.name.toLowerCase();
    const isDae = lower.endsWith(".dae");
    const isZip = lower.endsWith(".zip");
    if (!isDae && !isZip) {
      toast.error("Upload a .dae file or a .zip containing one");
      return;
    }
    setLoading(true);
    setFileName(file.name);
    try {
      let daeText: string;
      // Map of "relative/path/in/zip" → blob: URL, used to resolve texture refs.
      const resourceMap = new Map<string, string>();

      if (isZip) {
        const zip = await JSZip.loadAsync(file);
        const daeEntry = Object.values(zip.files).find(
          (f) => !f.dir && f.name.toLowerCase().endsWith(".dae"),
        );
        if (!daeEntry) {
          toast.error("No .dae file found inside the zip");
          return;
        }
        daeText = await daeEntry.async("string");
        const daeDir = daeEntry.name.includes("/")
          ? daeEntry.name.slice(0, daeEntry.name.lastIndexOf("/") + 1)
          : "";
        // Build blob URLs for every other file, keyed by their path RELATIVE to the .dae.
        await Promise.all(
          Object.values(zip.files).map(async (f) => {
            if (f.dir || f === daeEntry) return;
            const blob = await f.async("blob");
            const url = URL.createObjectURL(blob);
            blobUrlsRef.current.push(url);
            // Key by both the full zip path and the path relative to the .dae,
            // plus the bare filename, so however the .dae references it we can match.
            resourceMap.set(f.name, url);
            if (daeDir && f.name.startsWith(daeDir)) {
              resourceMap.set(f.name.slice(daeDir.length), url);
            }
            const base = f.name.split("/").pop();
            if (base) resourceMap.set(base, url);
          }),
        );
      } else {
        daeText = await file.text();
      }

      // Custom loading manager: rewrite any relative URL the ColladaLoader
      // tries to fetch (textures, etc.) to the matching blob URL from the zip.
      const manager = new THREE.LoadingManager();
      manager.setURLModifier((url) => {
        // Strip leading "./" and any base prefix three may have prepended.
        const cleaned = url.replace(/^\.?\//, "");
        const candidates = [
          cleaned,
          cleaned.split("/").pop() ?? cleaned,
          decodeURIComponent(cleaned),
          decodeURIComponent(cleaned.split("/").pop() ?? cleaned),
        ];
        for (const c of candidates) {
          const hit = resourceMap.get(c);
          if (hit) return hit;
        }
        return url;
      });
      const loader = new ColladaLoader(manager);
      const result = loader.parse(daeText, "");
      if (!result || !result.scene) {
        toast.error("This .dae file has no scene");
        return;
      }
      const obj = result.scene;
      // Make double-sided so plates/single-sided faces don't go invisible
      obj.traverse((n) => {
        const mesh = n as THREE.Mesh;
        if (mesh.isMesh && mesh.material) {
          const apply = (m: THREE.Material) => { m.side = THREE.DoubleSide; m.needsUpdate = true; };
          if (Array.isArray(mesh.material)) mesh.material.forEach(apply);
          else apply(mesh.material);
        }
      });
      clearModel();
      sceneRef.current?.add(obj);
      modelRef.current = obj;
      frameObject(obj);
      setHasModel(true);
      toast.success("Model loaded — drag to rotate, scroll to zoom");
    } catch (e) {
      console.error(e);
      toast.error("Failed to parse .dae file");
    } finally {
      setLoading(false);
    }
  }

  function resetView() {
    if (modelRef.current) frameObject(modelRef.current);
  }

  async function captureToMoodboard() {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera || !modelRef.current) return;
    // Force one render to ensure the latest frame is in the buffer
    renderer.render(scene, camera);
    let dataUrl = renderer.domElement.toDataURL("image/png");
    // If transparent bg, trim edges so it composes nicely on the moodboard
    if (bgTransparent) {
      try {
        dataUrl = await trimTransparentEdges(dataUrl);
      } catch {
        /* keep raw */
      }
    }
    const id = `3d-${Date.now()}`;
    const product = {
      id,
      name: fileName?.replace(/\.dae$/i, "") || "3D piece",
      maker: "3D import",
      price: "",
      category: "Decor" as const,
      src: dataUrl,
      colors: [],
      role: "ground" as const,
      description: "Captured from a 3D Collada model.",
    };
    const ok = userProductsStore.add(product);
    if (!ok) {
      toast.error("Sign in (or use guest mode) to save the snapshot");
      return;
    }
    if (!has(id)) toggle(id);
    toast.success("Snapshot added to your moodboard");
    setTimeout(() => navigate({ to: "/moodboard" }), 400);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} /> Back
        </Link>
        <div className="flex items-center gap-2">
          <Box size={16} className="text-rust" />
          <h1 className="font-serif text-xl text-ink">3D piece — test bench</h1>
        </div>
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Collada (.dae or .zip) · session only
        </span>
      </header>

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_320px]">
        {/* Viewer */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-[oklch(0.96_0.012_85)]">
          <div
            ref={mountRef}
            className="h-[70vh] w-full"
            style={{
              backgroundImage: bgTransparent
                ? "linear-gradient(45deg, oklch(0.92 0.01 85) 25%, transparent 25%), linear-gradient(-45deg, oklch(0.92 0.01 85) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, oklch(0.92 0.01 85) 75%), linear-gradient(-45deg, transparent 75%, oklch(0.92 0.01 85) 75%)"
                : undefined,
              backgroundSize: bgTransparent ? "20px 20px" : undefined,
              backgroundPosition: bgTransparent ? "0 0, 0 10px, 10px -10px, -10px 0" : undefined,
            }}
          />
          {!hasModel && !loading && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
              <Box size={36} strokeWidth={1.2} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Upload a Collada (.dae) file to load it here
              </p>
            </div>
          )}
          {loading && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <p className="text-sm text-ink">Parsing model…</p>
            </div>
          )}
        </div>

        {/* Side panel */}
        <aside className="flex flex-col gap-4">
          <label className="flex cursor-pointer flex-col items-start gap-2 rounded-2xl border border-dashed border-border bg-secondary/40 p-5 transition-colors hover:border-ink hover:bg-secondary">
            <div className="flex items-center gap-2 text-ink">
              <Upload size={16} />
              <span className="text-sm font-medium">Upload .dae or .zip</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Collada XML from SketchUp (File → Export → 3D Model → .dae). Zip the
              .dae together with its texture folder to keep materials.
            </p>
            <input
              type="file"
              accept=".dae,.zip,model/vnd.collada+xml,application/xml,text/xml,application/zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.currentTarget.value = "";
              }}
            />
            {fileName && (
              <p className="mt-1 truncate text-[11px] text-ink">{fileName}</p>
            )}
          </label>

          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Background
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setBgTransparent(true)}
                className={`flex-1 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  bgTransparent
                    ? "bg-ink text-background"
                    : "bg-secondary text-ink hover:bg-secondary/70"
                }`}
              >
                Transparent
              </button>
              <button
                onClick={() => setBgTransparent(false)}
                className={`flex-1 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  !bgTransparent
                    ? "bg-ink text-background"
                    : "bg-secondary text-ink hover:bg-secondary/70"
                }`}
              >
                Linen
              </button>
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">
              Transparent makes the snapshot blend cleanly into the moodboard.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={resetView}
              disabled={!hasModel}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-ink transition-colors hover:bg-secondary disabled:opacity-40"
            >
              <RotateCcw size={13} /> Reset view
            </button>
            <button
              onClick={captureToMoodboard}
              disabled={!hasModel}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-rust px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-primary-foreground transition-transform hover:scale-[1.01] disabled:scale-100 disabled:opacity-40"
            >
              <Camera size={14} /> Capture to moodboard
            </button>
          </div>

          <div className="rounded-2xl bg-secondary/50 p-4">
            <div className="mb-2 flex items-center gap-2 text-ink">
              <Sparkles size={13} className="text-rust" />
              <span className="text-[11px] uppercase tracking-[0.18em]">How to use</span>
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-[12px] leading-relaxed text-muted-foreground">
              <li>Drop a .dae export from SketchUp.</li>
              <li>Drag to orbit, scroll to zoom, right-drag to pan.</li>
              <li>Find the angle you want, then capture.</li>
              <li>The snapshot appears as a normal piece on your moodboard.</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
