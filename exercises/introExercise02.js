import * as THREE from "three";
import { OrbitControls } from "../build/jsm/controls/OrbitControls.js";
import {
  InfoBox,
  createGroundPlaneXZ,
  initCamera,
  initDefaultBasicLight,
  initRenderer,
  onWindowResize,
  setDefaultMaterial,
} from "../libs/util/util.js";

let scene, renderer, camera, material, light, orbit; // Initial variables
scene = new THREE.Scene(); // Create main scene
renderer = initRenderer(); // Init a basic renderer
camera = initCamera(new THREE.Vector3(0, 15, 30)); // Init camera in this position
material = setDefaultMaterial(); // create a basic material
light = initDefaultBasicLight(scene); // Create a basic light to illuminate the scene
orbit = new OrbitControls(camera, renderer.domElement); // Enable mouse rotation, pan, zoom etc.

// Listen window size changes
window.addEventListener(
  "resize",
  function () {
    onWindowResize(camera, renderer);
  },
  false
);

// Show axes (parameter is size of each axis)
let axesHelper = new THREE.AxesHelper(12);
scene.add(axesHelper);

// create the ground plane
let plane = createGroundPlaneXZ(20, 20);
scene.add(plane);

material = setDefaultMaterial("lightgreen");
for (let index = 0; index < 3; index++) {
  if (index == 0) {
    // create a cube
    let cubeGeometry = new THREE.BoxGeometry(4, 4, 4);
    let cube = new THREE.Mesh(cubeGeometry, material);
    // position the cube
    cube.position.set(0.0, 2.0, 0.0);
    // add the cube to the scene
    scene.add(cube);
  }

  if (index == 1) {
    // material is dark red
    material = setDefaultMaterial("darkred");
    // create a cylinder
    let cylinderGeometry = new THREE.CylinderGeometry(2.5, 2.5, 6, 32);
    let cylinder = new THREE.Mesh(cylinderGeometry, material);
    // position the cylinder to the left of the cube
    cylinder.position.set(-6.0, 3.0, 0.0);
    // add the cylinder to the scene
    scene.add(cylinder);
  }

  if (index == 2) {
    // material is light blue
    material = setDefaultMaterial("lightblue");
    // create a sphere
    let sphereGeometry = new THREE.SphereGeometry(2, 32, 32);
    let sphere = new THREE.Mesh(sphereGeometry, material);
    // position the sphere to the right of the cube
    sphere.position.set(6.0, 2.0, 0.0);
    // add the sphere to the scene
    scene.add(sphere);
  }
}

// Use this to show information onscreen
let controls = new InfoBox();
controls.add("Basic Scene");
controls.addParagraph();
controls.add("Use mouse to interact:");
controls.add("* Left button to rotate");
controls.add("* Right button to translate (pan)");
controls.add("* Scroll to zoom in/out.");
controls.show();

render();
function render() {
  requestAnimationFrame(render);
  renderer.render(scene, camera); // Render scene
}
