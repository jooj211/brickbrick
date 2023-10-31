import * as THREE from "three";
import { MathUtils } from "three";
import { PointerLockControls } from "../build/jsm/controls/PointerLockControls.js";
import { CSG } from "../libs/other/CSGMesh.js";
import KeyboardState from "../libs/util/KeyboardState.js";
import { SecondaryBox, initRenderer } from "../libs/util/util.js";

class ball {
  constructor(x, y, velocity) {
    this.velocity = velocity;
    this.obj = createBall(x, y);
  }
}

let puColor = 0xff0000;
let gameStatus = 0; //0 = jogo não começou; 1 = jogo rolando ; 2 = jogo pausado ; 3 = perdeu ; 4 = ganhou
let initialSpeed = 0.025,
  finalSpeed = 0.05,
  speed = initialSpeed;
const ballClock = new THREE.Clock();
let level = 1;
let rows = 0;
let cols = 0;
let brokenBricks = 0;

let scene, renderer, light, keyboard;
scene = new THREE.Scene(); // Create main scene
renderer = initRenderer(); // View function in util/utils
light = new THREE.DirectionalLight(0xffffff, 0.7);
light.castShadow = true; //?Não sei oq isso faz, fiquei com preguiça de ler
light.position.set(2, 5, 10);

// Shadow settings
light.castShadow = true;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
light.shadow.camera.near = 1;
light.shadow.camera.far = 20;
light.shadow.camera.left = -5;
light.shadow.camera.right = 5;
light.shadow.camera.top = 5;
light.shadow.camera.bottom = -5;
light.shadowDarkness = 0.5;
scene.add(light);

scene.add(light.target);
light.target.position.set(0, -2, 0);

let light2 = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(light2);

keyboard = new KeyboardState();
var ballInicialVelocity = new THREE.Vector3(
  0,
  speed * Math.sin(MathUtils.degToRad(90)),
  0
);
let dh = 0.21; //delta de
const clock = new THREE.Clock();
var tempoDecorrido = 0;
// Main camera
const camera = initializeCamera();
const auxCamera = initializeCamera();
scene.background = new THREE.Color(0x00008b);
window.addEventListener(
  "resize",
  function () {
    onWindowResizeOrthographic(camera, renderer);
  },
  false
);
scene.add(camera);

//Criar plano de fundo (para as sombras baterem)
const geometry = new THREE.PlaneGeometry(10, 10);
const material2 = new THREE.MeshLambertMaterial({
  color: "darkslateblue",
  side: THREE.DoubleSide,
});
const plane = new THREE.Mesh(geometry, material2);
plane.position.set(0, 0, -0.05);
plane.receiveShadow = true;
scene.add(plane);

const playerControls = new PointerLockControls(auxCamera, renderer.domElement);

let collidableMeshList = [];
let brickHolder = new THREE.Object3D();
let brickHolderX;

if (level == 1) brickHolderX = -1.05;
if (level == 2) brickHolderX = -0.95;
brickHolder.position.set(brickHolderX, 2.2, 0);
scene.add(brickHolder);

createBorders();

var brickMatrix = initializeMatrix();
let pad = createPad();
collidableMeshList.push(pad);
let ballLista = [];
ballLista.push(
  new ball(pad.position.x, pad.position.y + 0.2, ballInicialVelocity)
);
// Boolean flag to track whether the pointer is locked
let isPointerLocked = false;

scene.add(camera);
let powerUpsList = [];

document.addEventListener("click", function (event) {
  if (event.button === 0) {
    if ((gameStatus == 3 || gameStatus == 0) && isPointerLocked) {
      ballClock.start();
      gameStatus = 1;
    }
  }
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    if (gameStatus != 3 && gameStatus != 4) {
      if (isPointerLocked) {
        ballClock.stop();
        gameStatus = 2;
      } else if (gameStatus != 0) {
        ballClock.running = true;
        gameStatus = 1;
      }
    }
    togglePointerLock();
  }

  if (event.code == "KeyR") {
    if (gameStatus != 0) reset();
  }

  if (event.code == "KeyG") {
    if (level == 1) {
      level = 2;
      brickHolderX = -0.95;
    } else {
      level = 1;
      brickHolderX = -1.05;
    }
    brickHolder.position.set(brickHolderX, 2.2, 0);
    reset();
  }

  if (event.code == "Enter") {
    var element = document.querySelector("#webgl-output");
    element.requestFullscreen();
  }
});

