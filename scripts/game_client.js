function game_client (ws) {
	this.ws = ws;
	var pid;

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

	var player_speed = 200;

	var player = {
		x: canvas.width/2,
		y: canvas.height/2,
		angle: 0
	}

	var colours = ['#2176ff', '#379e3a', '#efe639', '#f7411d', '#c130e5'];

	var last_cmd;
	var curr_cmd;

	var curr_snapshot;
	var prev_snapshot;

	//main function
	var last_time;
	var send_switch;
	var paused;
	function main() {
		if (paused) { return }

		var now = Date.now();
		var dt = (now - last_time) / 1000.0;

		window.print_msg('GC', 'GC==> framerate='+Math.floor(1/dt));

		send_switch += 1;
		if (send_switch % 2 == 0) {
			update(dt);
		}

		//render();

		last_time = now;
		get_anim_frame(main);
	}

	function update(dt) {
		if (window.input.is_down('ESCAPE')) {
			this.ws.close();
			return;
		}
		var commands = window.input.get_commands();

		var rect = canvas.getBoundingClientRect();
		cx = window.input.mouseX() - rect.left;
		cy = window.input.mouseY() - rect.top;

		var send_angle = false;
		var new_angle = Math.atan2((cx-player.x), (cy-player.y));
		if (new_angle != player.angle || new_angle == undefined) {
			send_angle = true;
		}

		if (player.x < 0) { player.x = 0 }
		if (player.x > 640) { player.x = 640 }
		if (player.y < 0) { player.y = 0}
		if (player.y > 480) { player.y = 480}
		
		if (this.ws && this.ws.readyState === this.ws.OPEN && (commands.length > 0 || new_angle)) {
			var move = {
				'moves':commands,
				'angle':new_angle,
			}
			last_cmd = curr_cmd;
			curr_cmd = move;
			this.ws.send(JSON.stringify([window.netm.MSG_MOVE, move]));
		}
	}

	function render() {
		//render background
		ctx.fillStyle = '#D9D9D9';
		ctx.fillRect(0,0,canvas.width, canvas.height);

		//render all players
		render_ship(pid, player, true);		
	}

	function render_ship(_pid, state, debug) {
		var debug_str = '[x: ' + Math.floor(state.x) + 
		', y: ' + Math.floor(state.y) + 
		', angle: ' + state.angle + 
		', mouseX: ' + window.input.mouseX() + 
		', mouseY: ' + window.input.mouseY() + ']';
		window.print_msg('render_ship', debug_str);

		px = 50 * Math.sin(state.angle);
		py = 50 * Math.cos(state.angle);

		ctx.save();
		ctx.translate(state.x, state.y);

		//aiming line
		/*ctx.beginPath();
		ctx.moveTo(0,0);
		ctx.lineTo(px, py);
		ctx.stroke();*/

		ctx.rotate(-state.angle);

		//player is a triangle
		ctx.fillStyle = colours[_pid-1];
		ctx.strokeStyle = colours[_pid-1];
		ctx.beginPath();
		ctx.moveTo(0,20);
		ctx.lineTo(14,-14);
		ctx.lineTo(-14,-14);
		ctx.lineTo(0,20);
		
		if (debug) {
			ctx.stroke();
		} else {
			ctx.fill();
		}

		ctx.restore();
	}

	this.init = function(_pid) {
		console.log('starting game client');
		paused = false;
		pid = _pid;
		last_time = Date.now();
		send_switch = 0;
		main();
	}
	this.state_update = function(msg) {
		window.print_msg('APP', 'Game Time: '+Number(msg[0]).toFixed(2));
		
		/*
		var s_tick = msg[0];
		//gamestate is a big list of all items to keep track of
		msg.slice(1).forEach(function(entry) {
			//if the item in the list is a player object..
			if (entry.hasOwnProperty('pid') && pid == entry.pid) {
				player.x = entry.state.x;
				player.y = entry.state.y;
				player.angle = entry.state.a;
			}
		});*/

		prev_snapshot = curr_snapshot;
		curr_snapshot = msg;

		render();
	}
	this.reset_screen = function() {
		paused = true;
		ctx.fillStyle = '#D9D9D9';
		ctx.fillRect(0,0,canvas.width, canvas.height);

		console.log(canvas.width, canvas.height);
	};

	this.reset_screen();	
}