const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector("#cv")
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize( window.innerWidth, window.innerHeight );
camera.position.setZ(30);
renderer.render(scene,camera);

//var domEvents   = new THREEx.DomEvents(camera, renderer.domElement)

let torus; 
let planets = [];
let paused = false;
let meteorites = [];
let globalTimer = 0;
let base_speed = 20;

// html data
let htmlSpeed;
let htmlDistance;
let meteorId = 0;

function addTorus(imgsrc,pos) {
    const texture = new THREE.TextureLoader().load(imgsrc);
    var geometry = new THREE.TorusGeometry(12,2,2,100); // inner diameter,outer size,thickness,smoothness
    var material = new THREE.MeshStandardMaterial({map:texture}); //wireframe:true,{color:0x882233}
    torus = new THREE.Mesh(geometry,material);
    torus.position.set(pos[0],pos[1],pos[2]);
    scene.add(torus);

}

function addPlanet(imgsrc,pos){
    const texture = new THREE.TextureLoader().load(imgsrc);
    geometry = new THREE.SphereGeometry(9,24,24);
    material = new THREE.MeshStandardMaterial({map:texture});
    const newPlanet = new THREE.Mesh(geometry,material);
    newPlanet.position.set(pos[0],pos[1],pos[2]);
    planets.push(newPlanet);
    scene.add(newPlanet);
    return newPlanet;
}

let saturn_pos = [0,0,0];
addTorus("img/saturn_rings.png",saturn_pos);
addPlanet("img/saturn.png",saturn_pos)

const gltfLoader = new THREE.GLTFLoader();
    gltfLoader.load("models/rocket1.glb", (gltf) => {
    const root = gltf.scene;
    scene.add(root);
});



const pointlight = new THREE.PointLight(0xFFFFFF);
pointlight.position.set(20,200,100);
scene.add(pointlight);

const ambientlight = new THREE.AmbientLight(0xFFFFFF);
//scene.add(ambientlight);

function showGrid(){
    const lighthelper = new THREE.PointLightHelper(pointlight);
    const gridhelper = new THREE.GridHelper(200,50);
    scene.add(lighthelper,gridhelper);
}
//showGrid();

// const controls = new THREE.OrbitControls(camera,renderer.domElement);
// //const controls = new THREE.FirstPersonControls(camera,renderer.domElement);
// controls.movementSpeed = 20.0;

function addStar() {
    const geometry = new THREE.SphereGeometry(Math.random(0.10,0.8),24,24);
    const material = new THREE.MeshStandardMaterial({color:0xFFFF99});
    const star = new THREE.Mesh(geometry,material);
    const [x,y,z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(1000));
    star.position.set(x,y,z);
    scene.add(star);
}

Array(200).fill().forEach(addStar);

const background = new THREE.TextureLoader().load("img/space3.png");
scene.background = background;

class Player {
    constructor(flyspeed,initial_z,initial_x,initial_y,remainingDistance){
        this.flyspeed = flyspeed;
        this.speed = 20;
        this.x = initial_x,
        this.y = initial_y;
        this.z = initial_z;
        this.remainingDistance = remainingDistance;
        this.score = 0;
        this.startTime = new Date();
    }
}

let player = new Player(20,200,0,0,1000);
camera.translateZ(player.z);

const convertedSpeed = function(speed) {
    player.z -= (speed/40);
    return -(speed/40);
}

class Meteor {
    constructor(damage,y,z) {
        this.damage = damage;
        this.y = y;
        this.z = z;
        this.createMeteor();
    }

    createMeteor(){
        var geometry = new THREE.SphereGeometry(4,5,8);
        var texture = new THREE.TextureLoader().load("img/meteor.png");
        var material = new THREE.MeshStandardMaterial({map:texture});
        this.MeteorObj = new THREE.Mesh(geometry,material);
        this.MeteorObj.position.y = this.y
        this.MeteorObj.position.x = this.get_x_position();
        this.MeteorObj.position.z = this.z;
        scene.add(this.MeteorObj);
        this.MeteorObj.name = `meteor${meteorId}`;
        meteorId ++;
    }

    get_x_position() {
        let chance = Math.random();
        this.initialPos = 400;
        if (chance < 0.5) {
            return this.initialPos;
        }
        this.initialPos = -this.initialPos;
        return this.initialPos;
    }

    moveTo(x,y,z){
        this.MeteorObj.position.y = Math.max(0,this.MeteorObj.position.y - this.getSpeed(0.0375));
        let x_diff = (this.MeteorObj.position.x - x);
        let direction = -(this.initialPos/Math.abs(this.initialPos));
        if (direction == 1) {
            this.MeteorObj.position.x = Math.min(0,this.MeteorObj.position.x + direction*(this.getSpeed(0.0825))) ;
        } else {
            this.MeteorObj.position.x = Math.max(0, this.MeteorObj.position.x + direction*(this.getSpeed(0.0825)));
        }
        let z_diff = (this.MeteorObj.position.z - z);
        this.MeteorObj.position.z += this.getSpeed(0.1875);
        this.MeteorObj.rotation.y += 0.1;
        this.MeteorObj.rotation.z += 0.2;

    }

