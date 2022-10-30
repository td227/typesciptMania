import * as THREE from 'three';
import Track from './track';

export default class Game {
	public track!: Track;
	constructor() {
		this.startGame();
	}
	startGame() {
		THREE.Cache.enabled = true;
		//this will enable the cache, which will allow us to load in the assets
		const width = window.innerWidth;
		const height = window.innerHeight;
		//this will get the width and height of the window
		const viewAngle = 75,
			aspect = width / height,
			near = 0.1,
			far = 5000;
		/*this will set the view angle, aspect ratio, near and far clipping planes
        for the camera, this will help us with culling to create the infinite
        tunnel illusion*/
		const camera = new THREE.PerspectiveCamera(viewAngle, aspect, near, far);
		camera.position.z = 150;

		const renderer = new THREE.WebGLRenderer();
		document.body.appendChild(renderer.domElement);
		//this will add the renderer to the webpage

		const scene = new THREE.Scene();
		renderer.setSize(width, height);
		this.track = new Track(renderer, camera, scene);
		this.track.init();
	}
}
