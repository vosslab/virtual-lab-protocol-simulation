"""
Unit tests for svg_validate.validate() function.

Tests cover: valid SVGs, script injection, event handlers, missing viewBox,
files outside assets/, and empty files.

Fixtures are created dynamically under assets/test_fixtures/ to satisfy
the validator's requirement that SVGs be under assets/**/
"""

import os
import sys
import pytest

# Add tools directory to path for svg_validate import
TOOLS_DIR = os.path.join(os.path.dirname(__file__), "..", "tools")
sys.path.insert(0, TOOLS_DIR)
import svg_validate


#============================================


@pytest.fixture
def repo_root():
	"""Get repo root via git."""
	import subprocess

	result = subprocess.run(
		["git", "rev-parse", "--show-toplevel"],
		capture_output=True,
		text=True,
		timeout=5,
	)
	return result.stdout.strip()


@pytest.fixture
def test_assets_dir(repo_root, tmp_path):
	"""Create and return a temporary assets test directory."""
	# Create a temp directory structure under assets for test fixtures
	test_dir = os.path.join(repo_root, "assets", "test_fixtures")
	os.makedirs(test_dir, exist_ok=True)

	# Yield the path
	yield test_dir

	# Cleanup: remove test fixtures after test completes
	import shutil
	shutil.rmtree(test_dir, ignore_errors=True)


#============================================


def test_valid_svg_passes(test_assets_dir):
	"""A valid SVG with viewBox and no dangerous elements should pass."""
	svg_path = os.path.join(test_assets_dir, "valid.svg")
	svg_content = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" fill="blue"/></svg>'

	with open(svg_path, "w") as f:
		f.write(svg_content)

	report = svg_validate.validate(svg_path)
	assert report.ok is True
	assert report.error_message == ""


def test_svg_with_script_element_fails(test_assets_dir):
	"""An SVG with a <script> element should fail."""
	svg_path = os.path.join(test_assets_dir, "with_script.svg")
	svg_content = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><script>alert("bad")</script><rect/></svg>'

	with open(svg_path, "w") as f:
		f.write(svg_content)

	with pytest.raises(ValueError) as exc_info:
		svg_validate.validate(svg_path)
	assert "Found <script> element" in str(exc_info.value)


def test_svg_with_onclick_handler_fails(test_assets_dir):
	"""An SVG with an onclick= attribute should fail."""
	svg_path = os.path.join(test_assets_dir, "with_onclick.svg")
	svg_content = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect onclick="evil()"/></svg>'

	with open(svg_path, "w") as f:
		f.write(svg_content)

	with pytest.raises(ValueError) as exc_info:
		svg_validate.validate(svg_path)
	assert "Found inline event handler" in str(exc_info.value)
	assert "onclick" in str(exc_info.value)


def test_svg_without_viewbox_fails(test_assets_dir):
	"""An SVG without a viewBox attribute should fail."""
	svg_path = os.path.join(test_assets_dir, "no_viewbox.svg")
	svg_content = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'

	with open(svg_path, "w") as f:
		f.write(svg_content)

	with pytest.raises(ValueError) as exc_info:
		svg_validate.validate(svg_path)
	assert "Missing viewBox attribute" in str(exc_info.value)


def test_empty_file_fails(test_assets_dir):
	"""An empty or malformed file should fail."""
	svg_path = os.path.join(test_assets_dir, "empty.svg")

	with open(svg_path, "w") as f:
		f.write("")

	with pytest.raises(ValueError) as exc_info:
		svg_validate.validate(svg_path)
	assert "Malformed XML" in str(exc_info.value)


def test_file_not_found():
	"""A non-existent file should raise FileNotFoundError."""
	with pytest.raises(FileNotFoundError):
		svg_validate.validate("/nonexistent/path/to/file.svg")


def test_svg_outside_assets_fails():
	"""An SVG file outside assets/ directory should fail."""
	import tempfile

	with tempfile.TemporaryDirectory() as tmp_dir:
		temp_svg = os.path.join(tmp_dir, "outside_assets.svg")
		svg_content = '<?xml version="1.0"?><svg viewBox="0 0 100 100"><rect/></svg>'

		with open(temp_svg, "w") as f:
			f.write(svg_content)

		with pytest.raises(ValueError) as exc_info:
			svg_validate.validate(temp_svg)
		assert "outside assets/" in str(exc_info.value)
