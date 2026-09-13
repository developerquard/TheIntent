import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useTheme } from "@/lib/use-theme";
import { useAccessibility } from "@/lib/use-accessibility";

export function Interactive3DBackdrop() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolved } = useTheme();
  const { reduceBackgroundEffects } = useAccessibility();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || reduceBackgroundEffects) return;

    const isDark = resolved === "dark";

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(isDark ? 0x09090b : 0xf8fafc, 0.015);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.z = 45;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(isDark ? 0x404060 : 0xaaaaaa, 1.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(isDark ? 0x6366f1 : 0x4f46e5, 3, 100);
    pointLight.position.set(20, 20, 20);
    scene.add(pointLight);

    const secondaryLight = new THREE.PointLight(isDark ? 0x10b981 : 0x059669, 2, 80);
    secondaryLight.position.set(-20, -20, 10);
    scene.add(secondaryLight);

    // 1. Create floating 3D intent nodes
    const nodeCount = 45;
    const nodesGroup = new THREE.Group();
    const nodePositions: THREE.Vector3[] = [];
    const nodeVelocities: THREE.Vector3[] = [];
    const nodeMeshes: THREE.Mesh[] = [];

    const geometries = [
      new THREE.IcosahedronGeometry(0.8, 0),
      new THREE.DodecahedronGeometry(0.7, 0),
      new THREE.OctahedronGeometry(0.75, 0),
      new THREE.SphereGeometry(0.6, 12, 12),
    ];

    const baseColor = isDark ? 0x6366f1 : 0x4338ca;
    const hotColor = isDark ? 0x10b981 : 0x059669;

    for (let i = 0; i < nodeCount; i++) {
      const geom = geometries[i % geometries.length];
      const isHot = i % 5 === 0;
      const mat = new THREE.MeshPhongMaterial({
        color: isHot ? hotColor : baseColor,
        emissive: isHot ? (isDark ? 0x042f2e : 0x064e3b) : isDark ? 0x1e1b4b : 0x312e81,
        shininess: 90,
        wireframe: i % 3 === 0,
        transparent: true,
        opacity: isDark ? 0.75 : 0.6,
      });

      const mesh = new THREE.Mesh(geom, mat);
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 70,
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 40,
      );

      mesh.position.copy(pos);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

      nodesGroup.add(mesh);
      nodeMeshes.push(mesh);
      nodePositions.push(pos);
      nodeVelocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.03,
          (Math.random() - 0.5) * 0.03,
          (Math.random() - 0.5) * 0.02,
        ),
      );
    }
    scene.add(nodesGroup);

    // 2. Line connections between close nodes
    const maxConnections = 120;
    const linePositions = new Float32Array(maxConnections * 6);
    const lineColors = new Float32Array(maxConnections * 6);

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.35 : 0.25,
      blending: THREE.AdditiveBlending,
    });
    const linesMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(linesMesh);

    // 3. Ambient Particle Starfield / Intent Dust
    const particleCount = 200;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 100;
      particlePos[i + 1] = (Math.random() - 0.5) * 80;
      particlePos[i + 2] = (Math.random() - 0.5) * 60;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: isDark ? 0.4 : 0.3,
      color: isDark ? 0xa5b4fc : 0x6366f1,
      transparent: true,
      opacity: isDark ? 0.4 : 0.3,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Mouse Parallax Physics
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const onMouseMove = (e: MouseEvent) => {
      mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse lerp
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      camera.position.x = mouse.x * 6;
      camera.position.y = mouse.y * 4;
      camera.lookAt(0, 0, 0);

      // Rotate light
      pointLight.position.x = Math.sin(elapsedTime * 0.5) * 25;
      pointLight.position.z = Math.cos(elapsedTime * 0.5) * 25;

      // Update Node positions & rotation
      for (let i = 0; i < nodeCount; i++) {
        const mesh = nodeMeshes[i];
        const pos = nodePositions[i];
        const vel = nodeVelocities[i];

        pos.add(vel);

        // Boundary rebound
        if (Math.abs(pos.x) > 38) vel.x *= -1;
        if (Math.abs(pos.y) > 28) vel.y *= -1;
        if (Math.abs(pos.z) > 22) vel.z *= -1;

        mesh.position.copy(pos);
        mesh.rotation.x += 0.005;
        mesh.rotation.y += 0.007;

        const pulse = 1 + Math.sin(elapsedTime * 1.4 + i * 0.7) * 0.08;
        mesh.scale.setScalar(pulse);
      }

      nodesGroup.rotation.y = Math.sin(elapsedTime * 0.12) * 0.08;
      nodesGroup.rotation.x = Math.cos(elapsedTime * 0.1) * 0.04;
      camera.position.z = 45 + Math.sin(elapsedTime * 0.18) * 1.2;

      // Update node connection lines
      let vertexIdx = 0;
      let colorIdx = 0;
      let connectionCount = 0;
      const connectionDistSq = 18 * 18;

      const c1 = isDark ? new THREE.Color(0x6366f1) : new THREE.Color(0x4f46e5);
      const c2 = isDark ? new THREE.Color(0x10b981) : new THREE.Color(0x059669);

      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          if (connectionCount >= maxConnections) break;

          const p1 = nodePositions[i];
          const p2 = nodePositions[j];
          const distSq = p1.distanceToSquared(p2);

          if (distSq < connectionDistSq) {
            linePositions[vertexIdx++] = p1.x;
            linePositions[vertexIdx++] = p1.y;
            linePositions[vertexIdx++] = p1.z;

            linePositions[vertexIdx++] = p2.x;
            linePositions[vertexIdx++] = p2.y;
            linePositions[vertexIdx++] = p2.z;

            const lerpFactor = 1 - Math.sqrt(distSq) / 18;
            const mixColor = c1.clone().lerp(c2, lerpFactor);

            lineColors[colorIdx++] = mixColor.r;
            lineColors[colorIdx++] = mixColor.g;
            lineColors[colorIdx++] = mixColor.b;

            lineColors[colorIdx++] = mixColor.r;
            lineColors[colorIdx++] = mixColor.g;
            lineColors[colorIdx++] = mixColor.b;

            connectionCount++;
          }
        }
      }

      lineGeometry.attributes.position.needsUpdate = true;
      lineGeometry.attributes.color.needsUpdate = true;
      lineGeometry.setDrawRange(0, connectionCount * 2);

      // Rotate particle background slow
      particles.rotation.y = elapsedTime * 0.02;
      particles.rotation.x = Math.sin(elapsedTime * 0.08) * 0.04;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [resolved, reduceBackgroundEffects]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ opacity: 0.9 }}
    />
  );
}
