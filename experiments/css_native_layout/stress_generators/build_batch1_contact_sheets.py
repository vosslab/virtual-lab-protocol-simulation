#!/usr/bin/env python3
"""
Build NEW3 Batch 1 contact sheets from existing per-scene PNGs.

Reads precheck + scorecard JSONs, builds standalone HTML contact sheets
(no external CSS/JS) under contact_sheets/. Each sheet has a CSS grid of
cards with thumbnail + scene metadata.
"""

# Standard Library
import os
import json
import argparse

#============================================
# Path constants
#============================================

REPO_REL_PRECHECK_DIR = 'experiments/css_native_layout/stress_results/precheck_batch1'
REPO_REL_SCORECARD_DIR = 'experiments/css_native_layout/stress_results/scorecard_batch1'
REPO_REL_PNG_DIR = 'test-results/new3_stress_batch1/audit'
REPO_REL_OUT_DIR = 'experiments/css_native_layout/stress_results/contact_sheets'

# Relative path from contact_sheets/ to the audit PNGs:
# contact_sheets -> stress_results -> css_native_layout -> experiments -> REPO_ROOT
PNG_REL_FROM_SHEET = '../../../../test-results/new3_stress_batch1/audit'

GOLD_PREFIX = 'gold_'
SCENES_PER_PAGE = 50

#============================================
# Scene class inference (for stress_* scenes)
#============================================

STRESS_CLASS_PATTERNS = [
	'composition',
	'dense_clutter',
	'extreme_aspect_scene',
	'instrument_heavy',
	'long_label_scene',
	'many_bottles_scene',
	'many_small_tools_scene',
	'tall_glassware_scene',
	'template',
	'zoom_detail',
]


def infer_scene_class_from_name(scene_name: str, fallback: str) -> str:
	# Gold scenes use whatever the scorecard says (often 'composition')
	if scene_name.startswith(GOLD_PREFIX):
		return fallback if fallback else 'composition'
	# Stress scenes follow stress_<class>_NNN naming
	stripped = scene_name[len('stress_'):] if scene_name.startswith('stress_') else scene_name
	for klass in STRESS_CLASS_PATTERNS:
		if stripped.startswith(klass):
			return klass
	return fallback if fallback else 'unknown'


#============================================
# JSON loading
#============================================

def parse_args():
	parser = argparse.ArgumentParser(description='Build NEW3 Batch 1 contact sheets')
	parser.add_argument('-r', '--repo-root', dest='repo_root', default=None,
		help='Repo root (defaults to git rev-parse --show-toplevel)')
	parser.add_argument('-v', '--verbose', dest='verbose', action='store_true',
		help='Verbose output')
	args = parser.parse_args()
	return args


def get_repo_root(explicit: str) -> str:
	if explicit:
		return explicit
	# Use cwd-aware git lookup
	import subprocess
	result = subprocess.run(
		['git', 'rev-parse', '--show-toplevel'],
		check=True, capture_output=True, text=True
	)
	root = result.stdout.strip()
	return root


def load_scenes(repo_root: str, verbose: bool) -> list:
	precheck_dir = os.path.join(repo_root, REPO_REL_PRECHECK_DIR)
	scorecard_dir = os.path.join(repo_root, REPO_REL_SCORECARD_DIR)
	png_dir = os.path.join(repo_root, REPO_REL_PNG_DIR)
	precheck_files = sorted(os.listdir(precheck_dir))
	scenes = []
	for fname in precheck_files:
		if not fname.endswith('.json'):
			continue
		scene_name = fname[:-len('.json')]
		precheck_path = os.path.join(precheck_dir, fname)
		scorecard_path = os.path.join(scorecard_dir, fname)
		png_path = os.path.join(png_dir, scene_name + '.png')
		with open(precheck_path, 'r') as f:
			precheck = json.load(f)
		with open(scorecard_path, 'r') as f:
			scorecard = json.load(f)
		record = build_record(scene_name, precheck, scorecard, png_path)
		scenes.append(record)
		if verbose:
			print('loaded ' + scene_name)
	return scenes


