import * as THREE from 'three';
import Audio from './audio';
import Key from './key';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GameNotes from './gameNotes';
import Note from './note';

type SongNote = {
	note: Note;
	mesh: THREE.Mesh[];
};

export default class Track {
	private renderer: THREE.WebGLRenderer;
	private camera: THREE.PerspectiveCamera;
	private scene: THREE.Scene;

	private musicDeley: number = 0;

	private inputKeys: string[] = ['d', 'f', 'j', 'k'];
	private keys: Key[] = [];

	private sphere: THREE.Mesh = new THREE.Mesh();
	private keyWidths: number[] = [];
	private xPos: number[] = [];
	private yStartPoint: number = 1200;
	/*this number is arbitrary, but it is roughly the top of the screen
	we use these two numbers to calculate the y position of the note track */
	private yEndPoint: number = -40;
	public fallTime: number = 0.8;
	//this number, in seconds is how long it takes for the note to move from the top to the bottom of the track

	private visualKey: visualKey = {
		yVel: 0,
		yEndPoint: 0,
		width: 0,
		height: 0,
		materials: [],
		pressedMaterials: []
	};

	private keyLights: THREE.Mesh[] = [];
	private keyLightMaterials: THREE.MeshBasicMaterial[] = [];

	private tunnel: THREE.Mesh = new THREE.Mesh();
	private tunnel2: THREE.Mesh = new THREE.Mesh();
	// we will give these attributes default values, which will not be used.
	//to avoid typescript errors, we will give them a value of 0 or null

	public lastTime: number = Date.now();
	public firstNoteTime: number = Date.now();
	private gameNotes: GameNotes = new GameNotes(this.keys);
	private songNotes: Note[] = [];
	private trackNotes: SongNote[] = [];
	public timeZero: number = 0;

	constructor(
		renderer: THREE.WebGLRenderer,
		camera: THREE.PerspectiveCamera,
		scene: THREE.Scene
	) {
		this.renderer = renderer;
		this.camera = camera;
		this.scene = scene;
	}

	async init() {
		this.setWindowResizer();
		const controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.createTrack();
		this.keyAttributes();
		this.loop();
		let audio = new Audio(
			this.renderer,
			this.scene,
			this.camera,
			this,
			this.timeZero
		);
		this.songNotes = await audio.parseFile(this.visualKey.yVel, this.keys);
	}

	render() {
		this.renderer.render(this.scene, this.camera);
	}

	update() {
		console.log(this.visualKey.yVel);
		//this function will be called every frame
		let delta = (Date.now() - this.lastTime) / 1000;
		//this will calculate the time since the last frame
		this.lastTime = Date.now();
		//this will update the lastTime variable to the current time
		this.tunnel.position.y += this.visualKey.yVel * delta * 2;
		if (this.tunnel.position.y < 400 - 15000 / 8) {
			this.tunnel.position.set(0, 400, 0);
			/*here we will move the tunnel backwards if pases by one of its texture
			which will create the illusion of it moving continuously */
		}
		this.tunnel2.position.y -= this.visualKey.yVel * delta * 2;
		//this.tunnel2.rotateY(0.004);
		if (this.tunnel2.position.y > 400 + 15000 / 8) {
			this.tunnel2.position.set(0, 400, 0);
			//this is the reverse of tunnel 1
		}
		this.keyLights.forEach((light, i) => {
			if (!this.keys[i].pressed) this.keyLightMaterials[i].opacity -= 0.0125;
			//this will make the lights fade out when the key is not pressed
		});

		this.trackNotes.forEach((note, i) => {
			note.mesh.forEach(
				(x) => (x.position.y += this.visualKey.yVel * delta)
			);
			//this will move the notes down the track
			if (
				note.mesh[note.mesh.length - 1].position.y <
				this.visualKey.yEndPoint - 1000
			) {
				note.mesh.forEach((x) => this.scene.remove(x));
				//this.trackNotes.splice(i, 1);
				//this will remove the note from the game if it passes the bottom of the screen
			}
		});
	}

	loop() {
		requestAnimationFrame(this.loop.bind(this));
		this.update();
		this.render();
	}

