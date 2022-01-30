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
let track;
let roadSections = [];
let buildings;
let building_pos_l = [];
building_pos_l.push([-240,-20,50,0]); // done
building_pos_l.push([-290,24,60,0]); // done
building_pos_l.push([-210,-80,40,0]); // done
building_pos_l.push([-220,-60,50,0]); // done
building_pos_l.push([-440,-76,30,0]); // done
building_pos_l.push([-200,-20,40,0]); // done
building_pos_l.push([-290,-80,30,0]); // done

let building_pos_r = [];
building_pos_r.push([240,-20,50,3.14]); // done
building_pos_r.push([290,24,60,3.14]); // done
building_pos_r.push([210,-80,40,3.14]); // done
building_pos_r.push([220,-60,50,3.14]); // done
building_pos_r.push([440,-76,30,3.14]); // done
building_pos_r.push([200,-20,40,3.14]); // done
building_pos_r.push([290,-80,30,3.14]); // done

let bike;
let bike_z_change = 0;
let moved_z = 0;

let direction_x = 1;
let moved_x = 0;
let random_x_length = Math.random() * 5;

let bike_y_change = 0;
let moved_y = 0;

let paused = true;

// html data
let htmlSpeed;
let htmlDistance;

// environment
class RoadSection {
    constructor(z){
        this.z = z;
        this.initialize()
    }

    initialize(){
        this.makeRoad()
        this.makePavement()
    }

    makeRoad(){
        var geometry = new THREE.BoxGeometry(200, 1, 400, 1, 1, 1);
        var texture = new THREE.TextureLoader().load("img/road.png");
        var material = new THREE.MeshStandardMaterial({map:texture});
        this.road = new THREE.Mesh(geometry,material);
        scene.add(this.road);
        this.road.position.y -= 80;
        this.road.position.z += this.z;
    }

    makePavement(){
        let pavementWidth = 1000;
        var geometry = new THREE.BoxGeometry(pavementWidth, 12, 400, 1, 1, 1);
        var texture = new THREE.TextureLoader().load("img/pavement.png");
        var material = new THREE.MeshStandardMaterial({map:texture});
        this.leftpavement = new THREE.Mesh(geometry,material);
        scene.add(this.leftpavement);

        var geometry = new THREE.BoxGeometry(pavementWidth, 12, 400, 1, 1, 1);
        var texture = new THREE.TextureLoader().load("img/pavement.png");
        var material = new THREE.MeshStandardMaterial({map:texture});
        this.rightpavement = new THREE.Mesh(geometry,material);
        scene.add(this.rightpavement);

        this.leftpavement.position.y -= 80;
        this.leftpavement.position.x -= pavementWidth/2+100;
        this.leftpavement.position.z += this.z;

        this.rightpavement.position.y -= 80;
        this.rightpavement.position.x += pavementWidth/2+100;
        this.rightpavement.position.z += this.z;
    }

    updateZ(value){
        this.z += value;
        this.road.position.z += value;
        this.leftpavement.position.z += value;
        this.rightpavement.position.z += value;
    } 
}

function addRoadSections() {
    for (let i = 0; i <= 3; i++) {
        roadSections.push(new RoadSection(i*-400+260));
    }
}

class Buildings{
    constructor(){
        this.buildings_l = [];
        this.buildings_r = [];
        this.initialize();
    }
    initialize(){
        this.loadBuildings();
    }

    loadBuildings(){
        for (let i = 0; i < 7; i++) {
            let model = `models/buildings/building${i+1}.glb`;
            const gltfLoader = new THREE.GLTFLoader();
            // left side
            gltfLoader.load(model, (gltf) => {
                const building = gltf.scene;
                building.visible = false;
                let scalef = building_pos_l[i][2];
                building.scale.set(scalef, scalef, scalef);

                scene.add(building);
                this.buildings_l.push(building);
            })

            gltfLoader.load(model, (gltf) => {
                const building = gltf.scene;
                building.visible = false;
                let scalef = building_pos_r[i][2];
                building.scale.set(scalef, scalef, scalef);

                scene.add(building);
                this.buildings_r.push(building);
                if (i == 6) {
                    this.updateAllBuildings()
                    this.addRandomBuilding(-200);
                    this.addRandomBuilding(-400);
                    loadBike("models/bike.obj");
                }
            })
        }
    }
    
    updateAllBuildings() {
        for (let i = 0; i < 7; i++) {
            this.buildings_l[i].position.x += building_pos_l[i][0];
            this.buildings_l[i].position.y += building_pos_l[i][1];

            this.buildings_r[i].position.x += building_pos_r[i][0];
            this.buildings_r[i].position.y += building_pos_r[i][1];
            this.buildings_r[i].rotation.y += building_pos_r[i][3];
        }
    }