def build_record(scene_name: str, precheck: dict, scorecard: dict, png_path: str) -> dict:
	checks = precheck['checks']
	artwork = checks.get('artwork_integrity', {})
	# Hard fail counts come from precheck (severity == HARD_FAIL)
	clipped = artwork.get('clipped_by_parent', [])
	aspect = artwork.get('aspect_distorted', [])
	clipped_hf = [item for item in clipped if item.get('severity') == 'HARD_FAIL']
	aspect_hf = [item for item in aspect if item.get('severity') == 'HARD_FAIL']
	clipped_count = len(clipped_hf)
	aspect_hf_count = len(aspect_hf)
	hard_fail_count = clipped_count + aspect_hf_count
	# Object count: prefer artwork_integrity.natural_vs_rendered length
	nvr = artwork.get('natural_vs_rendered', [])
	object_count = len(nvr)
	# Score and class from scorecard
	score = scorecard.get('total_layout_score', 0)
	scene_class_raw = scorecard.get('scene_class', '')
	scene_class = infer_scene_class_from_name(scene_name, scene_class_raw)
	# Top failure: pick the failure type with highest count, fall back to scorecard recommendation
	top_failure = derive_top_failure(clipped_count, aspect_hf_count, scorecard)
	# One-line caption built ahead of time
	caption = build_caption(scene_name, hard_fail_count, score, top_failure)
	record = {
		'scene_name': scene_name,
		'scene_class': scene_class,
		'object_count': object_count,
		'hard_fail_count': hard_fail_count,
		'clipped_by_parent': clipped_count,
		'aspect_distorted_HF': aspect_hf_count,
		'score': score,
		'top_failure': top_failure,
		'caption': caption,
		'png_exists': os.path.exists(png_path),
		'is_gold': scene_name.startswith(GOLD_PREFIX),
	}
	return record


def derive_top_failure(clipped_count: int, aspect_hf_count: int, scorecard: dict) -> str:
	# If one failure type dominates, name it; otherwise fall back to scorecard recommendation
	if clipped_count == 0 and aspect_hf_count == 0:
		rec = scorecard.get('recommended_adjustment', '')
		if rec:
			return rec
		return 'no_hard_fail'
	if clipped_count >= aspect_hf_count:
		return 'clipped_by_parent'
	return 'aspect_distorted_HF'


def build_caption(scene_name: str, hard_fail_count: int, score: int, top_failure: str) -> str:
	caption = scene_name + ' - score=' + str(score)
	caption += ', hard_fails=' + str(hard_fail_count)
	caption += ', top=' + top_failure
	return caption


#============================================
# HTML rendering
#============================================

CSS_BLOCK = '''
<style>
* { box-sizing: border-box; }
body {
	margin: 0;
	padding: 24px;
	font-family: -apple-system, system-ui, sans-serif;
	background: #f3f4f6;
	color: #1f2937;
}
h1 { margin: 0 0 8px 0; color: #1e3a8a; }
h2 { margin: 24px 0 8px 0; color: #1e40af; }
.subtitle { margin: 0 0 24px 0; color: #4b5563; font-size: 14px; }
.nav { margin: 16px 0 24px 0; padding: 12px; background: #ffffff; border: 1px solid #d1d5db; border-radius: 6px; }
.nav a { color: #1d4ed8; text-decoration: none; margin-right: 12px; }
.nav a:hover { text-decoration: underline; }
.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: 16px;
}
.card {
	background: #ffffff;
	border: 1px solid #d1d5db;
	border-radius: 6px;
	padding: 12px;
	box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.card img {
	width: 100%;
	height: auto;
	display: block;
	border: 1px solid #e5e7eb;
	background: #f9fafb;
}
.card-title {
	font-weight: 600;
	margin-top: 8px;
	font-size: 14px;
	color: #111827;
	word-break: break-all;
}
.card-meta {
	font-size: 12px;
	color: #4b5563;
	margin-top: 4px;
	line-height: 1.4;
}
.badge {
	display: inline-block;
	padding: 2px 6px;
	border-radius: 4px;
	background: #dbeafe;
	color: #1e3a8a;
	font-size: 11px;
	margin-right: 4px;
}
.badge.fail { background: #fee2e2; color: #991b1b; }
.badge.ok { background: #d1fae5; color: #065f46; }
.missing { color: #b91c1c; font-style: italic; }
.section-info {
	background: #fefce8;
	border: 1px solid #fde68a;
	padding: 10px 12px;
	border-radius: 6px;
	margin: 12px 0;
	font-size: 13px;
	color: #713f12;
}
.page-link { display: inline-block; padding: 4px 8px; background: #e5e7eb; border-radius: 4px; margin-right: 6px; color: #1f2937; text-decoration: none; }
.page-link:hover { background: #d1d5db; }
.page-link.active { background: #1d4ed8; color: #ffffff; }
</style>
'''


