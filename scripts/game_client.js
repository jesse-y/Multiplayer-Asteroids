function game_client (ws) {
	this.ws = ws;
	this.pid = -1;

	var get_anim_frame = (function(){
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

	var client_speed = 1 / 30;
	var player_speed = 200;

	var player = {
		x: canvas.width/2,
		y: canvas.height/2,
		angle: 0
	}

	//main function
	var last_time;
	var last_sent;
	var paused;
	function main() {
		if (paused) { return }

		var now = Date.now();
		var dt = (now - last_time) / 1000.0;

		window.print_msg('GC', 'GC==> framerate='+Math.floor(1/dt));

		last_sent += dt;
		if (last_sent >= client_speed) {
			window.print_msg('GC2', 'GC==> cmd rate='+Math.floor(1/last_sent));
			update(dt);
			last_sent = 0.;
		}

		render();

		last_time = now;
		get_anim_frame(main);
	}

	function update(dt) {
		var commands = window.input.get_commands();

		var rect = canvas.getBoundingClientRect();
		cx = window.input.mouseX() - rect.left;
		cy = window.input.mouseY() - rect.top;

		var send_angle = false;
		var new_angle = Math.atan2((cx-player.x), (cy-player.y));
		if (new_angle != player.angle || new_angle == undefined) {
			send_angle = true;
			//player.angle = new_angle;
		}

		if (player.x < 0) { player.x = 0 }
		if (player.x > 640) { player.x = 640 }
		if (player.y < 0) { player.y = 0}
		if (player.y > 480) { player.y = 480}
		
		if (this.ws && this.ws.readyState === this.ws.OPEN && (commands.length > 0 || new_angle)) {
			var c_state = {
				'x':Math.floor(player.x),
				'y':Math.floor(player.y),
				'a':player.angle
			}
			var move = {
				'moves':commands,
				'angle':new_angle,
				'c_tick':Date.now()
			}
			this.ws.send(JSON.stringify([window.netm.MSG_MOVE, move]));
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
		last_time = Date.now();
		last_sent = 0.;
		main();
	}
	this.state_update = function(msg) {
		window.print_msg('APP', 'Game Time: '+Number(msg[0]).toFixed(2));
		var s_tick = msg[0];
		//gamestate is a big list of all items to keep track of
		msg.slice(1).forEach(function(entry) {
			//if the item in the list is a player object..
			if (entry.hasOwnProperty('pid')) {
				player.x = entry.state.x;
				player.y = entry.state.y;
				player.angle = entry.state.a;
			}
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