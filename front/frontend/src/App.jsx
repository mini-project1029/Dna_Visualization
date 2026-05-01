import { useState } from "react";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

function App() {
  const [sequence1, setSequence1] = useState("");
  const [sequence2, setSequence2] = useState("");
  const [motif, setMotif] = useState("");
  const [result, setResult] = useState(null);
  const [showMutations, setShowMutations] = useState(true);
  const [showMotifs, setShowMotifs] = useState(true);
  const gcContent = result?.data?.gc_content || 0;
  const gcFactor = gcContent / 100; // 0 → 1
  const [selectedBase, setSelectedBase] = useState(null);
  const styleTag = document.createElement("style");


  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target.result;

      // Remove FASTA header
      const lines = text.split("\n").filter(line => !line.startsWith(">"));
      const sequence = lines.join("").trim();

      setSequence1(sequence);
    };

    reader.readAsText(file);
  };

  const mountRef = useRef(null);
  const basePairsRef = useRef([]); // Store all clickable base pair meshes

  useEffect(() => {
    styleTag.innerHTML = `
@keyframes popIn {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
`;
document.head.appendChild(styleTag);
    if (!mountRef.current) return;

    mountRef.current.innerHTML = "";

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 20;
    

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000);

    mountRef.current.appendChild(renderer.domElement);

    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(10, 10, 10);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // SAFE SEQUENCE
    let sequence = (sequence1 || "").toUpperCase();
    let mutationPositions = [];
    let motifPositions = [];
    let motifLength = 0;

    const cleanMotif = (motif || "").toUpperCase().replace(/[^ATGC]/g, "");

    if (result && result.data && result.data.motif_positions && cleanMotif) {
      motifPositions = result.data.motif_positions;
      motifLength = cleanMotif.length;
    }
    const isAnalyzed = result && result.data;

    if (result && result.data && result.data.mutations) {
      mutationPositions = result.data.mutations.map(m => m.pos);
    }
    sequence = sequence.replace(/[^ATGC]/g, "");
    if (sequence.length < 5) {
      sequence = "ATGCATGCATGC";
    }

    // COMPLEMENT
    const getComplement = (b) => {
      if (b === "A") return "T";
      if (b === "T") return "A";
      if (b === "G") return "C";
      if (b === "C") return "G";
      return "A";
    };

    // BASE COLORS
    const getBaseColor = (b) => {
      if (b === "A") return 0xffff00; // yellow
      if (b === "T") return 0xff0000; // red
      if (b === "G") return 0x00ff00; // green
      if (b === "C") return 0x0000ff; // blue
      return 0xffffff;
    };

    const group = new THREE.Group();
    const basePairs = []; // Track all clickable base pair meshes

    const radius = 4;
    const helixHeight = sequence.length * 0.6;

    const points1 = [];
    const points2 = [];

    // CREATE BASE PAIRS AS CLICKABLE MESHES
    for (let i = 0; i < sequence.length; i++) {
      const base = sequence[i];
      const isGC = base === "G" || base === "C";
      const angle = i * 0.3;
      const y = i * 0.6 - helixHeight / 2;

      const x1 = Math.cos(angle) * radius;
      const z1 = Math.sin(angle) * radius;

      const x2 = Math.cos(angle + Math.PI) * radius;
      const z2 = Math.sin(angle + Math.PI) * radius;

      points1.push(new THREE.Vector3(x1, y, z1));
      points2.push(new THREE.Vector3(x2, y, z2));

      const base1 = sequence[i];
      const base2 = getComplement(base1);

      // MIDPOINT
      const mid = new THREE.Vector3(
        (x1 + x2) / 2,
        y,
        (z1 + z2) / 2
      );

      // HALF 1: From strand1 to midpoint (colored by base1)
      const start1 = new THREE.Vector3(x1, y, z1);
      const direction1 = new THREE.Vector3().subVectors(mid, start1);
      const length1 = direction1.length();

      const cylinderGeo1 = new THREE.CylinderGeometry(0.08, 0.08, length1, 8);
      const isMutated = showMutations && mutationPositions.includes(i);

      let isMotif = false;

      if (showMotifs && motifLength > 0) {
        isMotif = motifPositions.some(pos =>
          i >= pos && i < pos + motifLength
        );
      }

      const finalColor =
        isMutated
          ? 0xff00ff
          : isMotif
            ? 0x00ffff
            : getBaseColor(base1);

      const finalEmissive =
        isMutated
          ? 0x550055
          : isMotif
            ? 0x003333
            : 0x000000;

      const gcBoost = isGC ? 0.8 : 0.1;

      const cylinderMat1 = new THREE.MeshPhongMaterial({
        color: finalColor,
        shininess: 100,
        emissive: finalEmissive,
        emissiveIntensity: gcBoost
      });

      const cylinder1 = new THREE.Mesh(cylinderGeo1, cylinderMat1);

      // Position at midpoint of the half-segment
      cylinder1.position.copy(start1).add(direction1.clone().multiplyScalar(0.5));

      // Align cylinder (which points up by default) with the direction vector
      cylinder1.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), // cylinder's default orientation
        direction1.normalize()
      );

      cylinder1.userData = {
        type: 'base_pair_half',
        base: base1,
        position: i,
        strand: 1,
        complementBase: base2
      };

      group.add(cylinder1);
      basePairs.push(cylinder1);

      // HALF 2: From midpoint to strand2 (colored by base2)
      const start2 = new THREE.Vector3(x2, y, z2);
      const direction2 = new THREE.Vector3().subVectors(mid, start2);
      const length2 = direction2.length();

      const cylinderGeo2 = new THREE.CylinderGeometry(0.08, 0.08, length2, 8);

      const finalColor2 =
        isMutated
          ? 0xff00ff
          : isMotif
            ? 0x00ffff
            : getBaseColor(base2);

      const finalEmissive2 =
        isMutated
          ? 0x550055
          : isMotif
            ? 0x003333
            : 0x000000;


      const baseComp = base2;
      const isGC2 = baseComp === "G" || baseComp === "C";

      const gcBoost2 = isGC2 ? 0.8 : 0.1;

      const cylinderMat2 = new THREE.MeshPhongMaterial({
        color: finalColor2,
        shininess: 100,
        emissive: finalEmissive2,
        emissiveIntensity: gcBoost2
      });

      const cylinder2 = new THREE.Mesh(cylinderGeo2, cylinderMat2);

      // Position at midpoint of the half-segment
      cylinder2.position.copy(start2).add(direction2.clone().multiplyScalar(0.5));

      // Align cylinder with the direction vector
      cylinder2.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction2.normalize()
      );

      cylinder2.userData = {
        type: 'base_pair_half',
        base: base2,
        position: i,
        strand: 2,
        complementBase: base1
      };

      group.add(cylinder2);
      basePairs.push(cylinder2);
    }

    // WHITE BACKBONE STRANDS
    if (points1.length > 3) {
      const curve1 = new THREE.CatmullRomCurve3(points1);
      const curve2 = new THREE.CatmullRomCurve3(points2);

      const tubeGeo1 = new THREE.TubeGeometry(curve1, 100, 0.15, 8, false);
      const tubeGeo2 = new THREE.TubeGeometry(curve2, 100, 0.15, 8, false);

      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });

      const strand1 = new THREE.Mesh(tubeGeo1, mat);
      const strand2 = new THREE.Mesh(tubeGeo2, mat);

      group.add(strand1);
      group.add(strand2);
    }

    scene.add(group);
    basePairsRef.current = basePairs;

    // RAYCASTER FOR CLICK DETECTION
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let hoveredObject = null;

    const onMouseMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();

      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(basePairs);

      if (intersects.length > 0) {
        const obj = intersects[0].object;

        if (hoveredObject && hoveredObject !== obj) {
          hoveredObject.material.emissive.setHex(0x000000);
          hoveredObject.scale.set(1, 1, 1);
        }

        hoveredObject = obj;

        obj.material.emissive.setHex(0x333333);
        obj.material.emissiveIntensity = 0.5;
        obj.scale.set(1.2, 1.2, 1.2);

      } else {
        if (hoveredObject) {
          hoveredObject.material.emissive.setHex(0x000000);
          hoveredObject.scale.set(1, 1, 1);
          hoveredObject = null;
        }
      }
    };
