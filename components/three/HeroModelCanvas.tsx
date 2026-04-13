"use client";

import { Component, Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, useGLTF } from "@react-three/drei";

function HeroModel() {
  const scene = useGLTF("/models/MyChar3dModel2.glb");

  return <primitive object={scene.scene} scale={1.8} position={[0, -1.4, 0]} />;
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
        <div className="flex h-full items-center justify-center bg-linear-to-br from-slate-950 to-slate-800 p-6 text-center text-sm text-white/80">
          Add <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-white">/models/MyChar3dModel2.glb</code> to
          enable the 3D hero model.
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
            <Stage environment="city" intensity={0.6} adjustCamera={false}>
              <HeroModel />
            </Stage>
          </Suspense>
          <OrbitControls autoRotate autoRotateSpeed={1.8} enableZoom={false} enablePan={false} />
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}

useGLTF.preload("/models/MyChar3dModel2.glb");