// Handle the pointer lock change event to update isPointerLocked flag
playerControls.addEventListener("lock", () => {
  isPointerLocked = true;
});

playerControls.addEventListener("unlock", () => {
  isPointerLocked = false;
});
var message = new SecondaryBox("");
var message2 = new SecondaryBox("Seremos campões");
message2.box.style.top = "0";
message2.box.style.bottom = "";

//change the position of the message to the top of the screen

render();

/* ------------------ FUNCTIONS ------------------ */

function reset() {
  gameStatus = 1;

  for (let i = ballLista.length - 1; i >= 0; i--) {
    scene.remove(ballLista[i]);
    removeBola(ballLista[i]);
  }

  for (let i = powerUpsList.length - 1; i >= 0; i--) {
    scene.remove(powerUpsList[i]);
  }
  ballLista = [];
  powerUpsList = [];

  var inicialVelocity = new THREE.Vector3();
  inicialVelocity.x = 0;
  inicialVelocity.y = initialSpeed * Math.sin(MathUtils.degToRad(90));
  ballLista.push(
    new ball(pad.position.x, pad.position.y + 0.2, inicialVelocity)
  );

  gameStatus = 3;
  resetBricks();
}

function resetBricks() {
  // Clear the current brick matrix
  for (let i = 0; i < brickMatrix.length; i++) {
    for (let j = 0; j < brickMatrix[i].length; j++) {
      const brick = brickMatrix[i][j];
      const obj = brick.obj;
      //obj.position.set(1000, 1000, 1000); // Move the brick out of the scene
      removeBrick(obj.name);
    }
  }
  brickMatrix = initializeMatrix();
}

function Brick(obj, resistance, color) {
  this.obj = obj;
  this.resistance = resistance;
  this.color = color;
  this.id = 0;
}

// Function to toggle pointer lock status
function togglePointerLock() {
  if (!isPointerLocked) {
    playerControls.lock();
    isPointerLocked = true;

    // Add the mousemove event listener for locked pointer
    document.addEventListener("mousemove", onMouseMoveLocked, false);
  } else {
    playerControls.unlock();
    isPointerLocked = false;

    // Remove the mousemove event listener when the pointer is unlocked
    document.removeEventListener("mousemove", onMouseMoveLocked, false);
  }
}

function readMatrix(matrixString) {
  const rows = matrixString.trim().split("\n");
  const matrix = [];

  for (const row of rows) {
    const columns = row.split(",");

    for (const column of columns) {
      const brickValue = parseInt(column.trim());
      if (!isNaN(brickValue)) {
        matrix.push(brickValue);
      }
    }
  }

  return matrix;
}

function onMouseMoveLocked(event) {
  //if (gameStatus != 1) return;
  // Calculate the horizontal movement based on mouse position
  const movementX =
    event.movementX || event.mozMovementX || event.webkitMovementX || 0;

  // Define the horizontal movement speed
  const horizontalSpeed = 0.01; // Adjust this value as needed

  // Calculate the new x-coordinate for the platform
  const newPlatformX = pad.position.x + movementX * horizontalSpeed;

  // Define the boundaries of the restricted area
  const minX = -0.9; // Minimum x-coordinate within the area
  const maxX = 0.9; // Maximum x-coordinate within the area

  // Clamp the new x-coordinate within the specified boundaries
  const clampedX = Math.min(Math.max(newPlatformX, minX), maxX);

  // Update the platform's position
  pad.position.setX(clampedX);
}

