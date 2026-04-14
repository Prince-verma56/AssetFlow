"use client";

import { Component, Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, useGLTF } from "@react-three/drei";

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
        <div className="flex h-full flex-col items-center justify-center bg-linear-to-br from-slate-950 to-slate-800 p-6 text-center text-sm text-white/80">
          <p className="mb-2 font-semibold text-red-400">Model Failed to Load</p>
          <p>
            Please ensure <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-white">{MODEL_PATH}</code> exists in your public folder.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export function HeroModelCanvas() {
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-[2rem] border border-white/50 bg-linear-to-br from-white/65 via-white/25 to-sky-100/40 shadow-[0_30px_80px_-35px_rgba(37,99,235,0.4)] backdrop-blur-md lg:h-[560px]">
      <CanvasErrorBoundary>
        <Canvas frameloop="demand" camera={{ position: [0, 1.5, 5], fov: 38 }}>
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
            maxPolarAngle={Math.PI / 2} // Prevents camera from going under the floor
          />
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}

// Preload the exact same path
useGLTF.preload(MODEL_PATH);