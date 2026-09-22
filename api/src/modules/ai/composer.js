export class AiComposerModule {
    ai;
    fallbackResponses = [
        "Thank you for your email. I'll get back to you soon.",
        "Noted. I'll take a look and revert.",
        "Could you provide more details?",
    ];
    constructor(envAi) {
        this.ai = envAi; // The Workers AI binding
    }
    getPromptForTone(tone = 'professional', prompt) {
        return `Write a ${tone} email about the following: ${prompt}`;
    }
    async generateDraft(prompt, options) {
        if (!this.ai)
            return this.fallback();
        const finalPrompt = this.getPromptForTone(options?.tone, prompt) +
            (options?.context ? `\nContext: ${options.context}` : '');
        try {
            const response = await this.ai.run('@cf/meta/llama-2-7b-chat-int8', {
                messages: [{ role: 'user', content: finalPrompt }]
            });
            return response.response;
        }
        catch (e) {
            return this.fallback();
        }
    }
    async expandDraft(shortText) {
        if (!this.ai)
            return shortText;
        const prompt = `Expand the following bullet points into a full, professional email:\n${shortText}`;
        try {
            const response = await this.ai.run('@cf/meta/llama-2-7b-chat-int8', {
                messages: [{ role: 'user', content: prompt }]
            });
            return response.response;
        }
        catch (e) {
            return shortText;
        }
    }
    async replyDraft(originalEmail, instruction) {
        if (!this.ai)
            return this.fallback();
        const prompt = `Draft a reply to this email:\n"""${originalEmail}"""\nInstructions: ${instruction}`;
        try {
            const response = await this.ai.run('@cf/meta/llama-2-7b-chat-int8', {
                messages: [{ role: 'user', content: prompt }]
            });
            return response.response;
        }
        catch (e) {
            return this.fallback();
        }
    }
    fallback() {
        return this.fallbackResponses[Math.floor(Math.random() * this.fallbackResponses.length)];
    }
}
