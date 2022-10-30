import key from './key';
export default class Note {
	constructor(
		column: number,
		velocityocity: number,
		time: number,
		isSlider: boolean = false,
		duration: number = 0
	) {
		//isSlider is a boolean that is true if the note is a slider, it is defaulted to false
		//duration is the length of the slider, it is defaulted to 0, since it is not used if the note is not a slider
		this.column = column;
		this.velocity = velocityocity;
		this.time = time;
		this.isSlider = isSlider;
		this.duration = duration;
		this.keys = [];
		this.dropTime = this.time - 1000 / this.velocity;
	}

	public column: number = 0;
	public velocity: number = 0;
	public time: number = 0;
	public isSlider: boolean;
	public duration: number;

	public keys: key[];
	public x: number = this.column;
	public y: number = 110;

	public dropTime = 0;
}
