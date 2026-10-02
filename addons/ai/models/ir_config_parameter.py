from odoo import api, models


class IrConfigParameter(models.Model):
    _inherit = 'ir.config_parameter'

    # Odoo 20 added typed getters on ir.config_parameter. Odoo 19 only has
    # ``get_param``. These shims keep the backported AI code working.

    @api.model
    def get_str(self, key, default=''):
        value = self.sudo().get_param(key)
        return value if value not in (False, None) else default

    @api.model
    def get_int(self, key, default=0):
        value = self.sudo().get_param(key)
        if value in (False, None, ''):
            return default
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    @api.model
    def get_float(self, key, default=0.0):
        value = self.sudo().get_param(key)
        if value in (False, None, ''):
            return default
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    @api.model
    def get_bool(self, key, default=False):
        value = self.sudo().get_param(key)
        if value in (False, None, ''):
            return default
        return str(value).lower() in ('1', 'true', 'yes', 'on')
