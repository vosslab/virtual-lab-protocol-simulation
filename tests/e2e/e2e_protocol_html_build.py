"""
tests/test_protocol_html_build.py

Pytest assertions for pipeline/build_protocol_html.py.

Checks:
  - Running build_protocol_html.py --all emits exactly N HTML files (N == mini-protocols)
  - No HTML file is larger than a reasonable limit (sanity check: no monolith)
  - dist/ and test-results/ have no tracked files (gitignored)
"""

import os
import subprocess

#============================================

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

#============================================

def get_mini_protocol_count():
	"""
	Count mini-protocols by scanning content/protocols/ for protocol.yaml files.

	Returns the count of mini-protocols found.
	"""
	content_root = os.path.join(REPO_ROOT, 'content', 'protocols')
	count = 0

	if not os.path.isdir(content_root):
		return 0

	for root, dirs, files in os.walk(content_root):
		if 'protocol.yaml' in files:
			yaml_path = os.path.join(root, 'protocol.yaml')
			try:
				with open(yaml_path, 'r') as f:
					content = f.read()
					if 'protocol_type: mini_protocol' in content or "protocol_type: 'mini_protocol'" in content:
						count += 1
			except Exception:
				pass

	return count

#============================================

class TestProtocolHtmlBuild:
	"""
	Test suite for build_protocol_html.py.
	"""

	def test_build_all_generates_correct_count(self):
		"""
		Verify that build_protocol_html.py --all generates one HTML per mini-protocol.
		"""
		# Count mini-protocols
		expected_count = get_mini_protocol_count()
		assert expected_count > 0, "No mini-protocols found in content/protocols/"

		# Run the builder
		result = subprocess.run(
			['python3', 'pipeline/build_protocol_html.py', '--all'],
			cwd=REPO_ROOT,
			capture_output=True,
			text=True
		)

		assert result.returncode == 0, f"Builder failed: {result.stderr}"

		# Count generated HTML files in dist/
		dist_dir = os.path.join(REPO_ROOT, 'dist')
		assert os.path.isdir(dist_dir), "dist/ directory not found"

		html_files = [f for f in os.listdir(dist_dir) if f.endswith('.html')]
		# Exclude the smoke test file if it exists
		html_files = [f for f in html_files if not f.startswith('_')]

		assert len(html_files) == expected_count, (
			f"Expected {expected_count} HTML files, got {len(html_files)}: {html_files}"
		)

	def test_no_monolithic_html(self):
		"""
		Verify that no single HTML file is suspiciously large (sanity check for monolith).

		A reasonable per-protocol shell should be < 5 KB. Much larger suggests inlining
		the entire bundle instead of referencing the shared dist/runtime.bundle.js.
		"""
		# Run the builder first
		subprocess.run(
			['python3', 'pipeline/build_protocol_html.py', '--all'],
			cwd=REPO_ROOT,
			capture_output=True,
			text=True
		)

		dist_dir = os.path.join(REPO_ROOT, 'dist')
		max_allowed_bytes = 5120

		for filename in os.listdir(dist_dir):
			if not filename.endswith('.html') or filename.startswith('_'):
				continue

			filepath = os.path.join(dist_dir, filename)
			file_size = os.path.getsize(filepath)

			assert file_size <= max_allowed_bytes, (
				f"{filename} is {file_size} bytes, exceeds sanity limit of {max_allowed_bytes} "
				"(possible monolithic HTML; should reference shared bundle)"
			)

	def test_dist_and_test_results_not_tracked(self):
		"""
		Verify that dist/ and test-results/ are not tracked in git.

		Both directories are gitignored and should have no tracked files.
		"""
		result = subprocess.run(
			['git', 'status', '--porcelain', 'dist/', 'test-results/'],
			cwd=REPO_ROOT,
			capture_output=True,
			text=True
		)

		assert result.returncode == 0, f"git status failed: {result.stderr}"
		assert result.stdout.strip() == '', (
			f"dist/ or test-results/ have tracked files:\n{result.stdout}"
		)

	def test_builder_single_protocol(self):
		"""
		Verify that build_protocol_html.py --protocol <name> works for a single protocol.
		"""
		# Pick the first mini-protocol
		import yaml

		mini_protocols = []
		content_root = os.path.join(REPO_ROOT, 'content', 'protocols')

		for root, dirs, files in os.walk(content_root):
			if 'protocol.yaml' in files:
				yaml_path = os.path.join(root, 'protocol.yaml')
				try:
					with open(yaml_path, 'r') as f:
						data = yaml.safe_load(f)
						if data and data.get('protocol_type') == 'mini_protocol':
							protocol_name = data.get('protocol_name')
							if protocol_name:
								mini_protocols.append(protocol_name)
				except Exception:
					pass

		assert len(mini_protocols) > 0, "No mini-protocols found"
		test_protocol = mini_protocols[0]

		# Run the builder for this one protocol
		result = subprocess.run(
			['python3', 'pipeline/build_protocol_html.py', '--protocol', test_protocol],
			cwd=REPO_ROOT,
			capture_output=True,
			text=True
		)

		assert result.returncode == 0, f"Builder failed for {test_protocol}: {result.stderr}"

		# Verify the HTML file was created
		html_path = os.path.join(REPO_ROOT, 'dist', f'{test_protocol}.html')
		assert os.path.isfile(html_path), f"Expected HTML file not found: {html_path}"

	def test_html_shell_references_bundle(self):
		"""
		Verify that generated HTML shells reference dist/runtime.bundle.js (not inline the bundle).
		"""
		# Run the builder
		subprocess.run(
			['python3', 'pipeline/build_protocol_html.py', '--all'],
			cwd=REPO_ROOT,
			capture_output=True,
			text=True
		)

		dist_dir = os.path.join(REPO_ROOT, 'dist')
		html_files = [f for f in os.listdir(dist_dir) if f.endswith('.html') and not f.startswith('_')]

		assert len(html_files) > 0, "No HTML files generated"

		# Pick one HTML file and check it references the bundle
		test_html = os.path.join(dist_dir, html_files[0])
		with open(test_html, 'r') as f:
			content = f.read()

		# Should reference dist/runtime.bundle.js or ./runtime.bundle.js
		assert 'runtime.bundle.js' in content, (
			f"{html_files[0]} does not reference the shared runtime bundle"
		)

		# Should NOT contain inline code that looks like the entire bundled runtime
		# (simple heuristic: the bundle is large, shells are small)
		assert content.count('export') < 10, (
			f"{html_files[0]} appears to inline the entire bundle (too many 'export' keywords)"
		)
