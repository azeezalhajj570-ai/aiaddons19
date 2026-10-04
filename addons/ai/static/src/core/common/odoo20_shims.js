import { Store } from "@mail/core/common/store_service";
import { Thread } from "@mail/core/common/thread_model";
import { patch } from "@web/core/utils/patch";

// Odoo 20 lets models be read through their server name (`store["mail.thread"]`,
// `store["discuss.channel"]`); Odoo 19 keys them by JS class name (`store.Thread`).
// Both server names map to `Thread` in Odoo 19.
for (const pyModelName of ["mail.thread", "discuss.channel"]) {
    Object.defineProperty(Store.prototype, pyModelName, {
        configurable: true,
        get() {
            return this.Thread;
        },
    });
}

// The AI stack is backported from Odoo 20, where a `discuss.channel` is a
// `DiscussChannel` record distinct from the generic `Thread`. In Odoo 19 the
// channel *is* the thread, so exposing the channel as the thread itself keeps
// the backported code (`thread.channel.isAiChat`, `this.channel.ai_session_ids`,
// …) working. Non-channel threads (mail.box, …) have no channel.
patch(Thread.prototype, {
    get channel() {
        return this.model === "discuss.channel" ? this : undefined;
    },
});

// Odoo 20 reads the debug flag through the store; Odoo 19 keeps it on env.
patch(Store.prototype, {
    get debugMode() {
        return { isActive: () => Boolean(this.env.debug) };
    },
    // Odoo 20 added `ai_chat` to the chat channel types so AI chats show up in
    // the messaging menu / Discuss "Chats" list. Odoo 19 only knows chat/group.
    tabToThreadType(tab) {
        const types = super.tabToThreadType(tab);
        if (tab === "chat" && !types.includes("ai_chat")) {
            return [...types, "ai_chat"];
        }
        return types;
    },
});
