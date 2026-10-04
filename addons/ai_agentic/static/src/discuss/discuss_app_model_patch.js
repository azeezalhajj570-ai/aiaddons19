import { DiscussApp } from "@mail/core/public_web/discuss_app_model";
import { fields } from "@mail/model/export";
import { patch } from "@web/core/utils/patch";

// Backported from Odoo 20; Odoo 19's DiscussApp has no `sidebarState` tab model,
// so only the agent-scoping state is kept here.
patch(DiscussApp.prototype, {
    setup() {
        super.setup(...arguments);
        this.scopedAiAgentId = fields.Attr(undefined);
    },

    setScopedAiAgent(id) {
        const agentId = Number(id);
        if (agentId !== this.scopedAiAgentId) {
            this.scopedAiAgentId = agentId;
        }
    },

    clearScopedAiAgent() {
        this.scopedAiAgentId = undefined;
    },

    get scopedAgent() {
        return this.scopedAiAgentId ? this.store["ai.agent"].get(this.scopedAiAgentId) : undefined;
    },

    isChannelInScopedAiAgent(channel) {
        return Boolean(this.scopedAiAgentId) && channel?.ai_agent_id?.id === this.scopedAiAgentId;
    },
});
