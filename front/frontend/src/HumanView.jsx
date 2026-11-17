import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// ── BODY PARTS (silhouette geometry + position + rotation) ──────────────────
function buildSilhouette(scene) {
    const mat = (opacity = 0.18) =>
        new THREE.MeshPhongMaterial({
            color: 0x0d2137,
            emissive: 0x0a1628,
            emissiveIntensity: 0.9,
            transparent: true,
            depthWrite: false,
            opacity,
            side: THREE.DoubleSide,
        });

    const wireMat = (opacity = 0.12) =>
        new THREE.MeshBasicMaterial({
            color: 0x1e4d7a,
            wireframe: true,
            transparent: true,
            depthWrite: false,
            opacity,
        });

    const add = (geo, px, py, pz, rx = 0, ry = 0, rz = 0, opac = 0.18) => {
        const mesh = new THREE.Mesh(geo, mat(opac));
        mesh.position.set(px, py, pz);
        mesh.rotation.set(rx, ry, rz);
        scene.add(mesh);

        const wire = new THREE.Mesh(geo.clone(), wireMat());
        wire.position.set(px, py, pz);
        wire.rotation.set(rx, ry, rz);
        scene.add(wire);
    };

    // HEAD
    add(new THREE.SphereGeometry(0.52, 32, 32), 0, 8.55, 0);

    // NECK
    add(new THREE.CylinderGeometry(0.18, 0.22, 0.55, 16), 0, 8.0, 0);

    // TORSO  (wider at shoulders, tapers to waist)
    // TORSO (one smooth shape instead of boxes)
    const torsoProfile = new THREE.SplineCurve([
        new THREE.Vector2(0.40, 4.05),   // bottom of pelvis
        new THREE.Vector2(0.62, 4.12),
        new THREE.Vector2(0.80, 4.45),   // hips
        new THREE.Vector2(0.75, 4.95),
        new THREE.Vector2(0.75, 5.35),   // waist
        new THREE.Vector2(0.75, 5.85),
        new THREE.Vector2(0.88, 6.40),   // ribcage
        new THREE.Vector2(0.93, 6.95),   // chest
        new THREE.Vector2(0.86, 7.45),   // shoulders
        new THREE.Vector2(0.55, 7.78),
        new THREE.Vector2(0.20, 7.88),   // base of neck
    ]).getPoints(40);
    const torsoGeo = new THREE.LatheGeometry(torsoProfile, 28);
    torsoGeo.scale(1, 1, 0.7);           // flatten front-to-back
    add(torsoGeo, 0, 0, 0);

    // ── ARMS (T-pose: horizontal) ──
    // Upper arm L/R
    add(new THREE.CapsuleGeometry(0.19, 1.05, 8, 16), -1.52, 7.05, 0, 0, 0, Math.PI / 2);
    add(new THREE.CapsuleGeometry(0.19, 1.05, 8, 16), 1.52, 7.05, 0, 0, 0, Math.PI / 2);

    // Elbow joint
    add(new THREE.SphereGeometry(0.19, 16, 16), -2.22, 7.05, 0);
    add(new THREE.SphereGeometry(0.19, 16, 16), 2.22, 7.05, 0);

    // Forearm L/R
    add(new THREE.CapsuleGeometry(0.15, 0.95, 8, 16), -3.0, 7.05, 0, 0, 0, Math.PI / 2);
    add(new THREE.CapsuleGeometry(0.15, 0.95, 8, 16), 3.0, 7.05, 0, 0, 0, Math.PI / 2);

    // Wrist / hand
    add(new THREE.BoxGeometry(0.42, 0.28, 0.14), -3.72, 7.05, 0);
    add(new THREE.BoxGeometry(0.42, 0.28, 0.14), 3.72, 7.05, 0);

    // ── LEGS ──
    // Hip joints
    add(new THREE.SphereGeometry(0.24, 16, 16), -0.62, 4.0, 0);
    add(new THREE.SphereGeometry(0.24, 16, 16), 0.62, 4.0, 0);

    // Upper leg L/R
    add(new THREE.CapsuleGeometry(0.26, 1.5, 8, 16), -0.62, 2.9, 0);
    add(new THREE.CapsuleGeometry(0.26, 1.5, 8, 16), 0.62, 2.9, 0);

    // Knee joint
    add(new THREE.SphereGeometry(0.23, 16, 16), -0.62, 1.95, 0);
    add(new THREE.SphereGeometry(0.23, 16, 16), 0.62, 1.95, 0);

    // Lower leg L/R
    add(new THREE.CapsuleGeometry(0.19, 1.45, 8, 16), -0.62, 0.9, 0);
    add(new THREE.CapsuleGeometry(0.19, 1.45, 8, 16), 0.62, 0.9, 0);

    // Ankle
    add(new THREE.SphereGeometry(0.17, 16, 16), -0.62, 0.08, 0);
    add(new THREE.SphereGeometry(0.17, 16, 16), 0.62, 0.08, 0);

    // Foot
    add(new THREE.BoxGeometry(0.28, 0.16, 0.6), -0.62, -0.1, 0.18);
    add(new THREE.BoxGeometry(0.28, 0.16, 0.6), 0.62, -0.1, 0.18);

    // Shoulder caps
    add(new THREE.SphereGeometry(0.24, 16, 16), -1.08, 7.1, 0);
    add(new THREE.SphereGeometry(0.24, 16, 16), 1.08, 7.1, 0);
}

