"use client";

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const ThreeBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000);
    camera.position.z = 400;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true, // transparent background
      antialias: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Generate circular particle texture programmatically (saves loading external assets)
    const createParticleTexture = () => {
      const size = 64;
      const canvasTexture = document.createElement('canvas');
      canvasTexture.width = size;
      canvasTexture.height = size;
      const ctx = canvasTexture.getContext('2d');
      if (ctx) {
        // Draw circle with soft glow
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        // Using a soft orange/gold theme matching Vidyapith Connect
        gradient.addColorStop(0, 'rgba(255, 159, 10, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 159, 10, 0.8)');
        gradient.addColorStop(0.5, 'rgba(244, 184, 32, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
      }
      return new THREE.CanvasTexture(canvasTexture);
    };

    const particleTexture = createParticleTexture();

    // 5. Create particles
    const particleCount = 240;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      // Spread particles in a wide 3D space
      positions[i * 3] = (Math.random() - 0.5) * 800;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 800;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 800;

      // Small constant drift velocities
      velocities.push({
        x: (Math.random() - 0.5) * 0.3,
        y: (Math.random() - 0.5) * 0.3,
        z: (Math.random() - 0.5) * 0.3
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Material
    const material = new THREE.PointsMaterial({
      size: 8,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.45
    });

    // Points system
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // 6. Interactive mouse tracking
    let targetMouseX = 0;
    let targetMouseY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coords (-0.5 to 0.5)
      targetMouseX = (e.clientX / window.innerWidth) - 0.5;
      targetMouseY = (e.clientY / window.innerHeight) - 0.5;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 7. Handle window resize
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 8. Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth mouse parallax interpolation (easing)
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      // Rotate camera subtly based on mouse coords
      camera.position.x = mouseX * 250;
      camera.position.y = -mouseY * 250;
      camera.lookAt(scene.position);

      // Update particle positions based on drift velocities
      const positionsArr = geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        // Drift
        positionsArr[i * 3] += velocities[i].x;
        positionsArr[i * 3 + 1] += velocities[i].y;
        positionsArr[i * 3 + 2] += velocities[i].z;

        // Wrap around boundaries
        if (positionsArr[i * 3] < -400) positionsArr[i * 3] = 400;
        if (positionsArr[i * 3] > 400) positionsArr[i * 3] = -400;
        if (positionsArr[i * 3 + 1] < -400) positionsArr[i * 3 + 1] = 400;
        if (positionsArr[i * 3 + 1] > 400) positionsArr[i * 3 + 1] = -400;
        if (positionsArr[i * 3 + 2] < -400) positionsArr[i * 3 + 2] = 400;
        if (positionsArr[i * 3 + 2] > 400) positionsArr[i * 3 + 2] = -400;
      }
      geometry.attributes.position.needsUpdate = true;

      // Rotate the points system slightly for global dynamics
      points.rotation.y += 0.0006;
      points.rotation.x += 0.0003;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      particleTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none', // click through canvas
        zIndex: 9999, // overlay above all layout layers
        opacity: 0.3
      }}
    />
  );
};
