function game_client (ws) {
	this.ws = ws;

	var requestAnimFrame = (function(){
    return window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(callback){
            window.setTimeout(callback, 1000 / 60);
        };
	})();

	//create and instantiate canvas object
	var canvas = document.getElementById('viewport')
	canvas.width = 640;
	canvas.height = 480;
	var ctx = canvas.getContext('2d');

	var playerSpeed = 200;

	var player = {
		x: canvas.width/2,
		y: canvas.height/2,
		angle: 0
	}

	//main function
	var lastTime;
	var paused;
	function main() {
		if (paused) { return }

		var now = Date.now();
		var dt = (now - lastTime) / 1000.0;

		update(dt);
		render();

		lastTime = now;
		requestAnimFrame(main);
	}

	function update(dt) {
		var commands = [];
		if (window.input.isDown('UP')) {
			//player.y -= playerSpeed * dt;
			//player.x += playerSpeed * dt * Math.sin(player.angle);
			//player.y += playerSpeed * dt * Math.cos(player.angle);
			commands = commands.concat('UP');
		}
		if (window.input.isDown('DOWN')) {
			//player.y += playerSpeed * dt;
			//player.x -= playerSpeed * dt * Math.sin(player.angle);
			//player.y -= playerSpeed * dt * Math.cos(player.angle);
			commands = commands.concat('DOWN');
		}
		if (window.input.isDown('LEFT')) {
			//player.x -= playerSpeed * dt;
			//player.angle += playerRotSpeed * dt;
			commands = commands.concat('LEFT');
		}
		if (window.input.isDown('RIGHT')) {
			//player.x += playerSpeed * dt;
			//player.angle -= playerRotSpeed * dt;
			commands = commands.concat('RIGHT');
		}
		if (window.input.isDown('ESCAPE')) {
			this.ws.close();
		}
		var rect = canvas.getBoundingClientRect();
		cx = window.input.mouseX() - rect.left;
		cy = window.input.mouseY() - rect.top;

		player.angle = Math.atan2((cx-player.x), (cy-player.y));

		if (player.x < 0) { player.x = 0 }
		if (player.x > 640) { player.x = 640 }
		if (player.y < 0) { player.y = 0}
		if (player.y > 480) { player.y = 480}

		if (this.ws && this.ws.readyState === this.ws.OPEN && commands.length > 0) {
			//console.log(commands);
			this.ws.send(JSON.stringify([window.netm.MSG_MOVE].concat(commands)));
		}
	}

	function render() {
		document.getElementById('debug').innerHTML = '[x: ' + Math.floor(player.x) + 
		', y: ' + Math.floor(player.y) + 
		', angle: ' + player.angle + 
		', mouseX: ' + window.input.mouseX() + 
		', mouseY: ' + window.input.mouseY() + ']';
		
		ctx.fillStyle = '#D9D9D9';
		ctx.fillRect(0,0,canvas.width, canvas.height);

		px = 40 * Math.sin(player.angle);
		py = 40 * Math.cos(player.angle);

		ctx.save();
		ctx.translate(player.x, player.y);

		//aiming line
		ctx.beginPath();
		ctx.moveTo(0,0);
		ctx.lineTo(px, py);
		ctx.stroke();

		ctx.rotate(-player.angle);

		//player is a triangle
		ctx.fillStyle = '#2176ff';
		ctx.beginPath();
		ctx.moveTo(0,20);
		ctx.lineTo(14,-14);
		ctx.lineTo(-14,-14);
		ctx.lineTo(0,20);
		ctx.fill();

		ctx.restore();
	}

	this.init = function() {
		console.log('starting game client');
		paused = false;
		main();
	}
	this.state_update = function(msg) {
		console.log('new game state');
		msg.forEach(function(entry) {
			//console.log(entry);
			player.x = entry.x
			player.y = entry.y
		});
	}
	this.reset_screen = function() {
		paused = true;
		ctx.fillStyle = '#D9D9D9';
		ctx.fillRect(0,0,canvas.width, canvas.height);

		console.log(canvas.width, canvas.height);
	};

	this.reset_screen();	
}