	createTrack() {
		const loader = new THREE.TextureLoader();

		this.camera.position.set(0, -210, 200);
		this.camera.lookAt(0, 200, 0);
		/*instead of calculating how the game would work in 3D, which would mean
		accounting for 2 axis for note falling, we construct the game in a 2d space
		and then rotate the camera to give the illusion of 3D. This is much easier
		to calculate and will give the same effect.*/

		//this object will be used to load the textures
		this.renderer.physicallyCorrectLights = true;
		/*this will make the lighting more realistic, meaning that the light will
        be affected by the material. It will also have accurate falloff, this means,
        instead of using intensity to calculate brightness, power (in lumens) will
        be used, and also decay and penumbra will need to be set. */

		const cols = [0x7f2f78, 0x292e73];
		const pos = [50, -50];
		const targets = [350, -350];
		for (let i = 0; i < 2; i++) {
			const light = new THREE.DirectionalLight(cols[i], 100);
			//light.intensity = 10;
			light.position.set(pos[i], -1000, 40);
			light.target.position.set(targets[i], 0, 0);
			light.renderOrder = 3;
			this.scene.add(light);
		}

		const scalingFactor = 1.75;
		const textureWidths = [75, 91];
		for (let i = 0; i < 4; i++) {
			if ([1, 2].includes(i))
				this.keyWidths[i] = textureWidths[0] / scalingFactor;
			else this.keyWidths[i] = textureWidths[1] / scalingFactor;
			/*this will be useful later to calculate
                1 - the position of the keys on the track
                2 - the width of the keys

                the keys in the middle (1 and 2) are smaller than the others,
                therefore we need to accomodate for that.
            */
		}

		this.xPos = [
			-this.keyWidths[0] / 2 - this.keyWidths[1],
			-this.keyWidths[1] / 2,
			this.keyWidths[1] / 2,
			this.keyWidths[1] + this.keyWidths[0] / 2
		];
		/*despite looking arbritrary, this is the position of the keys
                    on the track, based on the width of the keys and the distance
                    between them.*/

		/* now we will create the the main structure of the scene.
        this is the track and the 2 large cylinders that will create what will be
        the walls of the track.

        we will move the cylinders every frame to create the illusion of movement
        after one pass of a wall texture, we will move it back exactly the amount
        of one of its textures, so that it will be in the same position as it was
        before. and therefore creating the illusion that it continuously moves.*/

		let wallTexture = loader.load('assets/wallTexture.png');
		wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
		wallTexture.repeat.set(8, 8);
		//this will repeat the texture to create a tiling effect.

		let wallMaterial = new THREE.MeshPhysicalMaterial({
			color: 0xffffff,
			//despite not using it, we need to set a color for the material
			map: wallTexture,
			reflectivity: 1,
			roughness: 0,
			transparent: true,
			side: THREE.DoubleSide
		});

		let wallTexture2 = loader.load('assets/wallTexture2.png');
		wallTexture2.wrapS = wallTexture2.wrapT = THREE.RepeatWrapping;
		wallTexture2.repeat.set(8, 8);

		let wallMaterial2 = new THREE.MeshPhysicalMaterial({
			color: 0xffffff,
			map: wallTexture2,
			reflectivity: 1,
			roughness: 0,
			side: THREE.DoubleSide
		});

		let tunnelGeometry = new THREE.CylinderGeometry(
			700,
			700,
			15000,
			8,
			8,
			true
		);
		let tunnelOuter = new THREE.Mesh(tunnelGeometry, wallMaterial);
		tunnelOuter.position.set(0, 400, 0);
		this.tunnel = tunnelOuter;
		this.tunnel.rotateY(Math.PI / 8);
		/*the tunnel is not cylindrical, it is octagonal, so we need to set the
        rotation of the cylinder to 0.4 radians, so that the bottom of the screen
        is one of the faces of an octagon, and not the vertex.*/
		this.tunnel.renderOrder = -1;
		/*this will make this tunnel render second (we set -2 to tunnel2), so that it will be before
        everything else.

        this does not need to be negative. I am doing this to ensure that somewhere
        else i do not use these reserved orders of render*/
		this.scene.add(this.tunnel);

		let tunnel2Geometry = new THREE.CylinderGeometry(
			800,
			800,
			15000,
			8,
			8,
			true
		);
		let tunnel2Outer = new THREE.Mesh(tunnel2Geometry, wallMaterial2);
		tunnel2Outer.position.set(0, 400, 0);
		this.tunnel2 = tunnel2Outer;
		this.tunnel2.rotateY(0.4);
		this.tunnel2.renderOrder = -2;
		this.scene.add(this.tunnel2);

		let tGeometry = new THREE.BoxGeometry(200, 4000, 1);
		let track = new THREE.Mesh(
			tGeometry,
			new THREE.MeshLambertMaterial({
				color: 0x000000,
				refractionRatio: 0.5,
				transparent: true,
				side: THREE.BackSide,
				combine: THREE.MixOperation,
				reflectivity: 0.5
			})
		);
		track.position.set(0, 200, 0);
		this.scene.add(track);

		const noteBlock = new THREE.Mesh(
			new THREE.PlaneGeometry(250, 300),
			new THREE.MeshBasicMaterial({
				color: 0x000000,
				side: THREE.DoubleSide
			})
		);

		noteBlock.rotateX(Math.PI / 2);
		noteBlock.position.set(0, 1200, 0);
		noteBlock.renderOrder = -1;
		this.scene.add(noteBlock);
		//we need to hide some of slider spawning behind the track, so we will use this plane to do that.
	}

