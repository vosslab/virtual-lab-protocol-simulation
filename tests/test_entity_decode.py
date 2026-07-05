"""
Unit tests for pipeline.entity_decode.decode_entities.

Cases are inline literals per PYTEST_STYLE.md; no on-disk fixture file. Values
that carry a decoded glyph are asserted via chr(codepoint) rather than a
literal character, so this test file stays ASCII-only.
"""

import pipeline.entity_decode


def test_decode_named_entity_micro() -> None:
	decoded = pipeline.entity_decode.decode_entities("400 &micro;M")
	assert decoded == "400 " + chr(0x00B5) + "M"


def test_decode_numeric_decimal_entity() -> None:
	decoded = pipeline.entity_decode.decode_entities("&#181;")
	assert decoded == chr(181)


def test_decode_numeric_hex_entity() -> None:
	decoded = pipeline.entity_decode.decode_entities("&#xB5;")
	assert decoded == chr(0xB5)


def test_decode_numeric_hex_entity_greek_mu() -> None:
	decoded = pipeline.entity_decode.decode_entities("&#956;")
	assert decoded == chr(956)


def test_decode_amp_does_not_double_decode() -> None:
	decoded = pipeline.entity_decode.decode_entities("Tris &amp; EDTA")
	assert decoded == "Tris & EDTA"


def test_decode_two_entities_in_one_string() -> None:
	decoded = pipeline.entity_decode.decode_entities("&alpha; and &beta;")
	assert decoded == chr(0x03B1) + " and " + chr(0x03B2)


def test_decode_entity_adjacent_to_punctuation() -> None:
	decoded = pipeline.entity_decode.decode_entities("20&micro;L, added.")
	assert decoded == "20" + chr(0x00B5) + "L, added."


def test_decode_unknown_named_entity_passes_through() -> None:
	decoded = pipeline.entity_decode.decode_entities("&notarealentity;")
	assert decoded == "&notarealentity;"
