export var PluginHook;
(function (PluginHook) {
    PluginHook["BEFORE_SEND"] = "BEFORE_SEND";
    PluginHook["AFTER_RECEIVE"] = "AFTER_RECEIVE";
    PluginHook["BEFORE_DISPLAY"] = "BEFORE_DISPLAY";
    PluginHook["ON_COMPOSE"] = "ON_COMPOSE";
    PluginHook["ON_SEARCH"] = "ON_SEARCH";
    PluginHook["ON_LABEL"] = "ON_LABEL";
    PluginHook["ON_DELETE"] = "ON_DELETE";
})(PluginHook || (PluginHook = {}));
export class PluginManager {
    plugins = new Map();
    registerPlugin(manifest) {
        if (!this.validatePluginManifest(manifest)) {
            throw new Error(`Invalid plugin manifest for ${manifest?.id || 'unknown'}`);
        }
        this.plugins.set(manifest.id, {
            ...manifest,
            enabled: true,
            priority: manifest.priority ?? 50
        });
    }
    async executeHook(hook, context) {
        const activePlugins = Array.from(this.plugins.values())
            .filter(p => p.enabled && p.hooks[hook])
            .sort((a, b) => b.priority - a.priority);
        let currentContext = { ...context };
        for (const plugin of activePlugins) {
            try {
                const handler = plugin.hooks[hook];
                const result = await Promise.resolve(handler(currentContext));
                if (result) {
                    currentContext = { ...currentContext, ...result };
                }
            }
            catch (err) {
                console.error('Plugin crashed on hook execution:', plugin.id, hook, err);
            }
        }
        return currentContext;
    }
    listPlugins() {
        return Array.from(this.plugins.values());
    }
    enablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (plugin)
            plugin.enabled = true;
    }
    disablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (plugin)
            plugin.enabled = false;
    }
    validatePluginManifest(manifest) {
        return Boolean(manifest &&
            typeof manifest.id === 'string' &&
            typeof manifest.name === 'string' &&
            typeof manifest.version === 'string' &&
            typeof manifest.hooks === 'object');
    }
}
export const pluginSystem = new PluginManager();
