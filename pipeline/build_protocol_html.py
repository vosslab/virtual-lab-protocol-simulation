#!/usr/bin/env python3

"""
pipeline/build_protocol_html.py

Generates one HTML file per mini-protocol under dist/.

Each shell:
  - Mounts a <div id="runtime-root"> container
  - Loads dist/runtime.bundle.js (shared)
  - Calls mountRuntime with per-protocol runtimeData

Usage:
  source source_me.sh && python3 pipeline/build_protocol_html.py --all
  source source_me.sh && python3 pipeline/build_protocol_html.py --protocol <name>

Exit code: 0 on success, nonzero on failure.
Output: dist/<protocol_name>.html for each mini-protocol.
"""

import os
import re
import sys
import argparse
import json
import yaml

#============================================

def get_repo_root():
	"""
	Resolve the repository root using git.
	"""
	result = os.popen('git rev-parse --show-toplevel 2>/dev/null').read().strip()
	if result:
		return result
	raise RuntimeError('Could not determine repo root; not in a git repo')

#============================================

def scan_mini_protocols(repo_root):
	"""
	Scan content/protocols for all mini_protocol YAML files.

	Returns a dict: {protocol_name -> path/to/protocol.yaml}
	"""
	protocols = {}
	content_root = os.path.join(repo_root, 'content', 'protocols')

	if not os.path.isdir(content_root):
		return protocols

	# Walk all subdirectories looking for protocol.yaml files
	for root, dirs, files in os.walk(content_root):
		if 'protocol.yaml' in files:
			yaml_path = os.path.join(root, 'protocol.yaml')
			try:
				with open(yaml_path, 'r') as f:
					data = yaml.safe_load(f)
					if data and data.get('protocol_type') == 'mini_protocol':
						protocol_name = data.get('protocol_name')
						if protocol_name:
							protocols[protocol_name] = yaml_path
			except Exception:
				pass

	return protocols

#============================================

def load_protocol_from_generated(protocol_name, repo_root):
	"""
	Load a single protocol from the generated protocol_data.ts file.

	Returns the protocol config dict, or None if not found.
	"""
	protocol_data_path = os.path.join(repo_root, 'generated', 'protocol_data.ts')
	if not os.path.exists(protocol_data_path):
		return None

	try:
		with open(protocol_data_path, 'r') as f:
			content = f.read()

		# This is a very basic approach: exec the TypeScript to extract protocol data
		# In production, this would use a proper TypeScript parser
		# For now, we're just embedding the protocol config as JSON in the HTML

		# Look for the protocol entry in the PROTOCOL_CATALOG
		# Expected pattern: `protocol_name: { ... },`
		pattern = rf'{protocol_name}:\s*\{{([^}}]*(?:{{[^}}]*}}[^}}]*)*)\}}'
		match = re.search(pattern, content, re.DOTALL)
		if not match:
			return None

		# This is imperfect but we return None and fall back to name-only
		return None  # TODO: implement proper extraction
	except Exception:
		return None


