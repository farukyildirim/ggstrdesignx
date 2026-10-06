import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GasSpringParams, CalculationResult, EndFittingItem } from '../types/cad';
import { DEFAULT_FITTINGS } from '../utils/engineeringData';
import { exportToStlBlob } from '../utils/stlExporter';

export interface ThreeViewportHandle {
  exportStl: (binary?: boolean) => Blob | null;
  resetCamera: () => void;
  setCameraView: (view: 'iso' | 'front' | 'top' | 'detail') => void;
}

interface ThreeViewportProps {
  params: GasSpringParams;
  calc: CalculationResult;
  compressionRatio: number; // 0.0 (fully extended) to 1.0 (fully compressed)
  explodedRatio: number; // 0.0 (assembled) to 1.0 (exploded)
  cutawayMode: boolean; // Cross section view
  showDimensions: boolean; // CAD dimension lines
  materialFinish: 'standard' | 'tactical' | 'stainless' | 'gold';
  availableFittings?: EndFittingItem[];
}

export const ThreeViewport = forwardRef<ThreeViewportHandle, ThreeViewportProps>(({
  params,
  calc,
  compressionRatio,
  explodedRatio,
  cutawayMode,
  showDimensions,
  materialFinish,
  availableFittings = DEFAULT_FITTINGS,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const assemblyGroupRef = useRef<THREE.Group | null>(null);
  const dimensionGroupRef = useRef<THREE.Group | null>(null);

  // Mesh refs for animated transformations
  const tubeMeshRef = useRef<THREE.Mesh | null>(null);
  const rodMeshRef = useRef<THREE.Mesh | null>(null);
  const tubeFittingMeshRef = useRef<THREE.Mesh | null>(null);
  const rodFittingMeshRef = useRef<THREE.Mesh | null>(null);
  const internalPistonMeshRef = useRef<THREE.Mesh | null>(null);
  const internalOilMeshRef = useRef<THREE.Mesh | null>(null);

  const [hoveredPart, setHoveredPart] = useState<string | null>(null);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    exportStl: (binary = true) => {
      if (!assemblyGroupRef.current) return null;
      return exportToStlBlob(assemblyGroupRef.current, binary);
    },
    resetCamera: () => {
      if (!cameraRef.current || !controlsRef.current) return;
      const dist = Math.max(350, params.extLength * 0.9);
      cameraRef.current.position.set(dist * 0.7, dist * 0.35, dist * 0.7);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    },
    setCameraView: (view: 'iso' | 'front' | 'top' | 'detail') => {
      if (!cameraRef.current || !controlsRef.current) return;
      const dist = Math.max(350, params.extLength * 0.85);
      controlsRef.current.target.set(0, 0, 0);

      if (view === 'iso') {
        cameraRef.current.position.set(dist * 0.6, dist * 0.4, dist * 0.6);
      } else if (view === 'front') {
        cameraRef.current.position.set(0, 0, dist * 1.1);
      } else if (view === 'top') {
        cameraRef.current.position.set(0, dist * 1.2, 0.001);
      } else if (view === 'detail') {
        const rodOffset = (calc.tubeHeight / 2.0) + (calc.rodHeight / 2.0) - 15.0;
        cameraRef.current.position.set(60, rodOffset + 40, 80);
        controlsRef.current.target.set(0, rodOffset, 0);
      }
      controlsRef.current.update();
    },
  }));

  // Initial Scene Setup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1120); // Deep slate canvas
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 1, 5000);
    const initialDist = Math.max(400, params.extLength * 0.85);
    camera.position.set(initialDist * 0.75, initialDist * 0.35, initialDist * 0.75);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 60;
    controls.maxDistance = 2500;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Lighting (Three-point studio setup)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfff7ed, 1.4); // Key light (warm)
    dirLight1.position.set(250, 450, 300);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    dirLight1.shadow.camera.near = 50;
    dirLight1.shadow.camera.far = 1500;
    dirLight1.shadow.bias = -0.0005;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xbae6fd, 0.9); // Fill light (cool blue)
    dirLight2.position.set(-300, 150, -200);
    scene.add(dirLight2);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8); // Rim light
    rimLight.position.set(0, -200, -350);
    scene.add(rimLight);

    // Ground plane & Shadow
    const groundGeo = new THREE.PlaneGeometry(3000, 3000);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.28 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -Math.max(120, params.tubeOd * 2.5);
    ground.receiveShadow = true;
    ground.name = 'helper_ground';
    scene.add(ground);

    // Circular Engineering Grid
    const gridHelper = new THREE.PolarGridHelper(params.extLength * 0.75, 16, 8, 32, 0x1e293b, 0x0f172a);
    gridHelper.position.y = ground.position.y + 0.1;
    gridHelper.name = 'helper_grid';
    scene.add(gridHelper);

    // Assembly Group
    const assemblyGroup = new THREE.Group();
    scene.add(assemblyGroup);
    assemblyGroupRef.current = assemblyGroup;

    // Dimension Group
    const dimensionGroup = new THREE.Group();
    scene.add(dimensionGroup);
    dimensionGroupRef.current = dimensionGroup;

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update 3D Geometry and Materials when parameters change
  useEffect(() => {
    const scene = sceneRef.current;
    const assemblyGroup = assemblyGroupRef.current;
    const dimensionGroup = dimensionGroupRef.current;
    if (!scene || !assemblyGroup || !dimensionGroup) return;

    // Clear existing assembly children
    while (assemblyGroup.children.length > 0) {
      const obj = assemblyGroup.children[0];
      assemblyGroup.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }

    // Clear dimensions
    while (dimensionGroup.children.length > 0) {
      const obj = dimensionGroup.children[0];
      dimensionGroup.remove(obj);
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
        obj.geometry.dispose();
      }
    }

    const { tubeOd, rodOd, stroke, extLength, rodFittingId, tubeFittingId } = params;
    const { tubeHeight, rodHeight } = calc;

    const tubeR = tubeOd / 2.0;
    const rodR = rodOd / 2.0;

    // Clipping plane for Cutaway mode
    const clipPlanes = cutawayMode ? [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)] : [];

    // Materials Configuration
    let tubeMat: THREE.Material;
    let rodMat: THREE.Material;
    let fittingMat: THREE.Material;

    if (materialFinish === 'standard') {
      // Prompt specification:
      // Outer Tube: Siyah / Koyu Füme (RGB: 0.15, 0.15, 0.15)
      // Piston Rod: Parlak Krom / Gümüş (RGB: 0.85, 0.85, 0.88)
      // Mafsallar: Anodize Mavi (RGB: 0.1, 0.4, 0.8)
      tubeMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.15, 0.15, 0.15),
        roughness: 0.45,
        metalness: 0.35,
        clippingPlanes: clipPlanes,
        clipShadows: true,
      });
      rodMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.88, 0.89, 0.92),
        roughness: 0.08,
        metalness: 0.96,
      });
      fittingMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.1, 0.4, 0.8),
        roughness: 0.3,
        metalness: 0.82,
      });
    } else if (materialFinish === 'tactical') {
      tubeMat = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.6,
        metalness: 0.2,
        clippingPlanes: clipPlanes,
      });
      rodMat = new THREE.MeshStandardMaterial({
        color: 0x27272a,
        roughness: 0.2,
        metalness: 0.9,
      });
      fittingMat = new THREE.MeshStandardMaterial({
        color: 0x3f3f46,
        roughness: 0.4,
        metalness: 0.6,
      });
    } else if (materialFinish === 'stainless') {
      tubeMat = new THREE.MeshStandardMaterial({
        color: 0xd4d4d8,
        roughness: 0.25,
        metalness: 0.92,
        clippingPlanes: clipPlanes,
      });
      rodMat = new THREE.MeshStandardMaterial({
        color: 0xf4f4f5,
        roughness: 0.05,
        metalness: 0.98,
      });
      fittingMat = new THREE.MeshStandardMaterial({
        color: 0xa1a1aa,
        roughness: 0.2,
        metalness: 0.9,
      });
    } else {
      // Gold / Zinc plated
      tubeMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.4,
        metalness: 0.3,
        clippingPlanes: clipPlanes,
      });
      rodMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.08,
        metalness: 0.95,
      });
      fittingMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.25,
        metalness: 0.85,
      });
    }

    // Helper to generate End Fitting Geometry matching CadQuery function:
    const createFittingGeometry = (fittingId: string, isRodEnd: boolean) => {
      const group = new THREE.Group();
      const fitting = availableFittings.find((f) => f.id === fittingId) || availableFittings[0];
      const fittingR = rodR * 1.8;
      const fittingLen = fitting.offsetLenMm || 20.0;
      const holeR = (fitting.holeDiaMm || 8.0) / 2.0;
      const shapeType = fitting.shapeType;

      if (shapeType === 'eyelet') {
        // Eyelet: cylindrical eye with center hole
        const eyeShape = new THREE.Shape();
        eyeShape.absarc(0, 0, fittingR, 0, Math.PI * 2, false);
        const holePath = new THREE.Path();
        holePath.absarc(0, 0, holeR, 0, Math.PI * 2, true);
        eyeShape.holes.push(holePath);

        const extrudeSettings = {
          steps: 1,
          depth: 12.0,
          bevelEnabled: true,
          bevelThickness: 1.0,
          bevelSize: 1.0,
          bevelSegments: 3,
        };
        const eyeGeo = new THREE.ExtrudeGeometry(eyeShape, extrudeSettings);
        eyeGeo.center();
        eyeGeo.rotateX(Math.PI / 2);

        const eyeMesh = new THREE.Mesh(eyeGeo, fittingMat);
        eyeMesh.castShadow = true;
        eyeMesh.receiveShadow = true;
        group.add(eyeMesh);

        // Shank connecting eyelet to tube/rod
        const shankH = 12.0;
        const shankGeo = new THREE.CylinderGeometry(rodR * 1.2, rodR * 1.2, shankH, 24);
        const shankMesh = new THREE.Mesh(shankGeo, fittingMat);
        shankMesh.position.y = isRodEnd ? -shankH / 2 : shankH / 2;
        shankMesh.castShadow = true;
        group.add(shankMesh);
      } else if (shapeType === 'ball') {
        // Ball Joint: Socket housing + ball stud
        const sphereGeo = new THREE.SphereGeometry(fittingR * 1.1, 24, 24);
        const sphereMesh = new THREE.Mesh(sphereGeo, fittingMat);
        sphereMesh.castShadow = true;
        sphereMesh.receiveShadow = true;
        group.add(sphereMesh);

        // Cross ball stud pin
        const pinGeo = new THREE.CylinderGeometry(holeR, holeR, fittingR * 2.6, 16);
        pinGeo.rotateZ(Math.PI / 2);
        const pinMesh = new THREE.Mesh(pinGeo, rodMat);
        pinMesh.castShadow = true;
        group.add(pinMesh);

        // Neck
        const neckH = 12.0;
        const neckGeo = new THREE.CylinderGeometry(rodR * 1.1, rodR * 1.1, neckH, 20);
        const neckMesh = new THREE.Mesh(neckGeo, fittingMat);
        neckMesh.position.y = isRodEnd ? -neckH / 2 : neckH / 2;
        group.add(neckMesh);
      } else if (shapeType === 'clevis') {
        // Clevis Fork: U-shaped prong with cross pin
        const forkBodyGeo = new THREE.BoxGeometry(fittingR * 2.2, 16.0, fittingR * 1.8);
        const forkMesh = new THREE.Mesh(forkBodyGeo, fittingMat);
        forkMesh.castShadow = true;
        group.add(forkMesh);

        // Cross pin
        const pinGeo = new THREE.CylinderGeometry(holeR, holeR, fittingR * 2.6, 16);
        pinGeo.rotateX(Math.PI / 2);
        const pinMesh = new THREE.Mesh(pinGeo, rodMat);
        group.add(pinMesh);

        // Shank
        const shankH = 10.0;
        const shankGeo = new THREE.CylinderGeometry(rodR * 1.2, rodR * 1.2, shankH, 20);
        const shankMesh = new THREE.Mesh(shankGeo, fittingMat);
        shankMesh.position.y = isRodEnd ? -13 : 13;
        group.add(shankMesh);
      } else if (shapeType === 'flange') {
        // Flange plate with holes
        const plateGeo = new THREE.CylinderGeometry(fittingR * 2.2, fittingR * 2.2, 5, 32);
        const plateMesh = new THREE.Mesh(plateGeo, fittingMat);
        plateMesh.castShadow = true;
        group.add(plateMesh);

        // Neck
        const neckH = 12.0;
        const neckGeo = new THREE.CylinderGeometry(rodR * 1.2, rodR * 1.2, neckH, 20);
        const neckMesh = new THREE.Mesh(neckGeo, fittingMat);
        neckMesh.position.y = isRodEnd ? -8 : 8;
        group.add(neckMesh);
      } else {
        // Threaded Stud
        const threadGeo = new THREE.CylinderGeometry(rodR, rodR, fittingLen, 24);
        const threadMesh = new THREE.Mesh(threadGeo, fittingMat);
        threadMesh.castShadow = true;
        group.add(threadMesh);

        // Nut flange
        const nutGeo = new THREE.CylinderGeometry(rodR * 1.5, rodR * 1.5, 5, 6);
        const nutMesh = new THREE.Mesh(nutGeo, fittingMat);
        nutMesh.position.y = isRodEnd ? -fittingLen / 2 + 2.5 : fittingLen / 2 - 2.5;
        group.add(nutMesh);
      }

      return group;
    };

    // 1. OUTER TUBE (Silindir Gövde)
    const tubeGeo = new THREE.CylinderGeometry(tubeR, tubeR, tubeHeight, 36);
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    tubeMesh.castShadow = true;
    tubeMesh.receiveShadow = true;
    tubeMesh.name = 'Outer_Tube';
    tubeMeshRef.current = tubeMesh;
    assemblyGroup.add(tubeMesh);

    // Decorative tube end caps & crimp bands
    const crimpGeo = new THREE.TorusGeometry(tubeR + 0.3, 0.6, 8, 36);
    crimpGeo.rotateX(Math.PI / 2);
    const crimpMesh = new THREE.Mesh(crimpGeo, fittingMat);
    crimpMesh.position.y = tubeHeight / 2 - 1.5;
    tubeMesh.add(crimpMesh);

    // 2. PISTON ROD (Piston Mili)
    const rodGeo = new THREE.CylinderGeometry(rodR, rodR, rodHeight, 36);
    const rodMesh = new THREE.Mesh(rodGeo, rodMat);
    rodMesh.castShadow = true;
    rodMesh.receiveShadow = true;
    rodMesh.name = 'Piston_Rod';
    rodMeshRef.current = rodMesh;
    assemblyGroup.add(rodMesh);

    // 3. TUBE END FITTING
    const tubeFittingGroup = createFittingGeometry(params.tubeFittingId, false);
    tubeFittingGroup.name = 'Tube_End_Fitting';
    tubeFittingMeshRef.current = tubeFittingGroup as any;
    assemblyGroup.add(tubeFittingGroup);

    // 4. ROD END FITTING
    const rodFittingGroup = createFittingGeometry(params.rodFittingId, true);
    rodFittingGroup.name = 'Rod_End_Fitting';
    rodFittingMeshRef.current = rodFittingGroup as any;
    assemblyGroup.add(rodFittingGroup);

    // 5. INTERNAL CUTAWAY COMPONENTS (When in cutaway or inspection)
    if (cutawayMode) {
      // Piston Head inside the tube attached to bottom of rod
      const pistonHeadGeo = new THREE.CylinderGeometry(tubeR - 0.5, tubeR - 0.5, 12, 24);
      const pistonMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b, // Brass/Bronze piston valve
        metalness: 0.8,
        roughness: 0.3,
      });
      const pistonHeadMesh = new THREE.Mesh(pistonHeadGeo, pistonMat);
      pistonHeadMesh.position.y = -rodHeight / 2 + 6;
      rodMesh.add(pistonHeadMesh);
      internalPistonMeshRef.current = pistonHeadMesh;

      // Piston Ring / Seal (Black Viton seal)
      const sealGeo = new THREE.TorusGeometry(tubeR - 0.3, 1.2, 8, 24);
      sealGeo.rotateX(Math.PI / 2);
      const sealMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.8 });
      const sealMesh = new THREE.Mesh(sealGeo, sealMat);
      pistonHeadMesh.add(sealMesh);

      // Hydraulic Oil damping pool at bottom of tube
      const oilGeo = new THREE.CylinderGeometry(tubeR - 0.4, tubeR - 0.4, 25, 24);
      const oilMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.65,
        roughness: 0.1,
      });
      const oilMesh = new THREE.Mesh(oilGeo, oilMat);
      oilMesh.position.y = -tubeHeight / 2 + 12.5;
      tubeMesh.add(oilMesh);
      internalOilMeshRef.current = oilMesh;

      // Rod Guide Bushing & Wiper Seal at top of tube
      const bushingGeo = new THREE.CylinderGeometry(tubeR - 0.3, tubeR - 0.3, 18, 24);
      const bushingMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.7, roughness: 0.3 });
      const bushingMesh = new THREE.Mesh(bushingGeo, bushingMat);
      bushingMesh.position.y = tubeHeight / 2 - 9;
      tubeMesh.add(bushingMesh);
    }

    // DIMENSION OVERLAYS
    if (showDimensions) {
      createDimensionVisuals(dimensionGroup, params, calc);
    }
  }, [params, calc, cutawayMode, showDimensions, materialFinish]);

  // Dimension lines builder
  const createDimensionVisuals = (group: THREE.Group, p: GasSpringParams, c: CalculationResult) => {
    const dimColor = 0x38bdf8; // Bright cyan
    const lineMat = new THREE.LineBasicMaterial({ color: dimColor, linewidth: 2 });
    const dashMat = new THREE.LineDashedMaterial({ color: 0x64748b, dashSize: 4, gapSize: 2 });

    const xOffset = p.tubeOd + 25;
    const topY = c.tubeHeight / 2 + (c.rodHeight / 2) + (p.stroke) + 10;
    const bottomY = -c.tubeHeight / 2 - 10;

    // Full Length Dimension Line
    const pts = [
      new THREE.Vector3(xOffset, bottomY, 0),
      new THREE.Vector3(xOffset, topY, 0),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, lineMat);
    group.add(line);

    // Extension Ticks
    const tickGeo1 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, bottomY, 0),
      new THREE.Vector3(xOffset + 8, bottomY, 0),
    ]);
    const tickGeo2 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, topY, 0),
      new THREE.Vector3(xOffset + 8, topY, 0),
    ]);
    const t1 = new THREE.Line(tickGeo1, dashMat);
    t1.computeLineDistances();
    const t2 = new THREE.Line(tickGeo2, dashMat);
    t2.computeLineDistances();
    group.add(t1);
    group.add(t2);

    // Stroke dimension line (closer in)
    const strokeX = p.tubeOd / 2 + 15;
    const strokeBottom = c.tubeHeight / 2;
    const strokeTop = c.tubeHeight / 2 + p.stroke;
    const strokeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(strokeX, strokeBottom, 0),
      new THREE.Vector3(strokeX, strokeTop, 0),
    ]);
    const strokeLine = new THREE.Line(strokeGeo, new THREE.LineBasicMaterial({ color: 0x34d399 }));
    group.add(strokeLine);

    const sTick1 = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p.rodOd / 2, strokeBottom, 0),
      new THREE.Vector3(strokeX + 6, strokeBottom, 0),
    ]), dashMat);
    sTick1.computeLineDistances();

    const sTick2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p.rodOd / 2, strokeTop, 0),
      new THREE.Vector3(strokeX + 6, strokeTop, 0),
    ]), dashMat);
    sTick2.computeLineDistances();

    group.add(sTick1);
    group.add(sTick2);
  };

  // Dynamic positions driven by compressionRatio and explodedRatio
  useEffect(() => {
    const { stroke } = params;
    const { tubeHeight, rodHeight } = calc;

    // Normal position parameters matching CadQuery script:
    // rod_offset = (tube_h / 2.0) + (rod_h / 2.0) - 15.0
    // tube_end_shape at -tube_h / 2.0 - 10.0
    // rod_end_shape at rod_offset + rod_h / 2.0 + 10.0
    const nominalRodOffset = (tubeHeight / 2.0) + (rodHeight / 2.0) - 15.0;
    const nominalTubeEndPos = -tubeHeight / 2.0 - 10.0;

    // Compression offset: rod pushes into tube by (compressionRatio * stroke)
    const compressionTravel = compressionRatio * stroke;

    // Exploded offset: pushes components apart along the axis
    const explodeDist = explodedRatio * 120.0;

    // 1. Tube stays at 0 (or slight center reference)
    if (tubeMeshRef.current) {
      tubeMeshRef.current.position.y = 0;
    }

    // 2. Tube End Fitting moves downward in exploded view
    if (tubeFittingMeshRef.current) {
      tubeFittingMeshRef.current.position.y = nominalTubeEndPos - explodeDist * 0.8;
    }

    // 3. Rod moves according to compression & explode
    const actualRodOffset = nominalRodOffset - compressionTravel + explodeDist * 0.5;
    if (rodMeshRef.current) {
      rodMeshRef.current.position.y = actualRodOffset;
    }

    // 4. Rod End Fitting sits on top of the rod (moves along with rod + extra explode)
    if (rodFittingMeshRef.current) {
      const rodTop = actualRodOffset + rodHeight / 2.0 + 10.0 + explodeDist * 0.8;
      rodFittingMeshRef.current.position.y = rodTop;
    }

    // Update dimensions opacity or visibility if exploded
    if (dimensionGroupRef.current) {
      dimensionGroupRef.current.visible = showDimensions && explodedRatio < 0.15;
    }
  }, [params, calc, compressionRatio, explodedRatio, showDimensions]);

  // Current dynamic compression force reading
  const currentForce = Math.round(params.forceN * (1 + (calc.kFactor - 1) * compressionRatio));
  const currentLen = Math.round(params.extLength - compressionRatio * params.stroke);

  return (
    <div className="relative w-full h-full min-h-[460px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full flex-1 cursor-grab active:cursor-grabbing relative" />

      {/* Floating Modern Engineering HUD */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-lg px-3 py-1.5 shadow-md">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200">Canlı 3D Model Önizleme</span>
          <span className="text-[11px] text-slate-400">·</span>
          <span className="text-[11px] font-mono text-cyan-300">CAD Assembly</span>
        </div>

        {/* Dynamic Compression State HUD */}
        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-lg px-3 py-2 shadow-md flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Anlık Boy</span>
            <span className="text-slate-100 font-semibold tabular-nums">{currentLen} mm</span>
          </div>
          <div className="h-6 w-px bg-slate-700" />
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Anlık Kuvvet F(x)</span>
            <span className="text-cyan-400 font-semibold tabular-nums">{currentForce} N</span>
          </div>
          <div className="h-6 w-px bg-slate-700" />
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Strok Sıkışması</span>
            <span className="text-amber-400 font-semibold tabular-nums">{Math.round(compressionRatio * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Camera View Switcher Floating Bar */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-lg p-1 shadow-md">
        <button
          onClick={() => {
            const handle = (ref as any).current;
            if (handle) handle.setCameraView('iso');
          }}
          className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="İzometrik Görünüm"
        >
          İzometrik
        </button>
        <button
          onClick={() => {
            const handle = (ref as any).current;
            if (handle) handle.setCameraView('front');
          }}
          className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Yandan Görünüş"
        >
          Ön / Yan
        </button>
        <button
          onClick={() => {
            const handle = (ref as any).current;
            if (handle) handle.setCameraView('top');
          }}
          className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Üstten Görünüş"
        >
          Üst
        </button>
        <button
          onClick={() => {
            const handle = (ref as any).current;
            if (handle) handle.resetCamera();
          }}
          className="px-2.5 py-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors"
          title="Kamerayı Sıfırla"
        >
          Merkezle
        </button>
      </div>

      {/* Assembly Part Color Legend Overlay */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-neutral-900 border border-neutral-600 inline-block" />
          <span>Tüp: Siyah (D:{params.tubeOd}mm)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slate-200 border border-slate-400 inline-block" />
          <span>Mil: Krom (d:{params.rodOd}mm)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-600 border border-blue-400 inline-block" />
          <span>Mafsallar: Anodize Mavi</span>
        </div>
      </div>

      {/* Mouse navigation guide helper */}
      <div className="absolute bottom-3 right-3 text-[11px] text-slate-500 font-mono hidden md:block">
        Sol Tık: Döndür · Sağ Tık: Kaydır · Tekerlek: Yakınlaştır
      </div>
    </div>
  );
});

ThreeViewport.displayName = 'ThreeViewport';
