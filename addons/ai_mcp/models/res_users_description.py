from odoo import fields, models


class ResUsersApikeysDescription(models.TransientModel):
    _inherit = 'res.users.apikeys.description'

    # Odoo 20 defines ``scope`` as a Selection on this wizard and extends it with
    # ``selection_add=[('mcp', 'MCP')]``. Odoo 19 has no ``scope`` field here, so
    # the whole selection must be declared instead of extended.
    scope = fields.Selection(
        selection=[('rpc', 'RPC'), ('mcp', 'MCP')],
        default='rpc',
        string='Scope',
    )

    def _default_duration(self):
        # Added in 20, used by the MCP OAuth controllers.
        return self._selection_duration()[0][0]