const onClick = (event) => {
  const rect = renderer.domElement.getBoundingClientRect();

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(basePairs);

  if (intersects.length > 0) {
    const obj = intersects[0].object;

    // THIS IS THE FIX
    if (obj.userData) {
      setSelectedBase(obj.userData);
    }

    console.log('Clicked base pair:', obj.userData);

    // HIGHLIGHT EFFECT
    obj.material.emissive.setHex(0xffffff);
    obj.material.emissiveIntensity = 0.8;

    obj.scale.set(1.5, 1.5, 1.5);

    setTimeout(() => {
      obj.material.emissive.setHex(0x000000);
      obj.material.emissiveIntensity = 0;
      obj.scale.set(1, 1, 1);
    }, 800);
  }
};

    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('mousemove', onMouseMove);


    const animate = () => {
      requestAnimationFrame(animate);

      
      group.rotation.y += 0.0035; // keep or remove later

      controls.update(); // REQUIRED

      renderer.render(scene, camera);
    };

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;

    animate();

    return () => {
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      if (mountRef.current) {
        mountRef.current.innerHTML = "";
      }
    };
  }, [sequence1, result, showMutations, showMotifs]);

const getPanelTheme = (base) => {
  if (base === "A") return {
    border: "#ffff00",
    glow: "rgba(255,255,0,0.5)",
    bg: "rgba(255,255,0,0.05)"
  };

  if (base === "T") return {
    border: "#ff0000",
    glow: "rgba(255,0,0,0.5)",
    bg: "rgba(255,0,0,0.05)"
  };

  if (base === "G") return {
    border: "#00ff00",
    glow: "rgba(0,255,0,0.5)",
    bg: "rgba(0,255,0,0.05)"
  };

  if (base === "C") return {
    border: "#010f8eff",
    glow: "rgba(0, 30, 255, 1)",
    bg: "rgba(0,255,255,0.05)"
  };

  return {
    border: "#fff",
    glow: "rgba(255,255,255,0.3)",
    bg: "rgba(255,255,255,0.03)"
  };
};

