function world(world_specs) {
	var framerate = 1000 / 60;
	
	//document object to apply our render to
	var canvas = document.getElementById('viewport');
	canvas.width = world_specs.x;
	canvas.height = world_specs.y;

	//context of the document element
	var ctx = canvas.getContext('2d');

	var player_speed = 200;

	//variables for cycle
	var frame_start;
	var interpolating;

	//world snapshots
	var from;
	var to;

	this.iterate = function(dt) {
		frame_start += dt;
		if (frame_start >= to.timestamp) {
			_render(to);
		}
	}

	//internal function to render a single snapshot
	function _render(snapshot) {
		//render the background
		ctx.fillStyle = '#D9D9D9';
		ctx.fillRect(0,0,canvas.width, canvas.height);

		//apply the render function for each object
		snapshot.game_objects.forEach(function(entry) {
			console.log(entry);
			entry.render(ctx);
		});
	}

	//public function to assign new snapshots to render
	this.render = function(_from, _to, _interpolate) {
		paused = false;
		//this is the first render of this world
		if (from == undefined) { _render(_from) }

		from = _from;
		to = _to;

		if (_interpolate) { interpolating = true }

		frame_start = from.timestamp;
	}

	this.exists = function() {
		if (from == undefined || to == undefined) {
			return false
		} else {
			return true
		}
	}

	this.reset = function() {
		ctx.fillStyle = '#D9D9D9';
		ctx.fillRect(0,0,canvas.width, canvas.height);
		console.log('reset screen, world coords:', canvas.width, canvas.height);
	}
	this.reset();
}

//-------------------------------------------------------------------//
//--GAME ENTITIES----------------------------------------------------//
//-------------------------------------------------------------------//

function Ship(_x, _y, _a, _colour) {
	this.x = _x;
	this.y = _y;
	this.angle = _a;
	this.colour = _colour;

	this.render = function (ctx) {
		ctx.save();

		//translate object to correct position
		ctx.translate(this.x, this.y);

		px = 50 * Math.sin(this.angle);
		py = 50 * Math.cos(this.angle);

		//aiming line
		ctx.beginPath();
		ctx.moveTo(0,0);
		ctx.lineTo(px, py);
		ctx.stroke();

		ctx.rotate(-this.angle);

		//the ship is a triangle
		ctx.fillStyle = this.colour;
		ctx.beginPath();
		ctx.moveTo(0,20);
		ctx.lineTo(14,-14);
		ctx.lineTo(-14,-14);
		ctx.lineTo(0,20);
		ctx.fill();

		ctx.restore();
	}
}