import type { FusionOutput } from './types';
import { hasSourceDisagreement } from './fusion';

export type VerificationStatus = 'verified' | 'single-source' | 'disputed';

export interface VerificationResult {
  status: VerificationStatus;
  sourceCount: number;
  /** i18n key explaining the status. */
  messageKey: string;
}

/**
 * Classifies how trustworthy the fused result is:
 *  - verified: 2+ sources that agree
 *  - disputed: 2+ sources that disagree beyond tolerance
 *  - single-source: only one provider responded
 */
export function verify(fusion: FusionOutput): VerificationResult {
  const sourceCount = fusion.contributors.length;
  if (sourceCount <= 1) {
    return {
      status: 'single-source',
      sourceCount,
      messageKey: 'verification.singleSource',
    };
  }
  if (hasSourceDisagreement(fusion.contributors)) {
    return {
      status: 'disputed',
      sourceCount,
      messageKey: 'verification.disputed',
    };
  }
  return {
    status: 'verified',
    sourceCount,
    messageKey: 'verification.verified',
  };
}
