document.addEventListener('DOMContentLoaded', () => {
  let viewer, model, currentMode;
  const statusEl = document.getElementById('status');
  const navigateBtn = document.getElementById('navigate-btn');
  const markerBtn = document.getElementById('marker-btn');
  const uploadBtn = document.getElementById('upload-btn');
  const viewModeSelect = document.getElementById('view-mode');
  const faceNameEl = document.querySelector('.face-name');

  const setStatus = msg => (statusEl.textContent = msg || '');

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

  // Tamaño estable del visor (idéntico a espacio.INM)
  function fixViewerSize() {
    const viewerEl = document.getElementById('viewer');
    const width = 960;
    const height = 540;

    // Ajustar contenedor y renderer de Panolens
    if (viewer) {
      viewer.container.style.width = width + 'px';
      viewer.container.style.height = height + 'px';
      viewer.renderer.setSize(width, height);
      viewer.onWindowResize();
      viewer.updateControl();
    } else {
      // Fijar dimensiones del div hasta que el viewer exista
      viewerEl.style.width = width + 'px';
      viewerEl.style.height = height + 'px';
    }
  }

  function initViewer3D(fileUrl, ext) {
    if (!viewer) {
      viewer = new PANOLENS.Viewer({
        container: document.getElementById('viewer'),
        autoHideInfospot: true,
        controlBar: true,
        enableFullscreen: true
      });

      // Fondo transparente como en INM (renderer), pero panel negro por CSS
      viewer.renderer.setClearColor(0x000000, 0);

      // Helpers
      viewer.scene.add(new THREE.GridHelper(100, 50, 0x999999, 0xcccccc));
      viewer.scene.add(new THREE.AxesHelper(50));

      // Luces
      viewer.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
      dirLight.position.set(30, 50, 25);
      viewer.scene.add(dirLight);

      // Cámara
      viewer.camera.position.set(20, 20, 20);
      viewer.camera.lookAt(new THREE.Vector3(0, 0, 0));

      // Fijar tamaño inicial
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

  function initViewerRA(fileUrl) {
    setStatus('Modo RA listo (requiere cámara y marcador)');
    // Cuando integres RA real, mantené fixViewerSize para paridad visual
    fixViewerSize();
  }

  // Orden: primero menú → luego (+) → luego acciones
  viewModeSelect.onchange = e => {
    currentMode = e.target.value;

    // Estado de botones
    uploadBtn.disabled = !currentMode;
    navigateBtn.disabled = true;
    markerBtn.style.display = 'none';

    // Texto de ayuda
    setStatus(
      currentMode === 'orbit'
        ? 'Seleccione un modelo para cargar en visor 3D'
        : currentMode === 'ra'
          ? 'Seleccione un modelo para cargar en RA'
          : 'Seleccione un modo de visualización'
    );

    // Reset visual del botón (+) y etiqueta
    uploadBtn.textContent = '+';
    uploadBtn.style.fontSize = '60px'; // tamaño grande para el +
    if (faceNameEl) faceNameEl.textContent = 'Subir modelo';

    // Asegurar tamaño estable del visor
    fixViewerSize();
  };

  // Botón (+): muestra NOMBRE del archivo, sin miniatura
  uploadBtn.onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.obj,.stl';

    input.onchange = e => {
      const file = e.target.files && e.target.files[0];
      if (!file) {
        // Reset a +
        uploadBtn.textContent = '+';
        uploadBtn.style.fontSize = '60px';
        if (faceNameEl) faceNameEl.textContent = 'Subir modelo';
        return;
      }

      // Mostrar SOLO el nombre del archivo en el botón (monospace)
      uploadBtn.textContent = file.name;
      uploadBtn.style.fontSize = '12px'; // tamaño para texto
      uploadBtn.disabled = true;
      uploadBtn.style.cursor = 'default';

      // Guardar URL para carga posterior (no se asigna al DOM para evitar miniaturas)
      uploadBtn.dataset.file = URL.createObjectURL(file);
      uploadBtn.dataset.ext = (file.name.split('.').pop() || '').toLowerCase();

      // Actualizar etiqueta al lado del botón
      if (faceNameEl) faceNameEl.textContent = 'Archivo cargado';

      // Habilitar navegación
      navigateBtn.disabled = false;
      setStatus('Modelo cargado, listo para navegar');

      if (currentMode === 'ra') {
        markerBtn.style.display = 'inline-block';
      }
    };

    input.click();
  };

  // Navegar: inicia el visor según modo
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
      initViewerRA(fileUrl);
      setStatus('Buscando marcador con cámara...');
    }
  };

  // Descargar marcador (placeholder)
  markerBtn.onclick = () => {
    const a = document.createElement('a');
    a.download = 'rraumlab-marcador.png';
    a.href = 'rraumlab-marcador.png';
    a.click();
    setStatus('Marcador descargado ✓');
  };

  // Mantener tamaño estable como INM
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      setTimeout(fixViewerSize, 100);
    }
  });
  window.addEventListener('resize', fixViewerSize);

  // Fijar tamaño al cargar
  fixViewerSize();
});