    getSpeed(initialspeed) {
        return initialspeed*player.flyspeed;
    }

    getDistance(x,y,z) {
        let distance = Math.sqrt(Math.pow(this.MeteorObj.position.x - x,2)+ Math.pow(this.MeteorObj.position.z - z,2));
        //console.log(distance);
    }

    HitPlayer(x,y,z){
        if (Math.abs(this.MeteorObj.position.y - y) == 0) {
            if (Math.abs(this.MeteorObj.position.x - x) ==  0) {
                removeMeteor(this.MeteorObj);
                return true;
            }
        }
        return false;
    }

}

function getObjDistance(obj) {
    let distance = Math.sqrt(Math.pow(obj.position.x - player.x,2)+ Math.pow(obj.position.z - player.z,2));
    console.log(distance);
}

function removeMeteor(object) {
    let tempMeteorites = [];
    for (let meteor of meteorites) {
        if (meteor.MeteorObj.name == object.name) {
            console.log(`DEBUG: ${object.name} removed from scene.`);
            continue;
        }
        tempMeteorites.push(meteor);
    }
    meteorites = tempMeteorites;

    //console.log(object);

    scene.remove(object);

}

function updateMeteorites() {
    let tempMeteorites = [];
    for (let meteor of meteorites) {
        meteor.moveTo(player.x,player.y,player.z);
        if (!meteor.HitPlayer(player.x,player.y,player.z)) {
            tempMeteorites.push(meteor)
            if (meteor == tempMeteorites[0]) {
                meteor.getDistance(player.x,player.y,player.z);
            }
            continue;
        }
        console.log(`Hit Player: ${meteor.MeteorObj.name}`)
    }
    meteorites = tempMeteorites;
}


function updatePlayer() {
    camera.translateZ(convertedSpeed(player.flyspeed));
    player.remainingDistance -= player.speed/3600*1000/30;
    let displayDistance = player.remainingDistance - player.remainingDistance%1
    if (displayDistance <= 0) {
        console.log('You reached the goal!');
        
    }
    if (htmlDistance) {
        htmlDistance.innerText =  `${displayDistance}m`;
    }
    
}
function rotateObjects() {
    torus.rotation.x += 0.002;
    //torus.rotation.y += 0.01;
    torus.rotation.z += 0.002;
    
    for (let planet of planets) {
        planet.rotation.y += 0.002;
        planet.rotation.z += 0.001;
    } 
}

function animate() {
    requestAnimationFrame(animate);
    rotateObjects();

    renderer.render(scene,camera);
    
    if (!paused) {
        updateMeteorites();
        updatePlayer();
        timedEvents();
        window.requestAnimationFrame(render);
    }
}

let randomTimeEvent = [Math.round(Math.random()*60  + 40)];

function timedEvents() {
    globalTimer ++;
    if (globalTimer%randomTimeEvent[0] == 0) {
        console.log(`Spawning new Meteor: ${meteorId}`);
        meteorites.push(new Meteor(0,180,player.z-1000));
        randomTimeEvent[0] = Math.round(Math.random()*100  + 40);
        globalTimer = 0;
    }
}

function onKeyPressed() {
// Add event listener on keydown
document.addEventListener('keydown', (event) => {
    var name = event.key;
    var code = event.code;
    // Alert the key name and key code on keydown
    //console.log(`Key pressed ${name} \r\n Key code value: ${code}`);

    if (code == "Space") {
        paused = !paused;
        console.log(`paused game ${paused}`);
        return;
    }
    if (code == "ArrowUp") {
        player.speed ++;
        htmlSpeed.innerHTML = `${player.speed} km/h`;
        return;
    }
    if (code == "ArrowDown") {
        player.speed --;
        htmlSpeed.innerHTML = `${player.speed} km/h`; 
        return;
    }

  }, false);

}

onKeyPressed()

document.addEventListener("DOMContentLoaded", function () {
    htmlSpeed = document.querySelector(".js-speed");
    htmlDistance = document.querySelector(".js-distance");
    console.log(htmlSpeed);
    
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerMove( event ) {

	// calculate pointer position in normalized device coordinates
	// (-1 to +1) for both components

	pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

}

function render() {

	// update the picking ray with the camera and pointer position
	raycaster.setFromCamera( pointer, camera );

	// calculate objects intersecting the picking ray
	const intersects = raycaster.intersectObjects( scene.children );

	for ( let i = 0; i < intersects.length; i ++ ) {

		//intersects[ i ].object.material.color.set( 0xff0000 );
        if (intersects[i].object.name.substring(0,6) == "meteor") {
            //console.log(`touching: ${intersects[i].object.name}`);
            removeMeteor(intersects[i].object);
        }
        
	}

	renderer.render( scene, camera );

}

window.addEventListener('pointermove', onPointerMove);

animate();

// functions only called through the Application

function getSpeed(speed) {
    player.speed = speed;
    htmlSpeed.innerHTML = `${speed} km/h`;
}
