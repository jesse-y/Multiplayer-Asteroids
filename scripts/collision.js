//title
var title = document.createElement('h1');
title.innerHTML = 'Collision Detection Demo';
document.body.appendChild(title);

//canvas initialisation
var canvas = document.createElement('canvas');
canvas.width = 640;
canvas.height = 480;
document.body.appendChild(canvas);

//instructions
var instructions01 = document.createElement('p');
instructions01.innerHTML = "\
This is a collision detection demo based on the Separating Axis Theorem. You move the square with wasd or  \
arrow keys, and can rotate it with J and L. \
Press escape to stop the simulation. At each step, each shape is projected against the other's edge normals. \
If there is at least one edge normal at which no overlap occurs, then these shapes have not collided.";
document.body.appendChild(instructions01);

var instructions02 = document.createElement('p');
instructions02.innerHTML = "\
In this demo, each shape's edge normal has been shown to demonstrate which plane each shape is projected against. \
There are four dots on each normal - each pair represents each shape's minimum and maximum projected value. When \
they intersect, they are considered to be overlapping. Overlapping points and colliding shapes are shown in red, \
whereas non-overlapping and non-colliding shapes are shown in blue.";
document.body.appendChild(instructions02);


//canvas context to allow drawing on the canvas
var ctx = canvas.getContext('2d');

//START-----------------------------------------------------------//
var box = new shape([200,320], [[35,35],[35,-35],[-35,-35],[-35,35]]);
var tri = new shape([320,240], [[0,50],[35,-35],[-35,-35]]);

//variable for visualisation purposes
var sum_angle = 0;

cycle();

function cycle() {
	ctx.fillStyle = '#dfdfdf';
	ctx.fillRect(0,0, canvas.width, canvas.height);

	//setting up input collection
	var cmds = window.input.get_commands();
	var cancel = false;
	var pos = box.centre();
	var angle = 0;
	cmds.forEach(function (cmd) {
		if (cmd == 'UP') pos.y -= 5;
		if (cmd == 'DOWN') pos.y += 5;
		if (cmd == 'LEFT') pos.x -= 5;
		if (cmd == 'RIGHT') pos.x += 5;
		if (cmd == 'ESCAPE') cancel = true;
	})
	if (window.input.is_down('J')) {angle -= 0.05; sum_angle -= 0.05;}
	if (window.input.is_down('L')) {angle += 0.05; sum_angle += 0.05;}
	box.move(pos.x, pos.y);
	box.rotate(angle);

	console.log('box position: ', pos.x, pos.y, 'box angle: ', sum_angle);

	var shape_colour;
	if (tri.colliding(box)) {
		shape_colour = '#ff0000';
	} else {
		shape_colour = '#0000ff';
	}

	box.draw(ctx, shape_colour);
	tri.draw(ctx, shape_colour);

	if (cancel) return;
	window.setTimeout(cycle, 1000/30);
}
//OBJECTS---------------------------------------------------------//
function shape(centre, shape_points) {
	var points = [];
	var centre = new vector2d(centre[0], centre[1]);

	shape_points.forEach(function (point) {
		points.push(new vector2d(point[0], point[1]));
	})

	this.points = function() {
		return points;
	}

	this.centre = function() {
		return centre;
	}

	this.move = function(x, y) {
		centre = new vector2d(x, y);
	}

	this.rotate = function(angle) {
		var new_points = [];
		var c = Math.cos(angle);
		var s = Math.sin(angle);
		points.forEach(function (p) {
			var xr = p.x * c - p.y * s;
			var yr = p.x * s + p.y * c;
			new_points.push(new vector2d(xr, yr));
		})
		points = new_points;
	}

	this.overlapping = function (other) {
		var norms_this = this.get_normals();
		var num_collisions = 0;

		//use this shape's norms to check collisions
		for (var i = 0; i < norms_this.length; i++) {
			var n = norms_this[i];
			var proj_this = new projection(this.true_points(), n);
			var proj_other = new projection(other.true_points(), n);

			var colour;
			if (proj_this.overlaps(proj_other)) {
				colour = '#ff0000';
				num_collisions += 1;
			} else {
				colour = '#0000ff';
			}

			var c = this.centre();

			draw_line([n.x*-1000+c.x, n.y*-1000+c.y],[n.x*1000+c.x,n.y*1000+c.y]);
			
			//proj.min/max is a magnitude value. To place it on the canvas we need to multiply
			//by the edge normal and add the offset of the shape we wish to snap to.

			draw_dot(proj_this.min*n.x+c.x, proj_this.min*n.y+c.y, colour);
			draw_dot(proj_this.max*n.x+c.x, proj_this.max*n.y+c.y, colour);

			draw_dot(proj_other.min*n.x+c.x, proj_other.min*n.y+c.y, colour);
			draw_dot(proj_other.max*n.x+c.x, proj_other.max*n.y+c.y, colour);
		}

		if (num_collisions < norms_this.length) {
			return false;
		} else {
			return true;
		}
	}

	this.colliding = function (other) {
		//usually you would return straight if the first shape comparison fails, but
		//all comparison checks are being done here for visualisation purposes
		var result = true;
		if (!this.overlapping(other)) {
			result = false;
		} 
		if (!other.overlapping(this)) {
			result = false;
		}
		return result;
	}

	this.true_points = function () {
		//return points based in world space
		var result = [];
		points.forEach(function (point) {
			result.push(new vector2d(point.x+centre.x, point.y+centre.y));
		})
		return result;
	}

	this.get_normals = function() {
		var edge_normals = [];
		for (var i = 0; i < points.length; i++) {
			var p1 = points[i];
			var p2;
			if (i+1 == points.length) p2 = points[0];
			else 					  p2 = points[i+1];

			var x1 = p1.x + centre.x;
			var x2 = p2.x + centre.x;

			var y1 = p1.y + centre.y;
			var y2 = p2.y + centre.y;

			var vector = new vector2d(x1-x2, y1-y2);
			var mag = Math.sqrt(vector.x**2 + vector.y**2);

			edge_normals.push(new vector2d(vector.y/mag, (vector.x/mag)*-1));
		}
		return edge_normals;
	}

	this.draw = function(ctx, colour) {
		if (colour == undefined) colour = '#000000';
		ctx.save();
		ctx.strokeStyle = colour;

		ctx.translate(centre.x, centre.y);

		ctx.beginPath();
		
		ctx.moveTo(points[0].x, points[0].y);
		points.forEach(function (p) {
			ctx.lineTo(p.x, p.y);
		});
		ctx.lineTo(points[0].x, points[0].y);

		ctx.stroke();
		ctx.restore();
	}
}

