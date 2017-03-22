from collections import deque

class IdManager:
	def __init__(self, max_id=0):
		self.last_id = 0
		self.max_id = max_id
		self.ids = deque()

	def assign_id(self):
		if self.last_id == self.max_id and self.max_id > 0:
			err_str = 'IdManager: max ids requested. max_id=({})'.format(self.max_id)
			raise IdManagerException(err_str)
		if self.ids:
			return self.ids.popleft()
		else:
			self.last_id += 1
			return self.last_id

	def release_id(self, new_id):
		self.ids.append(new_id)

class IdManagerException(Exception):
	pass