import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument } from '../../../slash-commands/SlashCommandArgument.js';
import { commonEnumProviders } from '../../../slash-commands/SlashCommandCommonEnumsProvider.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { isTrueBoolean } from '../../../utils.js';

export default 'MessageLimit'; // Init ES module

const context = SillyTavern.getContext();
const settingsKey = 'messageLimit';

/**
 * @type {MessageLimitSettings}
 * @typedef {Object} MessageLimitSettings
 * @property {boolean} enabled - Whether the extension is enabled.
 * @property {boolean} quietPrompts - Whether to apply the message limit to quiet prompts.
 * @property {number} limit - Maximum number of messages to send.
 * @property {number} advanceCount - Number of messages to advance by when trimming chat.
 */
const defaultSettings = Object.freeze({
    enabled: false,
    quietPrompts: false,
    limit: 10,
    advanceCount: 1,
});

/**
 * Intercepts message generation to limit the number of messages.
 * @param {object[]} chat Chat messages
 * @param {number} _contextSize Context size (not used)
 * @param {function} _abort Abort function (not used)
 * @param {string} type Generation type
 */
globalThis.MessageLimit_interceptGeneration = function (chat, _contextSize, _abort, type) {
    /** @type {MessageLimitSettings} */
    const settings = context.extensionSettings[settingsKey];
    if (!settings.enabled) {
        return;
    }
    if (type === 'quiet' && !settings.quietPrompts) {
        return;
    }
    if (chat.length > settings.limit) {
        const overage = (chat.length - settings.limit) % settings.advanceCount;
        const targetLength = overage === 0 
            ? settings.limit 
            : settings.limit - settings.advanceCount + overage;
        
        chat.splice(0, chat.length - targetLength);
    }
};

