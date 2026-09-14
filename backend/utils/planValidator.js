/**
 * Comprehensive Validator for PIP and PDP Plan Title and Instructions
 * 
 * Rules:
 * - Title: 10–255 characters and at least 2 words.
 * - Instructions: 30–5000 characters and at least 5 words.
 * - Trim whitespace.
 * - Reject punctuation-only, character repeats, and pure filler placeholders (e.g. asdf, qwerty, abc, xyz).
 * - Do NOT reject legitimate sentences merely because they contain words such as "test", "sample", or "documentation".
 */

const PURE_PLACEHOLDER_REGEX = /^(asdf|qwerty|abc|xyz|123|1234|aaa|bbb|ccc|zzz|dummy|placeholder|lorem|ipsum|filler|foo|bar|baz|test|testing|sample|temp|note|feedback)$/i;

function isPunctuationOnly(str) {
  return /^[\s.,_\-!@#$%^&*()+=/\\|<>?~`"':;{}[\]]+$/.test(str);
}

function hasRepetitiveCharFiller(str, threshold = 5) {
  const pattern = new RegExp(`(.)\\1{${threshold - 1},}`, 'i');
  return pattern.test(str);
}

function isEntirelyPlaceholderWords(words) {
  if (!words || words.length === 0) return false;
  return words.every(w => {
    const stripped = w.replace(/[^\w]/g, '');
    return stripped.length === 0 || PURE_PLACEHOLDER_REGEX.test(stripped);
  });
}

function validatePlanInputs(rawTitleOrObj, rawDescription) {
  let rawTitle = rawTitleOrObj;
  let rawDesc = rawDescription;
  if (typeof rawTitleOrObj === 'object' && rawTitleOrObj !== null && rawDescription === undefined) {
    rawTitle = rawTitleOrObj.title;
    rawDesc = rawTitleOrObj.description;
  }
  const errors = {};

  // 1. Validate Title
  if (!rawTitle || typeof rawTitle !== 'string') {
    errors.title = 'Plan title is required and cannot be empty.';
  } else {
    const cleanTitle = rawTitle.trim();
    if (cleanTitle.length === 0) {
      errors.title = 'Plan title is required and cannot be empty.';
    } else if (cleanTitle.length < 10) {
      errors.title = 'Plan title must be at least 10 characters long.';
    } else if (cleanTitle.length > 255) {
      errors.title = 'Plan title cannot exceed 255 characters.';
    } else {
      const words = cleanTitle.split(/\s+/).filter(w => w.length > 0);
      if (words.length < 2) {
        errors.title = 'Plan title must contain at least 2 words.';
      } else if (isPunctuationOnly(cleanTitle)) {
        errors.title = 'Plan title cannot consist solely of punctuation or symbols.';
      } else if (hasRepetitiveCharFiller(cleanTitle, 5)) {
        errors.title = 'Plan title cannot consist of repeated filler characters.';
      } else if (isEntirelyPlaceholderWords(words)) {
        errors.title = 'Please provide a meaningful, descriptive plan title.';
      }
    }
  }

  // 2. Validate Instructions / Expected Outcomes
  if (!rawDesc || typeof rawDesc !== 'string') {
    errors.description = 'Plan instructions / expected outcomes are required and cannot be empty.';
  } else {
    const cleanDesc = rawDesc.trim();
    if (cleanDesc.length === 0) {
      errors.description = 'Plan instructions / expected outcomes are required and cannot be empty.';
    } else if (cleanDesc.length < 30) {
      errors.description = 'Plan instructions must be at least 30 characters long to provide clear guidance.';
    } else if (cleanDesc.length > 5000) {
      errors.description = 'Plan instructions cannot exceed 5000 characters.';
    } else {
      const words = cleanDesc.split(/\s+/).filter(w => w.length > 0);
      if (words.length < 5) {
        errors.description = 'Plan instructions must contain at least 5 words explaining the expected goals and outcomes.';
      } else if (isPunctuationOnly(cleanDesc)) {
        errors.description = 'Plan instructions cannot consist solely of punctuation or symbols.';
      } else if (hasRepetitiveCharFiller(cleanDesc, 6)) {
        errors.description = 'Plan instructions cannot consist of repeated filler characters.';
      } else if (isEntirelyPlaceholderWords(words)) {
        errors.description = 'Please provide descriptive, meaningful instructions for the recipient.';
      }
    }
  }

  const isValid = Object.keys(errors).length === 0;
  return {
    isValid,
    errors,
    cleanTitle: isValid && typeof rawTitle === 'string' ? rawTitle.trim() : null,
    cleanDescription: isValid && typeof rawDesc === 'string' ? rawDesc.trim() : null,
    message: !isValid ? (errors.title || errors.description) : null
  };
}

module.exports = {
  validatePlanInputs,
  isPunctuationOnly,
  hasRepetitiveCharFiller,
  isEntirelyPlaceholderWords
};
