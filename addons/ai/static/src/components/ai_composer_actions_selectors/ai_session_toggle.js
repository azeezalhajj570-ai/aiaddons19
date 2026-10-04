import { Component, t, useProps } from "@odoo/owl";
import { CheckboxItem } from "@web/core/dropdown/checkbox_item";

export class AiSessionToggle extends Component {
    static template = "ai.SessionToggle";
    static components = { CheckboxItem };

    props = useProps({
        aiSession: t.object(),
        configAttribute: t.string(),
        icon: t.string().optional(),
        label: t.string(),
    });

    setup() {
        this.attr = this.props.configAttribute;
    }

    get checked() {
        return Boolean(this.props.aiSession.config?.[this.attr]);
    }

    toggle() {
        const { aiSession, configAttribute } = this.props;
        aiSession.updateConfig(configAttribute, !aiSession.config?.[configAttribute]);
    }
}
