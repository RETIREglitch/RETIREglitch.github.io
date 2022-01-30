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

// lighting
let pointlight;

// dynamic loading 
let roadSections = [];
let buildings;
let building_pos_l = [];
building_pos_l.push([-240,-20,50,0]); // done
building_pos_l.push([-290,24,60,0]); // done
building_pos_l.push([-210,-80,40,0]); // done
building_pos_l.push([-220,-70,50,0]); // done
building_pos_l.push([-440,-76,30,0]); // done
building_pos_l.push([-200,-40,40,0]); // done
building_pos_l.push([-290,-80,30,0]); // done

let building_pos_r = [];
building_pos_r.push([240,-20,50,3.14]); // done
building_pos_r.push([290,24,60,3.14]); // done
building_pos_r.push([210,-80,40,3.14]); // done
building_pos_r.push([220,-70,50,3.14]); // done
building_pos_r.push([440,-76,30,3.14]); // done
building_pos_r.push([200,-40,40,3.14]); // done
building_pos_r.push([290,-80,30,3.14]); // done

// finish line: z-pos should be -53965;
let finish_line;

// bike data
let bike;
let bike_z_change = 0;
let moved_z = 0;

let direction_x = 1;
let moved_x = 0;
let random_x_length = Math.random() * 5;

let bike_y_change = 0;
let moved_y = 0;

// other data
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
                building.position.z = 1000;
                scene.add(building);
                this.buildings_l.push(building);
            })

            gltfLoader.load(model, (gltf) => {
                const building = gltf.scene;
                building.visible = false;
                let scalef = building_pos_r[i][2];
                building.scale.set(scalef, scalef, scalef);
                building.position.z = 1000;
                scene.add(building);
                this.buildings_r.push(building);
                if (i == 6) {
                    this.updateAllBuildings()
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
        let building = buildingsArray[randomValue];
        while (building.position.z < bike.position.z) {
            console.log("test");
            buildingsArray = this.buildings_l;
            if (randomInt(0,1) == 1) {
                buildingsArray = this.buildings_r;
            }
            randomValue = randomInt(0,buildingsArray.length-1);
            building = buildingsArray[randomValue];
        }
        
        building.position.z = z;
        building.visible = true;
        //console.log(randomValue);
        return;

    }
}

class FinishLine{
    constructor(){
        this.z = -30000;//-170810;//-400;//-53965;
        this.initialize();
    }

    initialize(){
        console.log("creating end")
        var geometry = new THREE.BoxGeometry(4, 160, 4, 1, 1, 1);
        var texture = new THREE.TextureLoader().load("img/wood_texture.png");
        var material = new THREE.MeshStandardMaterial({map:texture});
        this.leftpole = new THREE.Mesh(geometry,material);

        scene.add(this.leftpole);
        this.leftpole.position.y += 0;
        this.leftpole.position.x -= 100;
        this.leftpole.position.z = this.z ;
        this.rightpole = new THREE.Mesh(geometry,material);
        this.rightpole.position.y += 0;
        this.rightpole.position.x += 100;
        this.rightpole.position.z = this.z ;
        scene.add(this.rightpole);

        geometry = new THREE.BoxGeometry(200, 25, 1, 1, 1, 1);
        texture = new THREE.TextureLoader().load("img/finishline.png");
        material = new THREE.MeshStandardMaterial({map:texture});
        this.flag = new THREE.Mesh(geometry,material);
        scene.add(this.flag);

        this.flag.position.y += 40
        this.flag.position.z = this.z ;
    }

}

// other objects
function loadBike(model) {
    const objLoader = new THREE.OBJLoader();
    objLoader.load(model, function(obj){
        obj.position.y = -140;
        obj.position.z = -18;
        obj.position.z = -20;
        scene.add(obj);
        bike = obj;
        buildings.addRandomBuilding(-200);
        buildings.addRandomBuilding(-400);
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
    console.log(bike.position.z);

    if (roadSections[0].z > bike.position.z+260) {
        roadSections[0].updateZ(-400*roadSections.length+1);
        let tempPart = roadSections[0];

        for (let i = 0; i < roadSections.length-1;i++){
            roadSections[i] = roadSections[i+1];
        }
        roadSections[roadSections.length-1] = tempPart;
        buildings.addRandomBuilding(bike.position.z-1000);
    }

    // if (pointlight.position.z > bike.position.z+100) {
    //     pointlight.position.z -= 200;
    // }
    pointlight.position.z = bike.position.z;

    const randomBikeX = pseudoRandomX();
    bike.position.x += randomBikeX;
    bike.rotation.y += randomBikeX/200;
    bike.rotation.z += randomBikeX/200;

    player.remainingDistance = (finish_line.z - bike.position.z)/finish_line.z*1000;
    // player.remainingDistance -= player.speed/3600*1000/100;
    let displayDistance = player.remainingDistance - player.remainingDistance%1

    if (displayDistance <= 0) {
        alert('You reached the goal!'); 
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
        // window.requestAnimationFrame(render);
    }
}



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

// functions only called through the Application

function getSpeed(speed) {
    player.speed = speed;
    htmlSpeed.innerHTML = `${speed} km/h`;
}


document.addEventListener("DOMContentLoaded", function () {
    htmlSpeed = document.querySelector(".js-speed");
    htmlDistance = document.querySelector(".js-distance");
    //console.log(htmlSpeed);

    track = document.createElement('audio')
    track.src = "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/WFMU/Broke_For_Free/Directionless_EP/Broke_For_Free_-_01_-_Night_Owl.mp3"
    track.load();
    track.play();

        
    const background = new THREE.TextureLoader().load("img/skybox.png");
    scene.background = background;

    pointlight = new THREE.PointLight(0xFFFFCC);
    pointlight.position.set(0,100,100);
    scene.add(pointlight);
    console.log(pointlight);
    pointlight.decay = 0;

    onKeyPressed();
    addRoadSections();
    buildings = new Buildings();
    finish_line = new FinishLine();

    animate();

});