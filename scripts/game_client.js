function game_client() {
	var client_speed = 1/30;

	var ws;
	var gs = new game_state();
	var ih = new input_handler();

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

	var canvas = document.getElementById('viewport');
	canvas.width = 640;
	canvas.height = 480;
	var ctx = canvas.getContext('2d');

	//default ship colours
	var colours = ['#2176ff', '#379e3a', '#efe639', '#f7411d', '#c130e5'];

	var paused;
	var last_time;
	function main() {
		if (paused) return;

		var now = Date.now();
		var dt = (now - last_time) / 1000.0;

		//handle input
		var history = ih.pop_history();
		gs.extend_history(history);

		//update game state and then render it
		frame = gs.next_frame(dt);
		render(frame);

		last_time = now;
		get_anim_frame(main);
	}

	this.init = function(_ws, args) {
		console.log('starting game client');
		ws = _ws;

		paused = false;
		last_time = Date.now();

		var pid = args[0];
		var game_time = args[1];

		ih.init(ws, client_speed);
		gs.init(pid, game_time);
		main();
	}

	this.state_update = function(msg) {
		gs.state_update(msg);
	}

	function render(frame) {
		//render background
		ctx.fillStyle = '#D9D9D9';
		ctx.fillRect(0,0,canvas.width, canvas.height);

		if (frame == undefined) return;

		//render state players
		for (var key in frame.state.players) {
			var ship = frame.state.players[key];
			render_ship(ship.pid, ship.state, true);
		}
		//render predicted player
		var pp = frame.predicted_player;
		render_ship(pp.pid, pp, false);
	}

	function render_ship(_pid, state, debug) {
		var debug_str = 'server: [x: ' + Math.floor(state.x) + 
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

	this.reset_screen = function() {
		paused = true;
		ctx.fillStyle = '#D9D9D9';
		ctx.fillRect(0,0,canvas.width, canvas.height);

		ih.stop();

		console.log(canvas.width, canvas.height);
	};

	this.reset_screen();	
}