function addSettings() {
    /** @type {MessageLimitSettings} */
    const settings = context.extensionSettings[settingsKey];

    const settingsContainer = document.getElementById('message_limit_container') ?? document.getElementById('extensions_settings');
    if (!settingsContainer) {
        return;
    }

    const inlineDrawer = document.createElement('div');
    inlineDrawer.classList.add('inline-drawer');
    settingsContainer.append(inlineDrawer);

    const inlineDrawerToggle = document.createElement('div');
    inlineDrawerToggle.classList.add('inline-drawer-toggle', 'inline-drawer-header');

    const extensionName = document.createElement('b');
    extensionName.textContent = context.t`Message Limit`;

    const inlineDrawerIcon = document.createElement('div');
    inlineDrawerIcon.classList.add('inline-drawer-icon', 'fa-solid', 'fa-circle-chevron-down', 'down');

    inlineDrawerToggle.append(extensionName, inlineDrawerIcon);

    const inlineDrawerContent = document.createElement('div');
    inlineDrawerContent.classList.add('inline-drawer-content');

    inlineDrawer.append(inlineDrawerToggle, inlineDrawerContent);

    // Enabled
    const enabledCheckboxLabel = document.createElement('label');
    enabledCheckboxLabel.classList.add('checkbox_label', 'marginBot5');
    enabledCheckboxLabel.htmlFor = 'messageLimitEnabled';
    const enabledCheckbox = document.createElement('input');
    enabledCheckbox.id = 'messageLimitEnabled';
    enabledCheckbox.type = 'checkbox';
    enabledCheckbox.checked = settings.enabled;
    enabledCheckbox.addEventListener('change', () => {
        settings.enabled = enabledCheckbox.checked;
        context.saveSettingsDebounced();
    });
    const enabledCheckboxText = document.createElement('span');
    enabledCheckboxText.textContent = context.t`Enabled`;
    enabledCheckboxLabel.append(enabledCheckbox, enabledCheckboxText);
    inlineDrawerContent.append(enabledCheckboxLabel);

    // Apply to quiet prompts
    const quietPromptsCheckboxLabel = document.createElement('label');
    quietPromptsCheckboxLabel.classList.add('checkbox_label', 'marginBot5');
    quietPromptsCheckboxLabel.htmlFor = 'messageLimitQuietPrompts';
    const quietPromptsCheckbox = document.createElement('input');
    quietPromptsCheckbox.id = 'messageLimitQuietPrompts';
    quietPromptsCheckbox.type = 'checkbox';
    quietPromptsCheckbox.checked = settings.quietPrompts;
    quietPromptsCheckbox.addEventListener('change', () => {
        settings.quietPrompts = quietPromptsCheckbox.checked;
        context.saveSettingsDebounced();
    });
    const quietPromptsCheckboxText = document.createElement('span');
    quietPromptsCheckboxText.textContent = context.t`Apply to background prompts`;
    quietPromptsCheckboxLabel.title = context.t`Background prompts = extensions, /commands, etc.`;
    const quietPromptsCheckboxTooltip = document.createElement('span');
    quietPromptsCheckboxTooltip.classList.add('fa-solid', 'fa-circle-info', 'opacity50p');
    quietPromptsCheckboxLabel.append(quietPromptsCheckbox, quietPromptsCheckboxText, quietPromptsCheckboxTooltip);
    inlineDrawerContent.append(quietPromptsCheckboxLabel);

    // Limit
    const parentSelectLabel = document.createElement('label');
    parentSelectLabel.htmlFor = 'messageLimitValue';
    parentSelectLabel.textContent = context.t`Maximum messages to send`;
    const limitInput = document.createElement('input');
    limitInput.id = 'messageLimitValue';
    limitInput.type = 'number';
    limitInput.min = String(0);
    limitInput.max = String(100000);
    limitInput.step = String(1);
    limitInput.value = String(settings.limit);
    limitInput.classList.add('text_pole');
    limitInput.addEventListener('input', () => {
        settings.limit = Math.max(0, Math.round(Number(limitInput.value)));
        context.saveSettingsDebounced();
    });
    inlineDrawerContent.append(parentSelectLabel, limitInput);

    // Advance Count
    const advanceCountLabel = document.createElement('label');
    advanceCountLabel.htmlFor = 'messageLimitAdvanceCount';
    advanceCountLabel.textContent = context.t`Messages to advance by`;
    const advanceCountInput = document.createElement('input');
    advanceCountInput.id = 'messageLimitAdvanceCount';
    advanceCountInput.type = 'number';
    advanceCountInput.min = String(1);
    advanceCountInput.max = String(100000);
    advanceCountInput.step = String(1);
    advanceCountInput.value = String(settings.advanceCount);
    advanceCountInput.classList.add('text_pole');
    advanceCountInput.title = context.t`Number of messages to remove at a time when trimming chat. Higher values keep the oldest messages constant longer, which helps with context caching.`;
    advanceCountInput.addEventListener('input', () => {
        settings.advanceCount = Math.max(1, Math.round(Number(advanceCountInput.value)));
        context.saveSettingsDebounced();
    });
    inlineDrawerContent.append(advanceCountLabel, advanceCountInput);
}