function createBall(x, y) {
  var geometry = new THREE.SphereGeometry(0.05, 64, 32);
  var material = new THREE.MeshPhongMaterial({
    color: "rgb(255,255,255)",
    shininess: "0.001",
    specular: "rgb(255,255,255)",
    emissive: "rgb(255,255,255)",
    emissiveIntensity: "1.0",
  });
  var obj = new THREE.Mesh(geometry, material);
  obj.position.set(x, y, 0);
  obj.castShadow = true;

  var light = new THREE.PointLight(0xffffff, 1, 1);
  light.position.set(0, 0, 0);
  obj.add(light);
  scene.add(obj);
  return obj;
}

function createPad() {
  let material = new THREE.MeshLambertMaterial({
    color: "lightblue",
    side: THREE.DoubleSide,
  });
  // create a cube
  let cubeGeometry = new THREE.BoxGeometry(0.6, 0.1, 0.1);
  let cube = new THREE.Mesh(cubeGeometry, material);
  // position the cube
  cube.position.set(0.0, 0.05, 0.0);
  cube.matrixAutoUpdate = false;
  cube.updateMatrix();

  let cylindergeo = new THREE.CylinderGeometry(0.999, 0.999, 0.1, 50, 1);
  let cylinder = new THREE.Mesh(cylindergeo, material);
  cylinder.position.set(0, -0.85, 0);
  cylinder.matrixAutoUpdate = false;
  cylinder.rotateX(MathUtils.degToRad(90));
  cylinder.updateMatrix();
  let cubaogeo = new THREE.BoxGeometry(2, 2, 1);
  let cubao = new THREE.Mesh(cubaogeo, material);
  cubao.position.set(0, -0.9, 0);
  cubao.matrixAutoUpdate = false;
  cubao.updateMatrix();

  let cubeCSG = CSG.fromMesh(cube);
  let cylinderCSG = CSG.fromMesh(cylinder);
  let cubaoCSG = CSG.fromMesh(cubao);
  let cylinder_cubao = cylinderCSG.subtract(cubaoCSG);
  let rebatedor_ = cubeCSG.union(cylinder_cubao);
  let rebatedor = CSG.toMesh(rebatedor_, new THREE.Matrix4());
  rebatedor.material = material;
  scene.add(rebatedor);

  rebatedor.position.set(0, -2.1, 0);
  rebatedor.castShadow = true;
  rebatedor.name = "Pad";
  scene.add(rebatedor);
  return rebatedor;
}

function chooseLevel(level) {
  var matrixString = "";

  if (level == 1) {
    matrixString = `
    6,1,2,3,4,5
    6,1,2,3,4,5
    6,1,2,3,4,5
    6,1,2,3,4,5
    6,1,2,3,4,5
    6,1,2,3,4,5
    6,1,2,3,4,5
    6,1,2,3,4,5
    6,1,2,3,4,5
    6,1,2,3,4,5
    6,1,2,3,4,5
    `;
  } else if (level == 2) {
    matrixString = `
    6,2,5,3,1,4,5,3,6,2,5,3,1,4
    3,5,4,1,3,5,2,6,3,5,4,1,3,5
    5,3,1,4,5,3,6,1,5,3,1,4,5,3
    4,1,3,5,2,6,3,5,4,1,3,5,2,6
    7,7,7,7,7,7,7,7,7,7,7,7,7,7
    7,7,7,7,7,7,7,7,7,7,7,7,7,7
    3,5,2,6,3,5,4,1,3,5,2,6,3,5
    5,3,6,2,5,3,1,4,5,3,6,2,5,3
    2,6,3,5,4,1,3,5,2,6,3,5,4,1
    6,2,5,3,1,4,5,3,6,2,5,3,1,4
    `;
  }

  return matrixString;
}

