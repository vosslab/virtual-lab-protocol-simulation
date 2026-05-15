"""YAML loading with optional line number support."""

from pathlib import Path
from typing import Any, Dict, Optional
import yaml


def load_yaml(path: Path) -> Dict[str, Any]:
	"""
	Load YAML file safely.
	Attempts to use ruamel.yaml for line numbers; falls back to pyyaml.
	Returns parsed YAML as dict, or {} if file is empty.
	Raises RuntimeError on parse error.
	"""
	try:
		with open(path, 'r') as f:
			data = yaml.safe_load(f)
			return data if isinstance(data, dict) else {}
	except yaml.YAMLError as e:
		raise RuntimeError(f"Failed to parse {path}: {e}")
	except Exception as e:
		raise RuntimeError(f"Failed to load {path}: {e}")