function projection(shape, axis) {
	this.min = axis.dot(shape[0]);
	this.max = this.min;

	for (var i = 0; i < shape.length; i++) {
		var v = axis.dot(shape[i]);
		if (v < this.min) this.min = v;
		if (v > this.max) this.max = v;
	}

	//this step not neccesary, but done for visualisation purposes.
	//it scales back the dots to fit in the screen.
	this.min /= 2;
	this.max /= 2;

	this.overlaps = function(other) {
		//overlap method using arithmetic. arithmetic overlap can allow for vectorisation
		var check1 = this.max -other.min;
		if (check1 < 0) {
			return false;
		}
		var check2 = other.max - this.min;
		if (check2 < 0) {
			return false;
		}
		return true;
		/*
		//overlap method using variable equality. cannot vectorise with this method
		if (this.max < other.min) {
			return false;
		}
		if (other.max < this.min) {
			return false;
		}
		return true;*/
	}
}

function vector2d(x, y) {
	this.x = x;
	this.y = y;

	this.dot = function (other) {
		return (this.x * other.x) + (this.y * other.y);
	}
}

function draw_dot(x, y, colour) {
	ctx.fillStyle = colour;
	ctx.fillRect(x-3, y-3, 6,6);
}

function draw_line(p1, p2, colour) {
	if (colour == undefined) colour = '#000000';
	if (p1.constructor === Array) p1 = new vector2d(p1[0], p1[1]);
	if (p2.constructor === Array) p2 = new vector2d(p2[0], p2[1]);
	
	ctx.save();
	ctx.strokeStyle = colour;

	ctx.beginPath();
	ctx.moveTo(p1.x, p1.y);
	ctx.lineTo(p2.x, p2.y);

	ctx.stroke();
	ctx.restore();
}

function hex_generator(centre, length, offset) {
	var unit_hex = [[1,0], [0.5, -Math.sqrt(3)/2], [-0.5, -Math.sqrt(3)/2], [-1,0], [-0.5,Math.sqrt(3)/2], [0.5, Math.sqrt(3)/2]];
	var hex_points = [];
	unit_hex.forEach(function (p) {
		//modify each hex point by some value between -offset/2 to offset/2.
		//eg: length = 40, offset = 16: x = p.x * 40 + (val between -8 and 8)
		var x = Math.floor(p[0] * length + Math.round(Math.random() * offset - (offset/2)));
		var y = Math.floor(p[1] * length + Math.round(Math.random() * offset - (offset/2)));
		hex_points.push([x, y]);
	})

	//rotate the hex by a random value between 0-Math.PI
	var hex = new shape(centre, hex_points);
	hex.rotate(Math.random() * Math.PI);

	return hex;
}