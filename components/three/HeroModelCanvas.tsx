"use client";

import { Component, Suspense, useEffect, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, useGLTF } from "@react-three/drei";
import { ShieldAlert } from "lucide-react";

// Define the exact path once to prevent mismatch errors
const MODEL_PATH = "/models/Dronemodel.glb";

function HeroModel() {
  const { scene } = useGLTF(MODEL_PATH);
  
  // scene.clone() is highly recommended to prevent React remount bugs with Three.js
  return (
    <primitive 
      object={scene.clone()} 
      scale={3.0} 
      position={[0, -0.2, 0]} 
      rotation={[0.15, -0.45, 0]} 
    />
  );
}

function ModelFallback() {
  return (
    <mesh>
      <icosahedronGeometry args={[1.25, 1]} />
      <meshStandardMaterial color="#8fb9ff" metalness={0.25} roughness={0.2} />
    </mesh>
  );
}

class CanvasErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-slate-950 to-slate-800 p-6 text-center text-sm text-white/80">
          <ShieldAlert className="mb-3 size-8 text-amber-500" />
          <p className="mb-2 font-semibold text-amber-400">3D Viewer Unavailable</p>
          <p className="max-w-xs text-xs">
            Your browser has temporarily blocked WebGL due to context limits. Please refresh the page to view the 3D model.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function HeroModelCanvas() {
  const [isWebGLAvailable, setIsWebGLAvailable] = useState(true);

  useEffect(() => {
    // Detect WebGL context blockage
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        setIsWebGLAvailable(false);
      }
    } catch (e) {
      setIsWebGLAvailable(false);
    }
  }, []);

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-[2rem] border border-white/50 bg-gradient-to-br from-white/65 via-white/25 to-sky-100/40 shadow-[0_30px_80px_-35px_rgba(37,99,235,0.4)] backdrop-blur-md lg:h-[560px]">
      {!isWebGLAvailable ? (
        <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-center text-sm text-white/80">
          <ShieldAlert className="mb-3 size-8 text-amber-500" />
          <p className="mb-1 font-bold text-amber-400">3D Environment Paused</p>
          <p className="max-w-xs text-xs text-slate-300">
            WebGL context limits reached in development. Perform a hard refresh to restore the model view.
          </p>
        </div>
      ) : (
        <CanvasErrorBoundary>
          <Canvas 
            frameloop="demand" 
            dpr={[1, 1.5]} 
            gl={{ powerPreference: "default", antialias: false, preserveDrawingBuffer: true }} 
            camera={{ position: [0, 1.5, 5], fov: 38 }}
            onCreated={({ gl }) => {
              gl.domElement.addEventListener('webglcontextlost', (e) => {
                e.preventDefault();
                setIsWebGLAvailable(false);
              }, false);
            }}
          >
            <ambientLight intensity={0.6} />
            <Suspense fallback={<ModelFallback />}>
              <Stage environment="city" intensity={0.8} adjustCamera={false}>
                <HeroModel />
              </Stage>
            </Suspense>
            <OrbitControls 
              autoRotate 
              autoRotateSpeed={1.8} 
              enableZoom={false} 
              enablePan={false} 
              maxPolarAngle={Math.PI / 2} 
            />
          </Canvas>
        </CanvasErrorBoundary>
      )}
    </div>
  );
}

// Preload the exact same path to prevent suspense waterfalls
useGLTF.preload(MODEL_PATH);