def generate_html_shell(protocol_name, protocol_data, repo_root):
	"""
	Generate an HTML shell for a single mini-protocol.

	Returns the HTML string.
	"""
	# Prepare the minimal runtime data JSON: only the protocol name.
	# The runtime bundle will self-load via loadAndMountByProtocolName.
	runtime_data = {
		'protocol_name': protocol_name,
	}
	runtime_data_json = json.dumps(runtime_data, indent=2)

	# Build the HTML shell
	html_parts = []
	html_parts.append('<!DOCTYPE html>')
	html_parts.append('<html lang="en">')
	html_parts.append('<head>')
	html_parts.append('\t<meta charset="utf-8">')
	html_parts.append('\t<meta name="viewport" content="width=device-width, initial-scale=1.0">')
	html_parts.append(f'\t<title>{protocol_name}</title>')
	html_parts.append('\t<style>')
	html_parts.append('\t\t* {')
	html_parts.append('\t\t\tbox-sizing: border-box;')
	html_parts.append('\t\t\tmargin: 0;')
	html_parts.append('\t\t\tpadding: 0;')
	html_parts.append('\t\t}')
	html_parts.append('\t\tbody {')
	html_parts.append('\t\t\tfont-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;')
	html_parts.append('\t\t\tbackground-color: #f5f5f5;')
	html_parts.append('\t\t}')
	html_parts.append('\t\t#runtime-root {')
	html_parts.append('\t\t\twidth: 100%;')
	html_parts.append('\t\t\theight: 100vh;')
	html_parts.append('\t\t\tbackground-color: white;')
	html_parts.append('\t\t}')
	html_parts.append('\t</style>')
	html_parts.append('</head>')
	html_parts.append('<body>')
	html_parts.append('\t<div id="runtime-root"></div>')
	html_parts.append('')
	html_parts.append('\t<!-- Per-protocol runtime data (inlined). -->')
	html_parts.append('\t<script type="application/json" id="protocol-runtime-data">')
	html_parts.append(runtime_data_json)
	html_parts.append('\t</script>')
	html_parts.append('')
	html_parts.append('\t<!-- Shared runtime bundle (classic script, IIFE format). -->')
	html_parts.append('\t<script src="./runtime.bundle.js"></script>')
	html_parts.append('')
	html_parts.append('\t<!-- Load and mount the protocol. -->')
	html_parts.append('\t<script>')
	html_parts.append('\t\t(function() {')
	html_parts.append('\t\t\ttry {')
	html_parts.append('\t\t\t\t// Parse the inlined protocol data to get the protocol name.')
	html_parts.append('\t\t\t\tconst dataScript = document.getElementById("protocol-runtime-data");')
	html_parts.append('\t\t\t\tif (!dataScript) {')
	html_parts.append('\t\t\t\t\tthrow new Error("protocol-runtime-data script tag not found");')
	html_parts.append('\t\t\t\t}')
	html_parts.append('\t\t\t\tconst runtimeData = JSON.parse(dataScript.textContent);')
	html_parts.append('\t\t\t\tconst protocolName = runtimeData.protocol_name;')
	html_parts.append('')
	html_parts.append('\t\t\t\t// Get the runtime root element.')
	html_parts.append('\t\t\t\tconst runtimeRoot = document.getElementById("runtime-root");')
	html_parts.append('\t\t\t\tif (!runtimeRoot) {')
	html_parts.append('\t\t\t\t\tthrow new Error("runtime-root element not found");')
	html_parts.append('\t\t\t\t}')
	html_parts.append('')
	html_parts.append('\t\t\t\t// Load and mount the runtime by protocol name.')
	html_parts.append('\t\t\t\tSceneRuntime.loadAndMountByProtocolName(runtimeRoot, protocolName);')
	html_parts.append('\t\t\t} catch (error) {')
	html_parts.append('\t\t\t\tconsole.error("Failed to mount runtime:", error);')
	html_parts.append('\t\t\t\tconst errorDiv = document.createElement("div");')
	html_parts.append('\t\t\t\terrorDiv.style.cssText = ' +
		'"position: fixed; top: 10px; left: 10px; right: 10px; background-color: #ffcccc; " + ' +
		'"border: 3px solid #cc0000; padding: 20px; font-family: monospace; " + ' +
		'"font-size: 12px; color: #cc0000; white-space: pre-wrap; word-break: break-word; z-index: 10000;";')
	html_parts.append('\t\t\t\terrorDiv.textContent = "RUNTIME INITIALIZATION ERROR\\n\\n" + ' +
		'(error instanceof Error ? error.message : String(error));')
	html_parts.append('\t\t\t\tdocument.body.insertBefore(errorDiv, document.body.firstChild);')
	html_parts.append('\t\t\t\tthrow error;')
	html_parts.append('\t\t\t}')
	html_parts.append('\t\t})();')
	html_parts.append('\t</script>')
	html_parts.append('</body>')
	html_parts.append('</html>')

	return '\n'.join(html_parts)

#============================================

def main():
	"""
	Main entry point.
	"""
	parser = argparse.ArgumentParser(
		description='Generate one HTML file per mini-protocol under dist/',
	)
	parser.add_argument(
		'--all',
		action='store_true',
		help='Generate HTML for all mini-protocols',
	)
	parser.add_argument(
		'--protocol',
		type=str,
		help='Generate HTML for a single protocol by name',
	)

	args = parser.parse_args()

	# Validate arguments
	if not args.all and not args.protocol:
		parser.print_help()
		sys.exit(2)

	if args.all and args.protocol:
		print('ERROR: cannot specify both --all and --protocol', file=sys.stderr)
		sys.exit(1)

	try:
		repo_root = get_repo_root()
	except RuntimeError as e:
		print(f'ERROR: {e}', file=sys.stderr)
		sys.exit(1)

	# Scan for mini-protocols in content/protocols/
	mini_protocols = scan_mini_protocols(repo_root)

	if not mini_protocols:
		print('ERROR: no mini_protocols found in content/protocols/', file=sys.stderr)
		sys.exit(1)

	# Determine which protocols to build
	if args.all:
		protocols_to_build = mini_protocols
	else:
		protocol_name = args.protocol
		if protocol_name not in mini_protocols:
			print(f'ERROR: protocol "{protocol_name}" not found or not a mini_protocol', file=sys.stderr)
			sys.exit(1)
		protocols_to_build = {protocol_name: mini_protocols[protocol_name]}

	# Ensure dist/ directory exists
	dist_dir = os.path.join(repo_root, 'dist')
	try:
		os.makedirs(dist_dir, exist_ok=True)
	except Exception as e:
		print(f'ERROR: failed to create dist/ directory: {e}', file=sys.stderr)
		sys.exit(1)

	# Generate HTML files
	generated_count = 0
	for protocol_name, yaml_path in sorted(protocols_to_build.items()):
		try:
			# Pass the protocol name; the actual protocol config will be retrieved
			# from the runtime after the browser loads it.
			protocol_data = {'protocol_name': protocol_name}
			html_content = generate_html_shell(protocol_name, protocol_data, repo_root)
			output_path = os.path.join(dist_dir, f'{protocol_name}.html')

			with open(output_path, 'w') as f:
				f.write(html_content)

			generated_count += 1
			print(f'Generated: {output_path}')
		except Exception as e:
			print(f'ERROR: failed to generate HTML for "{protocol_name}": {e}', file=sys.stderr)
			sys.exit(1)

	# Report success
	print(f'SUCCESS: Generated {generated_count} HTML files')
	sys.exit(0)

#============================================

if __name__ == '__main__':
	main()