def html_header(title: str, subtitle: str, nav_html: str) -> str:
	html = '<!DOCTYPE html>\n'
	html += '<html lang="en"><head><meta charset="utf-8">\n'
	html += '<title>' + escape(title) + '</title>\n'
	html += CSS_BLOCK + '\n'
	html += '</head><body>\n'
	html += '<h1>' + escape(title) + '</h1>\n'
	if subtitle:
		html += '<div class="subtitle">' + escape(subtitle) + '</div>\n'
	if nav_html:
		html += nav_html
	return html


def html_footer() -> str:
	return '</body></html>\n'


def escape(text: str) -> str:
	# Basic HTML escape, ASCII safe
	text = str(text)
	text = text.replace('&', '&amp;')
	text = text.replace('<', '&lt;')
	text = text.replace('>', '&gt;')
	text = text.replace('"', '&quot;')
	return text


def render_card(record: dict, png_rel_prefix: str = PNG_REL_FROM_SHEET) -> str:
	scene_name = record['scene_name']
	png_rel = png_rel_prefix + '/' + scene_name + '.png'
	hf = record['hard_fail_count']
	score = record['score']
	klass = record['scene_class']
	top = record['top_failure']
	objs = record['object_count']
	clipped = record['clipped_by_parent']
	aspect_hf = record['aspect_distorted_HF']
	hf_class = 'fail' if hf > 0 else 'ok'
	card = '<div class="card">\n'
	if record['png_exists']:
		card += '\t<img src="' + escape(png_rel) + '" alt="' + escape(scene_name) + '" loading="lazy">\n'
	else:
		card += '\t<div class="missing">PNG missing: ' + escape(scene_name) + '.png</div>\n'
	card += '\t<div class="card-title">' + escape(scene_name) + '</div>\n'
	card += '\t<div class="card-meta">\n'
	card += '\t\t<span class="badge">' + escape(klass) + '</span>\n'
	card += '\t\t<span class="badge ' + hf_class + '">HF=' + str(hf) + '</span>\n'
	card += '\t\t<span class="badge">score=' + str(score) + '</span>\n'
	card += '\t\t<br>objects=' + str(objs) + ', clipped=' + str(clipped) + ', aspect_HF=' + str(aspect_hf) + '<br>\n'
	card += '\t\ttop: ' + escape(top) + '\n'
	card += '\t</div>\n'
	card += '</div>\n'
	return card


def render_grid(records: list, png_rel_prefix: str = PNG_REL_FROM_SHEET) -> str:
	html = '<div class="grid">\n'
	for record in records:
		html += render_card(record, png_rel_prefix)
	html += '</div>\n'
	return html


def png_prefix_for_sheet(sheet_path: str) -> str:
	"""
	Compute the relative PNG prefix for a sheet based on its directory depth.
	Sheets in contact_sheets/: use PNG_REL_FROM_SHEET.
	Sheets one level deeper (by_class/, by_failure_type/): add one more '..'.
	"""
	sheet_dir = os.path.dirname(sheet_path)
	parts = sheet_dir.rstrip('/').split('/')
	if parts and parts[-1] == 'contact_sheets':
		return PNG_REL_FROM_SHEET
	# One level deeper
	return '../' + PNG_REL_FROM_SHEET


def write_sheet(out_path: str, title: str, subtitle: str, records: list, back_link: bool = True) -> None:
	os.makedirs(os.path.dirname(out_path), exist_ok=True)
	nav = ''
	if back_link:
		nav = '<div class="nav"><a href="' + relative_to_index(out_path) + '">&larr; back to INDEX</a></div>\n'
	html = html_header(title, subtitle, nav)
	if not records:
		html += '<div class="section-info">No scenes match this filter.</div>\n'
	else:
		png_prefix = png_prefix_for_sheet(out_path)
		html += render_grid(records, png_prefix)
	html += html_footer()
	with open(out_path, 'w') as f:
		f.write(html)


