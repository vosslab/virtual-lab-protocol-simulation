import json
import os
import subprocess


#============================================
def _resolve_repo_root() -> str:
	"""
	Resolve the repository root using git rev-parse.

	Returns:
		str: Absolute path to repository root.
	"""
	result = subprocess.run(
		["git", "rev-parse", "--show-toplevel"],
		capture_output=True,
		text=True,
		check=True,
	)
	return result.stdout.strip()


#============================================
def _read_marker() -> str:
	"""
	Read REPO_TYPE marker from repository root.

	Returns:
		str: Marker token (e.g., "typescript"), or None if missing.
	"""
	repo_root = _resolve_repo_root()
	marker_path = os.path.join(repo_root, "REPO_TYPE")
	if not os.path.exists(marker_path):
		return None
	with open(marker_path, "r", encoding="utf-8") as handle:
		content = handle.read().strip()
	return content if content else None


#============================================
def test_tsconfig_compiler_target() -> None:
	"""
	Ensure tsconfig.json compilerOptions.target is es2020.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("target") != "es2020":
		raise AssertionError(f'target must be "es2020", got: {compiler_opts.get("target")}')


#============================================
def test_tsconfig_compiler_module() -> None:
	"""
	Ensure tsconfig.json compilerOptions.module is esnext.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("module") != "esnext":
		raise AssertionError(f'module must be "esnext", got: {compiler_opts.get("module")}')


#============================================
def test_tsconfig_compiler_module_resolution() -> None:
	"""
	Ensure tsconfig.json compilerOptions.moduleResolution is bundler.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("moduleResolution") != "bundler":
		raise AssertionError(f'moduleResolution must be "bundler", got: {compiler_opts.get("moduleResolution")}')


#============================================
def test_tsconfig_strict_mode() -> None:
	"""
	Ensure tsconfig.json compilerOptions.strict is true.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("strict") is not True:
		raise AssertionError(f"strict must be true, got: {compiler_opts.get('strict')}")


#============================================
def test_tsconfig_no_implicit_any() -> None:
	"""
	Ensure tsconfig.json compilerOptions.noImplicitAny is true.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("noImplicitAny") is not True:
		raise AssertionError(f"noImplicitAny must be true, got: {compiler_opts.get('noImplicitAny')}")


#============================================
def test_tsconfig_no_unchecked_indexed_access() -> None:
	"""
	Ensure tsconfig.json compilerOptions.noUncheckedIndexedAccess is true.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("noUncheckedIndexedAccess") is not True:
		raise AssertionError(f"noUncheckedIndexedAccess must be true, got: {compiler_opts.get('noUncheckedIndexedAccess')}")


#============================================
def test_tsconfig_exact_optional_property_types() -> None:
	"""
	Ensure tsconfig.json compilerOptions.exactOptionalPropertyTypes is true.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("exactOptionalPropertyTypes") is not True:
		raise AssertionError(f"exactOptionalPropertyTypes must be true, got: {compiler_opts.get('exactOptionalPropertyTypes')}")


#============================================
def test_tsconfig_no_implicit_override() -> None:
	"""
	Ensure tsconfig.json compilerOptions.noImplicitOverride is true.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("noImplicitOverride") is not True:
		raise AssertionError(f"noImplicitOverride must be true, got: {compiler_opts.get('noImplicitOverride')}")


#============================================
def test_tsconfig_verbatim_module_syntax() -> None:
	"""
	Ensure tsconfig.json compilerOptions.verbatimModuleSyntax is true.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("verbatimModuleSyntax") is not True:
		raise AssertionError(f"verbatimModuleSyntax must be true, got: {compiler_opts.get('verbatimModuleSyntax')}")


#============================================
def test_tsconfig_use_unknown_in_catch_variables() -> None:
	"""
	Ensure tsconfig.json compilerOptions.useUnknownInCatchVariables is true.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("useUnknownInCatchVariables") is not True:
		raise AssertionError(f"useUnknownInCatchVariables must be true, got: {compiler_opts.get('useUnknownInCatchVariables')}")


