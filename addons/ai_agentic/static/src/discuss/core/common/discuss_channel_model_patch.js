import { Thread } from "@mail/core/common/thread_model";
import { fields } from "@mail/model/export";
import { patch } from "@web/core/utils/patch";

// Backported from Odoo 20 (`DiscussChannel`); on Odoo 19 the channel is a Thread.
patch(Thread.prototype, {
    setup() {
        super.setup(...arguments);
        this.from_ai_automation = fields.Attr(false);
    },
});