def relative_to_index(sheet_path: str) -> str:
	# Compute relative path from a sheet file back to INDEX.html in contact_sheets/
	# All sheets live at most one level below contact_sheets/
	sheet_dir = os.path.dirname(sheet_path)
	# If sheet lives directly under contact_sheets/, link is "INDEX.html"
	# If sheet lives under contact_sheets/by_class/ or by_failure_type/, link is "../INDEX.html"
	parts = sheet_dir.rstrip('/').split('/')
	if parts and parts[-1] == 'contact_sheets':
		return 'INDEX.html'
	return '../INDEX.html'


def write_paginated(out_dir: str, base_name: str, title: str, subtitle: str, records: list) -> list:
	"""
	Paginate large lists into base_name.html, base_name_p2.html, ...
	Returns list of (relative_path_from_contact_sheets_root, label) tuples.
	"""
	if len(records) <= SCENES_PER_PAGE:
		out_path = os.path.join(out_dir, base_name + '.html')
		write_sheet(out_path, title, subtitle, records)
		return [(base_name + '.html', title)]
	# Paginated
	total = len(records)
	pages = (total + SCENES_PER_PAGE - 1) // SCENES_PER_PAGE
	results = []
	for page_idx in range(pages):
		start = page_idx * SCENES_PER_PAGE
		end = min(start + SCENES_PER_PAGE, total)
		page_records = records[start:end]
		if page_idx == 0:
			fname = base_name + '.html'
		else:
			fname = base_name + '_p' + str(page_idx + 1) + '.html'
		# Build page nav linking to siblings
		page_links = '<div class="nav">'
		page_links += '<a href="' + relative_to_index(os.path.join(out_dir, fname)) + '">&larr; back to INDEX</a> &nbsp; '
		for sibling_idx in range(pages):
			if sibling_idx == 0:
				sib_name = base_name + '.html'
			else:
				sib_name = base_name + '_p' + str(sibling_idx + 1) + '.html'
			active = ' active' if sibling_idx == page_idx else ''
			page_links += '<a class="page-link' + active + '" href="' + sib_name + '">page ' + str(sibling_idx + 1) + '</a>'
		page_links += '</div>\n'
		page_title = title + ' (page ' + str(page_idx + 1) + ' of ' + str(pages) + ')'
		page_subtitle = subtitle + ' Showing scenes ' + str(start + 1) + ' to ' + str(end) + ' of ' + str(total) + '.'
		out_path = os.path.join(out_dir, fname)
		os.makedirs(out_dir, exist_ok=True)
		html = html_header(page_title, page_subtitle, page_links)
		page_png_prefix = png_prefix_for_sheet(out_path)
		html += render_grid(page_records, page_png_prefix)
		html += html_footer()
		with open(out_path, 'w') as f:
			f.write(html)
		results.append((fname, page_title))
	return results


#============================================
# Sort helpers
#============================================

def sort_worst(records: list) -> list:
	def worst_key(record: dict) -> tuple:
		# Higher hard_fail, higher clipped, then lower score
		key = (-record['hard_fail_count'], -record['clipped_by_parent'], record['score'])
		return key
	worst = sorted(records, key=worst_key)
	return worst


def sort_best(records: list) -> list:
	def best_key(record: dict) -> tuple:
		key = (-record['score'], record['hard_fail_count'])
		return key
	best = sorted(records, key=best_key)
	return best


#============================================
# Main build
#============================================

def build_by_class_sheets(records: list, out_root: str) -> list:
	by_class_dir = os.path.join(out_root, 'by_class')
	# Group records by inferred class
	groups = {}
	for record in records:
		klass = record['scene_class']
		if klass not in groups:
			groups[klass] = []
		groups[klass].append(record)
	# Build one sheet per class
	links = []
	for klass in sorted(groups.keys()):
		group = groups[klass]
		group_sorted = sorted(group, key=lambda r: r['scene_name'])
		title = 'By class: ' + klass
		subtitle = str(len(group_sorted)) + ' scenes in class "' + klass + '".'
		fname = klass + '.html'
		out_path = os.path.join(by_class_dir, fname)
		write_sheet(out_path, title, subtitle, group_sorted)
		rel = 'by_class/' + fname
		links.append((rel, title, len(group_sorted)))
	return links


