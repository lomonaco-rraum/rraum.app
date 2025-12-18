/* ================= Botones de archivo ================= */

const FACE_LABELS = {
  px: 'Right (+X)',
  nx: 'Left (−X)',
  py: 'Top (+Y)',
  ny: 'Bottom (−Y)',
  pz: 'Front (+Z)',
  nz: 'Back (−Z)'
};

document.querySelectorAll('.file-btn').forEach(btn => {
  const targetId = btn.dataset.target;
  const input = document.getElementById(targetId);
  const labelText = FACE_LABELS[targetId] || targetId.toUpperCase();

  let nameEl =
    document.querySelector(`label[for="${targetId}"]`) ||
    (btn.nextElementSibling && btn.nextElementSibling.classList && btn.nextElementSibling.classList.contains('face-name') ? btn.nextElementSibling : null) ||
    document.getElementById(`${targetId}-label`) ||
    (btn.nextElementSibling && ['LABEL','SPAN'].includes(btn.nextElementSibling.tagName) ? btn.nextElementSibling : null);

  if (nameEl) nameEl.textContent = labelText;

  btn.setAttribute('title', labelText);
  btn.setAttribute('aria-label', labelText);

  btn.addEventListener('click', () => input && input.click());

  // Miniatura + validación 1:1
  input && input.addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      btn.innerHTML = '<span class="plus">+</span>';
      if (nameEl) nameEl.textContent = labelText;
      return;
    }

    const img = new Image();
    img.onload = () => {
      if (img.width !== img.height) {
        alert("La imagen debe ser cuadrada (proporción 1:1).");
        e.target.value = "";
        btn.innerHTML = '<span class="plus">+</span>';
        if (nameEl) nameEl.textContent = labelText;
        return;
      }

      const reader = new FileReader();
      reader.onload = ev => {
        btn.innerHTML = `<img src="${ev.target.result}" alt="miniatura">`;
        if (nameEl) nameEl.textContent = `${labelText}: ${file.name}`;
      };
      reader.readAsDataURL(file);
    };
    img.src = URL.createObjectURL(file);
  });
});

/* ================= Utilidades ================= */
const readAsDataURL = file => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = e => resolve(e.target.result);
  r.onerror = reject;
  r.readAsDataURL(file);
});

const statusEl = document.getElementById('status');
const setStatus = msg => statusEl.textContent = msg || '';

/* ================= Three.js ================= */
const canvas = document.createElement('canvas');
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
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.0); }`,
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

const renderTarget = new THREE.WebGLRenderTarget(4096, 2048, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBAFormat
});

/* ================= Panolens ================= */
const viewer = new PANOLENS.Viewer({
  container: document.getElementById('viewer'),
  autoHideInfospot: true,
  controlBar: true,
  enableFullscreen: true
});

// 🔹 Modificación pedida: fondo transparente en el renderer
viewer.renderer.setClearColor(0x000000, 0);

let panorama = null;

/* ================= Build ================= */
document.getElementById('build').onclick = async () => {
  try {
    const ids = ['px','nx','py','ny','pz','nz'];
    for (const id of ids) {
      if (!document.getElementById(id).files[0]) {
        setStatus('Falta subir: ' + id.toUpperCase());
        return;
      }
    }

    setStatus('Leyendo imágenes…');
    const urls = [];
    for (const id of ids) {
      urls.push(await readAsDataURL(document.getElementById(id).files[0]));
    }

    setStatus('Cargando cubemap…');
    new THREE.CubeTextureLoader().load(urls, cube => {
      cube.encoding = THREE.sRGBEncoding;
      quad.material.uniforms.tCube.value = cube;

      renderer.setSize(2048, 1024, false);
      renderer.render(scene, camera);

      const panoURL = renderer.domElement.toDataURL('image/png');

      if (panorama) viewer.remove(panorama);
      panorama = new PANOLENS.ImagePanorama(panoURL);
      panorama.rotation.z = Math.PI;

      panorama.addEventListener('enter', () => {
        viewer.tweenControlCenter(new THREE.Vector3(0, 0, -1), 0);
      });

      viewer.add(panorama);

      document.getElementById('download').disabled = false;
      setStatus('Listo ✓');
    });

  } catch (e) {
    console.error(e);
    setStatus('Error al generar panorama');
  }
};

/* ================= Download ================= */
document.getElementById('download').onclick = () => {
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

  const exportCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  renderer.render(blitScene, exportCamera);

  const a = document.createElement('a');
  a.download = 'panorama_4096x2048.png';
  a.href = renderer.domElement.toDataURL('image/png');
  a.click();

  setStatus('PNG descargado ✓');
};

/* ================= Ajustes de tamaño ================= */
function fixViewerSize() {
  const viewerEl = document.getElementById('viewer');
  const width = 960;
  const height = 540;
  viewer.container.style.width = width + 'px';
  viewer.container.style.height = height + 'px';
  viewer.renderer.setSize(width, height);
  viewer.onWindowResize();
  viewer.updateControl();
}

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    setTimeout(fixViewerSize, 100);
  }
});

window.addEventListener('resize', () => {
  fixViewerSize();
});
