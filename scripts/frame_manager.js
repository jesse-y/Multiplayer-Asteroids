function FrameManager() {
	var tick = 0;
	var frames = [];

	this.advance = function(state) {
		frames.push(state);
		tick += 1;
		console.log('-->new state: tick='+tick);
		console.log(state);
		console.log('');
	}

	this.reconcile = function(s_tick, s_state) {
		if (s_tick > frames.length) { return }

		var behind = tick - s_tick;
		var index = frames.length - behind - 1;
		var c_state = frames[index];

		var success;
		if (c_state == s_state) {
			success = true;
		} else {
			success = false;
		}
		console.log('-->compare: c_tick='+tick+', s_tick='+s_tick);
		console.log(c_state);
		console.log(s_state);
		console.log('');

		frames = frames.slice(frames.length - behind);
		return success;
	}

	this.unacked = function() {
		return frames.length;
	}

	this.reset = function () {
		tick = 0;
		frames = [];
	}
}