// ── ORGAN REGIONS ────────────────────────────────────────────────────────────
const REGIONS = [
    {
        id: "brain",
        label: "Brain",
        color: 0xe0e0e0,
        position: [0, 8.55, 0],
        geometry: () => new THREE.SphereGeometry(0.46, 32, 32),
        function: "Central nervous system. Controls thought, memory, motor control and sensory processing.",
        system: "Nervous System",
    },
    {
        id: "heart",
        label: "Heart",
        color: 0xef5350,
        position: [-0.28, 6.7, 0.28],
        geometry: () => new THREE.SphereGeometry(0.3, 32, 32),
        function: "Pumps oxygenated blood through the circulatory system.",
        system: "Cardiovascular System",
    },
    {
        id: "lung_left",
        label: "Left Lung",
        color: 0xce93d8,
        position: [-0.62, 6.65, 0.1],
        geometry: () => new THREE.CapsuleGeometry(0.24, 0.72, 8, 16),
        function: "Exchanges oxygen and CO₂ between air and blood.",
        system: "Respiratory System",
    },
    {
        id: "lung_right",
        label: "Right Lung",
        color: 0xce93d8,
        position: [0.62, 6.65, 0.1],
        geometry: () => new THREE.CapsuleGeometry(0.24, 0.72, 8, 16),
        function: "Exchanges oxygen and CO₂ between air and blood.",
        system: "Respiratory System",
    },
    {
        id: "liver",
        label: "Liver",
        color: 0xa1887f,
        position: [0.38, 5.8, 0.2],
        geometry: () => new THREE.SphereGeometry(0.36, 32, 32),
        function: "Metabolises nutrients, detoxifies blood, and produces bile.",
        system: "Digestive System",
    },
    {
        id: "stomach",
        label: "Stomach",
        color: 0xffb74d,
        position: [-0.22, 5.65, 0.22],
        geometry: () => new THREE.SphereGeometry(0.26, 32, 32),
        function: "Breaks down food using acids and enzymes.",
        system: "Digestive System",
    },
    {
        id: "kidney_left",
        label: "Left Kidney",
        color: 0x81c784,
        position: [-0.58, 5.3, -0.18],
        geometry: () => new THREE.SphereGeometry(0.18, 32, 32),
        function: "Filters blood and regulates fluid and electrolyte balance.",
        system: "Urinary System",
    },
    {
        id: "kidney_right",
        label: "Right Kidney",
        color: 0x81c784,
        position: [0.58, 5.3, -0.18],
        geometry: () => new THREE.SphereGeometry(0.18, 32, 32),
        function: "Filters blood and regulates fluid and electrolyte balance.",
        system: "Urinary System",
    },
    {
        id: "spine",
        label: "Spine",
        color: 0xe0e0e0,
        position: [0, 5.8, -0.3],
        geometry: () => new THREE.CapsuleGeometry(0.1, 3.2, 8, 16),
        function: "Structural support and protection of the spinal cord.",
        system: "Skeletal System",
    },
];

