"""Work around genlayer-test 0.29.x unlinking an open Windows temp file."""
import atexit
import os

if os.name == "nt":
    import gltest.direct.loader as loader

    _inject = loader._inject_message_to_fd0
    _deferred = set()

    def _inject_on_windows(vm):
        try:
            _inject(vm)
        except PermissionError as error:
            if getattr(error, "winerror", None) != 32 or not error.filename:
                raise
            _deferred.add(error.filename)

    def _cleanup():
        for path in _deferred:
            try:
                os.unlink(path)
            except OSError:
                pass

    loader._inject_message_to_fd0 = _inject_on_windows
    atexit.register(_cleanup)
