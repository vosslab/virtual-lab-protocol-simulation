#!/usr/bin/env python3
"""Sweep assets/**/*.svg for exact byte-duplicates and visual near-duplicates.

Outputs a review list (not an auto-fix) so a human can decide which clusters
are intentional variants and which should be consolidated or renamed.

Render path: cairosvg (pure Python, no network, deterministic).
Hash path: md5 for exact matches; imagehash phash for visual clusters.

Run from the repo root:
    source source_me.sh && python3 tools/svg_identity_sweep.py
"""

# Standard Library
import os
import sys
import hashlib
import argparse
import tempfile
import itertools
import subprocess

# PIP3 modules
import cairosvg
import imagehash
import PIL.Image

#============================================
def parse_args() -> argparse.Namespace:
	"""Parse command-line arguments."""
	parser = argparse.ArgumentParser(
		description="Sweep SVG assets for exact and visual duplicates. Outputs a review list."
	)
	parser.add_argument(
		'-a', '--asset-dir', dest='asset_dir',
		default='assets',
		help='Root directory to search for SVG files (default: assets/)'
	)
	parser.add_argument(
		'-o', '--output', dest='output_path',
		default=None,
		help='Path to write the Markdown report (default: docs/active_plans/audits/svg_identity_sweep.md)'
	)
	args = parser.parse_args()
	return args

#============================================
def collect_svgs(asset_dir: str) -> list:
	"""Collect all .svg file paths under asset_dir, sorted for determinism."""
	found = []
	for dirpath, _dirnames, filenames in os.walk(asset_dir):
		for filename in filenames:
			if filename.lower().endswith('.svg'):
				full_path = os.path.join(dirpath, filename)
				found.append(full_path)
	# sort for determinism
	found.sort()
	return found

#============================================
def compute_md5(path: str) -> str:
	"""Return the hex MD5 digest of file contents at path."""
	hasher = hashlib.md5()
	with open(path, 'rb') as fh:
		for chunk in iter(lambda: fh.read(65536), b''):
			hasher.update(chunk)
	return hasher.hexdigest()

#============================================
def render_svg_to_png(svg_path: str, tmp_dir: str, index: int) -> str:
	"""Render an SVG to a PNG raster using cairosvg.

	Writes to a temp file in tmp_dir.  Raises RuntimeError if rendering fails.

	Args:
		svg_path: Path to the SVG file.
		tmp_dir: Temporary directory to write the PNG.
		index: Numeric index to make filenames unique.

	Returns:
		Path to the written PNG file.
	"""
	# use a stable name based on index so reruns overwrite the same /tmp files
	basename = os.path.splitext(os.path.basename(svg_path))[0]
	out_path = os.path.join(tmp_dir, f"svgid_{index:04d}_{basename}.png")
	# render at 256x256 for perceptual hash (large enough for shape fidelity,
	# small enough to keep /tmp usage bounded)
	cairosvg.svg2png(url=svg_path, write_to=out_path, output_width=256, output_height=256)
	return out_path

#============================================
def compute_phash(png_path: str) -> imagehash.ImageHash:
	"""Compute a perceptual hash (phash) from a PNG file."""
	img = PIL.Image.open(png_path).convert('RGB')
	return imagehash.phash(img)

#============================================
def group_exact_duplicates(md5_map: dict) -> list:
	"""Group paths by their md5 digest; return only multi-path clusters.

	Args:
		md5_map: dict mapping path -> md5 hex string.

	Returns:
		List of lists, each inner list is a cluster of identical-bytes paths.
	"""
	# invert: md5 -> list of paths
	by_md5: dict = {}
	for path, digest in md5_map.items():
		if digest not in by_md5:
			by_md5[digest] = []
		by_md5[digest].append(path)
	# keep only groups with more than one path
	clusters = [sorted(paths) for paths in by_md5.values() if len(paths) > 1]
	clusters.sort()
	return clusters

