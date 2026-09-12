import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useTheme } from "@/lib/use-theme";

interface IntentNodeData {
  id: string;
  title: string;
  category: string;
  members: number;
  hash: string;
  color: string;
  position: [number, number, number];
}

const INTENT_NODES: IntentNodeData[] = [
  {
    id: "u_t2m",
    title: "AI Security Builders (Mumbai)",
    category: "Security · Live Room",
    members: 4,
    hash: "f067…5e77",
    color: "#10b981",
    position: [0, 0, 0],
  },
  {
    id: "u_9kd",
    title: "Learn Tabla Together",
    category: "Music · Matching",
    members: 2,
    hash: "b39e…9639",
    color: "#6366f1",
    position: [-5, 3.5, -2],
  },
  {
    id: "u_p81",
    title: "Game Jam Weekend (Pixel Artist)",
    category: "Dev · Gated",
    members: 3,
    hash: "a91f…c201",
    color: "#8b5cf6",
    position: [5, -2.5, 3],
  },
  {
    id: "u_c44",
    title: "Vegan Hiking Group",
    category: "Outdoors · Active",
    members: 5,
    hash: "77e2…d91a",
    color: "#06b6d4",
    position: [-4, -4, 2],
  },
  {
    id: "u_8xz",
    title: "Case Interview Practice",
    category: "Career · Live",
    members: 2,
    hash: "e441…8823",
    color: "#f59e0b",
    position: [4, 4, -3],
  },
];

export function ThreeIntentCluster() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { resolved } = useTheme();
  const [activeIntent, setActiveIntent] = useState<IntentNodeData>(INTENT_NODES[0]);
  const [hoveredTitle, setHoveredTitle] = useState<string | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isDark = resolved === "dark";
    const width = container.clientWidth;
    const height = 440;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 22);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 3. Lights
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0x6366f1, 2.5);
    dirLight1.position.set(10, 15, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x10b981, 2);
    dirLight2.position.set(-10, -10, -10);
    scene.add(dirLight2);

    // 4. Cluster Group
    const clusterGroup = new THREE.Group();
    scene.add(clusterGroup);

    // 5. Central Glowing Core Sphere
    const coreGeom = new THREE.IcosahedronGeometry(2.2, 2);
    const coreMat = new THREE.MeshPhongMaterial({
      color: isDark ? 0x6366f1 : 0x4f46e5,
      emissive: isDark ? 0x312e81 : 0x1e1b4b,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    clusterGroup.add(coreMesh);

    // 6. Orbital Rings
    const ringGeom = new THREE.TorusGeometry(8.5, 0.05, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0x818cf8 : 0x4338ca,
      transparent: true,
      opacity: 0.4,
    });
    const ring1 = new THREE.Mesh(ringGeom, ringMat);
    ring1.rotation.x = Math.PI / 3;
    clusterGroup.add(ring1);

    const ring2 = new THREE.Mesh(ringGeom, ringMat);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.x = -Math.PI / 6;
    clusterGroup.add(ring2);

    // 7. Render Intent Nodes (Spheres + Wireframe aura)
    const nodeMeshes: { mesh: THREE.Mesh; data: IntentNodeData }[] = [];

    INTENT_NODES.forEach((node) => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(...node.position);

      const color = new THREE.Color(node.color);
      const sphereGeom = new THREE.SphereGeometry(1.1, 32, 32);
      const sphereMat = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color.clone().multiplyScalar(0.4),
        shininess: 100,
      });

      const sphereMesh = new THREE.Mesh(sphereGeom, sphereMat);
      nodeGroup.add(sphereMesh);

      // Outer wireframe shell
      const auraGeom = new THREE.IcosahedronGeometry(1.5, 1);
      const auraMat = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      });
      const auraMesh = new THREE.Mesh(auraGeom, auraMat);
      nodeGroup.add(auraMesh);

      clusterGroup.add(nodeGroup);
      nodeMeshes.push({ mesh: sphereMesh, data: node });
    });

    // 8. Line connection graph
    const lineMat = new THREE.LineBasicMaterial({
      color: isDark ? 0xa5b4fc : 0x6366f1,
      transparent: true,
      opacity: 0.4,
    });

    for (let i = 0; i < INTENT_NODES.length; i++) {
      for (let j = i + 1; j < INTENT_NODES.length; j++) {
        const lineGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...INTENT_NODES[i].position),
          new THREE.Vector3(...INTENT_NODES[j].position),
        ]);
        const line = new THREE.Line(lineGeom, lineMat);
        clusterGroup.add(line);
      }
    }

    // Interactive Drag / Rotate Physics
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const raycaster = new THREE.Raycaster();
    const mouseVector = new THREE.Vector2();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseVector.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVector.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        clusterGroup.rotation.y += deltaX * 0.008;
        clusterGroup.rotation.x += deltaY * 0.008;

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }

      // Raycast hover
      raycaster.setFromCamera(mouseVector, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes.map((n) => n.mesh));

      if (intersects.length > 0) {
        const target = nodeMeshes.find((n) => n.mesh === intersects[0].object);
        if (target) {
          setHoveredTitle(target.data.title);
          renderer.domElement.style.cursor = "pointer";
        }
      } else {
        setHoveredTitle(null);
        renderer.domElement.style.cursor = "grab";
      }
    };

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseVector.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVector.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseVector, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes.map((n) => n.mesh));

      if (intersects.length > 0) {
        const target = nodeMeshes.find((n) => n.mesh === intersects[0].object);
        if (target) {
          setActiveIntent(target.data);
        }
      }
    };

    const domElement = renderer.domElement;
    domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    domElement.addEventListener("mousemove", onMouseMove);
    domElement.addEventListener("click", onClick);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (!isDragging) {
        clusterGroup.rotation.y += 0.003;
        clusterGroup.rotation.x = Math.sin(t * 0.5) * 0.15;
      }

      coreMesh.rotation.y = -t * 0.2;
      coreMesh.rotation.z = t * 0.15;

      ring1.rotation.z = t * 0.1;
      ring2.rotation.z = -t * 0.15;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      domElement.removeEventListener("mousemove", onMouseMove);
      domElement.removeEventListener("click", onClick);
      window.removeEventListener("resize", handleResize);
      if (container.contains(domElement)) {
        container.removeChild(domElement);
      }
      renderer.dispose();
    };
  }, [resolved]);

  return (
    <div className="relative w-full rounded-3xl border border-border bg-card/80 p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-primary/40">
      <div className="flex items-center justify-between font-mono-label text-xs">
        <span className="flex items-center gap-2 text-terminal-green">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-terminal-green" />
          Interactive 3D Intent Graph
        </span>
        <span className="text-muted-foreground">Drag to rotate · Click node</span>
      </div>

      {/* 3D WebGL Canvas Mounting Point */}
      <div ref={mountRef} className="relative h-[440px] w-full overflow-hidden rounded-2xl" />

      {/* Hover / Active Node Info Overlay Card */}
      <div className="mt-2 rounded-2xl border border-primary/30 bg-accent/60 p-4 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <span
              className="inline-block h-3 w-3 rounded-full mr-2"
              style={{ backgroundColor: activeIntent.color }}
            />
            <span className="font-semibold text-foreground text-sm">{activeIntent.title}</span>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono-label text-xs font-semibold text-primary">
            {activeIntent.category}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between font-mono-label text-xs text-muted-foreground">
          <span>{activeIntent.members} active members matched</span>
          <span>hash: {activeIntent.hash}</span>
        </div>
      </div>
    </div>
  );
}
