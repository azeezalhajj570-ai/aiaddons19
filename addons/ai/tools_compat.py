# Part of Odoo. See LICENSE file for full copyright and licensing details.
#
# Odoo 19 compatibility shims for symbols that only exist in Odoo 20's core.
# These are needed because the AI modules are backported from Odoo 20.
import base64
import hashlib
import io
import psycopg2

# ``odoo.tools.BinaryBytes`` (odoo/tools/binary.py) was introduced in 20.
try:
    from odoo.tools.binary import BinaryBytes, BinaryValue
except ImportError:
    from collections.abc import Buffer

    class BinaryValue(Buffer):
        """Proxy object around bytes content (Odoo 20 ``odoo.tools.binary``)."""
        __slots__ = ()

        def open(self) -> io.IOBase:
            return io.BytesIO(self.content)

        @property
        def content(self) -> bytes:
            raise NotImplementedError

        @property
        def filename(self) -> str:
            return ''

        @property
        def mimetype(self) -> str:
            from odoo.tools.mimetypes import guess_mimetype
            return guess_mimetype(self.content, '')

        @property
        def size(self) -> int:
            return len(self.content)

        @property
        def len(self):
            return self.size

        def __bytes__(self):
            return self.content

        def __buffer__(self, flags: int) -> memoryview:
            return memoryview(self.content)

        def __copy__(self):
            return self

        def __deepcopy__(self, memo):
            return self.__copy__()

        def to_base64(self) -> str:
            return base64.b64encode(self).decode()

        def decode(self, encoding="utf-8", errors="strict") -> str:
            return self.content.decode(encoding, errors)

        @property
        def checksum(self) -> str:
            return hashlib.sha256(self).hexdigest()

    class BinaryBytes(BinaryValue):
        """Static binary value."""
        __slots__ = ('__checksum', '__data', '__filename')

        def __init__(self, data, filename: str = ''):
            self.__data = bytes(data)
            self.__filename = str(filename or '')
            self.__checksum = None

        @property
        def content(self):
            return self.__data

        @property
        def filename(self):
            return self.__filename

        @property
        def checksum(self):
            if self.__checksum is None:
                self.__checksum = super().checksum
            return self.__checksum

        def __bool__(self):
            return bool(self.__data)

        def __repr__(self):
            data = self.__data
            if len(data) > 30:
                data = data[:27] + b'...'
            return f"Binary({data!r}, filename={self.__filename!r})"

    EMPTY_BINARY = BinaryBytes(b'')

# ``odoo.sql_db.PG_CONCURRENCY_EXCEPTIONS_TO_RETRY`` was introduced in 20.
try:
    from odoo.sql_db import PG_CONCURRENCY_EXCEPTIONS_TO_RETRY  # noqa: F401
except ImportError:
    PG_CONCURRENCY_EXCEPTIONS_TO_RETRY = (
        psycopg2.errors.LockNotAvailable,
        psycopg2.errors.SerializationFailure,
        psycopg2.errors.DeadlockDetected,
    )

# ``odoo.tools.mimetypes.MIMETYPE_HEAD_SIZE`` was introduced in 20.
try:
    from odoo.tools.mimetypes import MIMETYPE_HEAD_SIZE  # noqa: F401
except ImportError:
    MIMETYPE_HEAD_SIZE = 4096


def _patch_iap_jsonrpc():
    """Odoo 20 added the ``raise_user_error`` keyword to ``iap_jsonrpc``."""
    from odoo.addons.iap.tools import iap_tools

    original = iap_tools.iap_jsonrpc
    if getattr(original, '_ai_compat', False):
        return

    def iap_jsonrpc(*args, **kwargs):
        kwargs.pop('raise_user_error', None)
        return original(*args, **kwargs)

    iap_jsonrpc._ai_compat = True
    iap_tools.iap_jsonrpc = iap_jsonrpc


_patch_iap_jsonrpc()


def _patch_mail_store():
    """``Store.FieldList`` (a typing alias for stored field lists) was introduced
    in 20 and is only used in annotations. Provide a placeholder so the modules
    can be imported on 19."""
    from odoo.addons.mail.tools.discuss import Store

    if not hasattr(Store, 'FieldList'):
        Store.FieldList = dict


_patch_mail_store()