#============================================
def group_visual_duplicates(phash_map: dict, threshold: int) -> list:
	"""Group paths by visual similarity using hamming distance on phash.

	Uses a simple union-find / greedy clustering: for each pair with
	distance <= threshold, merge them into the same cluster.

	Args:
		phash_map: dict mapping path -> ImageHash.
		threshold: Maximum hamming distance to consider a visual match.

	Returns:
		List of tuples (cluster_paths, max_distance_in_cluster) for clusters
		with >= 2 members.
	"""
	paths = sorted(phash_map.keys())
	# union-find data structure for clustering
	parent: dict = {p: p for p in paths}

	def find(x: str) -> str:
		# path compression
		if parent[x] != x:
			parent[x] = find(parent[x])
		return parent[x]

	def union(x: str, y: str) -> None:
		parent[find(x)] = find(y)

	# record the minimum distance for each pair that was joined
	pair_distances: dict = {}

	# compare every pair
	for path_a, path_b in itertools.combinations(paths, 2):
		dist = phash_map[path_a] - phash_map[path_b]
		if dist <= threshold:
			union(path_a, path_b)
			key = (min(path_a, path_b), max(path_a, path_b))
			pair_distances[key] = dist

	# collect clusters
	clusters_dict: dict = {}
	for p in paths:
		root = find(p)
		if root not in clusters_dict:
			clusters_dict[root] = []
		clusters_dict[root].append(p)

	# compute max pairwise distance within each cluster for the report
	result = []
	for cluster_paths in clusters_dict.values():
		if len(cluster_paths) < 2:
			continue
		cluster_paths = sorted(cluster_paths)
		max_dist = 0
		for pa, pb in itertools.combinations(cluster_paths, 2):
			key = (min(pa, pb), max(pa, pb))
			if key in pair_distances:
				max_dist = max(max_dist, pair_distances[key])
		result.append((cluster_paths, max_dist))
	result.sort(key=lambda t: t[0][0])
	return result

#============================================
def relative_path(path: str, base: str) -> str:
	"""Return path relative to base, or path unchanged if base is not a prefix."""
	try:
		return os.path.relpath(path, base)
	except ValueError:
		return path

#============================================
def build_report(
	scanned: list,
	exact_clusters: list,
	visual_clusters: list,
	render_failures: list,
	repo_root: str,
	threshold: int,
) -> str:
	"""Build the Markdown report string.

	Args:
		scanned: All SVG paths scanned.
		exact_clusters: Output of group_exact_duplicates.
		visual_clusters: Output of group_visual_duplicates.
		render_failures: List of (path, error_message) pairs.
		repo_root: Repo root for computing relative paths.
		threshold: Hamming distance threshold used.

	Returns:
		Markdown report as a string.
	"""
	lines = []
	lines.append("# SVG identity sweep report")
	lines.append("")
	lines.append("Generated by `tools/svg_identity_sweep.py`.")
	lines.append("This is a REVIEW LIST -- no assets have been edited.")
	lines.append("")
	lines.append("## Summary")
	lines.append("")
	lines.append(f"- Assets scanned: {len(scanned)}")
	lines.append(f"- Exact-duplicate clusters: {len(exact_clusters)}")
	lines.append(f"- Visual near-duplicate clusters: {len(visual_clusters)}"
		f" (hamming threshold: {threshold})")
	lines.append(f"- Render failures: {len(render_failures)}")
	lines.append("")
	lines.append("---")
	lines.append("")

	# render failures
	if render_failures:
		lines.append("## Render failures (review needed)")
		lines.append("")
		lines.append("These assets failed to rasterize and may be malformed.")
		lines.append("")
		for fail_path, err_msg in render_failures:
			rel = relative_path(fail_path, repo_root)
			lines.append(f"- `{rel}`: {err_msg}")
		lines.append("")
		lines.append("---")
		lines.append("")

	# exact duplicate clusters
	lines.append("## Exact duplicate clusters")
	lines.append("")
	if exact_clusters:
		lines.append(
			"Assets in each cluster are byte-for-byte identical."
			" One is likely redundant or mislabeled."
		)
		lines.append("")
		for i, cluster_paths in enumerate(exact_clusters, 1):
			lines.append(f"### Exact cluster {i}")
			lines.append("")
			for p in cluster_paths:
				rel = relative_path(p, repo_root)
				lines.append(f"- `{rel}`")
			lines.append("")
			lines.append(
				"**Review needed:** Confirm whether these names represent the same"
				" concept or whether one is a leftover from a rename."
			)
			lines.append("")
	else:
		lines.append("No exact duplicate clusters found.")
		lines.append("")

	lines.append("---")
	lines.append("")

	# visual near-duplicate clusters
	lines.append("## Visual near-duplicate clusters")
	lines.append("")
	if visual_clusters:
		lines.append(
			f"Assets in each cluster have perceptual-hash hamming distance"
			f" <= {threshold}. They render nearly identically."
			f" Some may be intentional variants; others may be mislabeled."
		)
		lines.append("")
		for i, (cluster_paths, max_dist) in enumerate(visual_clusters, 1):
			lines.append(f"### Visual cluster {i}  (max hamming distance: {max_dist})")
			lines.append("")
			for p in cluster_paths:
				rel = relative_path(p, repo_root)
				lines.append(f"- `{rel}`")
			lines.append("")
			if max_dist == 0:
				lines.append(
					"**Review needed:** phash distance 0 means visually indistinguishable"
					" at 256px render. May be a byte-dup missed by md5 (unlikely) or"
					" semantically the same object at different scales."
				)
			elif max_dist <= 5:
				lines.append(
					"**Review needed:** Very close visual match. Likely the same art at"
					" different scales, with minor annotation differences, or a state"
					" variant that differs only in a small detail."
				)
			else:
				lines.append(
					"**Likely intentional:** Cluster members share broad shape but differ"
					" in details. Probably distinct objects or state variants."
					" Verify the names match the artwork."
				)
			lines.append("")
	else:
		lines.append("No visual near-duplicate clusters found.")
		lines.append("")

	lines.append("---")
	lines.append("")
	lines.append("## All assets scanned")
	lines.append("")
	for p in scanned:
		rel = relative_path(p, repo_root)
		lines.append(f"- `{rel}`")
	lines.append("")
	return "\n".join(lines)

