import { aiChannelBus } from "@ai/utils/ai_channel_bus";
import { AgentToolSummary } from "@ai/discuss/agent_tool_summary";
import { Thread } from "@mail/core/common/thread";
import { _t } from "@web/core/l10n/translation";
import { patch } from "@web/core/utils/patch";
import { useBus } from "@web/core/utils/hooks";

import { useState } from "@odoo/owl";

Thread.components = { ...Thread.components, AgentToolSummary };
patch(Thread.prototype, {
    setup() {
        super.setup();
        this.aiStepsGroupsVisibility = useState({});
        if (this.channel?.isAiChat) {
            useBus(aiChannelBus, "AI: Update Target Record", ({ detail }) => {
                const recordModel = detail.recordModel;
                const recordId = detail.recordId;
                if (
                    detail.targetRecord &&
                    this.channel.aiRootSession.res_model === recordModel &&
                    this.channel.aiRootSession.res_id === recordId
                ) {
                    this.channel.targetRecord = detail.targetRecord;
                    this.channel.aiSpecialActions = {
                        ...this.channel.aiSpecialActions,
                        ...this.channel.disabledActions,
                    };
                    this.channel.disabledActions = {};
                } else {
                    const { product_main_image, product_extra_image, ...remainingActions } =
                        this.channel.aiSpecialActions || {};
                    const disabledActions = {};
                    if (product_main_image) {
                        disabledActions.product_main_image = product_main_image;
                    }
                    if (product_extra_image) {
                        disabledActions.product_extra_image = product_extra_image;
                    }
                    this.channel.disabledActions = disabledActions;
                    this.channel.aiSpecialActions = remainingActions;
                }
            });
            useBus(aiChannelBus, "AI: Drop UseThis Action", () => {
                // ProductAddExtraImageAction reloads the editor after save which causes the useThis button to be removed.
                // We want to avoid that because the useThis button doesn't rely on the editor for saving in that specific case.
                if (this.channel.fromShopExtraImage) {
                    return;
                }
                const actions = this.channel.aiSpecialActions || {};
                delete actions.useThis;
            });
        }
    },
    // Odoo 19's Thread component has no `channel` shortcut (Odoo 20 split the
    // channel from the thread). Expose the channel so the templates work.
    get channel() {
        return this.props.thread.channel;
    },
    get showStartMessage() {
        if (this.channel?.isAiChat) {
            return this.state.mountedAndLoaded;
        }
        return super.showStartMessage;
    },
    get startMessageSubtitle() {
        if (this.channel?.isAiChat) {
            return this.channel.ai_agent_id?.subtitle || _t("Hello, what can I help you with?");
        } else {
            return super.startMessageSubtitle;
        }
    },
    onClickPromptButton(button) {
        this.props.thread.post(button.name, {}, { ai_prompt_button_ref: button.id });
    },
    get showPromptButtons() {
        return this.props.thread.messages.length === 0;
    },
    get sortedPromptButtons() {
        return (this.channel?.ai_prompt_buttons || []).sort((a, b) => a.sequence - b.sequence);
    },
    isSquashed(msg, prevMsg) {
        if (msg.aiAgentAuthored) {
            // author and date are added when starting a steps group
            return true;
        }
        return super.isSquashed(...arguments);
    },
    isStepsGroupShown(groupId) {
        return (
            this.aiStepsGroupsVisibility[groupId] ??
            (this.channel.aiSession?.config["show_agent_steps"] ||
                !!this.props.thread.store.debugMode.isActive())
        );
    },
    preserveScrollPosition() {
        this.props.thread.scrollTop = this.scrollableRef.el.scrollTop;
        this.lastSetValue = undefined;
    },
    toggleStepsGroupVisibility(groupId, preserveScroll = true) {
        if (preserveScroll) {
            this.preserveScrollPosition();
        }
        this.aiStepsGroupsVisibility[groupId] = !this.isStepsGroupShown(groupId);
    },
});
