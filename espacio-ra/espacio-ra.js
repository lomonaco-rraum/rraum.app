document.addEventListener('DOMContentLoaded', () => {
  let viewer, model, currentMode;
  const statusEl = document.getElementById('status');
  const navigateBtn = document.getElementById('navigate-btn');
  const markerBtn = document.getElementById('marker-btn');
  const uploadBtn = document.getElementById('upload-btn');
  const viewModeSelect = document.getElementById('view-mode');
  const faceNameEl = document.querySelector('.face-name');
  const vizModeSelect = document.getElementById('viz-mode');
  const orientationSelect = document.getElementById('orientation');


  const viewerEl = document.getElementById('viewer');
  const viewerRAEl = document.getElementById('viewer-ra');

  const setStatus = msg => (statusEl.textContent = msg || '');

  function setProjectionMode(mode) {
  if (!viewer) return;
  if (mode === 'parallel') {
    viewer.currentProjection = 'parallel';
    viewer.camera = viewer.orthoCam;
  } else {
    viewer.currentProjection = 'perspective';
    viewer.camera = viewer.perspCam;
  }
}

function setCameraOrientation(view) {
  if (!viewer) return;

  const parallelViews = ['top','bottom','front','back','left','right','iso_so','iso_no','iso_se','iso_ne'];
  const useParallel = parallelViews.includes(view);

  setProjectionMode(useParallel ? 'parallel' : 'perspective');
  const cam = viewer.camera;

  if (view === 'top') cam.position.set(0, 50, 0);
  else if (view === 'bottom') cam.position.set(0, -50, 0);
  else if (view === 'front') cam.position.set(0, 0, 50);
  else if (view === 'back') cam.position.set(0, 0, -50);
  else if (view === 'left') cam.position.set(-50, 0, 0);
  else if (view === 'right') cam.position.set(50, 0, 0);
  else if (view === 'iso_so') cam.position.set(-30, 30, 30);
  else if (view === 'iso_no') cam.position.set(-30, 30, -30);
  else if (view === 'iso_se') cam.position.set(30, 30, 30);
  else if (view === 'iso_ne') cam.position.set(30, 30, -30);
  else if (view === 'iso') cam.position.set(30, 30, 30);

  cam.lookAt(new THREE.Vector3(0, 0, 0));
  cam.updateProjectionMatrix?.();
}

  // 🔎 Detección de dispositivo
  function isMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }
  if (isMobile()) {
    document.body.classList.add('mobile');
  } else {
    document.body.classList.add('desktop');
  }

  // Crear cámaras en initViewer3D
function initViewer3D(fileUrl, ext) {
  // ... tu código existente ...

  if (!viewer) {
    viewer = new PANOLENS.Viewer({
      container: viewerEl,
      autoHideInfospot: true,
      controlBar: true,
      enableFullscreen: true
    });

    viewer.renderer.setClearColor(0xffffff, 1);

    viewer.scene.add(new THREE.GridHelper(100, 50, 0x999999, 0xcccccc));
    viewer.scene.add(new THREE.AxesHelper(50));

    viewer.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(30, 50, 25);
    viewer.scene.add(dirLight);

    // Cámara en perspectiva (default)
    const perspCam = viewer.camera;
    perspCam.position.set(20, 20, 20);
    perspCam.lookAt(new THREE.Vector3(0, 0, 0));

    // Cámara ortográfica
    const aspect = viewer.container.clientWidth / viewer.container.clientHeight || 1;
    const frustumSize = 60;
    const orthoCam = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
       frustumSize * aspect / 2,
       frustumSize / 2,
      -frustumSize / 2,
      0.1,
      1000
    );
    orthoCam.position.set(30, 30, 30);
    orthoCam.lookAt(0, 0, 0);

    // Guardar referencias
    viewer.perspCam = perspCam;
    viewer.orthoCam = orthoCam;
    viewer.currentProjection = 'perspective';
  }

  // ... resto de tu loader OBJ/STL ...
}