def build_worst_20(records: list, out_root: str) -> tuple:
	worst = sort_worst(records)[:20]
	out_path = os.path.join(out_root, 'worst_20.html')
	title = 'Worst 20 scenes'
	subtitle = 'Top 20 scenes ranked by hard_fail_count desc, then clipped_by_parent desc.'
	write_sheet(out_path, title, subtitle, worst)
	return ('worst_20.html', title, len(worst))


def build_best_20(records: list, out_root: str) -> tuple:
	best = sort_best(records)[:20]
	out_path = os.path.join(out_root, 'best_20.html')
	title = 'Best 20 scenes'
	subtitle = 'Top 20 scenes ranked by score desc.'
	write_sheet(out_path, title, subtitle, best)
	return ('best_20.html', title, len(best))


def build_all_hard_fails(records: list, out_root: str) -> list:
	hard = [r for r in records if r['hard_fail_count'] > 0]
	hard_sorted = sort_worst(hard)
	title = 'All hard-fail scenes'
	subtitle = 'Every scene with hard_fail_count > 0. ' + str(len(hard_sorted)) + ' total.'
	pages = write_paginated(out_root, 'all_hard_fails', title, subtitle, hard_sorted)
	links = []
	for fname, page_title in pages:
		links.append((fname, page_title, None))
	return links


def build_by_failure_type(records: list, out_root: str) -> tuple:
	"""
	Returns (links, skipped) where skipped is list of (type, reason) tuples.
	"""
	by_type_dir = os.path.join(out_root, 'by_failure_type')
	failure_types = ['clipped_by_parent', 'aspect_distorted_HF']
	links = []
	skipped = []
	for ftype in failure_types:
		# Collect scenes where this failure type fires
		hits = [r for r in records if r[ftype] > 0]
		count = len(hits)
		total_incidents = sum(r[ftype] for r in hits)
		if total_incidents <= 5:
			skipped.append((ftype, 'only ' + str(total_incidents) + ' incidents (need > 5)'))
			continue
		# Sort by that failure type desc
		hits_sorted = sorted(hits, key=lambda r: (-r[ftype], r['scene_name']))
		title = 'By failure type: ' + ftype
		subtitle = str(count) + ' scenes carry this failure (total ' + str(total_incidents) + ' incidents).'
		pages = write_paginated(by_type_dir, ftype, title, subtitle, hits_sorted)
		for fname, page_title in pages:
			rel = 'by_failure_type/' + fname
			links.append((rel, page_title, count))
	return (links, skipped)


def build_gold_scenes(records: list, out_root: str) -> tuple:
	gold = [r for r in records if r['is_gold']]
	gold_sorted = sort_best(gold)
	out_path = os.path.join(out_root, 'gold_scenes.html')
	title = 'Gold scenes'
	subtitle = 'All ' + str(len(gold_sorted)) + ' hand-authored gold scenes, sorted by score desc.'
	write_sheet(out_path, title, subtitle, gold_sorted)
	return ('gold_scenes.html', title, len(gold_sorted))


