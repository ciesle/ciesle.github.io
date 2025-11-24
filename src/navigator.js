const pageTitles = ["プロフィール", "技術記事", "大学記事"];
const urls = ["profile/index.html", "tech/index.html", "univ/index.html"];
const contentNum = pageTitles.length;
const colors = ["#e74c3c", "#e67e22", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6", "#6fa8ff"];
let size = [500, 500];
const fontSize = 50;
const speed = 50;
const ellipseSize = 0.3;

class Dest {
	constructor(text, url, width) {
		this.text = text;
		this.url = url;
		this.area = [width, fontSize * (1 + ellipseSize)];
		// 初期の移動方向が水平・垂直に近くなり過ぎないよう、角度をランダムに選ぶ
		// cos/sin の絶対値が小さい（= 軸に近い）場合は再選択する
		let angle;
		const minAxisGap = 0.25; // cos/sin の絶対値がこの値未満だと軸に近いとみなす
		do {
			angle = Math.random() * Math.PI * 2;
		} while (Math.abs(Math.cos(angle)) < minAxisGap || Math.abs(Math.sin(angle)) < minAxisGap);
		this.velocity = [Math.cos(angle) * speed, Math.sin(angle) * speed];
		this.pos = [Math.random() * size[0], Math.random() * size[1]];
		this.color = colors[Math.floor(Math.random() * colors.length)];
	}
	move(delta) {
		for (let i = 0; i < 2; i++) {
			this.pos[i] += delta / 1000 * this.velocity[i];
			if (this.pos[i] < i || this.pos[i] + this.area[i] > size[i]) {
				this.velocity[i] *= -1;
				this.pos[i] = Math.max(Math.min(this.pos[i], size[i] - this.area[i]), 0);
				this.color = colors[Math.floor(Math.random() * colors.length)];
			}
		}
	}
	inside(point) {
		return [...Array(2)].every((_, i) => { return this.pos[i] <= point[i] && point[i] < this.pos[i] + this.area[i] });
	}
	draw(ctx) {
		ctx.save();
		ctx.translate(this.pos[0], this.pos[1]);
		ctx.fillStyle = this.color;
		ctx.beginPath();
		ctx.ellipse(this.area[0] / 2, fontSize * (1 + ellipseSize / 2), this.area[0] / 2, fontSize * ellipseSize / 2, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillText(this.text, 0, 0);
		ctx.restore();
	}
}

let items;
let navigator, ctx;
let canvasContainer;
let time;

window.onload = function () {
	canvasContainer = document.getElementsByClassName("canvas-container")[0];

	items = new Array(contentNum);
	navigator = document.getElementById("navigator");
	ctx = navigator.getContext("2d");
	ctx.globalCompositeOperation = "destination-over";
	ctx.font = "bold " + fontSize + "px 'Segoe Print'";
	ctx.textAlign = "left";
	ctx.textBaseline = "top";

	for (let i = 0; i < contentNum; i++) {
		items[i] = new Dest(pageTitles[i], "../" + urls[i], ctx.measureText(pageTitles[i]).width);
	}
	navigator.addEventListener("click", e => {
		const rect = navigator.getBoundingClientRect();
		const point = [e.clientX - rect.left, e.clientY - rect.top];
		let count = 0;
		let next;
		items.forEach(item => {
			if (item.inside(point)) {
				count++;
				next = item.url;
			}
		});
		console.log(items[0].pos);
		console.log(items[0].area);
		console.log(point);
		if (count === 1) window.location.href = next;
	});
	time = new Date();
	window.requestAnimationFrame(draw);
}

function draw() {
	navigator.width = navigator.clientWidth;
	size[0] = navigator.width;
	ctx = navigator.getContext("2d");
	ctx.globalCompositeOperation = "lighter";
	ctx.font = "bold " + fontSize + "px 'Segoe Print'";
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.clearRect(0, 0, ...size);
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, size[0], size[1]);

	let delta = (new Date()).getTime() - time.getTime();
	time = new Date();
	items.forEach(item => {
		item.move(delta);
		item.draw(ctx);
	});
	window.requestAnimationFrame(draw);
}