function initializeMatrix() {
  const matrixString = chooseLevel(level);

  rows = matrixString.trim().split("\n").length;
  cols = matrixString.trim().split("\n")[0].split(",").length;

  const brickMatrix = new Array(rows)
    .fill(null)
    .map(() => new Array(cols).fill(null));

  let resistances = readMatrix(matrixString);
  let resistance = 1;
  let a = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      resistance = resistances[a];
      brickMatrix[i][j] = createBrick(
        i * dh,
        -j * (dh / 2),
        resistance,
        brickHolder
      );

      brickMatrix[i][j].obj.name = a;
      brickMatrix[i][j].id = a;

      if (brickMatrix[i][j].resistance == 7)
        removeBrick(brickMatrix[i][j].obj.name);

      a++;
    }
  }

  return brickMatrix;
}

function initializeCamera() {
  //let camera = new THREE.OrthographicCamera(-1, 1, 2, -2, 0.01, 10); //alterar valores?
  let w = window.innerHeight / 2;
  let h = window.innerHeight;
  let camera = new THREE.PerspectiveCamera(60, w / h, 0.01, 10); //fov, aspect, near, far
  let aspect = 0.5;
  let f = 5;
  camera.position.set(0, 0, 4.3);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  if (camera instanceof THREE.PerspectiveCamera) {
    camera.aspect = aspect;
  }
  if (camera instanceof THREE.OrthographicCamera) {
    camera.left = (-f * aspect) / 2;
    camera.right = (f * aspect) / 2;
    camera.top = f / 2;
    camera.bottom = -f / 2;
  }
  //camera.updateProjectionMatrix(); //?Isso faz o que?
  renderer.setSize(w, h);
  return camera;
}