// Ajustar ortográfica en resize
function fixViewerSize() {
  const width = isMobile() ? window.innerWidth : 960;
  const height = isMobile() ? 400 : 540;

  if (viewer) {
    viewer.container.style.width = width + 'px';
    viewer.container.style.height = height + 'px';
    viewer.renderer.setSize(width, height);
    viewer.onWindowResize();

    if (viewer.orthoCam) {
      const aspect = width / height;
      const frustumSize = 60;
      viewer.orthoCam.left   = -frustumSize * aspect / 2;
      viewer.orthoCam.right  =  frustumSize * aspect / 2;
      viewer.orthoCam.top    =  frustumSize / 2;
      viewer.orthoCam.bottom = -frustumSize / 2;
      viewer.orthoCam.updateProjectionMatrix();
    }
  } else {
    viewerEl.style.width = width + 'px';
    viewerEl.style.height = height + 'px';
  }
}

// Cambiar proyección
function setProjectionMode(mode) {
  if (!viewer) return;
  if (mode === 'parallel') {
    viewer.currentProjection = 'parallel';
    viewer.camera = viewer.orthoCam;
  } else {
    viewer.currentProjection = 'perspective';
    viewer.camera = viewer.perspCam;
  }
}

// Orientaciones
function setCameraOrientation(view) {
  if (!viewer) return;

  const parallelViews = [
    'top','bottom','front','back','left','right',
    'iso_so','iso_no','iso_se','iso_ne'
  ];
  const useParallel = parallelViews.includes(view);

  setProjectionMode(useParallel ? 'parallel' : 'perspective');
  const cam = viewer.camera;

  if (view === 'top')       cam.position.set(0, 50, 0);
  else if (view === 'bottom') cam.position.set(0, -50, 0);
  else if (view === 'front')  cam.position.set(0, 0, 50);
  else if (view === 'back')   cam.position.set(0, 0, -50);
  else if (view === 'left')   cam.position.set(-50, 0, 0);
  else if (view === 'right')  cam.position.set(50, 0, 0);
  else if (view === 'iso_so') cam.position.set(-30, 30, 30);
  else if (view === 'iso_no') cam.position.set(-30, 30, -30);
  else if (view === 'iso_se') cam.position.set(30, 30, 30);
  else if (view === 'iso_ne') cam.position.set(30, 30, -30);
  else if (view === 'iso')    cam.position.set(30, 30, 30); // isométrica en perspectiva

  cam.lookAt(new THREE.Vector3(0, 0, 0));
  cam.updateProjectionMatrix?.();
}