def build_index(out_root: str, by_class_links: list, worst_link: tuple,
		best_link: tuple, hard_links: list, failure_links: list,
		skipped: list, gold_link: tuple, total_scenes: int,
		total_cards: int, sheet_count: int) -> str:
	out_path = os.path.join(out_root, 'INDEX.html')
	title = 'NEW3 Batch 1 contact sheets'
	subtitle = ('Index of contact sheets built from ' + str(total_scenes)
		+ ' scenes across ' + str(sheet_count) + ' sheets ('
		+ str(total_cards) + ' cards total).')
	html = html_header(title, subtitle, '')
	html += '<h2>Top sheets</h2>\n<ul>\n'
	html += '\t<li><a href="' + worst_link[0] + '">' + escape(worst_link[1]) + '</a> (' + str(worst_link[2]) + ' scenes)</li>\n'
	html += '\t<li><a href="' + best_link[0] + '">' + escape(best_link[1]) + '</a> (' + str(best_link[2]) + ' scenes)</li>\n'
	html += '\t<li><a href="' + gold_link[0] + '">' + escape(gold_link[1]) + '</a> (' + str(gold_link[2]) + ' scenes)</li>\n'
	html += '</ul>\n'

	html += '<h2>All hard fails</h2>\n<ul>\n'
	for rel, page_title, _ in hard_links:
		html += '\t<li><a href="' + rel + '">' + escape(page_title) + '</a></li>\n'
	html += '</ul>\n'

	html += '<h2>By class</h2>\n<ul>\n'
	for rel, page_title, count in by_class_links:
		html += '\t<li><a href="' + rel + '">' + escape(page_title) + '</a> (' + str(count) + ' scenes)</li>\n'
	html += '</ul>\n'

	html += '<h2>By failure type</h2>\n<ul>\n'
	if failure_links:
		for rel, page_title, count in failure_links:
			count_str = ' (' + str(count) + ' scenes)' if count is not None else ''
			html += '\t<li><a href="' + rel + '">' + escape(page_title) + '</a>' + count_str + '</li>\n'
	else:
		html += '\t<li>No failure-type sheets generated.</li>\n'
	html += '</ul>\n'

	if skipped:
		html += '<h2>Skipped failure types</h2>\n<ul>\n'
		for ftype, reason in skipped:
			html += '\t<li>' + escape(ftype) + ': ' + escape(reason) + '</li>\n'
		html += '</ul>\n'

	html += html_footer()
	with open(out_path, 'w') as f:
		f.write(html)
	return out_path


def count_cards(by_class_links: list, worst_link: tuple, best_link: tuple,
		hard_links: list, failure_links: list, gold_link: tuple,
		records: list) -> int:
	# Count cards = sum of records rendered across all sheets.
	# by_class: 1 card per scene total (partition).
	# worst_20: <= 20.
	# best_20: <= 20.
	# all_hard_fails: every hard fail scene rendered exactly once across pages.
	# by_failure_type: sum incidents per failure type.
	# gold_scenes: # gold scenes.
	by_class_total = sum(link[2] for link in by_class_links)
	hard_count = sum(1 for r in records if r['hard_fail_count'] > 0)
	failure_total = 0
	# failure_links carries page-level entries; use count column when present.
	# But for accurate per-type incidents we recompute from records.
	for ftype in ['clipped_by_parent', 'aspect_distorted_HF']:
		hits = [r for r in records if r[ftype] > 0]
		if any(rel.startswith('by_failure_type/' + ftype) for rel, _, _ in failure_links):
			failure_total += len(hits)
	total = (by_class_total + worst_link[2] + best_link[2]
		+ hard_count + failure_total + gold_link[2])
	return total


def main():
	args = parse_args()
	repo_root = get_repo_root(args.repo_root)
	if args.verbose:
		print('repo_root: ' + repo_root)
	records = load_scenes(repo_root, args.verbose)
	if args.verbose:
		print('loaded ' + str(len(records)) + ' scene records')

	out_root = os.path.join(repo_root, REPO_REL_OUT_DIR)
	os.makedirs(out_root, exist_ok=True)

	# Build sheets
	by_class_links = build_by_class_sheets(records, out_root)
	worst_link = build_worst_20(records, out_root)
	best_link = build_best_20(records, out_root)
	hard_links = build_all_hard_fails(records, out_root)
	failure_links, skipped = build_by_failure_type(records, out_root)
	gold_link = build_gold_scenes(records, out_root)

	# Sheet count: by_class + 1 worst + 1 best + 1 gold + hard_link pages + failure pages
	sheet_count = (len(by_class_links) + 1 + 1 + 1
		+ len(hard_links) + len(failure_links))
	total_cards = count_cards(by_class_links, worst_link, best_link,
		hard_links, failure_links, gold_link, records)

	index_path = build_index(out_root, by_class_links, worst_link, best_link,
		hard_links, failure_links, skipped, gold_link,
		len(records), total_cards, sheet_count)

	# Report
	print('script_path: ' + os.path.abspath(__file__))
	print('contact_sheet_count: ' + str(sheet_count + 1))  # +1 for INDEX
	print('total_card_count: ' + str(total_cards))
	print('index_path: ' + index_path)
	if skipped:
		print('skipped_failure_types:')
		for ftype, reason in skipped:
			print('  ' + ftype + ': ' + reason)
	else:
		print('skipped_failure_types: (none)')


if __name__ == '__main__':
	main()