function addCommands() {
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'ml-state',
        helpString: 'Change the message limit state. If no argument is provided, return the current state.',
        returns: 'boolean',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Desired state of the message limit.',
                typeList: ARGUMENT_TYPE.STRING,
                isRequired: true,
                acceptsMultiple: false,
                enumProvider: commonEnumProviders.boolean('onOffToggle'),
            }),
        ],
        callback: (_, state) => {
            if (state && typeof state === 'string') {
                switch (String(state).trim().toLowerCase()) {
                    case 'toggle':
                    case 't':
                        context.extensionSettings[settingsKey].enabled = !context.extensionSettings[settingsKey].enabled;
                        break;
                    default:
                        context.extensionSettings[settingsKey].enabled = isTrueBoolean(String(state));
                }

                const checkbox = document.getElementById('messageLimitEnabled');
                if (checkbox instanceof HTMLInputElement) {
                    checkbox.checked = context.extensionSettings[settingsKey].enabled;
                    checkbox.dispatchEvent(new Event('input', { bubbles: true }));
                }

                context.saveSettingsDebounced();
            }

            return String(context.extensionSettings[settingsKey].enabled);
        },
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'ml-quiet',
        helpString: 'Change the message limit state for background (quiet) prompts. If no argument is provided, return the current state.',
        returns: 'boolean',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Desired state of the message limit for background prompts.',
                typeList: ARGUMENT_TYPE.STRING,
                isRequired: true,
                acceptsMultiple: false,
                enumProvider: commonEnumProviders.boolean('onOffToggle'),
            }),
        ],
        callback: (_, state) => {
            if (state && typeof state === 'string') {
                switch (String(state).trim().toLowerCase()) {
                    case 'toggle':
                    case 't':
                        context.extensionSettings[settingsKey].quietPrompts = !context.extensionSettings[settingsKey].quietPrompts;
                        break;
                    default:
                        context.extensionSettings[settingsKey].quietPrompts = isTrueBoolean(String(state));
                }

                const checkbox = document.getElementById('messageLimitQuietPrompts');
                if (checkbox instanceof HTMLInputElement) {
                    checkbox.checked = context.extensionSettings[settingsKey].quietPrompts;
                    checkbox.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }

            return String(context.extensionSettings[settingsKey].quietPrompts);
        },
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'ml-limit',
        helpString: 'Set the maximum number of messages to send. If no argument is provided, return the current limit.',
        returns: 'number',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Maximum number of messages to send. Must be a positive integer or zero.',
                typeList: ARGUMENT_TYPE.NUMBER,
                isRequired: true,
                acceptsMultiple: false,
            }),
        ],
        callback: (_, limit) => {
            if (limit && typeof limit === 'string') {
                if (isNaN(Number(limit)) || !isFinite(Number(limit))) {
                    throw new Error('Limit must be a finite number.');
                }

                context.extensionSettings[settingsKey].limit = Math.max(0, Math.round(Number(limit)));

                const input = document.getElementById('messageLimitValue');
                if (input instanceof HTMLInputElement) {
                    input.value = String(context.extensionSettings[settingsKey].limit);
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }

                context.saveSettingsDebounced();
            }

            return String(context.extensionSettings[settingsKey].limit);
        },
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'ml-advance',
        helpString: 'Set the number of messages to advance by when trimming chat. If no argument is provided, return the current advance count.',
        returns: 'number',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Number of messages to advance by. Must be a positive integer.',
                typeList: ARGUMENT_TYPE.NUMBER,
                isRequired: false,
                acceptsMultiple: false,
            }),
        ],
        callback: (_, advanceCount) => {
            if (advanceCount && typeof advanceCount === 'string') {
                if (isNaN(Number(advanceCount)) || !isFinite(Number(advanceCount))) {
                    throw new Error('Advance count must be a finite number.');
                }

                context.extensionSettings[settingsKey].advanceCount = Math.max(1, Math.round(Number(advanceCount)));

                const input = document.getElementById('messageLimitAdvanceCount');
                if (input instanceof HTMLInputElement) {
                    input.value = String(context.extensionSettings[settingsKey].advanceCount);
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }

                context.saveSettingsDebounced();
            }

            return String(context.extensionSettings[settingsKey].advanceCount);
        },
    }));
}

(function initExtension() {
    if (!context.extensionSettings[settingsKey]) {
        context.extensionSettings[settingsKey] = structuredClone(defaultSettings);
    }

    for (const key of Object.keys(defaultSettings)) {
        if (context.extensionSettings[settingsKey][key] === undefined) {
            context.extensionSettings[settingsKey][key] = defaultSettings[key];
        }
    }

    addSettings();
    addCommands();
})();