function setVisualizationMode(mode) {
  if (!model) return;

  if (mode === 'wire') {
    const firstMesh = model.children.find(c => c.isMesh);
    if (!firstMesh) return;

    if (model.userData.edgeLines) {
      model.remove(model.userData.edgeLines);
      delete model.userData.edgeLines;
    }

    const edges = new THREE.EdgesGeometry(firstMesh.geometry);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x000000 })
    );

    model.userData.edgeLines = line;
    model.add(line);
    firstMesh.visible = false;
  } else {
    model.traverse(child => {
      if (child.isMesh) {
        child.visible = true;
        child.material =
          mode === 'solid'
            ? new THREE.MeshStandardMaterial({ color: 0x888888 })
            : new THREE.MeshPhysicalMaterial({
                color: 0xcccccc,
                metalness: 0.5,
                roughness: 0.4
              });
      }
    });

    if (model.userData.edgeLines) {
      model.remove(model.userData.edgeLines);
      delete model.userData.edgeLines;
    }
  }
}


  // Ajuste: posiciona el vértice mínimo en (0,0,0) y escala al cubo 10x10x10
 function fitObjectToCubeWithBase(object) {
  const group = new THREE.Group();
  group.add(object);

  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());

  // Escalar al cubo 10x10x10
  const maxDim = Math.max(size.x, size.y, size.z);
  const scaleFactor = 10 / maxDim;
  group.scale.setScalar(scaleFactor);

  // Recalcular bounding box después de escalar
  const scaledBox = new THREE.Box3().setFromObject(group);
  const min = scaledBox.min.clone();

  // Ajustar posición: apoyar en Y=0
  group.position.y -= min.y;

  // Centrar en X y Z para que quede sobre la grilla
  group.position.x -= (scaledBox.min.x + scaledBox.max.x) / 2;
  group.position.z -= (scaledBox.min.z + scaledBox.max.z) / 2;

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
    viewer.onWindowResize(); // ✅ suficiente
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

      viewer.renderer.setClearColor(0xffffff, 1); // blanco opaco

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

  if (currentMode === 'ra') {
    document.getElementById('viewer-ra').style.display = 'block';
    document.getElementById('viewer').style.display = 'none';
  } else if (currentMode === 'orbit') {
    document.getElementById('viewer-ra').style.display = 'none';
    document.getElementById('viewer').style.display = 'block';
  }

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

    // 👉 activar fullscreen RA
    document.body.classList.add('ra-fullscreen');
    setStatus('Cámara activada: apunte al marcador');
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

  // 🔧 Funciones de visualización y orientación
  // 🔧 Funciones de visualización y orientación
  function setVisualizationMode(mode) {
    if (!model) return;

    if (mode === 'wire') {
      // Versión mínima: aristas del primer mesh (ajusta si tu modelo tiene varios)
      const firstMesh = model.children.find(c => c.isMesh);
      if (!firstMesh) return;

      // Eliminar líneas previas
      if (model.userData.edgeLines) {
        model.remove(model.userData.edgeLines);
        delete model.userData.edgeLines;
      }

      // Crear aristas externas y añadirlas al mismo grupo del modelo
      const edges = new THREE.EdgesGeometry(firstMesh.geometry);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x000000 })
      );

      model.userData.edgeLines = line;
      model.add(line);

      // Opcional: ocultar el sólido
      firstMesh.visible = false;
    } else {
      // Restaurar sólido/iluminado y quitar líneas si estaban
      model.traverse(child => {
        if (child.isMesh) {
          child.visible = true;
          child.material =
            mode === 'solid'
              ? new THREE.MeshStandardMaterial({ color: 0x888888 })
              : new THREE.MeshPhysicalMaterial({
                  color: 0xcccccc,
                  metalness: 0.5,
                  roughness: 0.4
                });
        }
      });
      if (model.userData.edgeLines) {
        model.remove(model.userData.edgeLines);
        delete model.userData.edgeLines;
      }
    }
  }

  function setCameraOrientation(view) {
    if (!viewer) return;
    const cam = viewer.camera;
    if (view === 'top') cam.position.set(0, 50, 0);
    else if (view === 'bottom') cam.position.set(0, -50, 0);
    else if (view === 'front') cam.position.set(0, 0, 50);
    else if (view === 'back') cam.position.set(0, 0, -50);
    else if (view === 'left') cam.position.set(-50, 0, 0);
    else if (view === 'right') cam.position.set(50, 0, 0);
    else if (view === 'iso') cam.position.set(30, 30, 30);
    cam.lookAt(new THREE.Vector3(0, 0, 0));
  }

  // 🔧 Listeners de los nuevos menús
  vizModeSelect.onchange = e => setVisualizationMode(e.target.value);
orientationSelect.onchange = e => setCameraOrientation(e.target.value);
projectionSelect.onchange = e => setProjectionMode(e.target.value);

fixViewerSize();

// Exportar funciones al ámbito global
window.setVisualizationMode = setVisualizationMode;
window.setCameraOrientation = setCameraOrientation;
window.setProjectionMode = setProjectionMode;
}); // ← cierre ÚNICO del DOMContentLoaded

