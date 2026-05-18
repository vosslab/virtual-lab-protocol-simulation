"""YAML loading utility."""

from pathlib import Path
import yaml


def load_yaml(path: Path) -> dict:
	"""
	Load YAML file with pyyaml. Returns parsed YAML as dict, or {} if file is
	empty. Raises RuntimeError on YAML parse error; other I/O errors propagate
	naturally.
	"""
	with open(path, 'r') as f:
		try:
			data = yaml.safe_load(f)
		except yaml.YAMLError as e:
			raise RuntimeError(f"Failed to parse {path}: {e}")
	return data if isinstance(data, dict) else {}
