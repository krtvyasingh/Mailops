/**
 * Module: Honeytoken Spam Trap Detector
 * 
 * Manages decoy email addresses designed to catch scrapers and malicious spammers,
 * automatically training local Bayesian filters on trapped spam.
 */

export interface HoneytokenAccount {
  address: string;
  trapType: 'web_scraped' | 'breach_seeded' | 'darkweb';
  created: number;
  triggeredCount: number;
}

export class HoneytokenManager {
  private traps: Map<string, HoneytokenAccount> = new Map();

  public registerTrap(address: string, trapType: HoneytokenAccount['trapType']): void {
    this.traps.set(address.toLowerCase(), {
      address: address.toLowerCase(),
      trapType,
      created: Date.now(),
      triggeredCount: 0
    });
  }

  public isTrap(address: string): boolean {
    return this.traps.has(address.toLowerCase());
  }

  public recordTrigger(address: string): HoneytokenAccount | null {
    const trap = this.traps.get(address.toLowerCase());
    if (trap) {
      trap.triggeredCount++;
      return trap;
    }
    return null;
  }
}
