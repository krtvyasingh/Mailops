/**
 * Module: Honeytoken Spam Trap Detector
 *
 * Manages decoy email addresses designed to catch scrapers and malicious spammers,
 * automatically training local Bayesian filters on trapped spam.
 */
export class HoneytokenManager {
    traps = new Map();
    registerTrap(address, trapType) {
        this.traps.set(address.toLowerCase(), {
            address: address.toLowerCase(),
            trapType,
            created: Date.now(),
            triggeredCount: 0
        });
    }
    isTrap(address) {
        return this.traps.has(address.toLowerCase());
    }
    recordTrigger(address) {
        const trap = this.traps.get(address.toLowerCase());
        if (trap) {
            trap.triggeredCount++;
            return trap;
        }
        return null;
    }
}