	keyAttributes() {
		const loader = new THREE.TextureLoader();
		//again we need a loader to provide texture to our materials
		this.visualKey.height = (this.keyWidths[0] / 75) * 109;
		this.visualKey.width = this.keyWidths[0];
		/*to get the height of a key, since the width is known, we can use the
         ratio of the width to the height of the texture*/

		let keysTemp: THREE.Mesh[] = [];
		for (let i = 0; i < 4; i++) {
			let keyGeometry = new THREE.PlaneGeometry(
				this.keyWidths[i],
				this.visualKey.height
			);
			let keyLightGeometry = new THREE.PlaneGeometry(
				this.keyWidths[i],
				(this.visualKey.height / 109) * 632
			);
			//again we will use the ratio of the height of the texture to the height of the light texture
			//the light will be displayed while a key is pressed
			this.keyLightMaterials[i] = new THREE.MeshBasicMaterial({
				map: loader.load('assets/keyLight.png'),
				transparent: true,
				opacity: 0
			});
			keysTemp[i] = new THREE.Mesh(
				keyGeometry,
				new THREE.MeshBasicMaterial({ color: 0x00ffff })
			);
			this.keyLights[i] = new THREE.Mesh(
				keyLightGeometry,
				this.keyLightMaterials[i]
			);
		}
		this.visualKey.materials = [
			new THREE.MeshBasicMaterial({ map: loader.load('assets/key.png') }),
			new THREE.MeshBasicMaterial({ map: loader.load('assets/key2.png') }),
			new THREE.MeshBasicMaterial({ map: loader.load('assets/key3.png') }),
			new THREE.MeshBasicMaterial({ map: loader.load('assets/key.png') })
			//keys 1 and 4 are the same, so we can use the same texture
		];
		this.visualKey.pressedMaterials = [
			new THREE.MeshBasicMaterial({
				map: loader.load('assets/keyPressed.png')
			}),
			new THREE.MeshBasicMaterial({
				map: loader.load('assets/key2Pressed.png')
			}),
			new THREE.MeshBasicMaterial({
				map: loader.load('assets/key3Pressed.png')
			}),
			new THREE.MeshBasicMaterial({
				map: loader.load('assets/keyPressed.png')
			})
		];
		/*we will use 2 different materials for the keys, one for when they are
		pressed, and one for when they are not.*/
		this.visualKey.yVel = (this.yEndPoint - this.yStartPoint) / this.fallTime;

		const judgementLineMaterial = new THREE.MeshBasicMaterial({
			map: loader.load('assets/jLine.png'),
			transparent: true
		});
		const judgementLineGeometry = new THREE.PlaneGeometry(
			this.xPos[3] +
				this.keyWidths[3] / 2 -
				(this.xPos[0] - this.keyWidths[0] / 2),
			(this.visualKey.width / 75) * 532
		);
		const judgementLine = new THREE.Mesh(
			judgementLineGeometry,
			judgementLineMaterial
		);
		/*the judgement line is a plane that is the width of the track.
		its purpose is to indicate where the note should be hit on the track */
		judgementLine.position.set(
			(this.xPos[1] + this.xPos[2]) / 2,
			this.yEndPoint + 2,
			10
		);
		//we need the judgement line to be centered and also rendered ontop of everything else
		judgementLine.renderOrder = 1;
		this.scene.add(judgementLine);

		const debugline = new THREE.Mesh(
			new THREE.PlaneGeometry(1000, 1),
			new THREE.MeshBasicMaterial({ color: 0x00ffff })
		);
		debugline.position.set(
			(this.xPos[1] + this.xPos[2]) / 2,
			this.yEndPoint + 2,
			10
		);
		//this.scene.add(debugline);

		const scaleWidth = this.visualKey.width / 75;
		const sideGeometry = new THREE.PlaneGeometry(scaleWidth * 510, 2500 / 2);
		/*the side of the track is a plane that is the height of the track.
		it does not have a specific purpose, but it looks nice*/
		let leftMaterial = new THREE.MeshBasicMaterial({
			map: loader.load('assets/trackLeft.png'),
			transparent: true
		});
		let rightMaterial = new THREE.MeshBasicMaterial({
			map: loader.load('assets/trackRight.png'),
			transparent: true
		});
		const trackLeft = new THREE.Mesh(sideGeometry, leftMaterial);
		const trackRight = new THREE.Mesh(sideGeometry, rightMaterial);

		trackLeft.position.set(
			-26 + this.xPos[0] - (scaleWidth * 510) / 2,
			-this.yEndPoint * 12.5,
			0
		);
		trackRight.position.set(
			26 + this.xPos[3] + (scaleWidth * 510) / 2,
			-this.yEndPoint * 12.5,
			0
		);
		trackLeft.renderOrder = trackRight.renderOrder = 1;
		this.scene.add(trackLeft, trackRight);
		//we need the track to be centered and also rendered ontop of everything else

		keysTemp.forEach((key, i) => {
			key.position.set(
				this.xPos[i],
				this.yEndPoint - this.visualKey.height / 2,
				3
			);
			this.keys[i] = new Key(this.inputKeys[i]);
			setInterval(() => {
				if (this.keys[i].pressed) {
					keysTemp[i].material = this.visualKey.pressedMaterials[i];
				} else {
					keysTemp[i].material = this.visualKey.materials[i];
				}
				//this will change the material of the key light depending on whether the key is pressed or not
			}, 1);
			this.scene.add(key, this.keyLights[i]);
		});
		this.keyLights.forEach((light, i) => {
			light.position.set(
				this.xPos[i],
				this.yEndPoint + this.visualKey.height * 3 - 5,
				6
			);
			setInterval(() => {
				if (this.keys[i].pressed) {
					this.keyLightMaterials[i].opacity = 0.5;
					//if the key is pressed, the light will be displayed
					//its opacity will decrease every frame, so when the key is released, the light will fade away
				}
			}, 1);
		});
	}

