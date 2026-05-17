"""Rich console factory for consistent text rendering across tools."""

import os
import rich.console


def make_console(no_color: bool = False) -> rich.console.Console:
	"""
	Create and return a rich.console.Console instance.

	Args:
		no_color: if True, disable color output. Also respects NO_COLOR environment variable.

	Returns:
		rich.console.Console configured for the output context.

	Behavior:
		- If no_color=True or NO_COLOR env is set, returns Console with color suppressed.
		- Otherwise returns Console with auto-detection (tty, truecolor).
		- No theme or customization exposed to maintain consistent internal styling.
	"""
	# Check both the parameter and the NO_COLOR environment variable
	should_suppress_color = no_color or bool(os.environ.get('NO_COLOR'))

	if should_suppress_color:
		# Return console with color explicitly disabled
		return rich.console.Console(force_terminal=False, no_color=True)
	else:
		# Return console with defaults (auto-detect tty + truecolor)
		return rich.console.Console()
