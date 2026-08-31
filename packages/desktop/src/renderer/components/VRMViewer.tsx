// ============================================================
// VRM Viewer - Wyświetlanie modelu 3D Lisi
// Używa Three.js + @pixiv/three-vrm
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import type { LisiState } from '@shared/types';

interface VRMViewerProps {
  modelPath: string;
  state: LisiState;
  isSpeaking: boolean;
  isListening: boolean;
}

export function VRMViewer({ modelPath, state, isSpeaking, isListening }: VRMViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const vrmRef = useRef<any>(null);
  const clockRef = useRef(new THREE.Clock());
  const animationFrameRef = useRef<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- Inicjalizacja Three.js ----
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scena
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Kamera
    const camera = new THREE.PerspectiveCamera(25, width / height, 0.1, 100);
    camera.position.set(0, 1.3, 2.5);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    // Oświetlenie
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 2, 3);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Światło punktowe z przodu (twarz)
    const frontLight = new THREE.PointLight(0xffeedd, 0.5, 10);
    frontLight.position.set(0, 1.5, 2);
    scene.add(frontLight);

    // Subtelne różowe światło (anime vibe)
    const pinkLight = new THREE.PointLight(0xff6b9d, 0.2, 5);
    pinkLight.position.set(-1, 1, 1);
    scene.add(pinkLight);

    // Załaduj model VRM
    loadVRMModel(modelPath, scene);

    // Animacja
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      const delta = clockRef.current.getDelta();
      
      // Animuj VRM
      if (vrmRef.current) {
        vrmRef.current.update(delta);
        
        // Idle animation - delikatne kołysanie
        applyIdleAnimation(vrmRef.current, delta);
        
        // Animacja mówienia
        if (isSpeaking) {
          applySpeakingAnimation(vrmRef.current, delta);
        }
        
        // Animacja nasłuchiwania
        if (isListening) {
          applyListeningAnimation(vrmRef.current, delta);
        }
      }
      
      renderer.render(scene, camera);
    };
    
    animate();

    // Resize handler
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // ---- Załaduj model VRM ----
  const loadVRMModel = async (path: string, scene: THREE.Scene) => {
    try {
      setLoading(true);
      
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(
          path,
          resolve,
          (progress) => {
            console.log(`Ładowanie VRM: ${(progress.loaded / progress.total * 100).toFixed(0)}%`);
          },
          reject
        );
      });

      const vrm = gltf.userData.vrm;
      if (!vrm) {
        throw new Error('Plik nie zawiera prawidłowego modelu VRM');
      }

      // Optymalizuj model
      VRMUtils.removeUnnecessaryJoints(gltf.scene);
      VRMUtils.removeUnnecessaryVertices(gltf.scene);

      // Ustaw pozycję
      vrm.scene.position.set(0, 0, 0);
      vrm.scene.rotation.set(0, 0, 0);

      scene.add(vrm.scene);
      vrmRef.current = vrm;
      
      setLoading(false);
      console.log('Model VRM załadowany pomyślnie');
    } catch (err) {
      console.error('Błąd ładowania VRM:', err);
      setError('Nie udało się załadować modelu VRM');
      setLoading(false);
    }
  };

  // ---- Animacje ----
  const timeRef = useRef(0);

  const applyIdleAnimation = (vrm: any, delta: number) => {
    timeRef.current += delta;
    const t = timeRef.current;
    
    // Delikatne oddychanie
    const spine = vrm.humanoid?.getNormalizedBoneNode('spine');
    if (spine) {
      spine.rotation.x = Math.sin(t * 1.5) * 0.02;
    }
    
    // Delikatne kołysanie głową
    const head = vrm.humanoid?.getNormalizedBoneNode('head');
    if (head) {
      head.rotation.z = Math.sin(t * 0.8) * 0.03;
      head.rotation.x = Math.sin(t * 0.5) * 0.02;
    }
    
    // Mruganie (co ~4 sekundy)
    if (vrm.expressionManager) {
      const blinkCycle = t % 4;
      if (blinkCycle > 3.8 && blinkCycle < 3.95) {
        vrm.expressionManager.setValue('blink', 1);
      } else {
        vrm.expressionManager.setValue('blink', 0);
      }
    }
  };

  const applySpeakingAnimation = (vrm: any, delta: number) => {
    if (!vrm.expressionManager) return;
    
    const t = timeRef.current;
    
    // Animacja ust (lip sync symulowany)
    const mouthOpen = Math.abs(Math.sin(t * 8)) * 0.5 + 0.1;
    vrm.expressionManager.setValue('aa', mouthOpen);
    
    // Uśmiech podczas mówienia
    vrm.expressionManager.setValue('happy', 0.3);
    
    // Delikatne kiwanie głową
    const head = vrm.humanoid?.getNormalizedBoneNode('head');
    if (head) {
      head.rotation.x = Math.sin(t * 3) * 0.05;
    }
  };

  const applyListeningAnimation = (vrm: any, delta: number) => {
    if (!vrm.expressionManager) return;
    
    const t = timeRef.current;
    
    // Zainteresowana mina
    vrm.expressionManager.setValue('happy', 0.2);
    
    // Pochylona głowa (nasłuchiwanie)
    const head = vrm.humanoid?.getNormalizedBoneNode('head');
    if (head) {
      head.rotation.z = Math.sin(t * 0.5) * 0.08;
      head.rotation.y = Math.sin(t * 0.3) * 0.05;
    }
    
    // Uszy lisa (jeśli ma morph targety)
    vrm.expressionManager.setValue('relaxed', 0.5);
  };

  // ---- Render ----
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: 'inherit',
        overflow: 'hidden',
      }}
    >
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
          background: 'rgba(15, 15, 25, 0.8)',
          zIndex: 10,
        }}>
          <div style={{ fontSize: 48 }}>🦊</div>
          <div style={{ color: '#ff9a56', fontSize: 14 }}>Ładowanie Lisi...</div>
        </div>
      )}
      
      {error && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
          background: 'rgba(15, 15, 25, 0.9)',
          zIndex: 10,
        }}>
          <div style={{ fontSize: 48 }}>😿</div>
          <div style={{ color: '#f87171', fontSize: 14 }}>{error}</div>
          <div style={{ color: '#606078', fontSize: 12 }}>
            Upewnij się, że plik Lisi.vrm jest w głównym folderze
          </div>
        </div>
      )}
    </div>
  );
}
