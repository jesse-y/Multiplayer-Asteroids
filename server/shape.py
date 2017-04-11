import numpy as np
from math import sin, cos
from datatypes import Position

class Shape:

	def __init__(self, state, points):
		self.centre, self.angle = state
		self.points = np.array(points)

	def world_points(self):
		#add world centre coordinates to each point and rotate by its angle
		cosa, sina = cos(self.angle), sin(self.angle)
		rotation_matrix = np.array([[cosa, -sina],[sina, cosa]])
		return (self.points.dot(rotation_matrix) + [self.centre.x, self.centre.y])

	def edge_normals(self):
		#grab the x axis of the points ndarray
		x1 = self.points[:,0]
		#shift the array forward, wrapping the last value back to the front
		x1r = np.roll(x1, -1)

		#do the same for the y axis
		y1 = self.points[:,1]
		y1r = np.roll(y1, -1)

		#create an edge vector by subtracting the shifted x and y arrays from their originals
		#zip together the values to form a 2d array that resemble the original points array
		#to get the normal of the edge vector we transform [x, y] -> [y, -x]
		return np.hstack([ (y1-y1r)[:,None], -(x1-x1r)[:,None] ])

	def project(self, shape_norms):
		#to get the projection, we need to dot product each shape point against
		#each normal vector of the target. we need to transpose the normal vector to
		#get desired behaviour.
		proj = self.world_points().dot(shape_norms.transpose())
		#the first axis contains the result of each dot product PER EDGE NORMAL.
		#we need to extract the minimum and maximum for each edge normal
		mins = np.amin(proj, 0)
		maxs = np.amax(proj, 0)
		#zip together the results into a 2d array of the same form as the points array
		return np.hstack([ mins[:,None], maxs[:,None] ])

	def overlaps(self, other):
		#project both this shape and the other shape against this shape's edge normals
		norms = self.edge_normals()

		self_proj = self.project(norms)
		other_proj = other.project(norms)
		
		#use np.where to find indexes of values that are less than 0
		#the length of np.where tells us how many GAPS there are
		#there are 2 cases to check:
		#self.max - other.min
		check1 = self_proj[:,1] - other_proj[:,0]
		#other.max - self.min
		check2 = other_proj[:,1] - self_proj[:,0]

		#np.where returns a tuple of arrays, one for each dimension. our result is a 1d array, so check
		#the size of the first element of each np.where statement.
		overlap_count = np.where(check1 < 0)[0].size + np.where(check2 < 0)[0].size
		return overlap_count

	def colliding(self, other):
		#overlaps returns how many gaps there are. anything above zero means the shapes don't collide.
		if self.overlaps(other) != 0:
			return False
		#if using the first shape's normals fail then we need to try again with the second shape's normals.
		elif other.overlaps(self) != 0:
			return False
		else:
			return True


if __name__ == '__main__':
	print('testing Shape() object ...')

	box = Shape([Position(200,320),0], [[35,35], [35,-35], [-35,-35], [-35,35]])
	tri = Shape([Position(320,240),0], [[0,50], [35,-35], [-35,-35]])

	print('box=[{},{}], tri=[{},{}], colliding={}=>False'.format(200,320,320,240,tri.colliding(box)))

	box = Shape([Position(275,250),0], [[35,35], [35,-35], [-35,-35], [-35,35]])
	tri = Shape([Position(320,240),0], [[0,50], [35,-35], [-35,-35]])

	print('box=[{},{}], tri=[{},{}], colliding={}=>True'.format(275,250,320,240,tri.colliding(box)))

	box = Shape([Position(360,205),0], [[35,35], [35,-35], [-35,-35], [-35,35]])
	tri = Shape([Position(320,240),0], [[0,50], [35,-35], [-35,-35]])

	print('box=[{},{}], tri=[{},{}], colliding={}=>True'.format(360,205,320,240,tri.colliding(box)))

	box = Shape([Position(490,95),0], [[35,35], [35,-35], [-35,-35], [-35,35]])
	tri = Shape([Position(320,240),0], [[0,50], [35,-35], [-35,-35]])

	print('box=[{},{}], tri=[{},{}], colliding={}=>False'.format(490,95,320,240,tri.colliding(box)))

	box = Shape([Position(245,215),0], [[35,35], [35,-35], [-35,-35], [-35,35]])
	tri = Shape([Position(320,240),0], [[0,50], [35,-35], [-35,-35]])

	print('box=[{},{}], tri=[{},{}], colliding={}=>False'.format(245,215,320,240,tri.colliding(box)))

	box = Shape([Position(245,215),-0.7], [[35,35], [35,-35], [-35,-35], [-35,35]])
	tri = Shape([Position(320,240),0], [[0,50], [35,-35], [-35,-35]])

	print('box=[{},{}]+angle=-0.7**, tri=[{},{}] colliding={}=>True'.format(245,215,320,240,tri.colliding(box)))