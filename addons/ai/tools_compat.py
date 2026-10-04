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
    can be imported on 19.

    Odoo 20 additionally accepts a *callable* field builder as the ``fields``
    argument of ``Store.add`` (``lambda res: res.attr(...) / res.one(...) /
    res.many(...) / res.from_method(...)``) and ``comodel`` method names as
    sub-field lists. Odoo 19 only understands a list of field names and
    ``Store.Attr/One/Many`` descriptors. The shim below translates the 20
    builder API into the 19 one so the backported ``_store_*_fields`` methods
    keep working unmodified.
    """
    from odoo.addons.mail.tools.discuss import Store

    if not hasattr(Store, 'FieldList'):
        Store.FieldList = dict

    if getattr(Store.add, '_ai_compat', False):
        return

    class _FieldList:
        """Odoo 20 ``Store.FieldList`` builder emulation for Odoo 19."""

        def __init__(self, store, records):
            self._store = store
            self._records = records
            self.fields = []

        @property
        def target(self):
            return self._store.target

        def attr(self, field_name, value=None, *, predicate=None, sudo=False):
            self.fields.append(Store.Attr(field_name, value, predicate=predicate, sudo=sudo))
            return self

        def one(self, field_name, fields=None, *, predicate=None, sudo=False, value=None, **kwargs):
            self.fields.append(
                Store.One(field_name, fields, predicate=predicate, sudo=sudo, value=value, **kwargs)
            )
            return self

        def many(self, field_name, fields=None, *, predicate=None, sudo=False, value=None, **kwargs):
            self.fields.append(
                Store.Many(field_name, fields, predicate=predicate, sudo=sudo, value=value, **kwargs)
            )
            return self

        def extend(self, fields):
            self.fields.extend(fields)
            return self

        def from_method(self, method_name):
            getattr(self._records, method_name)(self)
            return self

    original_add = Store.add

    def add(self, records, fields=None, extra_fields=None, as_thread=False, **kwargs):
        if callable(fields) and not isinstance(fields, type):
            builder = _FieldList(self, records)
            fields(builder)
            fields = builder.fields
        elif isinstance(fields, str):
            # Odoo 20 uses a method name (e.g. "_store_session_fields") to extend
            # the field list, whereas Odoo 19 uses a plain field name. Only treat
            # the string as a method when the model actually exposes one.
            method = getattr(records, fields, None)
            if callable(method):
                builder = _FieldList(self, records)
                method(builder)
                fields = builder.fields
        return original_add(self, records, fields, extra_fields, as_thread, **kwargs)

    add._ai_compat = True
    Store.add = add
    Store.FieldList = _FieldList


_patch_mail_store()
