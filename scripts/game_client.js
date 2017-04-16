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

	//default object shapes
	var shapes = {
		player: [[0,20], [14,-14], [-14,-14]],
		bullet: [[2,2], [2,-2], [-2,-2], [-2,2]]
	}

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

		//render entities
		for (var key in frame.state.entities) {
			var entity = frame.state.entities[key];
			if (entity.type == 'player') {
				render_shape(entity, shapes.player, colours[entity.pid-1], false);
			}
			if (entity.type == 'bullet') {
				render_shape(entity, shapes.bullet, '#000000', true);
			}
		}
		
		//render predicted player
		var pp = frame.predicted_player;
		render_shape(pp, shapes.player, colours[pp.pid-1], true);

		//render events
		if (frame.state.hasOwnProperty('events')) {
			for (var key in frame.state.events) {
				render_points(frame.state.events[key], '#ff0000');
			}
		}
	}

	function render_shape(state, points, colour, fill) {
		ctx.save();

		ctx.strokeStyle = colour;
		ctx.fillStyle = colour;

		ctx.translate(state.x, state.y);
		ctx.rotate(-state.a);

		ctx.beginPath();
		ctx.moveTo(points[0][0], points[0][1]);
		points.slice(1).forEach(function (p) {
			ctx.lineTo(p[0], p[1]);
		});
		ctx.lineTo(points[0][0], points[0][1]);
		
		if (fill == true) {
			ctx.fill();
		} else {
			ctx.stroke();
		}

		ctx.restore();
	}

	function render_points(points, colour) {
		//render a set of absolute points
		ctx.save();

		ctx.strokeStyle = colour;
		ctx.beginPath();
		ctx.moveTo(points[0][0], points[0][1]);
		points.slice(1).forEach(function (p) {
			ctx.lineTo(p[0], p[1]);
		});
		ctx.lineTo(points[0][0], points[0][1]);
		ctx.stroke();

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

/*
//deprecated
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
	ctx.beginPath();
	ctx.moveTo(0,0);
	ctx.lineTo(px, py);
	ctx.stroke();

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
*/