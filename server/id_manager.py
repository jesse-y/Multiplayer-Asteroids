from collections import deque

class IdManager:
	def __init__(self, max_id=0):
		self.last_id = 0
		self.max_id = max_id
		self.ids = deque()

	def assign_id(self):
		result = None
		if not self.ids and self.last_id == self.max_id and self.max_id > 0:
			print('IdManager: max ids requested. last_id={}, max_id={}, ids={}'.format(self.last_id, self.max_id, self.ids))
			result = -1
			raise Exception
		elif self.ids:
			result = self.ids.popleft()
		else:
			self.last_id += 1
			result = self.last_id
		print('assigning id: {}. last_id={}, max_id={}, ids={}'.format(result, self.last_id, self.max_id, self.ids))
		return result

	def release_id(self, new_id):
		if new_id == -1:
			print('attempted to release invalid id! ({})'.format(new_id))
		print('releasing id: {}. last_id={}, max_id={}, ids={}'.format(new_id, self.last_id, self.max_id, self.ids))
		self.ids.append(new_id)