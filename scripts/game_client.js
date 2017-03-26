function game_client (ws) {
	this.ws = ws;
	this.pid = -1;

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

	var player_speed = 200;

	var player = {
		x: canvas.width/2,
		y: canvas.height/2,
		angle: 0
	}

	//main function
	var lastTime;
	var paused;
	var fm = new FrameManager();
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
			commands.push('UP');
			player.y -= player_speed * dt;
		}
		if (window.input.isDown('DOWN')) {
			commands.push('DOWN');
			player.y += player_speed * dt;
		}
		if (window.input.isDown('LEFT')) {
			commands.push('LEFT');
			player.x -= player_speed * dt;
		}
		if (window.input.isDown('RIGHT')) {
			commands.push('RIGHT');
			player.x += player_speed * dt;
		}
		if (window.input.isDown('ESCAPE')) {
			this.ws.close();
		}
		var rect = canvas.getBoundingClientRect();
		cx = window.input.mouseX() - rect.left;
		cy = window.input.mouseY() - rect.top;

		var dir = Math.atan2((cx-player.x), (cy-player.y)); 
		var new_angle = false;
		if (dir != player.angle || dir == 'NaN') {
			player.angle = dir;
			new_angle = true;
		}

		if (player.x < 0) { player.x = 0 }
		if (player.x > 640) { player.x = 640 }
		if (player.y < 0) { player.y = 0}
		if (player.y > 480) { player.y = 480}

		
		if (this.ws && this.ws.readyState === this.ws.OPEN) {
			var c_state = {
				'x':Math.floor(player.x),
				'y':Math.floor(player.y),
				//'a':player.angle
			}
			fm.advance(c_state);
			var move = {
				'moves':commands,
				'angle':player.angle,
				'c_tick':fm.get_tick()
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
		main();
	}
	this.state_update = function(msg) {
		var s_tick = msg[0];
		//gamestate is a big list of all items to keep track of
		msg.slice(1).forEach(function(entry) {
			//if the item in the list is a player object..
			if (entry.hasOwnProperty('pid')) {
				var success = fm.reconcile(entry.c_tick, entry.state);
				if (success != undefined) {
					if (success) {
						console.log('successful reconciliation: '+success);
					} else {
						console.log('failed reconciliation: '+success);	
					}
				}
				player.x = entry.state.x;
				player.y = entry.state.y;
				//player.angle = entry.state.a;

				window.print_msg('network', 'unacked inputs:'+fm.unacked());
			}
		});
	}
	this.reset_screen = function() {
		paused = true;
		fm.reset();
		ctx.fillStyle = '#D9D9D9';
		ctx.fillRect(0,0,canvas.width, canvas.height);

		console.log(canvas.width, canvas.height);
	};

	this.reset_screen();	
}