	setWindowResizer() {
		let width, height;
		window.addEventListener('resize', () => {
			width = window.innerWidth;
			height = window.innerHeight;
			this.renderer.setSize(width, height);
			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix();
			//this will resize the canvas when the window is resized
			//this will also resize the camera so that the scene is not distorted
		});
	}

	createNotes(timeZero: number) {
		console.log('creating notes');
		let loader = new THREE.TextureLoader();
		const height = (this.visualKey.height * 65) / 192;
		const noteMaterials: THREE.MeshBasicMaterial[] = [
			new THREE.MeshBasicMaterial({ map: loader.load('assets/note.png') }),
			new THREE.MeshBasicMaterial({ map: loader.load('assets/note2.png') }),
			new THREE.MeshBasicMaterial({ map: loader.load('assets/note2.png') }),
			new THREE.MeshBasicMaterial({ map: loader.load('assets/note.png') })
		];
		const sliderMaterials: THREE.MeshBasicMaterial[][] = [
			[
				new THREE.MeshBasicMaterial({
					map: loader.load('assets/sliderTop.png')
				}),
				new THREE.MeshBasicMaterial({
					map: loader.load('assets/sliderMid.png')
				}),
				new THREE.MeshBasicMaterial({
					map: loader.load('assets/sliderTail.png')
				})
			],
			[
				new THREE.MeshBasicMaterial({
					map: loader.load('assets/sliderTop2.png')
				}),
				new THREE.MeshBasicMaterial({
					map: loader.load('assets/sliderMid2.png')
				}),
				new THREE.MeshBasicMaterial({
					map: loader.load('assets/sliderTail2.png')
				})
			]
		];
		//we are defining the materials for notes and sliders here

		const velocity: number = this.visualKey.yVel;
		const timeTaken: number =
			(1 / (velocity / (this.yEndPoint - 10 - this.yStartPoint))) * 1000;
		//velocityocity of the note and time taken is how long it takes to go from top to bottom

		this.songNotes.forEach((note, i) => {
			/*we are creating a note for each note or sliderin the songNotes array.
			we need to fist determine if the note is a slider or not*/
			const checkOffset: number = Date.now() - timeZero;
			const timingOffset: number = Date.now() - timeZero + timeTaken;
			const sliderMaterialSelection: number = [1, 2].includes(note.column)
				? 1
				: 0;
			let hold: number = 0;
			if (note.isSlider) {
				hold = note.duration;
				const sliderGeometry: THREE.PlaneGeometry[] = [
					new THREE.PlaneGeometry(this.keyWidths[note.column], height),
					new THREE.PlaneGeometry(this.keyWidths[note.column], height)
				];
				const slider: THREE.Mesh[] = [
					new THREE.Mesh(
						sliderGeometry[0],
						sliderMaterials[sliderMaterialSelection][0]
					),
					new THREE.Mesh(
						sliderGeometry[1],
						sliderMaterials[sliderMaterialSelection][1]
					),
					new THREE.Mesh(
						sliderGeometry[1],
						sliderMaterials[sliderMaterialSelection][2]
					)
				]; //the slider is made up of 3 parts, the top, the middle and the bottom
				//the middle part will be stretched to the length of the slider
				this.trackNotes[i] = { note: note, mesh: slider };
			} else {
				const noteGeometry = new THREE.PlaneGeometry(
					this.keyWidths[note.column],
					height
				);
				const noteMesh = new THREE.Mesh(
					noteGeometry,
					noteMaterials[note.column % 4]
				);
				this.trackNotes[i] = { note: note, mesh: [noteMesh] };
			}
			setTimeout(() => {
				const topPos: number = this.yStartPoint;
				if (this.trackNotes[i].note.isSlider) {
					//if the note is a slider, we need to stretch the middle part of the slider
					//we also need to set the position of the slider
					const sliderDuration = Math.abs(
						this.trackNotes[i].note.duration / 1000
					);
					const sliderLength = Math.abs(velocity * sliderDuration);
					//the duration of the slider is in milliseconds, so we need to convert it to seconds

					const slider: THREE.Mesh[] = this.trackNotes[i]
						.mesh as THREE.Mesh[];
					const noteInfo: Note = this.trackNotes[i].note;

					slider[0].position.set(this.xPos[noteInfo.column], topPos, 2);

					const midGeometry: THREE.PlaneGeometry = new THREE.PlaneGeometry(
						this.keyWidths[noteInfo.column],
						sliderLength
					);

					slider[1] = new THREE.Mesh(
						midGeometry,
						sliderMaterials[sliderMaterialSelection][1]
					);

					slider[1].position.set(
						this.xPos[noteInfo.column],
						topPos + sliderLength / 2,
						2
					);

					slider[2].position.set(
						this.xPos[noteInfo.column],
						topPos + sliderLength,
						2
					);
					slider.map((slide) => (slide.renderOrder = 3));
					slider.map((slide) => this.scene.add(slide));
				} else {
					const noteMesh: THREE.Mesh = this.trackNotes[i]
						.mesh[0] as THREE.Mesh;
					noteMesh.position.set(this.xPos[note.column], topPos, 2);
					this.scene.add(noteMesh);
				}
			}, note.time - timingOffset);

			this.gameNotes.setCheckNote(note, note.time - checkOffset);
		});
	}
}

interface visualKey {
	yVel: number;
	//used to calculate how fast a note will fall down the track
	yEndPoint: number;
	//on the y axis, where the note will stop falling
	width: number;
	//the widths are not consistent, but we need to know the original width to calculate a ratio for sizing
	height: number;
	materials: THREE.MeshBasicMaterial[];
	pressedMaterials: THREE.MeshBasicMaterial[];
}