const theme = getPanelTheme(selectedBase?.base);

let selectedMutation = null;

if (selectedBase && result && result.data && result.data.mutations) {
  selectedMutation = result.data.mutations.find(
    m => m.pos === selectedBase.position
  );
}

  return (

    <div style={{
      display: "flex",
      height: "100vh",
      background: "linear-gradient(180deg, #0a0a0a, #111)",
      color: "#e5e5e5",
      fontFamily: "Inter, sans-serif"
    }}>

      {/* LEFT PANEL */}
      <div style={{
        width: "30%",
        padding: "24px",
        borderRight: "1px solid #222",
        overflowY: "auto",
        backgroundColor: "#0d0d0d"
      }}>

        <h2>DNA Analyzer</h2>

        <h3 style={{
          marginTop: "20px",
          marginBottom: "20px",
          color: "#888",
          paddingBottom: "6px",
          borderTop: "1px solid #ffffffff",
          borderBottom: "1px solid #ffffffff",
          letterSpacing: "1px",
          fontSize: "12px"
        }}>

          INPUT
        </h3>

        {/* Sequence 1 */}
        <textarea
          placeholder="Sequence 1"
          value={sequence1}
          onChange={(e) => setSequence1(e.target.value)}
          onFocus={(e) => e.target.style.border = "1px solid #555"}
          onBlur={(e) => e.target.style.border = "1px solid #222"}
          style={{
            width: "100%",
            marginBottom: "12px",
            padding: "10px",
            background: "#111",
            color: "#fff",
            border: "1px solid #222",
            borderRadius: "6px",
            transition: "all 0.2s ease",
            outline: "none"
          }}
        />

        {/* Sequence 2 */}
        <textarea
          placeholder="Sequence 2"
          value={sequence2}
          onChange={(e) => setSequence2(e.target.value)}
          onFocus={(e) => e.target.style.border = "1px solid #555"}
          onBlur={(e) => e.target.style.border = "1px solid #222"}
          style={{
            width: "100%",
            marginBottom: "12px",
            padding: "10px",
            background: "#111",
            color: "#fff",
            border: "1px solid #222",
            borderRadius: "6px",
            transition: "all 0.2s ease",
            outline: "none"
          }}
        />

        {/* Motif */}
        <input
          placeholder="Motif"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          onFocus={(e) => e.target.style.border = "1px solid #555"}
          onBlur={(e) => e.target.style.border = "1px solid #222"}
          style={{
            width: "100%",
            marginBottom: "12px",
            padding: "10px",
            background: "#111",
            color: "#fff",
            border: "1px solid #222",
            borderRadius: "6px",
            transition: "all 0.2s ease",
            outline: "none"
          }}
        />

        {/* Button */}
        <button
          style={{
            width: "100%",
            padding: "12px",
            background: "#fff",
            color: "#000",
            border: "none",
            borderRadius: "6px",
            fontWeight: "bold",
            cursor: "pointer",
            transform: "scale(1)",
            transition: "all 0.2s ease"
          }}

          onMouseEnter={(e) => {
            e.target.style.transform = "scale(1.03)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "scale(1)";
          }}

          onClick={async () => {
            const res = await fetch("http://127.0.0.1:8000/analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sequence1, sequence2, motif })
            });

            const data = await res.json();
            setResult(data);
          }}
        >
          ANALYZE
        </button>


        <h3 style={{
          marginTop: "20px",
          marginBottom: "20px",
          color: "#888",
          paddingBottom: "6px",
          borderTop: "1px solid #ffffffff",
          borderBottom: "1px solid #ffffffff",
          letterSpacing: "1px",
          fontSize: "12px"
        }}>

          VISUALIZATION
        </h3>

        <div style={{ marginTop: "15px" }}>
          <label>
            <input
              type="checkbox"
              checked={showMutations}
              onChange={() => setShowMutations(!showMutations)}
            />
            Show Mutations
          </label>

          <br />

          <label>
            <input
              type="checkbox"
              checked={showMotifs}
              onChange={() => setShowMotifs(!showMotifs)}
            />
            Show Motifs
          </label>
        </div>

        {/* RESULTS */}
        <h3 style={{
          marginTop: "20px",
          marginBottom: "20px",
          color: "#888",
          paddingBottom: "6px",
          borderTop: "1px solid #ffffffff",
          borderBottom: "1px solid #ffffffff",
          letterSpacing: "1px",
          fontSize: "12px"
        }}>
          RESULTS
        </h3>
        {result && (
          <div style={{ marginTop: "20px" }}>

            <h3>Mutations</h3>
            {result.data.mutations.map((m, i) => (
              <div key={i}>
                {m.pos}: {m.from} → {m.to}
              </div>
            ))}

            <h3>Motif Positions</h3>
            {result.data.motif_positions.length > 0 ? (
              result.data.motif_positions.map((pos, i) => (
                <div key={i}>
                  Position: {pos}
                </div>
              ))
            ) : (
              <p>No motif matches found</p>
            )}
            <h3>GC Content</h3>
            <p>{result.data.gc_content.toFixed(2)}%</p>

            <h3>Prediction</h3>
            <div style={{
              padding: "10px",
              border: "1px solid #444",
              textAlign: "center",
              fontWeight: "bold"
            }}>
              {result.data.prediction === 1
                ? "HIGH RISK"
                : "LOW RISK"}
            </div>

          </div>
        )}

      </div>

      {/* RIGHT PANEL */}
      <div style={{
        width: "70%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#050505",
        position: "relative",
        overflow:"hidden"
      }}>
        <div style={{
  position: "relative",
  width: "90%",
  height: "90%"
}}>
  <div
    ref={mountRef}
    style={{
      width: "100%",
      height: "100%",

    }}
  ></div>

  {selectedBase && (
    <div style={{
  position: "absolute",
  top: "10px",
  right: "10px",
  zIndex: 10,
  background: `#000000`,
border: `1px solid ${selectedMutation ? "#ff00ff" : theme.border}`,
  padding: "16px",
  borderRadius: "10px",
  color: "#fff",
  width: "220px",
  fontSize: "13px",
boxShadow: selectedMutation
  ? "0 0 40px rgba(255,0,255,0.8)"
  : `0 0 30px ${theme.glow}`,
  transition: "all 0.3s ease",
  animation: "popIn 0.25s ease",
  overflow: "hidden"
    }}>
      <div style={{
        marginBottom: "10px",
        fontWeight: "bold",
        color: "#aaa",
        fontSize: "12px",
        letterSpacing: "1px",
        borderBottom: "1px solid #222",
        paddingBottom: "6px"
      }}>

        <div style={{
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "10px",
background: selectedMutation ? "#ff00ff" : theme.border,
}}></div>
        BASE INFO
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#777" }}>Base</span>
        <span>{selectedBase.base}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#777" }}>Position</span>
        <span>{selectedBase.position}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#777" }}>Strand</span>
        <span>{selectedBase.strand}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#777" }}>Pair</span>
        <span>{selectedBase.complementBase}</span>
      </div>

<div style={{
  display: "flex",
  justifyContent: "space-between",
  marginTop: "8px"
}}>
  <span style={{ color: "#777" }}>Mutation</span>

  <span style={{
    color: selectedMutation ? "#ff00ff" : "#888",
    fontWeight: selectedMutation ? "bold" : "normal"
  }}>
    {selectedMutation
      ? `${selectedMutation.from} → ${selectedMutation.to}`
      : "None"}
  </span>
</div>

    </div>
  )}
</div>


      </div>

    </div>
  );
}
export default App;