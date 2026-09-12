import { useEffect, useRef } from "react";
import { useTheme } from "@/lib/use-theme";
import { useAccessibility } from "@/lib/use-accessibility";

/**
 * 3D animated footer component with floating geometric shapes
 * Uses Three.js for performance-optimized 3D rendering
 */
export function ThreeDFooter() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolved } = useTheme();
  const { reduceBackgroundEffects } = useAccessibility();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || reduceBackgroundEffects) return;

    let animationFrameId: number;

    const initThreeJS = async () => {
      let THREE: any;
      try {
        THREE = await import('three');
      } catch (error) {
        console.error('Failed to load Three.js:', error);
        return;
      }
      
      // Scene setup
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: true,
        powerPreference: 'high-performance'
      });
      
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      container.appendChild(renderer.domElement);

      // Create floating geometric shapes
      const shapes: any[] = [];
      const geometries = [
        new THREE.IcosahedronGeometry(0.5, 0),
        new THREE.OctahedronGeometry(0.4, 0),
        new THREE.TetrahedronGeometry(0.5, 0),
        new THREE.TorusGeometry(0.3, 0.1, 8, 16),
      ];

      const isDark = resolved === "dark";
      const baseColor = isDark ? 0x6366f1 : 0x3b82f6;
      const accentColor = isDark ? 0x8b5cf6 : 0x6366f1;

      // Create 8 floating shapes (reduced from 15 for performance)
      for (let i = 0; i < 8; i++) {
        const geometry = geometries[Math.floor(Math.random() * geometries.length)];
        const material = new THREE.MeshPhongMaterial({
          color: Math.random() > 0.5 ? baseColor : accentColor,
          transparent: true,
          opacity: 0.8,
          shininess: 100,
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Random positions - centered and visible
        mesh.position.x = (Math.random() - 0.5) * 6;
        mesh.position.y = (Math.random() - 0.5) * 3;
        mesh.position.z = (Math.random() - 0.5) * 3;
        
        // Random rotation speeds
        mesh.userData = {
          rotationSpeed: {
            x: (Math.random() - 0.5) * 0.02,
            y: (Math.random() - 0.5) * 0.02,
            z: (Math.random() - 0.5) * 0.02,
          },
          floatSpeed: Math.random() * 0.01 + 0.005,
          floatOffset: Math.random() * Math.PI * 2,
        };
        
        scene.add(mesh);
        shapes.push(mesh);
      }

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const pointLight = new THREE.PointLight(0xffffff, 1);
      pointLight.position.set(5, 5, 5);
      scene.add(pointLight);

      camera.position.z = 4;

      // Animation loop with performance optimization
      let lastTime = 0;
      const targetFPS = 24; // Reduced from 30 for better performance
      const frameInterval = 1000 / targetFPS;

      function animate(currentTime: number) {
        animationFrameId = requestAnimationFrame(animate);

        // Throttle to 24fps for performance
        if (currentTime - lastTime < frameInterval) return;
        lastTime = currentTime;

        const time = currentTime * 0.001;

        shapes.forEach((shape) => {
          // Rotation
          shape.rotation.x += shape.userData.rotationSpeed.x;
          shape.rotation.y += shape.userData.rotationSpeed.y;
          shape.rotation.z += shape.userData.rotationSpeed.z;

          // Floating motion
          shape.position.y += Math.sin(time + shape.userData.floatOffset) * shape.userData.floatSpeed;
        });

        // Subtle camera movement
        camera.position.x = Math.sin(time * 0.2) * 0.5;
        camera.position.y = Math.cos(time * 0.15) * 0.3;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
      }

      animate(0);

      // Handle resize
      const handleResize = () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      };

      window.addEventListener('resize', handleResize);

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
        renderer.dispose();
        geometries.forEach(geo => geo.dispose());
        shapes.forEach(shape => {
          if (shape.material) shape.material.dispose();
        });
      };
    };

    const cleanupPromise = initThreeJS();

    return () => {
      cleanupPromise.then(cleanup => cleanup?.());
    };
  }, [resolved, reduceBackgroundEffects]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-48 md:h-64 relative overflow-hidden"
      style={{ 
        background: resolved === 'dark' ? 'rgba(15, 23, 42, 0.3)' : 'rgba(241, 245, 249, 0.5)',
        zIndex: 10
      }}
    />
  );
}
