/* ================= Utilidades ================= */

const readAsDataURL = file =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const setStatus = msg =>
  document.getElementById("status").textContent = msg || "";

/* ================= Miniaturas ================= */

["px","nx","py","ny","pz","nz"].forEach(id => {
  const input = document.getElementById(id);
  const thumb = document.getElementById(`thumb-${id}`);

  input.addEventListener("change", () => {
    if (!input.files[0]) return;
    const url = URL.createObjectURL(input.files[0]);
    thumb.src = url;
    thumb.style.display = "block";
  });
});

/* ================= Three.js ================= */

const canvas = document.createElement("canvas");
const renderer = new THREE.WebGLRenderer({
  canvas,
  preserveDrawingBuffer: true,
  antialias: true
});

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const quad = new THREE.Mesh(
  new THREE.PlaneBufferGeometry(2, 2),
  new THREE.ShaderMaterial({
    uniforms: { tCube: { value: null } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform samplerCube tCube;

      void main() {
        float PI = 3.141592653589793;
        float lon = (vUv.x - 0.5) * 2.0 * PI;
        float lat = (0.5 - vUv.y) * PI;

        vec3 dir;
        dir.x = -sin(lon) * cos(lat);
        dir.y =  sin(lat);
        dir.z =  cos(lon) * cos(lat);

        gl_FragColor = textureCube(tCube, normalize(dir));
      }
    `
  })
);

scene.add(quad);

const renderTarget = new THREE.WebGLRenderTarget(4096, 2048);

/* ================= Panolens ================= */

const viewer = new PANOLENS.Viewer({
  container: document.getElementById("viewer"),
  autoHideInfospot: true
});

let panorama = null;

/* ================= Build ================= */

document.getElementById("build").onclick = async () => {
  const ids = ["px","nx","py","ny","pz","nz"];

  for (const id of ids) {
    if (!document.getElementById(id).files[0]) {
      setStatus("Falta subir: " + id.toUpperCase());
      return;
    }
  }

  setStatus("Procesando…");

  const urls = [];
  for (const id of ids) {
    urls.push(await readAsDataURL(document.getElementById(id).files[0]));
  }

  new THREE.CubeTextureLoader().load(urls, cube => {
    quad.material.uniforms.tCube.value = cube;

    renderer.setSize(2048, 1024, false);
    renderer.render(scene, camera);

    const panoURL = renderer.domElement.toDataURL("image/png");

    if (panorama) viewer.remove(panorama);

    panorama = new PANOLENS.ImagePanorama(panoURL);
    panorama.rotation.z = Math.PI;

    viewer.add(panorama);

    document.getElementById("download").disabled = false;
    setStatus("Listo");
  });
};

/* ================= Download ================= */

document.getElementById("download").onclick = () => {
  renderer.setRenderTarget(renderTarget);
  renderer.setSize(4096, 2048, false);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);

  const blitScene = new THREE.Scene();
  const blitMesh = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(2, 2),
    new THREE.MeshBasicMaterial({ map: renderTarget.texture })
  );

  blitMesh.scale.x = -1;
  blitMesh.scale.y = -1;

  blitScene.add(blitMesh);
  renderer.render(blitScene, camera);

  const a = document.createElement("a");
  a.download = "panorama_4096x2048.png";
  a.href = renderer.domElement.toDataURL("image/png");
  a.click();
};
