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
	var client_speed = 1/30;

	var player = {
		x: canvas.width/2,
		y: canvas.height/2,
		angle: 0
	}

	var colours = ['#2176ff', '#379e3a', '#efe639', '#f7411d', '#c130e5'];

	var registered_cmds = [];

	var game_time;

	var interp_frame;

	var last_time;
	var send_switch;
	var paused;

	this.init = function(args) {
		console.log('starting game client');
		paused = false;
		pid = args[0];
		last_time = Date.now();
		game_time = args[1];
		send_switch = 0;
		main();
	}

	function main() {
		if (paused) return;

		var now = Date.now();
		var dt = (now - last_time) / 1000.0;

		window.print_msg('GC', 'GC==> framerate='+Math.floor(1/dt));

		send_switch += 1;
		if (send_switch % 2 == 0) update(dt);

		interpolate(dt);

		last_time = now;
		game_time += dt;
		get_anim_frame(main);
	}

	function update(dt) {
		if (!document.hasFocus()) return
			
		if (window.input.is_down('ESCAPE')) {
			this.ws.close();
			return;
		}
		var commands = window.input.get_commands();

		var rect = canvas.getBoundingClientRect();
		cx = window.input.mouseX() - rect.left;
		cy = window.input.mouseY() - rect.top;

		//var new_angle = Math.atan2((cx-player.x), (cy-player.y))

		if (player.x < 0) { player.x = 0 }
		if (player.x > 640) { player.x = 640 }
		if (player.y < 0) { player.y = 0}
		if (player.y > 480) { player.y = 480}
		
		if (this.ws && this.ws.readyState === this.ws.OPEN) {
			var move = {
				'moves':commands,
				'mouseX':cx,
				'mouseY':cy
			}
			registered_cmds.push({
				'timestamp': game_time,
				'move': move
			})
			//make a prediction
			commands.forEach(function (move) {
				apply_move(player, move);
			});
			this.ws.send(JSON.stringify([window.netm.MSG_MOVE, move]));
		}
	}

	function interpolate(dt) {
		//render background
		ctx.fillStyle = '#D9D9D9';
		ctx.fillRect(0,0,canvas.width, canvas.height);

		//return if something went wrong
		if (from == undefined || to == undefined) return
		//if this is the first frame we have to render
		if (interp_frame == undefined) {
			//instantiate local predicted player
			var server_player = to.state.players[pid];
			player = clone(server_player);
			render(to);
		} else {
			//get interpolated frame timestamp fraction
			interp_frame.timestamp += dt;
			var frac_t = ((interp_frame.timestamp - from.timestamp) / (to.timestamp - from.timestamp));
			
			//interpolate the position of each player and render it
			for (var key in interp_frame.state.players) {
				if (to.state.players.hasOwnProperty(key)) {
					player = interp_frame.state.players[key].state;
					fp = from.state.players[key].state;
					tp = to.state.players[key].state;

					//tween translation
					player.x = fp.x + ((tp.x-fp.x) * frac_t);
					player.y = fp.y + ((tp.y-fp.y) * frac_t);

					//tween rotation
					var adiff = (tp.a-fp.a);
					if (adiff < -Math.PI) adiff += 2*Math.PI;
					if (adiff > Math.PI) adiff -= 2*Math.PI;

					player.a = fp.a + (adiff * frac_t);

					render_ship(key, player, true);
					if (key == pid) {
						//render out prediction of current player
						render_ship(pid, player, false);
					}
				}
			}
			//render(interp_frame);
		}
	}

	function render(ss) {
		//render background
		ctx.fillStyle = '#D9D9D9';
		ctx.fillRect(0,0,canvas.width, canvas.height);

		//render all players
		for (var key in ss.state.players) {
			var player = ss.state.players[key];
			render_ship(player.pid, player.state, true);
		}
	}

	function render_ship(_pid, state, debug) {
		var debug_str = '[x: ' + Math.floor(state.x) + 
		', y: ' + Math.floor(state.y) + 
		', angle: ' + state.a + 
		', mouseX: ' + window.input.mouseX() + 
		', mouseY: ' + window.input.mouseY() + ']';
		window.print_msg('render_ship', debug_str);

		px = 50 * Math.sin(state.a);
		py = 50 * Math.cos(state.a);

		ctx.save();
		ctx.translate(state.x, state.y);

		//aiming line
		/*ctx.beginPath();
		ctx.moveTo(0,0);
		ctx.lineTo(px, py);
		ctx.stroke();*/

		ctx.rotate(-state.a);

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

	var from;
	var to;
	this.state_update = function(msg) {
		window.print_msg('APP', 'Game Time: '+Number(msg.timestamp).toFixed(2));
		game_time = Number(msg.timestamp);

		//check predicted distance is correct
		var server_player = clone(msg.state.players[pid].state);
		if (server_player != undefined) {
			registered_cmds.forEach(function iterate(cmd) {
				cmd.move.moves.forEach(function (move) {
					apply_move(server_player, move);
				});
			});
			registered_cmds = [];
		} else {
			console.log('failed to find player');
		}
		//compare iteration result
		console.log('x['+server_player.x+','+player.x+']<->y['+server_player.y+','+player.y+']');

		from = clone(to);
		to = msg;
		interp_frame = clone(from);
	}

	function clone (obj) {
		if (obj != undefined) {
			return JSON.parse(JSON.stringify(obj))
		}
	}

	function apply_move(obj, move) {
		var new_val = Math.floor(player_speed * client_speed);
		if (move == 'UP') obj.y -= new_val;
		if (move == 'DOWN') obj.y += new_val;
		if (move == 'LEFT') obj.x -= new_val;
		if (move == 'RIGHT') obj.x += new_val;
	}

	this.reset_screen = function() {
		paused = true;
		ctx.fillStyle = '#D9D9D9';
		ctx.fillRect(0,0,canvas.width, canvas.height);

		console.log(canvas.width, canvas.height);
	};

	this.reset_screen();	
}