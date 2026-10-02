FROM norotec/odoo19-enterprise-bypass:enterprise

USER root

# The backported Odoo 20 AI modules render markdown through markdown2.
RUN pip3 install --no-cache-dir --break-system-packages markdown2

# Remove the Odoo 19 AI modules.
# The AI stack is backported from Odoo 20 and shipped through /mnt/extra-addons.
# The built-in 19 AI modules either auto-install against the new base (and thus
# fail to load) or would shadow the backported ones (built-in addons take
# precedence in the addons path). Removing them leaves the backported set as the
# single source of truth.
RUN rm -rf \
    /opt/odoo/odoo/addons/ai \
    /opt/odoo/odoo/addons/ai_account \
    /opt/odoo/odoo/addons/ai_app \
    /opt/odoo/odoo/addons/ai_auto_install \
    /opt/odoo/odoo/addons/ai_crm \
    /opt/odoo/odoo/addons/ai_crm_livechat \
    /opt/odoo/odoo/addons/ai_documents \
    /opt/odoo/odoo/addons/ai_documents_account \
    /opt/odoo/odoo/addons/ai_documents_source \
    /opt/odoo/odoo/addons/ai_fields \
    /opt/odoo/odoo/addons/ai_knowledge \
    /opt/odoo/odoo/addons/ai_livechat \
    /opt/odoo/odoo/addons/ai_server_actions \
    /opt/odoo/odoo/addons/ai_website \
    /opt/odoo/odoo/addons/ai_website_livechat