    addRandomBuilding(z){
        let buildingsArray = this.buildings_l;
        if (randomInt(0,1) == 1) {
            buildingsArray = this.buildings_r;
        }

        let randomValue = randomInt(0,buildingsArray.length-1);
        console.log(randomValue, buildingsArray.length);
        let building = buildingsArray[randomValue];
        building.position.z = z;
        building.visible = true;
        console.log(building);
        return;

    }
}


const background = new THREE.TextureLoader().load("img/skybox.png");
scene.background = background;

const pointlight = new THREE.PointLight(0xFFFFCC);
pointlight.position.set(0,100,100);
scene.add(pointlight);

// other objects
function loadBike(model) {
    const objLoader = new THREE.OBJLoader();
    objLoader.load(model, function(obj){
        obj.position.y = -140;
        obj.position.z = -18;
        //obj.position.z = 150;
        scene.add(obj);
        bike = obj;
    });

}

// player code
class Player {
    constructor(initial_z,initial_x,initial_y,remainingDistance){
        this.speed = 20;
        this.x = initial_x,
        this.y = initial_y;
        this.z = initial_z;
        this.remainingDistance = remainingDistance;
        this.score = 0;
        this.startTime = new Date();
    }
}

let player = new Player(0,0,0,1000);

function pseudoRandomX() {
    moved_x += 0.1;
    if (moved_x >= random_x_length) {
        if (direction_x == Math.abs(direction_x)) {
            random_x_length = random(1,6);
        };
        direction_x = -direction_x;
        moved_x = 0;
    }
    return 0.1*direction_x;
}

function random(min,max) {
    return Math.random() * (max-min) + min;
}

function randomInt(min,max) {
    return Math.round(random(min,max));
}

function pseudoRandomColor() {
    let red = random(0x90,0xFF);
    let green = random(0x90,0xFF);
    let blue = random(0x90,0xFF);
    return red << 16 | green << 8 | blue;
}

function updatePlayer() {
    //player.z += -player.speed/2;
    camera.translateZ(-player.speed/2);
    bike.position.z += -player.speed/2;


    if (roadSections[0].z > bike.position.z+260) {
        //console.log("loading road section");
        roadSections[0].updateZ(-400*roadSections.length+1);
        let tempPart = roadSections[0];

        for (let i = 0; i < roadSections.length-1;i++){
            roadSections[i] = roadSections[i+1];
        }
        roadSections[roadSections.length-1] = tempPart;
    }

    if (pointlight.position.z > bike.position.z+100) {
        pointlight.position.z -= 200;
        //let rc = pseudoRandomColor()
        //pointlight.color.setHex(rc);
        //console.log(pointlight);
        // console.log(rc);
    }

    const randomBikeX = pseudoRandomX();
    bike.position.x += randomBikeX;
    bike.rotation.y += randomBikeX/200;
    bike.rotation.z += randomBikeX/200;
    //bike.position.y += pseudoRandomY();

    player.remainingDistance -= player.speed/3600*1000/30;
    let displayDistance = player.remainingDistance - player.remainingDistance%1

    if (displayDistance <= 0) {
        console.log('You reached the goal!'); 
        displayDistance = 0;
    }
    if (htmlDistance) {
        htmlDistance.innerText =  `${displayDistance}m`;
    }
    
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene,camera);
    
    if (!paused) {
        updatePlayer();
        //timedEvents();
        window.requestAnimationFrame(render);
    }
}

// let randomTimeEvent = [Math.round(Math.random()*60  + 40)];

// function timedEvents() {
//     globalTimer ++;
//     if (globalTimer%randomTimeEvent[0] == 0) {
//     }
// }

function onKeyPressed() {
    document.addEventListener('keydown', (event) => {
        var name = event.key;
        var code = event.code;
        // Alert the key name and key code on keydown
        //console.log(`Key pressed ${name} \r\n Key code value: ${code}`);

        if (code == "Space") {
            paused = !paused;
            console.log(`paused game ${paused}`);
            if (paused) {
                track.pause();
                return;
            }
            track.play();
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
        // if (intersects[i].object.name.substring(0,6) == "meteor") {
        //     //console.log(`touching: ${intersects[i].object.name}`);
        //     removeMeteor(intersects[i].object);
        // }
	}
	renderer.render( scene, camera );
}


// functions only called through the Application

function getSpeed(speed) {
    player.speed = speed;
    htmlSpeed.innerHTML = `${speed} km/h`;
}


document.addEventListener("DOMContentLoaded", function () {
    htmlSpeed = document.querySelector(".js-speed");
    htmlDistance = document.querySelector(".js-distance");
    //console.log(htmlSpeed);
    
    //window.addEventListener('pointermove', onPointerMove);
    
    onKeyPressed();
    addRoadSections();
    buildings = new Buildings();
    animate();

    track = document.createElement('audio')
    track.src = "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/WFMU/Broke_For_Free/Directionless_EP/Broke_For_Free_-_01_-_Night_Owl.mp3"
    track.load();
    track.play();
    
});