// ── COMPONENT ────────────────────────────────────────────────────────────────
export default function HumanView({ result }) {
    const mountRef = useRef(null);
    const [selectedInfo, setSelectedInfo] = useState(null);
    const clickableRef = useRef([]);
    const selectedMeshRef = useRef(null);
    const hoveredMeshRef = useRef(null);
    const affectedOrgansRef = useRef([]);
    const associationsRef = useRef([]);
    const clockRef = useRef(0);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;
        mount.innerHTML = "";

        const width = mount.clientWidth || 800;
        const height = mount.clientHeight || 600;
        // SCENE
        const scene = new THREE.Scene();

        // CAMERA
        const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
        camera.position.set(0, 4.5, 11);

        // RENDERER
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x050505);
        mountRef.current.appendChild(renderer.domElement);
        renderer.domElement.style.display = "block";

        // LIGHTS
        scene.add(new THREE.AmbientLight(0xffffff, 0.35));
        const rim = new THREE.DirectionalLight(0x4fc3f7, 1.0);
        rim.position.set(-4, 6, -4);
        scene.add(rim);
        const fill = new THREE.DirectionalLight(0xffffff, 0.5);
        fill.position.set(4, 4, 6);
        scene.add(fill);

        // GRID FLOOR
        const grid = new THREE.GridHelper(24, 24, 0x0a1628, 0x0a1628);
        grid.position.y = -0.3;
        scene.add(grid);

        // SILHOUETTE
        buildSilhouette(scene);

        // ORGANS
        const clickable = [];
        REGIONS.forEach((region) => {
            const geo = region.geometry();
            const mat = new THREE.MeshPhongMaterial({
                color: region.color,
                emissive: region.color,
                emissiveIntensity: 0.2,
                transparent: true,
                depthWrite: false,
                opacity: 0.65,
                shininess: 90,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(...region.position);
            mesh.renderOrder =  2;
            mesh.userData = { regionId: region.id };
            scene.add(mesh);
            clickable.push(mesh);

            // Wire overlay
            const wireMat = new THREE.MeshBasicMaterial({
                color: region.color,
                wireframe: true,
                transparent: true,
                opacity: 0.3,
            });
            const wire = new THREE.Mesh(geo.clone(), wireMat);
            wire.position.set(...region.position);
            mesh.renderOrder = 3;
            scene.add(wire);

                        const glow = new THREE.Mesh(
                geo.clone(),
                new THREE.MeshBasicMaterial({
                    color: region.color,
                    transparent: true,
                    opacity: 0,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                })
            );
            glow.position.set(...region.position);
            glow.scale.setScalar(1.35);
            glow.renderOrder = 1;
            scene.add(glow);

            mesh.userData.wire = wire;
            mesh.userData.glow = glow;
        });
        clickableRef.current = clickable;

        // ORBIT CONTROLS
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.minDistance = 4;
        controls.maxDistance = 22;
        controls.target.set(0, 4.5, 0);
        controls.update();

        // RAYCASTER
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let mouseDownPos = { x: 0, y: 0 };

        const onMouseDown = (e) => {
            mouseDownPos = { x: e.clientX, y: e.clientY };
        };

        const onMouseMove = (e) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const hits = raycaster.intersectObjects(clickableRef.current);

            if (hoveredMeshRef.current && hoveredMeshRef.current !== selectedMeshRef.current) {
                hoveredMeshRef.current.material.emissiveIntensity = 0.2;
                hoveredMeshRef.current.scale.set(1, 1, 1);
            }
            if (hits.length > 0) {
                const hit = hits[0].object;
                if (hit !== selectedMeshRef.current) {
                    hit.material.emissiveIntensity = 0.55;
                    hit.scale.set(1.08, 1.08, 1.08);
                }
                hoveredMeshRef.current = hit;
                renderer.domElement.style.cursor = "pointer";
            } else {
                hoveredMeshRef.current = null;
                renderer.domElement.style.cursor = "default";
            }
        };

        const onClick = (e) => {
            const dx = Math.abs(e.clientX - mouseDownPos.x);
            const dy = Math.abs(e.clientY - mouseDownPos.y);
            if (dx > 5 || dy > 5) return;

            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const hits = raycaster.intersectObjects(clickableRef.current);

            if (selectedMeshRef.current) {
                selectedMeshRef.current.material.emissiveIntensity = 0.2;
                selectedMeshRef.current.scale.set(1, 1, 1);
            }
            if (hits.length > 0) {
                const hit = hits[0].object;
                const region = REGIONS.find((r) => r.id === hit.userData.regionId);
                selectedMeshRef.current = hit;
                hit.material.emissiveIntensity = 1.0;
                hit.scale.set(1.15, 1.15, 1.15);
                const colorHex = "#" + region.color.toString(16).padStart(6, "0");
                const association = associationsRef.current.find(a =>
                    a.organs.includes(region.id)
                );
                setSelectedInfo({ ...region, color: colorHex, association: association || null });
            } else {
                selectedMeshRef.current = null;
                setSelectedInfo(null);
            }
        };

        renderer.domElement.addEventListener("mousedown", onMouseDown);
        renderer.domElement.addEventListener("mousemove", onMouseMove);
        renderer.domElement.addEventListener("click", onClick);

        // ANIMATE
        let frameId;
        const animate = () => {
            frameId = requestAnimationFrame(animate);
                    clockRef.current += 0.03;
            const t = clockRef.current;
            const anyAffected = affectedOrgansRef.current.length > 0;

            clickableRef.current.forEach((mesh) => {
                const isAffected = affectedOrgansRef.current.includes(mesh.userData.regionId);
                const isSelected = mesh === selectedMeshRef.current;
                const isHovered = mesh === hoveredMeshRef.current;
                const { wire, glow } = mesh.userData;

                let emissive = 0.2, opacity = 0.65, wireOp = 0.3, glowOp = 0, s = 1;

                if (isAffected) {
                    const p = (Math.sin(t) + 1) / 2;   // 0..1 pulse
                    emissive = 0.4 + p * 1.4;
                    opacity = 0.7 + p * 0.3;
                    wireOp = 0.5 + p * 0.5;
                    glowOp = 0.15 + p * 0.45;
                    s = 1 + p * 0.04;
                } else if (anyAffected) {
                    emissive = 0; opacity = 0.07; wireOp = 0.05;   // dimmed
                }

                if (isHovered) {
                    emissive = Math.max(emissive, 0.55);
                    opacity = Math.max(opacity, 0.5);
                    wireOp = Math.max(wireOp, 0.4);
                    s = Math.max(s, 1.08);
                }
                if (isSelected) {
                    emissive = Math.max(emissive, 1.0);
                    opacity = Math.max(opacity, 0.85);
                    wireOp = Math.max(wireOp, 0.6);
                    s = Math.max(s, 1.15);
                }

                mesh.material.emissiveIntensity = emissive;
                mesh.material.opacity = opacity;
                mesh.scale.setScalar(s);
                wire.material.opacity = wireOp;
                wire.scale.setScalar(s);
                glow.material.opacity = glowOp;
                glow.scale.setScalar(1.35 * s);
            });

            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // RESIZE
        const onResize = () => {
            const w = mount.clientWidth;
            const h = mount.clientHeight;
            if (!w || !h) return;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        const resizeObserver = new ResizeObserver(onResize);
        resizeObserver.observe(mount);

        return () => {
            cancelAnimationFrame(frameId);
            resizeObserver.disconnect();
            controls.dispose();
            renderer.domElement.removeEventListener("mousedown", onMouseDown);
            renderer.domElement.removeEventListener("mousemove", onMouseMove);
            renderer.domElement.removeEventListener("click", onClick);
            renderer.dispose();
            renderer.forceContextLoss();
            mount.innerHTML = "";
        };
    }, []);

    useEffect(() => {
        const associations = result?.data?.organ_associations || [];
        associationsRef.current = associations;
        affectedOrgansRef.current = associations.flatMap(a => a.organs);
    }, [result]);

    return (
        <div style={{ position: "relative", width: "100%", height: "100%",overflow: "hidden" }}>
            <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

            {selectedInfo && (
                <div style={{
                    position: "absolute", top: "10px", right: "10px",
                    zIndex: 10, background: "#000",
                    border: `1px solid ${selectedInfo.color}`,
                    padding: "16px", borderRadius: "10px",
                    color: "#fff", width: "230px", fontSize: "13px",
                    boxShadow: `0 0 30px ${selectedInfo.color}66`,
                    animation: "popIn 0.25s ease", overflow: "hidden"
                }}>
                    <div style={{
                        position: "absolute", top: 0, left: 0,
                        width: "100%", height: "10px",
                        background: selectedInfo.color
                    }} />
                    <div style={{
                        marginBottom: "10px", fontWeight: "bold", color: "#aaa",
                        fontSize: "12px", letterSpacing: "1px",
                        borderBottom: "1px solid #222", paddingBottom: "6px"
                    }}>
                        REGION INFO
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ color: "#777" }}>Region</span>
                        <span style={{ fontWeight: "bold" }}>{selectedInfo.label}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                        <span style={{ color: "#777" }}>System</span>
                        <span>{selectedInfo.system}</span>
                    </div>
                    <div style={{
                        padding: "8px", background: "#111",
                        borderLeft: `3px solid ${selectedInfo.color}`,
                        fontSize: "12px", lineHeight: "1.5", color: "#ccc"
                    }}>
                        {selectedInfo.function}
                    </div>
                    {selectedInfo.association && (
                        <div style={{
                            marginTop: "10px",
                            padding: "8px",
                            background: "#0d0d0d",
                            borderLeft: `3px solid #ff9800`,
                            borderRadius: "0 4px 4px 0"
                        }}>
                            <div style={{
                                fontSize: "11px",
                                color: "#ff9800",
                                fontWeight: "bold",
                                letterSpacing: "1px",
                                marginBottom: "4px"
                            }}>
                                ⚠ MUTATION ASSOCIATION
                            </div>
                            <div style={{
                                fontSize: "12px",
                                color: "#ccc",
                                lineHeight: "1.5",
                                marginBottom: "6px"
                            }}>
                                {selectedInfo.association.reason}
                            </div>
                            <div style={{
                                fontSize: "11px",
                                color: "#555",
                                fontStyle: "italic"
                            }}>
                                Confidence: {selectedInfo.association.confidence}
                            </div>
                        </div>
                    )}

                    {!selectedInfo.association && (
                        <div style={{
                            marginTop: "10px", padding: "6px 8px",
                            background: "#0a0a0a", borderRadius: "4px",
                            fontSize: "11px", color: "#555", fontStyle: "italic"
                        }}>
                            No mutation associations detected for this region.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}