from odoo import fields, models


class ResUsersApikeysShow(models.AbstractModel):
    _inherit = 'res.users.apikeys.show'

    # Odoo 20 added these fields to the API key "show" model so the MCP
    # connection details can be displayed. Odoo 19 only has ``id``/``key``.
    scope = fields.Char(readonly=True)
    base_url = fields.Char(readonly=True)
