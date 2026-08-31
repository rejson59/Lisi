// ============================================================
// VRM Viewer v2 - Zaawansowany model 3D z prawdziwym lip sync
// i bogatymi emocjami
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, VRMExpressionPresetName } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';
import type { LisiState } from '@shared/types';
import { LipSyncEngine } from './lip-sync';
import { EmotionEngine, type EmotionType, type EmotionWeights } from './emotions';

interface VRMViewerProps {
  modelPath: string;
  state: LisiState;
  isSpeaking: boolean;
  isListening: boolean;
  /** Zewnętrzne AudioContext do analizy lip sync */
  audioContext?: AudioContext | null;
  /** źródło audio do lip sync (np. z Gemini) */
  audioSource?: AudioNode | null;
  /** Aktualna emocja z zewnątrz (np. z analizy tekstu) */
  emotion?: EmotionType;
  /** Callback gdy model gotowy */
  onReady?: () => void;
}

export function VRMViewer({
  modelPath,
  state,
  isSpeaking,
  isListening,
  audioContext,
  audioSource,
  emotion,
  onReady,
}: VRMViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const animationFrameRef = useRef<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Silniki animacji
  const lipSyncRef = useRef(new LipSyncEngine());
  const emotionEngineRef = useRef(new EmotionEngine());
  const timeRef = useRef(0);
  const prevStateRef = useRef<LisiState>('idle');

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
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scena
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Kamera - lekko z dołu, patrzy na twarz
    const camera = new THREE.PerspectiveCamera(22, width / height, 0.1, 100);
    camera.position.set(0, 1.25, 2.8);
    camera.lookAt(0, 1.15, 0);
    cameraRef.current = camera;

    // Oświetlenie - trójwarstwowe (key, fill, rim)
    // Key light - główne, ciepłe
    const keyLight = new THREE.DirectionalLight(0xfff0e6, 1.0);
    keyLight.position.set(1, 2, 2);
    scene.add(keyLight);

    // Fill light - wypełniające, chłodne
    const fillLight = new THREE.DirectionalLight(0xe6f0ff, 0.4);
    fillLight.position.set(-1.5, 1, 1);
    scene.add(fillLight);

    // Rim light - konturowe z tyłu
    const rimLight = new THREE.DirectionalLight(0xffd4e8, 0.6);
    rimLight.position.set(0, 1.5, -2);
    scene.add(rimLight);

    // Ambient - ogólne
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Subtelne różowe światło (anime vibe)
    const pinkLight = new THREE.PointLight(0xff6b9d, 0.15, 5);
    pinkLight.position.set(-1, 0.5, 1.5);
    scene.add(pinkLight);

    // Załaduj model VRM
    loadVRMModel(modelPath, scene);

    // Główna pętla animacji
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      timeRef.current += delta;

      if (vrmRef.current) {
        vrmRef.current.update(delta);
        updateAnimation(vrmRef.current, delta);
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize
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
      lipSyncRef.current.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ---- Inicjalizuj lip sync gdy dostępne audio ----
  useEffect(() => {
    if (audioContext && audioSource) {
      lipSyncRef.current.init(audioContext);
      lipSyncRef.current.connectSource(audioSource);
    }
  }, [audioContext, audioSource]);

  // ---- Zmiana emocji z zewnątrz ----
  useEffect(() => {
    if (emotion) {
      emotionEngineRef.current.setEmotion(emotion);
    }
  }, [emotion]);

  // ---- Reakcja na zmianę stanu ----
  useEffect(() => {
    const engine = emotionEngineRef.current;
    
    if (state !== prevStateRef.current) {
      prevStateRef.current = state;
      
      switch (state) {
        case 'listening':
          engine.setEmotion('happy', 0, 0.4);
          engine.addEmotion('excited', 0.6, 2000);
          break;
        case 'thinking':
          engine.setEmotion('thinking', 0, 0.8);
          break;
        case 'speaking':
          engine.setEmotion('happy', 0, 0.5);
          break;
        case 'executing':
          engine.setEmotion('proud', 0, 0.6);
          break;
        case 'error':
          engine.setEmotion('worried', 0, 0.7);
          engine.addEmotion('sad', 0.4, 3000);
          break;
        case 'idle':
          engine.setEmotion('neutral');
          break;
      }
    }
  }, [state]);

  // ---- Załaduj model VRM ----
  const loadVRMModel = async (path: string, scene: THREE.Scene) => {
    try {
      setLoading(true);

      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(path, resolve, (p) => {
          console.log(`Ładowanie VRM: ${((p.loaded / p.total) * 100).toFixed(0)}%`);
        }, reject);
      });

      const vrm = gltf.userData.vrm as VRM;
      if (!vrm) throw new Error('Plik nie zawiera prawidłowego modelu VRM');

      VRMUtils.removeUnnecessaryJoints(gltf.scene);
      VRMUtils.removeUnnecessaryVertices(gltf.scene);

      vrm.scene.position.set(0, 0, 0);
      vrm.scene.rotation.set(0, 0, 0);

      scene.add(vrm.scene);
      vrmRef.current = vrm;
      setLoading(false);
      onReady?.();

      // Loguj dostępne blend shapes
      if (vrm.expressionManager) {
        console.log('[VRM] Dostępne expressions:', 
          Object.keys((vrm.expressionManager as any).expressionMap || {}));
      }

      console.log('Model VRM załadowany pomyślnie');
    } catch (err) {
      console.error('Błąd ładowania VRM:', err);
      setError('Nie udało się załadować modelu VRM');
      setLoading(false);
    }
  };

  // ============================================================
  // GŁÓWNA FUNKCJA ANIMACJI - wywoływana co klatkę
  // ============================================================
  const updateAnimation = useCallback((vrm: VRM, delta: number) => {
    const t = timeRef.current;
    const em = emotionEngineRef.current;
    const lipSync = lipSyncRef.current;
    const expr = vrm.expressionManager;
    if (!expr) return;

    // 1. Pobierz wagi emocji
    const emotionWeights = em.update(delta);

    // 2. Pobierz klatkę lip sync
    const lipSyncFrame = lipSync.getFrame();

    // 3. Zastosuj emocje na twarz
    applyEmotionsToFace(expr, emotionWeights);

    // 4. Zastosuj lip sync (miesza się z emocjami)
    if (isSpeaking && lipSyncFrame.isVoiced) {
      applyLipSync(expr, lipSyncFrame.visemes);
    } else if (isSpeaking) {
      // Fallback: delikatny ruch ust nawet bez audio
      applyFallbackLipSync(expr, t);
    } else {
      // Zamknij usta gdy nie mówi
      fadeExpression(expr, 'aa', 0, delta * 5);
      fadeExpression(expr, 'ih', 0, delta * 5);
      fadeExpression(expr, 'ou', 0, delta * 5);
      fadeExpression(expr, 'ee', 0, delta * 5);
      fadeExpression(expr, 'oh', 0, delta * 5);
    }

    // 5. Mruganie (z EmotionEngine)
    setExpressionSafe(expr, 'blink', Math.max(emotionWeights.blinkLeft, emotionWeights.blinkRight));

    // 6. Ruchy głowy i ciała
    applyBodyAnimation(vrm, emotionWeights, t, delta);
  }, [isSpeaking, isListening]);

  // ---- Emocje na twarz ----
  const applyEmotionsToFace = (expr: any, weights: EmotionWeights) => {
    // Podstawowe emocje VRM
    setExpressionSafe(expr, 'happy', weights.happy);
    setExpressionSafe(expr, 'angry', weights.angry);
    setExpressionSafe(expr, 'sad', weights.sad);
    setExpressionSafe(expr, 'relaxed', weights.relaxed);
    setExpressionSafe(expr, 'surprised', weights.surprised);
  };

  // ---- Lip Sync ----
  const applyLipSync = (expr: any, visemes: { aa: number; ih: number; ou: number; ee: number; oh: number }) => {
    // Bezpośrednie mapowanie visemów na blend shapes
    setExpressionSafe(expr, 'aa', visemes.aa);
    setExpressionSafe(expr, 'ih', visemes.ih);
    setExpressionSafe(expr, 'ou', visemes.ou);
    setExpressionSafe(expr, 'ee', visemes.ee);
    setExpressionSafe(expr, 'oh', visemes.oh);
  };

  // ---- Fallback lip sync (gdy brak audio) ----
  const applyFallbackLipSync = (expr: any, t: number) => {
    // Symuluj mowę sinusoidami o różnych częstotliwościach
    const speed = 6;
    const aa = (Math.sin(t * speed) * 0.3 + 0.3) * (Math.sin(t * speed * 0.7) * 0.2 + 0.8);
    const ih = (Math.sin(t * speed * 1.3 + 1) * 0.2 + 0.2) * (Math.cos(t * speed * 0.5) * 0.3 + 0.7);
    const ou = (Math.sin(t * speed * 0.8 + 2) * 0.15 + 0.15);
    const ee = (Math.sin(t * speed * 1.1 + 3) * 0.1 + 0.1);
    
    setExpressionSafe(expr, 'aa', aa);
    setExpressionSafe(expr, 'ih', ih);
    setExpressionSafe(expr, 'ou', ou);
    setExpressionSafe(expr, 'ee', ee);
    setExpressionSafe(expr, 'oh', 0);
  };

  // ---- Ruchy ciała ----
  const applyBodyAnimation = (vrm: VRM, weights: EmotionWeights, t: number, delta: number) => {
    const head = vrm.humanoid?.getNormalizedBoneNode('head');
    const spine = vrm.humanoid?.getNormalizedBoneNode('spine');
    const chest = vrm.humanoid?.getNormalizedBoneNode('chest');
    const leftUpperArm = vrm.humanoid?.getNormalizedBoneNode('leftUpperArm');
    const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm');

    // ---- Oddychanie (zawsze aktywne) ----
    if (spine) {
      const breathCycle = Math.sin(t * 1.2) * 0.015;
      spine.rotation.x = breathCycle;
    }
    if (chest) {
      chest.rotation.x = Math.sin(t * 1.2 + 0.5) * 0.01;
    }

    // ---- Głowa ----
    if (head) {
      // Bazowy ruch głowy (idle sway)
      let headX = Math.sin(t * 0.4) * 0.02;
      let headY = Math.sin(t * 0.3) * 0.015;
      let headZ = Math.sin(t * 0.6) * 0.02;

      // Emocjonalne ruchy głowy
      const emotion = emotionEngineRef.current.getCurrentEmotion();
      
      switch (emotion) {
        case 'happy':
        case 'excited':
          // Kiwanie lekko na boki
          headZ += Math.sin(t * 2) * 0.04;
          headX += Math.sin(t * 1.5) * 0.03;
          break;
          
        case 'shy':
        case 'embarrassed':
          // Pochylona, odwrócona
          headX += 0.08;
          headZ += 0.05;
          headY -= 0.04;
          break;
          
        case 'sad':
        case 'crying':
          // Opuszczona
          headX += 0.06;
          headY -= 0.03;
          break;
          
        case 'angry':
          // Pochylona do przodu
          headX -= 0.05;
          headZ += Math.sin(t * 3) * 0.02; // Lekkie drżenie
          break;
          
        case 'surprised':
          // Odchylona do tyłu
          headX -= 0.08;
          break;
          
        case 'thinking':
          // Pochylona w bok
          headZ += 0.1;
          headY += Math.sin(t * 0.5) * 0.02;
          break;
          
        case 'confused':
          // Przechylona
          headZ += 0.12;
          headY += Math.sin(t * 0.8) * 0.03;
          break;
          
        case 'sleepy':
          // Opuszczona, kołysząca się
          headX += 0.1;
          headZ += Math.sin(t * 0.3) * 0.05;
          break;
          
        case 'playful':
          // Energiczne ruchy
          headZ += Math.sin(t * 2.5) * 0.06;
          headX += Math.sin(t * 1.8) * 0.04;
          break;
          
        case 'love':
          // Delikatne pochylenie
          headZ += 0.04;
          headX += Math.sin(t * 0.6) * 0.02;
          break;
          
        case 'smug':
          // Pewna siebie, lekko odchylona
          headX -= 0.04;
          headZ -= 0.03;
          break;
          
        case 'proud':
          // Wyprostowana
          headX -= 0.06;
          break;
          
        case 'worried':
          // Pochylona do przodu
          headX += 0.04;
          headZ += Math.sin(t * 1.2) * 0.03;
          break;
      }

      // Mówienie - kiwanie głową
      if (isSpeaking) {
        headX += Math.sin(t * 2.5) * 0.03;
        headY += Math.sin(t * 1.8) * 0.02;
      }

      // Nasłuchiwanie - skierowana do przodu, lekko przechylona
      if (isListening) {
        headZ += Math.sin(t * 0.4) * 0.06;
        headY += Math.sin(t * 0.3) * 0.03;
      }

      // Aplikuj z wygładzaniem
      head.rotation.x = lerp(head.rotation.x, headX, delta * 3);
      head.rotation.y = lerp(head.rotation.y, headY, delta * 3);
      head.rotation.z = lerp(head.rotation.z, headZ, delta * 3);
    }

    // ---- Oczy (kierunek patrzenia) ----
    // VRM używa lookAt target, ale możemy też bezpośrednio manipulować
    if (vrm.lookAt) {
      const emotion = emotionEngineRef.current.getCurrentEmotion();
      let targetX = Math.sin(t * 0.3) * 0.5; // Domyślne: delikatne śledzenie
      let targetY = Math.sin(t * 0.2) * 0.3;
      
      switch (emotion) {
        case 'shy':
        case 'embarrassed':
          targetX = -0.8;
          targetY = -0.5;
          break;
        case 'thinking':
          targetX = 0.6;
          targetY = 0.8;
          break;
        case 'sad':
        case 'crying':
          targetY = -0.6;
          break;
        case 'love':
          targetX = 0;
          targetY = 0.2;
          break;
        case 'angry':
          targetX = 0;
          targetY = 0;
          break;
      }
      
      // Ustaw target patrzenia
      vrm.lookAt.target = new THREE.Object3D();
      vrm.lookAt.target.position.set(targetX, targetY + 1.3, 2);
    }

    // ---- Ramiona (subtelne ruchy) ----
    if (leftUpperArm) {
      const emotion = emotionEngineRef.current.getCurrentEmotion();
      let armAngle = Math.sin(t * 0.8) * 0.02; // Domyślne: delikatne kołysanie
      
      if (emotion === 'excited' || emotion === 'happy') {
        armAngle += Math.sin(t * 2) * 0.05;
      } else if (emotion === 'shy') {
        armAngle += 0.08; // Ramiona bliżej ciała
      }
      
      leftUpperArm.rotation.z = lerp(leftUpperArm.rotation.z, armAngle + 0.1, delta * 2);
    }
    if (rightUpperArm) {
      const armAngle = Math.sin(t * 0.8 + Math.PI) * 0.02;
      rightUpperArm.rotation.z = lerp(rightUpperArm.rotation.z, armAngle - 0.1, delta * 2);
    }
  };

  // ---- Pomocnicze ----
  const setExpressionSafe = (expr: any, name: string, value: number) => {
    try {
      // Sprawdź czy expression istnieje
      const manager = expr;
      if (typeof manager.setValue === 'function') {
        manager.setValue(name, Math.max(0, Math.min(1, value)));
      }
    } catch {
      // Expression nie istnieje w tym modelu - ignoruj
    }
  };

  const fadeExpression = (expr: any, name: string, target: number, speed: number) => {
    try {
      const current = expr.getValue?.(name) ?? 0;
      const newValue = current + (target - current) * Math.min(1, speed);
      setExpressionSafe(expr, name, newValue);
    } catch {
      // Ignoruj
    }
  };

  const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, t);

  // ---- Publiczne API (dla rodzica) ----
  // Eksponuj silnik emocji i lip sync
  useEffect(() => {
    (window as any).__lisiEmotionEngine = emotionEngineRef.current;
    (window as any).__lisiLipSync = lipSyncRef.current;
    return () => {
      delete (window as any).__lisiEmotionEngine;
      delete (window as any).__lisiLipSync;
    };
  }, []);

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
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 12,
          background: 'rgba(15, 15, 25, 0.8)', zIndex: 10,
        }}>
          <div style={{ fontSize: 48, animation: 'float 2s ease-in-out infinite' }}>🦊</div>
          <div style={{ color: '#ff9a56', fontSize: 14 }}>Ładowanie Lisi...</div>
          <div style={{
            width: 200, height: 4, borderRadius: 2,
            background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
          }}>
            <div style={{
              width: '60%', height: '100%', borderRadius: 2,
              background: 'linear-gradient(90deg, #ff6b9d, #ff9a56)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          </div>
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 12,
          background: 'rgba(15, 15, 25, 0.9)', zIndex: 10,
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