#============================================
def main() -> None:
	"""Run the SVG identity sweep."""
	args = parse_args()

	# resolve repo root and paths
	repo_root = subprocess.run(
		["git", "rev-parse", "--show-toplevel"],
		capture_output=True, text=True, check=True,
	).stdout.strip()
	asset_dir = os.path.join(repo_root, args.asset_dir)
	default_report = os.path.join(
		repo_root, "docs", "active_plans", "audits", "svg_identity_sweep.md"
	)
	output_path = args.output_path if args.output_path else default_report

	# configuration -- do NOT expose as CLI knobs per argparse minimalism
	# hamming distance threshold for near-duplicate clustering
	PHASH_THRESHOLD = 10

	if not os.path.isdir(asset_dir):
		raise ValueError(f"Asset directory does not exist: {asset_dir}")

	print(f"Scanning SVG assets under: {asset_dir}")
	svgs = collect_svgs(asset_dir)
	print(f"Found {len(svgs)} SVG files")

	# ---- phase 1: byte hash ----
	print("Computing MD5 byte hashes...")
	md5_map: dict = {}
	for path in svgs:
		md5_map[path] = compute_md5(path)

	exact_clusters = group_exact_duplicates(md5_map)
	print(f"  Exact-duplicate clusters: {len(exact_clusters)}")

	# ---- phase 2: render + perceptual hash ----
	# use a stable /tmp subdirectory so reruns overwrite the same files
	tmp_dir = os.path.join(tempfile.gettempdir(), "svg_identity_sweep")
	os.makedirs(tmp_dir, exist_ok=True)
	print(f"Rendering SVGs to PNG rasters in: {tmp_dir}")

	phash_map: dict = {}
	render_failures: list = []

	for i, svg_path in enumerate(svgs):
		rel = os.path.relpath(svg_path, repo_root)
		try:
			png_path = render_svg_to_png(svg_path, tmp_dir, i)
			phash_map[svg_path] = compute_phash(png_path)
		except Exception as exc:
			# surface render failures loudly in the report; do not silently skip
			msg = str(exc)
			print(f"  RENDER FAIL: {rel} -- {msg}", file=sys.stderr)
			render_failures.append((svg_path, msg))

	print(f"  Rendered: {len(phash_map)}  Failures: {len(render_failures)}")

	# visual clustering on only successfully rendered assets
	print(f"Clustering by phash (threshold={PHASH_THRESHOLD})...")
	visual_clusters = group_visual_duplicates(phash_map, PHASH_THRESHOLD)

	# filter out exact-dup clusters whose members all appear in exact clusters
	# (those are already covered; visual clusters should add new information)
	exact_flat = set()
	for cluster_paths in exact_clusters:
		exact_flat.update(cluster_paths)
	visual_clusters_new = []
	for cluster_paths, max_dist in visual_clusters:
		# keep if the cluster introduces at least one path NOT in exact-dup set
		# OR if it spans different md5 hashes (truly visual-only dup)
		has_different_md5 = len(set(md5_map.get(p, '') for p in cluster_paths)) > 1
		if has_different_md5:
			visual_clusters_new.append((cluster_paths, max_dist))
	visual_clusters = visual_clusters_new
	print(f"  Visual near-duplicate clusters (excl. exact-dups): {len(visual_clusters)}")

	print(
		f"\nSUMMARY: {len(svgs)} assets scanned, "
		f"{len(exact_clusters)} exact-dup clusters, "
		f"{len(visual_clusters)} visual-dup clusters, "
		f"{len(render_failures)} render failures"
	)

	# ---- phase 3: write report ----
	report_text = build_report(
		scanned=svgs,
		exact_clusters=exact_clusters,
		visual_clusters=visual_clusters,
		render_failures=render_failures,
		repo_root=repo_root,
		threshold=PHASH_THRESHOLD,
	)

	os.makedirs(os.path.dirname(output_path), exist_ok=True)
	with open(output_path, 'w', encoding='ascii', errors='replace') as fh:
		fh.write(report_text)
	print(f"Report written to: {output_path}")


if __name__ == '__main__':
	main()
