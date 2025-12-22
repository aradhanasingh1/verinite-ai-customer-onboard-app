interface ValidationRules {
  [key: string]: RegExp;
  email: RegExp;
  phone: RegExp;
}

interface DocumentRequirement {
  type: string;
  description: string;
  alternatives?: string[];
}

export class FeedbackProvider {
  static getValidationError(field: string, value: string, rules: ValidationRules): string | null {
    if (!value?.trim()) return `${this.formatFieldName(field)} is required`;

    switch (field) {
      case 'email':
        return !rules.email.test(value) ? 'Please enter a valid email address' : null;
      case 'phone':
        return !rules.phone.test(value) ? 'Please enter a valid 10-digit phone number' : null;
      case 'dateOfBirth':
        return !this.isValidDate(value) ? 'Please enter a valid date of birth' : null;
      default:
        return null;
    }
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
      dateOfBirth: 'Date of Birth'
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