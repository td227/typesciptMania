import * as THREE from 'three';
export default class Key {
	private inputKey: string;
	//they key on the keyboard that will be used to press the key
	private lastPressed: number = 0;
	public pressed: boolean = false;
	public material: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial();
	//the time at which the key was last pressed, to determine accuracy on hold notes
	constructor(inputKey: string) {
		this.inputKey = inputKey;
		this.addEventListeners();
	}

	addEventListeners() {
		document.addEventListener('keydown', (e) => {
			this.onKeyDown(e);
		});
		document.addEventListener('keyup', (e) => {
			this.onKeyUp(e);
		});
		//this will add the event listeners to the webpage, and allow us to check for keypresses
	}

	onKeyDown(e: KeyboardEvent) {
		if (e.key === this.inputKey) {
			this.pressed = true;
			this.lastPressed = Date.now();
		}
	}

	onKeyUp(e: KeyboardEvent) {
		if (e.key === this.inputKey) {
			this.pressed = false;
		}
	}
}