function onWindowResizeOrthographic(camera, renderer, frustumSize = 5) {
  let w = window.innerHeight / 2;
  let h = window.innerHeight;
  let aspect = 0.5;
  let f = frustumSize;
  if (camera instanceof THREE.PerspectiveCamera) {
    camera.aspect = aspect;
  }
  if (camera instanceof THREE.OrthographicCamera) {
    camera.left = (-f * aspect) / 2;
    camera.right = (f * aspect) / 2;
    camera.top = f / 2;
    camera.bottom = -f / 2;
  }
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function removeBrick(brickName) {
  const brickIndex = collidableMeshList.findIndex(
    (brick) => brick.name === brickName
  );

  if (brickIndex !== -1) {
    const removedBrick = collidableMeshList.splice(brickIndex, 1)[0];
    brickHolder.remove(removedBrick);
  }
}

function updateBrick(brick) {
  var obj = brick.obj;

  switch (brick.resistance) {
    case 0:
      //obj.position.set(1000, 1000, 1000);
      brokenBricks += 1;

      //Bamboleio
      if (brokenBricks >= 10 && ballLista.length == 1) {
        var position = new THREE.Vector3();
        obj.getWorldPosition(position);

        //Objeto caindo para o powerup
        let pu = new THREE.OctahedronGeometry(0.07, 0);
        let pumaterial = new THREE.MeshPhongMaterial({
          color: "rgb(255,255,255)",
          shininess: "0.001",
          specular: "rgb(255,255,255)",
        });
        var obj2 = new THREE.Mesh(pu, pumaterial);
        obj2.position.set(position.x, position.y, 0);
        obj2.castShadow = true;
        var light = new THREE.PointLight(0xffffff, 1, 1);
        light.position.set(0, 0, 0);
        obj2.add(light);
        scene.add(obj2);
        brokenBricks = 0;
        powerUpsList.push(obj2);
      }
      removeBrick(obj.name);
      if (brickHolder.children.length == 0) gameStatus = 4;
      break;
    case 1:
      brick.color = "red";
      break;
    case 2:
      brick.color = "blue";
      break;
    case 3:
      brick.color = "orange";
      break;
    case 4:
      brick.color = "hotpink";
      break;
    case 5:
      brick.color = "lightgreen";
      break;
    case 6:
      brick.color = "lightgrey";
      break;
  }

  if (brick.resistance != 0) {
    obj.material.color.setColorName(brick.color);
  }
}

function createBrick(x, y, resistance, brickHolder) {
  var obj, color;
  var geometry = new THREE.BoxGeometry(0.2, 0.1, 0.1);

  switch (resistance) {
    case 1:
      color = "red";
      break;
    case 2:
      color = "blue";
      break;
    case 3:
      color = "orange";
      break;
    case 4:
      color = "hotpink";
      break;
    case 5:
      color = "lightgreen";
      break;
    case 6:
      color = "lightgrey";
      break;
    case 7:
      color = "white";
      break;
  }
  var material = new THREE.MeshLambertMaterial({
    color: color,
    side: THREE.DoubleSide,
  });
  material.side = THREE.DoubleSide;
  var obj = new THREE.Mesh(geometry, material);
  obj.castShadow = true;
  obj.name = "brick";
  obj.position.set(x, y, 0);
  brickHolder.add(obj);
  collidableMeshList.push(obj);
  const brick = new Brick(obj, resistance, color);
  return brick;
}

function updateBall(b) {
  if (gameStatus != 1) return;
  var bola = b.obj;
  var ballVelocity = b.velocity;
  tempoDecorrido = clock.getElapsedTime();
  bola.translateX(ballVelocity.x);
  bola.translateY(ballVelocity.y);

  const tbraycaster = new THREE.Raycaster();
  const tbdirection = new THREE.Vector3(
    0,
    0.07 * (Math.abs(ballVelocity.y) / ballVelocity.y),
    0
  );

  tbraycaster.ray.origin.copy(bola.position);
  tbraycaster.ray.direction.copy(tbdirection);

  const tbintersects = tbraycaster.intersectObjects(collidableMeshList);
  if (
    tbintersects.length > 0 &&
    tbintersects[0].distance <= 0.05 &&
    tempoDecorrido > 0.5 &&
    tbintersects[0]["object"].name == "Pad"
  ) {
    ballVelocity.y *= -1;
    tempoDecorrido = 0;
    clock.stop();
    clock.start();

    let angle;
    var distance = 1 + pad.position.x - (1 + bola.position.x);
    //Distance pode variar de -0.30 até 0.30
    if (distance < 0) {
      angle = MathUtils.degToRad(-90 - distance * 100);
      ballVelocity.x *= -1;
    } else {
      angle = MathUtils.degToRad(90 - distance * 100);
      ballVelocity.x *= -1;
    }

    newReflect(
      ballVelocity,
      new THREE.Vector3(Math.sin(angle), Math.cos(angle), 0).normalize()
    );

    var ang = Math.atan(ballVelocity.y / ballVelocity.x);
    var min_angle = MathUtils.degToRad(30);
    if (Math.abs(ang) < min_angle) {
      ballVelocity.x =
        speed *
        Math.cos(min_angle) *
        (ballVelocity.x / Math.abs(ballVelocity.x));
      ballVelocity.y =
        speed *
        Math.sin(min_angle) *
        (ballVelocity.y / Math.abs(ballVelocity.y));
    }
    if (bola.position.y < -2) bola.position.y = -1.8;
    if (ballVelocity.y < 0) ballVelocity.y *= -1;
  } else if (tbintersects.length > 0 && tbintersects[0].distance <= 0.05) {
    ballVelocity.y *= -1;
    if (tbintersects[0]["object"].parent == brickHolder) {
      var id = tbintersects[0]["object"].name.parseInt;
      for (let j = 0; j < cols; j++) {
        for (let i = rows - 1; i >= 0; i--) {
          if (brickMatrix[i][j].obj == tbintersects[0]["object"]) {
            if (brickMatrix[i][j].resistance == 6)
              brickMatrix[i][j].resistance = 1;
            else brickMatrix[i][j].resistance = 0;
            updateBrick(brickMatrix[i][j]);
            return;
          }
        }
      }
    } else if (tbintersects[0]["object"].name == "down") {
      if (ballLista.length > 1) {
        removeBola(b);
        return;
      } else {
        bola.position.set(pad.position.x, pad.position.y + 0.2, 0);
        gameStatus = 3;
        pad.position.set(0, -2.1, 0);
        ballVelocity.x = 0;
        ballVelocity.y = initialSpeed * Math.sin(MathUtils.degToRad(90));
        for (let i = powerUpsList.length - 1; i >= 0; i--) {
          scene.remove(powerUpsList[i]);
        }
        powerUpsList = [];
      }
    }
  }

  const lrdirection = new THREE.Vector3(
    0.07 * (Math.abs(ballVelocity.x) / ballVelocity.x),
    0,
    0
  );

  tbraycaster.ray.origin.copy(bola.position);
  tbraycaster.ray.direction.copy(lrdirection);

  const rlintersects = tbraycaster.intersectObjects(collidableMeshList);
  if (rlintersects.length > 0 && rlintersects[0].distance <= 0.07) {
    ballVelocity.x *= -1;

    if (rlintersects[0]["object"].parent == brickHolder) {
      var id = rlintersects[0]["object"].name.parseInt;
      for (let j = 0; j < cols; j++) {
        for (let i = rows - 1; i >= 0; i--) {
          if (brickMatrix[i][j].obj == rlintersects[0]["object"]) {
            if (brickMatrix[i][j].resistance == 6)
              brickMatrix[i][j].resistance = 1;
            else brickMatrix[i][j].resistance = 0;
            updateBrick(brickMatrix[i][j]);
            return;
          }
        }
      }
    }

    if (rlintersects[0]["object"].name == "Pad" && tempoDecorrido > 0.5) {
      tempoDecorrido = 0;
      clock.stop();
      clock.start();
      let angle;
      var distance = 1 + pad.position.x - (1 + bola.position.x);
      //Distance pode variar de -0.30 até 0.30
      if (distance < 0) {
        angle = MathUtils.degToRad(-90 - distance * 100);
        ballVelocity.x *= -1;

        newReflect(
          ballVelocity,
          new THREE.Vector3(Math.sin(angle), Math.cos(angle), 0).normalize()
        );

        if (ballVelocity.x < 0) ballVelocity.x *= -1;
      } else {
        angle = MathUtils.degToRad(90 - distance * 100);
        ballVelocity.x *= -1;

        newReflect(
          ballVelocity,
          new THREE.Vector3(Math.sin(angle), Math.cos(angle), 0).normalize()
        );

        if (ballVelocity.x > 0) ballVelocity.x *= -1;
      }
    }
  }

  bola.velocity = ballVelocity;
}

function newReflect(v, normal) {
  var v1 = new THREE.Vector3();

  return v.sub(v1.copy(normal).multiplyScalar(2 * v.dot(normal)));
}

function removeBola(bola) {
  // remove bola da lista
  var index = ballLista.indexOf(bola);
  if (index > -1) {
    ballLista.splice(index, 1);
  }

  // remove bola da cena
  scene.remove(bola.obj);
}

function stickBall() {
  ballLista[0].obj.position.set(pad.position.x, pad.position.y + 0.2, 0);
  ballLista[0].velocity = ballInicialVelocity;
}

function displaySpeed() {}

function increaseSpeed(b) {
  var timeSpent = ballClock.getElapsedTime();
  var progress = timeSpent / 15;

  var ballVelocity = b.velocity;

  if (progress < 1) {
    speed = initialSpeed + progress * (finalSpeed - initialSpeed);
    var normalized = new THREE.Vector3();
    normalized.copy(ballVelocity).normalize();
    ballVelocity.copy(normalized).multiplyScalar(speed);
    b.velocity = ballVelocity;
  }
}

function duplicaBola() {
  const matrizRotacao = new THREE.Matrix4();
  matrizRotacao.makeRotationAxis(new THREE.Vector3(0, 0, 1), Math.PI / 4);
  var novaBola = new ball(
    ballLista[0].obj.position.x,
    ballLista[0].obj.position.y,
    ballLista[0].velocity.clone().applyMatrix4(matrizRotacao)
  );

  if (Math.abs(novaBola.velocity.y) < 0.01) {
    var aux = novaBola.velocity.y;
    novaBola.velocity.y = novaBola.velocity.x;
    novaBola.velocity.x = aux;
  }
  ballLista.push(novaBola);
}

function updatePU(pu) {
  pu.translateY(-0.015);
  puColor += 500;
  pu.material.color.setHex(puColor);
  const tbraycaster = new THREE.Raycaster();
  const tbdirection = new THREE.Vector3(0, -1, 0);

  tbraycaster.ray.origin.copy(pu.position);
  tbraycaster.ray.direction.copy(tbdirection);

  const tbintersects = tbraycaster.intersectObjects(collidableMeshList);
  if (
    tbintersects.length > 0 &&
    tbintersects[0].distance <= 0.05 &&
    tbintersects[0]["object"].name == "Pad"
  ) {
    var index = powerUpsList.indexOf(pu);
    if (index > -1) {
      powerUpsList.splice(index, 1);
    }
    scene.remove(pu);
    //BARABARABARA: AUUMENTAR ESSE NÚMERO, PARA AS ESTRELAS
    if (ballLista.length <= 1) duplicaBola();
  }
  if (
    tbintersects.length > 0 &&
    tbintersects[0].distance <= 0.05 &&
    tbintersects[0]["object"].name == "down"
  ) {
    var index = powerUpsList.indexOf(pu);
    if (index > -1) {
      powerUpsList.splice(index, 1);
    }
    scene.remove(pu);
  }
}

function render() {
  message2.changeMessage("Speed: " + ((speed * 100) / 2.5).toFixed(4));

  if (gameStatus == 0) {
    stickBall();
    message.changeMessage("Press Space and then Left Click to start");
  }

  if (gameStatus == 1) {
    for (let i = 0; i < ballLista.length; i++) {
      if (ballLista[i]) {
        increaseSpeed(ballLista[i]);
        updateBall(ballLista[i]);
      }
    }
    for (let i = 0; i < powerUpsList.length; i++) {
      updatePU(powerUpsList[i]);
    }
    message.changeMessage("Press Space to pause");
  }

  if (gameStatus == 2) {
    message.changeMessage("Press Space to unpause");
  }

  if (gameStatus == 3) {
    stickBall();
    message.changeMessage("Left click to continue!");
  }

  if (gameStatus == 4) {
    message.changeMessage("You've won!!! Press R to restart!");
    //Change Nivel
    if (level == 1) {
      level = 2;
      brickHolderX = -0.95;
    } else {
      level = 1;
      brickHolderX = -1.05;
    }
    brickHolder.position.set(brickHolderX, 2.2, 0);
    reset();
  }

  requestAnimationFrame(render);
  renderer.render(scene, camera); // Render scene
}

function createBorders() {
  let upBorder = new THREE.BoxGeometry(3, 0.1, 0.2);
  let borderMaterial = new THREE.MeshLambertMaterial({
    color: "darkslateblue",
    side: THREE.DoubleSide,
  });
  borderMaterial.side = THREE.DoubleSide;
  let upb = new THREE.Mesh(upBorder, borderMaterial);
  upb.castShadow = true;
  upb.position.set(0.0, 2.5, 0.0);
  upb.name = "up";
  scene.add(upb);
  collidableMeshList.push(upb);

  let leftBorder = new THREE.BoxGeometry(0.1, 10, 0.2);
  let lb = new THREE.Mesh(leftBorder, borderMaterial);
  lb.castShadow = true;
  lb.position.set(-1.25, 0.0, 0.0);
  lb.name = "left";
  scene.add(lb);
  collidableMeshList.push(lb);

  let rightBorder = new THREE.BoxGeometry(0.1, 10, 0.2);
  let rb = new THREE.Mesh(rightBorder, borderMaterial);
  rb.castShadow;
  rb.position.set(1.25, 0.0, 0.0);
  rb.name = "right";
  scene.add(rb);
  collidableMeshList.push(rb);

  let downBorder = new THREE.BoxGeometry(3, 0.1, 0.2);
  let db = new THREE.Mesh(downBorder, borderMaterial);
  db.position.set(0.0, -2.55, 0.0);
  db.name = "down";
  scene.add(db);
  collidableMeshList.push(db);
}
