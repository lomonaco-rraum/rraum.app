document.addEventListener('DOMContentLoaded', () => {
  let viewer, model, currentMode;
  const statusEl = document.getElementById('status');
  const navigateBtn = document.getElementById('navigate-btn');
  const markerBtn = document.getElementById('marker-btn');
  const uploadBtn = document.getElementById('upload-btn');
  const viewModeSelect = document.getElementById('view-mode');
  const faceNameEl = document.querySelector('.face-name');

  const viewerEl = document.getElementById('viewer');
  const viewerRAEl = document.getElementById('viewer-ra');

  const setStatus = msg => (statusEl.textContent = msg || '');

  // 🔎 Detección de dispositivo
  function isMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }
  if (isMobile()) {
    document.body.classList.add('mobile');
  } else {
    document.body.classList.add('desktop');
  }

  // Ajuste: posiciona el vértice mínimo en (0,0,0) y escala al cubo 10x10x10
  function fitObjectToCubeWithBase(object) {
    const group = new THREE.Group();
    group.add(object);

    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const min = box.min.clone();

    group.position.sub(min);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = 10 / maxDim;
    group.scale.setScalar(scaleFactor);

    return group;
  }

  // Tamaño estable del visor Orbit (ajustado según dispositivo)
  function fixViewerSize() {
    const width = isMobile() ? window.innerWidth : 960;
    const height = isMobile() ? 400 : 540;

    if (viewer) {
      viewer.container.style.width = width + 'px';
      viewer.container.style.height = height + 'px';
      viewer.renderer.setSize(width, height);
      viewer.onWindowResize();
      viewer.updateControl();
    } else {
      viewerEl.style.width = width + 'px';
      viewerEl.style.height = height + 'px';
    }
  }

  function initViewer3D(fileUrl, ext) {
    // Mostrar Orbit, ocultar RA
    viewerEl.style.display = 'block';
    viewerRAEl.style.display = 'none';

    if (!viewer) {
      viewer = new PANOLENS.Viewer({
        container: viewerEl,
        autoHideInfospot: true,
        controlBar: true,
        enableFullscreen: true
      });

      viewer.renderer.setClearColor(0x000000, 0);

      viewer.scene.add(new THREE.GridHelper(100, 50, 0x999999, 0xcccccc));
      viewer.scene.add(new THREE.AxesHelper(50));

      viewer.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
      dirLight.position.set(30, 50, 25);
      viewer.scene.add(dirLight);

      viewer.camera.position.set(20, 20, 20);
      viewer.camera.lookAt(new THREE.Vector3(0, 0, 0));

      fixViewerSize();
    }

    if (!fileUrl || !ext) return;

    if (ext === 'obj') {
      const loader = new THREE.OBJLoader();
      loader.load(
        fileUrl,
        object => {
          const adjusted = fitObjectToCubeWithBase(object);
          viewer.scene.add(adjusted);
          model = adjusted;
          setStatus('Modelo OBJ cargado y apoyado en XY ✓');
        },
        undefined,
        () => setStatus('Error al cargar OBJ')
      );
    } else if (ext === 'stl') {
      const loader = new THREE.STLLoader();
      loader.load(
        fileUrl,
        geometry => {
          const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
          const mesh = new THREE.Mesh(geometry, material);
          const adjusted = fitObjectToCubeWithBase(mesh);
          viewer.scene.add(adjusted);
          model = adjusted;
          setStatus('Modelo STL cargado y apoyado en XY ✓');
        },
        undefined,
        () => setStatus('Error al cargar STL')
      );
    }
  }

  function initViewerRA(fileUrl, ext) {
    // Mostrar RA, ocultar Orbit
    viewerEl.style.display = 'none';
    viewerRAEl.style.display = 'block';

    setStatus('Modo RA listo: apunte la cámara al marcador');

    const markerEntity = viewerRAEl.querySelector('a-marker a-entity');
    if (markerEntity) {
      // limpiar atributos previos
      markerEntity.removeAttribute('obj-model');
      markerEntity.removeAttribute('stl-model');

      if (fileUrl && ext === 'obj') {
        markerEntity.setAttribute('obj-model', `url(${fileUrl})`);
      } else if (fileUrl && ext === 'stl') {
        // STL requiere un componente extra en A‑Frame
        markerEntity.setAttribute('stl-model', `url(${fileUrl})`);
      }
    }
  }

  // Menú de modos
  viewModeSelect.onchange = e => {
    currentMode = e.target.value;
    document.body.classList.remove('orbit-mode', 'ra-mode');
    document.body.classList.add(currentMode + '-mode');


    uploadBtn.disabled = !currentMode;
    navigateBtn.disabled = true;
    markerBtn.style.display = 'none';

    setStatus(
      currentMode === 'orbit'
        ? 'Seleccione un modelo para cargar en visor 3D'
        : currentMode === 'ra'
          ? 'Seleccione un modelo para cargar en RA'
          : 'Seleccione un modo de visualización'
    );

    uploadBtn.textContent = '+';
    uploadBtn.style.fontSize = '60px';
    if (faceNameEl) faceNameEl.textContent = 'Subir modelo';

    fixViewerSize();
  };

  // Botón (+)
  uploadBtn.onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.obj,.stl';

    input.onchange = e => {
      const file = e.target.files && e.target.files[0];
      if (!file) {
        uploadBtn.textContent = '+';
        uploadBtn.style.fontSize = '60px';
        if (faceNameEl) faceNameEl.textContent = 'Subir modelo';
        return;
      }

      uploadBtn.textContent = file.name;
      uploadBtn.style.fontSize = '12px';
      uploadBtn.disabled = true;
      uploadBtn.style.cursor = 'default';

      uploadBtn.dataset.file = URL.createObjectURL(file);
      uploadBtn.dataset.ext = (file.name.split('.').pop() || '').toLowerCase();

      if (faceNameEl) faceNameEl.textContent = 'Archivo cargado';

      navigateBtn.disabled = false;
      setStatus('Modelo cargado, listo para navegar');

      if (currentMode === 'ra') {
        markerBtn.style.display = 'inline-block';
      }
    };

    input.click();
  };

  // Navegar
  navigateBtn.onclick = () => {
    const fileUrl = uploadBtn.dataset.file;
    const ext = uploadBtn.dataset.ext;

    if (!fileUrl) {
      setStatus('Primero cargue un modelo');
      return;
    }

    if (currentMode === 'orbit') {
      initViewer3D(fileUrl, ext);
    } else if (currentMode === 'ra') {
      initViewerRA(fileUrl, ext);
    }
  };

  // Descargar marcador
  markerBtn.onclick = () => {
    const a = document.createElement('a');
    a.download = 'marker.png';
    a.href = 'marker.png';
    a.click();
    setStatus('Marcador descargado ✓');
  };

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      setTimeout(fixViewerSize, 100);
    }
  });
  window.addEventListener('resize', fixViewerSize);

  fixViewerSize();
});
