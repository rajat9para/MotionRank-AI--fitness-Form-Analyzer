import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';

function Dumbbell() {
  const group = useRef();
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = t * 0.3;
    group.current.rotation.z = Math.sin(t * 0.4) * 0.12;
  });

  const metal = { metalness: 0.95, roughness: 0.25 };

  return (
    <group ref={group} rotation={[0.4, 0, Math.PI / 2]} scale={1.05}>
      {/* handle */}
      <mesh>
        <cylinderGeometry args={[0.16, 0.16, 2.2, 24]} />
        <meshStandardMaterial color="#1c1c20" {...metal} />
      </mesh>
      {/* plates */}
      {[-1, 1].map((dir) => (
        <group key={dir} position={[0, dir * 1.2, 0]}>
          <mesh>
            <cylinderGeometry args={[0.62, 0.62, 0.34, 40]} />
            <meshStandardMaterial color="#16161a" {...metal} />
          </mesh>
          <mesh position={[0, dir * 0.34, 0]}>
            <cylinderGeometry args={[0.46, 0.46, 0.36, 40]} />
            <meshStandardMaterial color="#c6f135" emissive="#7fae00" emissiveIntensity={0.45} metalness={0.6} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Particles() {
  const ref = useRef();
  const count = 60;
  const positions = useRef(
    Float32Array.from({ length: count * 3 }, () => (Math.random() - 0.5) * 12)
  );
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.04;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions.current, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.045} color="#c6f135" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      className="mr-hero-canvas"
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 6], fov: 42 }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-4, 2, 3]} intensity={3} color="#c6f135" />
      <pointLight position={[3, -3, 2]} intensity={1.4} color="#7fae00" />
      <Suspense fallback={null}>
        <Float speed={1.6} rotationIntensity={0.5} floatIntensity={1.1}>
          <Dumbbell />
        </Float>
        <Particles />
      </Suspense>
    </Canvas>
  );
}
