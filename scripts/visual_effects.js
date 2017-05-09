function visual_effects(_ctx) {
	var ctx = _ctx;
	var vfx_obj = this;

	this.particle = function(start, finish, duration, colours) {
		var elapsed = 0;
		var position = {
			x:start[0],
			y:start[1]
		};
		var colour = colours[0];
		var done = false;

		this.update = function(dt) {
			elapsed += dt;
			if (elapsed >= duration || done) {
				done = true;
				return
			}

			var time_frac = elapsed / duration;
			position.x = start[0] + tween(start[0], finish[0], time_frac);
			position.y = start[1] + tween(start[1], finish[1], time_frac);
		}

		this.render = function() {
			ctx.save();

			ctx.fillStyle = colour;
			ctx.fillRect(position.x, position.y, 1, 1);

			ctx.restore();
		}

		this.complete = function() {
			return done;
		}

		function tween(start, finish, fraction) {
			return Math.round((finish - start) * fraction);
		}
	}

	this.emitter = function(position, radius, num_particles, duration, colours) {
		var elapsed = 0;
		var particles = [];
		var done = false;

		for (var i = 0; i < num_particles; i++) {
			var dist = Math.abs((Math.random() - Math.random()) * radius);
			var angle = Math.random() * Math.PI * 2;

			var x = position[0] + dist * Math.sin(angle);
			var y = position[1] + dist * Math.cos(angle);

			particles.push(new vfx_obj.particle(position, [x, y], duration, colours));
		}

		this.update = function(dt) {
			var finished = true;
			particles.forEach(function (p) {
				if (!p.complete()) {
					finished = false;
					p.update(dt);
				}
			})
			if (finished) {
				done = true;
			}
		}

		this.render = function() {
			particles.forEach(function (p) {
				if (!p.complete()) {
					p.render();
				}
			})
		}

		this.complete = function() {
			return done;
		}

		function gaussian_rand() {
			var samples = 6;
			var result = 0;
			for (var i = 0; i < samples; i++) {
				result += Math.random();
			}
			return result / samples;
		}
	}
}