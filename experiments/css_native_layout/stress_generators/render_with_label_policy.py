#!/usr/bin/env python3
"""
NEW3 Batch 2 Workstream F - Label policy renderer.

Re-emits an existing stress/gold scene HTML with an additional override
stylesheet appended after the canonical bench.css link. The override
contains only label-related rules; layout structure is never modified.

Inputs:
- A directory of already-rendered scene HTML (canonical: experiments/
  css_native_layout/stress_scenes/rendered/).
- A label-policy CSS file (one of experiments/css_native_layout/showcase/
  label_policies/label_policy_<N>.css).
- A list of scene basenames to copy (one per line, .html stripped).

Output:
- One HTML file per scene under the given output directory. The output HTML
  is byte-identical to the source except for an extra <link> in <head> and
  rewritten relative paths so the override CSS resolves correctly from the
  new location.

Why a wrapper instead of editing render_stress_to_html.py:
- The canonical renderer is content-shared with Batch 1 evidence and must
  stay byte-stable. This wrapper consumes its output as a snapshot.
"""

# Standard Library
import os
import sys
import argparse


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))


def rewrite_stylesheet_paths(html, source_dir, output_dir):
	"""Rewrite relative ../ paths in the HTML so they resolve from output_dir.

	The canonical rendered HTML lives at
	experiments/css_native_layout/stress_scenes/rendered/<scene>.html and
	references ../../styles/bench.css and ../../../../assets/equipment/...
	We compute how many extra ../ steps the output directory needs.
	"""
	# We use absolute file:// URLs to avoid path arithmetic errors.
	abs_styles = os.path.abspath(os.path.join(source_dir, '..', '..', 'styles'))
	abs_assets = os.path.abspath(os.path.join(REPO_ROOT, 'assets'))

	# Replace ../../styles/ with absolute file path
	new_html = html.replace('../../styles/', f'file://{abs_styles}/')
	new_html = new_html.replace('../../../../assets/', f'file://{abs_assets}/')
	return new_html


def inject_override_link(html, policy_css_abs_path):
	"""Add a <link> to the override CSS after the canonical bench.css link."""
	override_link = (
		f'<link rel="stylesheet" href="file://{policy_css_abs_path}">'
	)
	# Insert immediately before </head>
	marker = '</head>'
	if marker not in html:
		raise ValueError('source HTML has no </head> marker')
	new_html = html.replace(marker, override_link + '\n' + marker, 1)
	return new_html


def render_scene(source_html_path, output_html_path, policy_css_abs_path):
	"""Read source_html_path, inject override link, write to output_html_path."""
	with open(source_html_path, 'r', encoding='utf-8') as fh:
		html = fh.read()
	source_dir = os.path.dirname(source_html_path)
	output_dir = os.path.dirname(output_html_path)
	html = rewrite_stylesheet_paths(html, source_dir, output_dir)
	html = inject_override_link(html, policy_css_abs_path)
	os.makedirs(output_dir, exist_ok=True)
	with open(output_html_path, 'w', encoding='utf-8') as fh:
		fh.write(html)


def parse_args():
	parser = argparse.ArgumentParser(description=__doc__)
	parser.add_argument('-s', '--source-dir', dest='source_dir', required=True,
		help='Directory holding the already-rendered canonical HTML scenes')
	parser.add_argument('-o', '--output-dir', dest='output_dir', required=True,
		help='Output directory for re-emitted HTML with override CSS link')
	parser.add_argument('-p', '--policy-css', dest='policy_css', required=True,
		help='Absolute path to the label-policy override CSS file')
	parser.add_argument('-n', '--scenes', dest='scene_list', required=True,
		help='Path to a text file with one scene basename (no .html) per line')
	args = parser.parse_args()
	return args


def main():
	args = parse_args()
	policy_css_abs = os.path.abspath(args.policy_css)
	if not os.path.isfile(policy_css_abs):
		raise FileNotFoundError(f'policy CSS missing: {policy_css_abs}')
	with open(args.scene_list, 'r', encoding='utf-8') as fh:
		scenes = [line.strip() for line in fh if line.strip() and not line.startswith('#')]
	count = 0
	for scene in scenes:
		source = os.path.join(args.source_dir, f'{scene}.html')
		output = os.path.join(args.output_dir, f'{scene}.html')
		if not os.path.isfile(source):
			print(f'  SKIP missing source: {source}', file=sys.stderr)
			continue
		render_scene(source, output, policy_css_abs)
		count += 1
	print(f'Rendered {count} scenes -> {args.output_dir}')


if __name__ == '__main__':
	main()
