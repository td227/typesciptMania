import { time } from 'console';
import { start } from 'repl';
import * as THREE from 'three';
import { AudioAnalyser } from 'three';
import Key from './key';
import Note from './note';
import Track from './track';
export default class Audio {
	private renderer: THREE.WebGLRenderer;
	private audioContext = new AudioContext();
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;

	private listener = new THREE.AudioListener();
	private sound = new THREE.Audio(this.listener);
	private audioLoader = new THREE.AudioLoader();

	private track: Track;
	private playing: boolean = false;

	private timeZero: number;
	private loader = new THREE.FileLoader();

	private audio = 'songs/1391490 S3RL feat Nikolett - Silicon XX/audio.mp3';
	private song =
		'songs/1391490 S3RL feat Nikolett - Silicon XX/S3RL feat. Nikolett - Silicon XX (NikoSek) [XX-1.0].osu';
	private _song: string[] = [];

	constructor(
		renderer: THREE.WebGLRenderer,
		scene: THREE.Scene,
		camera: THREE.PerspectiveCamera,
		track: Track,
		timeZero: number
	) {
		this.renderer = renderer;
		this.scene = scene;
		this.camera = camera;
		this.track = track;
		this.timeZero = timeZero;
	}

	async parseFile(velocity: number, keys: Key[]) {
		await this.loader.loadAsync(this.song).then((data) => {
			this._song = data.toString().split('\n');
		});
		const _song = this._song;
		//we will need to make sure that the song is loaded before we parse it
		//_song = _song.toString().split('\n');

		let notes: Note[] = [];
		let startLine: number = 0;

		for (let i = 0; i < _song.length; i++) {
			if (_song[i].includes('[HitObjects]')) {
				startLine = i + 1;
				break;
			}
		}
		//we need to find the line where the notes start

		for (let i = startLine; i < _song.length; i++) {
			let line = _song[i].split(',');
			let column = getColumn(line[0]);
			let time = parseInt(line[2]);
			let isSlider = false;
			let duration = 0;
			if (line[3] === '128') {
				isSlider = true;
				duration = time - parseInt(line[5]);
			}
			notes.push(new Note(column, velocity, time, isSlider, duration));
			//we need to create a new note for each line
			//we need to parse the line to get the column, time, and duration
		}
		const sound = this.audioLoader.load(this.audio, (buffer) => {
			this.sound.setBuffer(buffer);
			this.sound.setLoop(true);
			this.sound.setVolume(0.1);
			let audioOffset = this.track.fallTime * 1000;

			this.sound.play(this.track.fallTime);
			let timeZero = Date.now() + this.track.fallTime * 1000;
			this.track.timeZero = timeZero;
			console.log('playing song');
			this.track.createNotes(timeZero);
			//we need to time the audio to the notes
			//to do this we need to get the time that the first note will fall
		});

		console.log('loaded song');

		return notes;
	}
}

function getColumn(x: string): number {
	switch (x) {
		case '64':
			return 0;
		case '192':
			return 1;
		case '320':
			return 2;
		case '448':
			return 3;
		default:
			return 0;
	}
}
