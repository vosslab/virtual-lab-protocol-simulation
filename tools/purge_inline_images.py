#!/usr/bin/env python3
"""Purge inline base64 image data from markdown protocol docs.

Strips reference-style image definitions of the form
	[imageN]: <data:image/...;base64,...>
and the matching `![alt][imageN]` use sites that point to them.
Leaves all other content untouched.

Usage:
	python3 tools/purge_inline_images.py FILE [FILE ...]
"""

import re
import argparse

#============================================
# matchers
#============================================

# matches a reference-style def whose URL starts with data: (any image type)
# captures the ref id so we can also strip use sites that target it
REF_DEF_RE = re.compile(
	r'^\[([^\]]+)\]:\s*<?data:[^>\n]+>?\s*$',
	re.MULTILINE,
)

#============================================
# core
#============================================

def purge_file(path: str) -> tuple[int, int, int]:
	"""Remove inline-base64 ref defs and matching use sites.

	Returns (defs_removed, uses_removed, bytes_saved).
	"""
	with open(path, 'r', encoding='utf-8') as f:
		text = f.read()
	before_bytes = len(text)

	# 1) find every base64 ref id and drop its definition line
	ref_ids = REF_DEF_RE.findall(text)
	new_text = REF_DEF_RE.sub('', text)
	defs_removed = len(ref_ids)

	# 2) drop use sites `![alt][refid]` for those ids only
	uses_removed = 0
	for rid in ref_ids:
		use_pat = re.compile(
			r'!\[[^\]]*\]\[' + re.escape(rid) + r'\]'
		)
		new_text, n = use_pat.subn('', new_text)
		uses_removed += n

	# 3) collapse runs of >=3 blank lines that may be left behind
	new_text = re.sub(r'\n{3,}', '\n\n', new_text)

	after_bytes = len(new_text)
	with open(path, 'w', encoding='utf-8') as f:
		f.write(new_text)
	return defs_removed, uses_removed, before_bytes - after_bytes

#============================================
# cli
#============================================

def parse_args():
	parser = argparse.ArgumentParser(description=__doc__)
	parser.add_argument(
		'files', nargs='+',
		help='markdown files to purge in place'
	)
	args = parser.parse_args()
	return args

def main():
	args = parse_args()
	for path in args.files:
		defs, uses, saved = purge_file(path)
		print(f"{path}: -{defs} defs, -{uses} uses, -{saved} bytes")

if __name__ == '__main__':
	main()