#============================================
def test_tsconfig_no_emit() -> None:
	"""
	Ensure tsconfig.json compilerOptions.noEmit is true.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("noEmit") is not True:
		raise AssertionError(f"noEmit must be true, got: {compiler_opts.get('noEmit')}")


#============================================
def test_tsconfig_skip_lib_check() -> None:
	"""
	Ensure tsconfig.json compilerOptions.skipLibCheck is true.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("skipLibCheck") is not True:
		raise AssertionError(f"skipLibCheck must be true, got: {compiler_opts.get('skipLibCheck')}")


#============================================
def test_tsconfig_no_fallthrough_case_in_switch() -> None:
	"""
	Ensure tsconfig.json compilerOptions.noFallthroughCasesInSwitch is true.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("noFallthroughCasesInSwitch") is not True:
		raise AssertionError(f"noFallthroughCasesInSwitch must be true, got: {compiler_opts.get('noFallthroughCasesInSwitch')}")


#============================================
def test_tsconfig_no_implicit_returns() -> None:
	"""
	Ensure tsconfig.json compilerOptions.noImplicitReturns is true.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("noImplicitReturns") is not True:
		raise AssertionError(f"noImplicitReturns must be true, got: {compiler_opts.get('noImplicitReturns')}")


#============================================
def test_tsconfig_no_unused_locals() -> None:
	"""
	Ensure tsconfig.json compilerOptions.noUnusedLocals is true.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("noUnusedLocals") is not True:
		raise AssertionError(f"noUnusedLocals must be true, got: {compiler_opts.get('noUnusedLocals')}")


#============================================
def test_tsconfig_no_unused_parameters() -> None:
	"""
	Ensure tsconfig.json compilerOptions.noUnusedParameters is true.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("noUnusedParameters") is not True:
		raise AssertionError(f"noUnusedParameters must be true, got: {compiler_opts.get('noUnusedParameters')}")


#============================================
def test_tsconfig_force_consistent_casing() -> None:
	"""
	Ensure tsconfig.json compilerOptions.forceConsistentCasingInFileNames is true.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("forceConsistentCasingInFileNames") is not True:
		raise AssertionError(f"forceConsistentCasingInFileNames must be true, got: {compiler_opts.get('forceConsistentCasingInFileNames')}")


#============================================
def test_tsconfig_isolated_modules() -> None:
	"""
	Ensure tsconfig.json compilerOptions.isolatedModules is true.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("isolatedModules") is not True:
		raise AssertionError(f"isolatedModules must be true, got: {compiler_opts.get('isolatedModules')}")


#============================================
def test_tsconfig_esmodule_interop() -> None:
	"""
	Ensure tsconfig.json compilerOptions.esModuleInterop is true.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("esModuleInterop") is not True:
		raise AssertionError(f"esModuleInterop must be true, got: {compiler_opts.get('esModuleInterop')}")


#============================================
def test_tsconfig_source_map() -> None:
	"""
	Ensure tsconfig.json compilerOptions.sourceMap is true.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	if compiler_opts.get("sourceMap") is not True:
		raise AssertionError(f"sourceMap must be true, got: {compiler_opts.get('sourceMap')}")


#============================================
def test_tsconfig_lib_includes_es2020_and_dom() -> None:
	"""
	Ensure tsconfig.json compilerOptions.lib includes es2020, dom, dom.iterable.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	with open(tsconfig_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	compiler_opts = data.get("compilerOptions", {})
	lib_list = compiler_opts.get("lib", [])
	expected_libs = {"es2020", "dom", "dom.iterable"}
	actual_libs = set(lib_list)

	if actual_libs != expected_libs:
		raise AssertionError(f"lib must be {expected_libs}, got: {actual_libs}")
