import { patch } from "@web/core/utils/patch";
import { registerComposerAction, ComposerAction } from "@mail/core/common/composer_actions";
import { Component } from "@odoo/owl";
import { AiSessionToggle } from "@ai/components/ai_composer_actions_selectors/ai_session_toggle";
import { _t } from "@web/core/l10n/translation";

patch(ComposerAction.prototype, {
    _getAiComposerActions() {
        return [
            "send-message",
            "upload-files",
            "voice-start",
            "voice-recording",
            "voice-transcribing",
            "toggle-think-longer",
            "toggle-restrict-to-resources",
            "toggle-web-search",
            "toggle-action-auto-approve",
            "toggle-agent-steps",
        ];
    },
    _condition({ composer, owner }) {
        if (composer.targetThread?.channel?.isAiChat) {
            const hasText = !!composer.composerText;
            const hasAttachments = composer.attachments && composer.attachments.length > 0;

            // Replace "empty" Send button with Dictate
            if (this.id === "send-message" && !hasText && !hasAttachments) {
                return false;
            }
            // Replace Dictate with Send or Recorder
            if (this.id === "voice-start" && hasText) {
                return false;
            }
            if (this.id === "voice-start" && owner?.voiceTranscription?.isTranscribing) {
                return false;
            }
        }

        if (
            composer.targetThread?.channel?.isAiChat &&
            !this._getAiComposerActions().includes(this.id)
        ) {
            return false;
        }
        return super._condition(...arguments);
    },
    _name({ composer }) {
        if (composer.targetThread?.channel?.isAiChat) {
            if (this.id === "send-message") {
                return _t("Send (%(keyboard_command)s)", { keyboard_command: "Enter" });
            }
            if (this.id === "voice-start") {
                return _t("Voice Message (%(keyboard_command)s)", { keyboard_command: "Alt+V" });
            }
        }
        return super._name(...arguments);
    },
    _sequence({ composer }) {
        if (composer.targetThread?.channel?.isAiChat && this.id === "voice-start") {
            // Remove the microphone from the bottom "Extra Actions" toolbar
            return undefined;
        }
        return super._sequence(...arguments);
    },
    _sequenceQuick({ composer }) {
        if (composer.targetThread?.channel?.isAiChat && this.id === "voice-start") {
            // Place microphone next to text input
            return 25;
        }
        return super._sequenceQuick(...arguments);
    },
});

registerComposerAction("voice-transcribing", {
    component: class VoiceMessageTranscribingSpinner extends Component {
        static template = "ai.VoiceMessageTranscribingSpinner";
    },
    condition: ({ composer, owner }) =>
        composer.targetThread?.channel?.isAiChat && owner?.voiceTranscription?.isTranscribing,
    sequenceQuick: 11,
});

registerComposerAction("toggle-action-auto-approve", {
    component: AiSessionToggle,
    componentProps: ({ composer }) => ({
        aiSession: composer.targetThread.channel.aiSession,
        configAttribute: "auto_confirm",
        icon: "fa fa-check-circle",
        label: _t("Auto-Approve Actions"),
    }),
    condition: ({ composer }) => composer.targetThread?.channel?.isAiChat,
    sequence: 20,
});

registerComposerAction("toggle-web-search", {
    component: AiSessionToggle,
    componentProps: ({ composer }) => ({
        aiSession: composer.targetThread.channel.aiSession,
        configAttribute: "enable_web_search",
        icon: "fa fa-search",
        label: _t("Web Search"),
    }),
    condition: ({ composer }) => composer.targetThread?.channel?.isAiChat,
    sequence: 21,
});

registerComposerAction("toggle-restrict-to-resources", {
    component: AiSessionToggle,
    componentProps: ({ composer }) => ({
        aiSession: composer.targetThread.channel.aiSession,
        configAttribute: "enable_resources_only",
        icon: "fa fa-book",
        label: _t("Restrict to Sources"),
    }),
    condition: ({ composer }) =>
        composer.targetThread?.channel?.isAiChat &&
        (composer.targetThread?.channel?.ai_agent_id?.sources_ids?.length ?? 0) > 0,
    sequence: 22,
});

registerComposerAction("toggle-agent-steps", {
    component: AiSessionToggle,
    componentProps: ({ composer }) => ({
        aiSession: composer.targetThread.channel.aiSession,
        configAttribute: "show_agent_steps",
        icon: "fa fa-check-square-o",
        label: _t("Show Steps"),
    }),
    condition: ({ composer }) => composer.targetThread?.channel?.isAiChat,
    sequence: 23,
});

registerComposerAction("toggle-think-longer", {
    component: AiSessionToggle,
    componentProps: ({ composer }) => ({
        aiSession: composer.targetThread.channel.aiSession,
        configAttribute: "enable_think_longer",
        icon: "fa fa-lightbulb-o",
        label: _t("Think Longer"),
    }),
    condition: ({ composer }) => composer.targetThread?.channel?.isAiChat,
    sequence: 24,
});
