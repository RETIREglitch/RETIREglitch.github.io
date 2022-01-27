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

function addTorus(imgsrc,z_pos) {
    const texture = new THREE.TextureLoader().load(imgsrc);
    var geometry = new THREE.TorusGeometry(12,2,2,100); // inner diameter,outer size,thickness,smoothness
    var material = new THREE.MeshStandardMaterial({map:texture}); //wireframe:true,{color:0x882233}
    torus = new THREE.Mesh(geometry,material);
    torus.position.z = z_pos;
    scene.add(torus);

}
let saturn_pos = 10;
addTorus("img/saturn_rings.png",saturn_pos);

// torus.addEventListener('click',function(event)
// {
//     console.log("test");
// });

function addPlanet(imgsrc, z_pos){
    const texture = new THREE.TextureLoader().load(imgsrc);
    geometry = new THREE.SphereGeometry(9,24,24);
    material = new THREE.MeshStandardMaterial({map:texture});
    const newPlanet = new THREE.Mesh(geometry,material);
    newPlanet.position.z = z_pos;
    planets.push(newPlanet);
    scene.add(newPlanet);
    return newPlanet;
}

addPlanet("img/saturn.png",saturn_pos)


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
    constructor(speed,initial_z,initial_x,initial_y){
        this.speed = speed;
        this.x = initial_x,
        this.y = initial_y;
        this.z = initial_z
    }
}

let player = new Player(20,200,0,0);
camera.translateZ(player.z);

const convertedSpeed = function(speed) {
    player.z -= (speed/40);
    return -(speed/40);
}

class Meteor {
    constructor(speed,damage,y,z) {
        this.speed = speed;
        this.damage = damage;
        this.y = y;
        this.z = z;
        this.createMeteor();
    }

    createMeteor(){
        var geometry = new THREE.SphereGeometry(3,10,10);
        const material = new THREE.MeshStandardMaterial({color:0xFF0099});
        this.MeteorObj = new THREE.Mesh(geometry,material);
        this.MeteorObj.position.y = this.y
        this.MeteorObj.position.x = this.get_x_position();
        console.log(this.initialPos);
        this.MeteorObj.position.z = this.z;
        scene.add(this.MeteorObj);
        this.xspeed = this.MeteorObj.position.x - player.x;
        this.yspeed = 0;
        this.zspeed = 0;


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
        this.MeteorObj.position.y = Math.max(0,this.MeteorObj.position.y - this.speed/40);

        let x_diff = (this.MeteorObj.position.x - x);
 
        let direction = -(this.initialPos/Math.abs(this.initialPos));
        this.MeteorObj.position.x += direction*(this.speed/18.15) ;

        let z_diff = (this.MeteorObj.position.z - z);
        this.MeteorObj.position.z += this.speed/8;
        this.HitPlayer(x,y,z);
    }

    HitPlayer(x,y,z){
        if (Math.abs(this.MeteorObj.position.y - y) < 0.05) {
            if (Math.abs(this.MeteorObj.position.x - x) < 3) {
                alert("hit");
                return true;
            }
        }
        console.log("Player:");
        console.log("\tX: " + x);
        console.log("\tY: " + y);
        console.log("\tZ: " + z);

        console.log("Comet:");
        console.log("X: " + this.MeteorObj.position. x);
        console.log("Y: " + this.MeteorObj.position. y);
        console.log("Z: " + this.MeteorObj.position. z);
        return false;
    }

}

meteorites.push(new Meteor(30,0,180,-800))

function moveMeteorites() {
    for (let meteor of meteorites) {
        meteor.moveTo(player.x,player.y,player.z);
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
        moveMeteorites();
        camera.translateZ(convertedSpeed(player.speed));
    }
}


function onKeyPressed() {
// Add event listener on keydown
document.addEventListener('keydown', (event) => {
    var name = event.key;
    var code = event.code;
    // Alert the key name and key code on keydown
    console.log(`Key pressed ${name} \r\n Key code value: ${code}`);
    if (code == "Space") {
        paused = !paused;
        console.log(`paused game ${paused}`);
    }
  }, false);

}
onKeyPressed()

animate();