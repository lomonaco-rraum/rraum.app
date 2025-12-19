/* ================= Botones de archivo ================= */
const FACE_LABELS = {
  px: 'Right (+X)',
  nx: 'Left (−X)',
  py: 'Top (+Y)',
  ny: 'Bottom (−Y)',
  pz: 'Front (+Z)',
  nz: 'Back (−Z)',
  eqr: 'Equirectangular'
};

document.querySelectorAll('.file-btn').forEach(btn => {
  const targetId = btn.dataset.target;
  const input = document.getElementById(targetId);
  const labelText = FACE_LABELS[targetId] || targetId.toUpperCase();

  btn.addEventListener('click', () => {
    if (input) input.click();
  });

  input && input.addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      btn.innerHTML = '<span class="plus">+</span>';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      btn.innerHTML = `<img src="${ev.target.result}" alt="miniatura">`;
    };
    reader.readAsDataURL(file);
  });
});

/* ================= Utilidades ================= */
const readAsDataURL = file => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = e => resolve(e.target.result);
  r.onerror = reject;
  r.readAsDataURL(file);
});

const setStatus = (id, msg) => {
  const el = document.getElementById(id);
  if (el) el.textContent = msg || '';
};

/* ================= Three.js comunes ================= */
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

/* ================= Panolens viewers ================= */
const viewer = new PANOLENS.Viewer({
  container: document.getElementById('viewer'),
  autoHideInfospot: true,
  controlBar: true,
  enableFullscreen: true
});
viewer.renderer.setClearColor(0x000000, 0);

let panorama = null;

const viewerEqr = new PANOLENS.Viewer({
  container: document.getElementById('viewer-eqr'),
  autoHideInfospot: true,
  controlBar: true,
  enableFullscreen: true
});
viewerEqr.renderer.setClearColor(0x000000, 0);

let panoramaEqr = null;

/* ================= Build CM → EQ ================= */
document.getElementById('build').onclick = async () => {
  try {
    const ids = ['px','nx','py','ny','pz','nz'];
    for (const id of ids) {
      if (!document.getElementById(id).files[0]) {
        setStatus('status','Falta subir: ' + id.toUpperCase());
        return;
      }
    }

    setStatus('status','Leyendo imágenes…');
    const urls = [];
    for (const id of ids) {
      urls.push(await readAsDataURL(document.getElementById(id).files[0]));
    }

    setStatus('status','Cargando cubemap…');
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
      setStatus('status','Listo ✓');
    });

  } catch (e) {
    console.error(e);
    setStatus('status','Error al generar panorama');
  }
};

/* ================= Download CM → EQ ================= */
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

  setStatus('status','PNG descargado ✓');
};

document.getElementById('build-eqr').onclick = async () => {
  try {
    const input = document.getElementById('eqr');
    if (!input || !input.files || input.files.length === 0) {
      setStatus('status-eqr','Falta subir equirectangular');
      return;
    }
    const file = input.files[0];
    const url = await readAsDataURL(file);

    // Mostrar EQ inmersiva en Panolens
    if (panoramaEqr) viewerEqr.remove(panoramaEqr);
    panoramaEqr = new PANOLENS.ImagePanorama(url);
    viewerEqr.add(panoramaEqr);

    // Cargar textura con filtros correctos
    const texture = new THREE.TextureLoader().load(url);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    cubeMapEqr = texture; // guardar para exportar

    document.getElementById('download-eqr').disabled = false;
    setStatus('status-eqr','Panorama listo ✓');
  } catch (e) {
    console.error(e);
    setStatus('status-eqr','Error al generar cubemap');
  }
};
/* ================Bloque Build =========== */
document.getElementById('build-eqr').onclick = async () => {
  const input = document.getElementById('eqr');
  if (!input || !input.files || input.files.length === 0) {
    setStatus('status-eqr','Falta subir equirectangular');
    return;
  }
  const file = input.files[0];
  const url = URL.createObjectURL(file);

  // Mostrar en visor Panolens
  if (panoramaEqr) viewerEqr.remove(panoramaEqr);
  panoramaEqr = new PANOLENS.ImagePanorama(url);
  viewerEqr.add(panoramaEqr);

  // 🔹 Aquí va tu bloque de TextureLoader
  const texture = new THREE.TextureLoader().load(url);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  eqrTexture = texture;   // guardar para exportar

  document.getElementById('download-eqr').disabled = false;
  setStatus('status-eqr','Panorama listo ✓');
};


/* ================= Download EQ → CM ================= */
document.getElementById('download-eqr').onclick = async () => {
  if (!eqrTexture) {
    setStatus('status-eqr','No hay equirectangular cargada');
    return;
  }

  const sceneEqr = new THREE.Scene();
  const sphere = new THREE.Mesh(
    new THREE.SphereBufferGeometry(500, 60, 40),
    new THREE.MeshBasicMaterial({ map: eqrTexture, side: THREE.BackSide })
  );
  sceneEqr.add(sphere);

  const directions = [
    { name: 'Right', dir: new THREE.Vector3(1,0,0), up: new THREE.Vector3(0,-1,0) },
    { name: 'Left', dir: new THREE.Vector3(-1,0,0), up: new THREE.Vector3(0,-1,0) },
    { name: 'Top', dir: new THREE.Vector3(0,1,0), up: new THREE.Vector3(0,0,1) },
    { name: 'Bottom', dir: new THREE.Vector3(0,-1,0), up: new THREE.Vector3(0,0,-1) },
    { name: 'Front', dir: new THREE.Vector3(0,0,1), up: new THREE.Vector3(0,-1,0) },
    { name: 'Back', dir: new THREE.Vector3(0,0,-1), up: new THREE.Vector3(0,-1,0) }
  ];

  const cam = new THREE.PerspectiveCamera(90, 1, 0.1, 1000);
  const zip = new JSZip();

  for (const d of directions) {
    cam.position.set(0,0,0);
    cam.up.copy(d.up);
    cam.lookAt(d.dir);

    const rendererLocal = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
    rendererLocal.setSize(1024, 1024);
    rendererLocal.render(sceneEqr, cam);

    const dataURL = rendererLocal.domElement.toDataURL('image/png');
    const base64 = dataURL.split(',')[1];
    zip.file(`${d.name}.png`, base64, {base64: true});
  }

  const zipName = prompt("Nombre del archivo ZIP:", "cubemap.zip") || "cubemap.zip";
  const content = await zip.generateAsync({type:"blob"});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = zipName;
  a.click();

  setStatus('status-eqr','ZIP descargado ✓');
};

/* ================= Tabs ================= */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
  });
});
