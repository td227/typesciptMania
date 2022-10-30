import * as THREE from 'three';
import Key from './key';
import Note from './note';
export default class GameNotes {
	private keys: Key[];
	public score: number = 0;
	public combo: number = 0;
	public maxCombo: number = 0;
	public accuracy: number = 0;
	public perfect: number = 0;
	public good: number = 0;
	public bad: number = 0;
	public miss: number = 0;
	public health: number = 100;
	public maxHealth: number = 100;
	public healthRegen: number = 0;
	public healthRegenRate: number = 0;

	constructor(keys: Key[]) {
		this.keys = keys;
	}

	setCheckNote(note: Note, time: number) {
		setTimeout(() => {
			this.checkNote(note);
		}, time);
	}

	checkNote(note: Note) {
		if (this.keys[note.column].pressed) {
			if (note.isSlider) {
				//TODO: Slider logic
			}
			this.score += 100;
			this.combo++;
		} else {
			this.combo = 0;
		}
	}
}
