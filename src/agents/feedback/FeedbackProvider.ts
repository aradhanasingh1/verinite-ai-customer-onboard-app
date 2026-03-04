// src/agents/feedback/FeedbackProvider.ts
interface ValidationRule {
  required?: boolean;
  minLength?: number;
  pattern?: RegExp;
  validate?: (value: string) => boolean;
  error?: string;
}

interface ValidationRules {
  [key: string]: ValidationRule;
}

interface DocumentRequirement {
  type: string;
  description: string;
  alternatives?: string[];
}

export class FeedbackProvider {
  static getValidationError(
    field: string,
    value: string,
    rules: ValidationRules
  ): string | null {
    const rule = rules[field];
    if (!rule) return null;

    // Check required
    if (rule.required && (!value || value.trim() === '')) {
      return rule.error || `${this.formatFieldName(field)} is required`;
    }

    // Check minLength
    if (rule.minLength && value.length < rule.minLength) {
      return rule.error || `${this.formatFieldName(field)} must be at least ${rule.minLength} characters`;
    }

    // Check pattern
    if (rule.pattern && !rule.pattern.test(value)) {
      return rule.error || `Please enter a valid ${field}`;
    }

    // Custom validation
    if (rule.validate && !rule.validate(value)) {
      return rule.error || `Invalid ${field} provided`;
    }

    return null;
  }

  static getDocumentFeedback(missingDocs: DocumentRequirement[]): string {
    if (!missingDocs.length) return 'All required documents have been submitted.';

    return `Please provide the following documents: ${missingDocs
      .map(doc => doc.description)
      .join(', ')}.`;
  }

  static getFieldLabel(field: string): string {
    const labels: { [key: string]: string } = {
      fullName: 'Full Name',
      email: 'Email Address',
      phone: 'Phone Number',
      dateOfBirth: 'Date of Birth',
      gender: 'Gender',
      address: 'Full Address'
    };
    return labels[field] || this.formatFieldName(field);
  }

  private static formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }

  private static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }
}