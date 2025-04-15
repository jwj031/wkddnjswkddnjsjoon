let scene, camera, renderer, controls;
let building;
let debris = []; // 파편 배열

// 초기화 함수
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcfe8ff);

  // 카메라 설정
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(5, 5, 10);

  // 렌더러 설정
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // OrbitControls 추가 (마우스로 회전)
  controls = new THREE.OrbitControls(camera, renderer.domElement);

  // 조명 설정
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 20, 10);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x888888)); // 부드러운 기본 조명

  // 바닥
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  animate();
}

// 건물 생성 함수 (재료별)
function buildWith(material) {
  if (building) scene.remove(building); // 기존 건물 제거

  let color = 0xaaaaaa; // 기본 색상
  let texture = null;

  // 재료 설정
  if (material === 'wood') {
    color = 0x8B4513; // 나무
    texture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/wood.jpg');
  } else if (material === 'concrete') {
    color = 0x777777; // 콘크리트
    texture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/concrete.jpg');
  } else if (material === 'steel') {
    color = 0xcccccc; // 강철
    texture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/steel.jpg');
  }

  // 건물 본체 (벽)
  const buildingGeometry = new THREE.BoxGeometry(4, 6, 4);
  const buildingMaterial = new THREE.MeshStandardMaterial({ color, map: texture });
  building = new THREE.Mesh(buildingGeometry, buildingMaterial);
  building.position.y = 3; // 바닥 위로 올림
  scene.add(building);

  // 건물에 창문 추가
  addWindows(building);

  // 건물 지붕 추가
  addRoof(building);

  // 구조 보강재 추가
  addReinforcements(building);
}

// 창문 추가 함수
function addWindows(building) {
  const windowGeometry = new THREE.PlaneGeometry(1.5, 1.5);
  const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x87CEEB, transparent: true, opacity: 0.7 });

  const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
  window1.position.set(-1.5, 2, 2.01); // 창문 위치 조정
  building.add(window1);

  const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
  window2.position.set(1.5, 2, 2.01); // 창문 위치 조정
  building.add(window2);
}

// 지붕 추가 함수
function addRoof(building) {
  const roofGeometry = new THREE.ConeGeometry(2.5, 1.5, 4);
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x777777 });
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.y = 6.5; // 지붕 높이 설정
  roof.rotation.y = Math.PI / 4; // 지붕 회전 (사각형 건물에 맞추기)
  building.add(roof);
}

// 구조 보강재 추가 함수
function addReinforcements(building) {
  const reinforcementGeometry = new THREE.CylinderGeometry(0.1, 0.1, 6);
  const reinforcementMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });

  // 보강재 4개
  for (let i = 0; i < 4; i++) {
    const reinforcement = new THREE.Mesh(reinforcementGeometry, reinforcementMaterial);
    reinforcement.position.set(
      (i % 2 === 0 ? -1.8 : 1.8),
      3,
      (i < 2 ? 1.8 : -1.8)
    );
    building.add(reinforcement);
  }
}

// 강도 테스트 (건물이 무너짐 + 잔해 생성)
function testStrength() {
  if (!building) return;

  let strength = 1.0; // 기본 강도

  // 재료별 강도 설정
  const color = building.material.color.getHex();
  if (color === 0x8B4513) strength = 0.3; // 나무
  else if (color === 0x777777) strength = 0.7; // 콘크리트
  else if (color === 0xcccccc) strength = 1.0; // 강철

  let shakeAmount = (1 - strength) * 0.5;
  let fallThreshold = 0.5 - strength; // 약할수록 무너질 확률 증가

  let t = 0;
  const originalY = building.position.y;

  const shakeAndFall = () => {
    if (t < 100) {
      building.position.x = Math.sin(t / 4) * shakeAmount;
      building.rotation.z = Math.sin(t / 8) * shakeAmount;

      t++;
      requestAnimationFrame(shakeAndFall);
    } else {
      // 약한 재료면 무너지게 하기
      if (Math.random() < fallThreshold) {
        const fall = () => {
          if (building.position.y > 0) {
            building.rotation.x += 0.05;
            building.position.y -= 0.1;
            requestAnimationFrame(fall);
          } else {
            spawnDebris(building.position); // 파편 생성
            scene.remove(building); // 건물 제거
          }
        };
        fall();
      } else {
        // 다시 제자리로
        building.position.x = 0;
        building.rotation.z = 0;
        building.position.y = originalY;
      }
    }
  };

  shakeAndFall();
}

// 파편 생성 함수
function spawnDebris(position) {
  for (let i = 0; i < 20; i++) {
    const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const piece = new THREE.Mesh(geo, mat);
    piece.position.copy(position);
    piece.velocity = {
      x: (Math.random() - 0.5) * 0.5,
      y: Math.random() * 0.5,
      z: (Math.random() - 0.5) * 0.5
    };
    scene.add(piece);
    debris.push(piece);
  }
}

// 애니메이션 함수 (파편에 중력 적용)
function animate() {
  requestAnimationFrame(animate);
  controls.update();

  // 잔해 파편에 중력 적용
  for (let i = 0; i < debris.length; i++) {
    const d = debris[i];
    d.velocity.y -= 0.01; // 중력
    d.position.x += d.velocity.x;
    d.position.y += d.velocity.y;
    d.position.z += d.velocity.z;

    // 바닥에 닿으면 멈추기
    if (d.position.y < 0.1) {
      d.position.y = 0.1;
      d.velocity = { x: 0, y: 0, z: 0 };
    }
  }

  renderer.render(scene, camera);
}

// 페이지 로드 후 초기화
init();
