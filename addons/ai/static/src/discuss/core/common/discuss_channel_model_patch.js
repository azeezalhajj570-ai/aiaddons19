import { aiChannelDataRegistry } from "@ai/utils/ai_channel_data_registry";
import { Thread } from "@mail/core/common/thread_model";
import { fields } from "@mail/model/export";
import { patch } from "@web/core/utils/patch";

// Backported from Odoo 20 (`DiscussChannel`). On Odoo 19 a discuss channel is a
// `Thread`, so the AI channel state lives directly on `Thread.prototype`.
patch(Thread.prototype, {
    setup() {
        super.setup(...arguments);
        this.ai_prompt_buttons = fields.Many("ai.prompt.button");
        this.ai_agent_id = fields.One("ai.agent");
        this.ai_session_ids = fields.Many("ai.session", { inverse: "channel_id" });
        this.aiInputSession = fields.One("ai.session");
        this.suggestedAiChannel = fields.One("Thread");
        this.isAiGenerating = fields.Attr(false);
        this.isAiSubmitting = fields.Attr(false);
        /** @type {number|undefined} record the AI chat was started from */
        this.aiChatSource = fields.Attr(undefined);
        /** @type {Object|undefined} actions offered by the caller of the AI chat */
        this.aiSpecialActions = fields.Attr(undefined);
        /** @type {Object|undefined} */
        this.targetRecord = fields.Attr(undefined);
        /** @type {Object|undefined} */
        this.textSelection = fields.Attr(undefined);
        /** @type {Object|undefined} actions the AI chat disables on its thread */
        this.disabledActions = fields.Attr(undefined);
        /** @type {boolean|undefined} AI chat opened from a shop extra-image media dialog */
        this.fromShopExtraImage = fields.Attr(undefined);
        this.are_prompts_from_local_storage = fields.Attr(true);
    },
    get aiRootSession() {
        return this.ai_session_ids.find((session) => !session.parent_session_id);
    },
    get displayName() {
        if (this.isAiChat && !this.display_name && this.ai_agent_id) {
            return this.ai_agent_id.name;
        }
        return super.displayName;
    },
    get isAiChat() {
        return this.channel_type === "ai_chat";
    },
    get aiSession() {
        return this.aiRootSession;
    },
    get aiMember() {
        return this.channel_member_ids?.find((member) => member.isAiAgent);
    },
    get importantCounter() {
        if (this.isAiChat) {
            const newestMessage = this.newestPersistentMessage;
            if (newestMessage?.aiIsAgentStep || newestMessage?.aiIsToolUse) {
                return 0;
            }
        }
        return super.importantCounter;
    },
    async deleteAiChatRpc() {
        const channelId = this.id;
        await this.store.env.services.orm.silent.call("discuss.channel", "unlink", [channelId]);
        aiChannelDataRegistry.removeData(channelId);
    },
});
