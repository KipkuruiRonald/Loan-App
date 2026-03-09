import re
import logging
from typing import Tuple, Dict, Optional

logger = logging.getLogger(__name__)


class EmailValidationService:
    """Validate email addresses thoroughly"""
    
    # Common disposable email domains
    DISPOSABLE_DOMAINS = {
        'tempmail.com', 'throwaway.com', 'mailinator.com',
        'guerrillamail.com', 'sharklasers.com', 'yopmail.com',
        '10minutemail.com', 'temp-mail.org', 'fakeinbox.com',
        'mailnator.com', 'mailinator2.com', 'getnada.com',
        'spambox.us', 'tempinbox.com', 'mailcatch.com',
        'trashmail.com', 'mintemail.com', 'emailondeck.com',
        'fakeemail.com', 'spam4.me', 'grr.la', 'maildrop.cc',
        'dispostable.com', 'emailfake.com', 'tempmailaddress.com',
        'tempr.email', 'mohmal.com', 'tempail.com', 'mailsac.com',
        'mails.ai-labs.de', 'mails.zlared.com', 'mailgw.de'
    }
    
    # Common typos in email domains
    COMMON_DOMAINS = {
        'gmail.com': ['gmial.com', 'gamil.com', 'gmai.com', 'gmal.com', 'gamil.com'],
        'yahoo.com': ['yaho.com', 'yahooo.com', 'yahho.com', 'yhaoo.com'],
        'hotmail.com': ['hotmai.com', 'hotmil.com', 'hotmal.com', 'hotmial.com'],
        'outlook.com': ['outlok.com', 'outloo.com', 'outlok.com', 'outluk.com'],
        'mail.com': ['mai.com', 'maill.com', 'emal.com'],
        'icloud.com': ['iclod.com', 'icloud.cm', 'icoud.com']
    }
    
    @staticmethod
    def validate_format(email: str) -> Tuple[bool, str]:
        """Check if email format is valid"""
        if not email:
            return False, "Email is required"
        
        # More strict email regex
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        if not re.match(pattern, email):
            return False, "Invalid email format"
        
        # Check for common issues
        local, domain = email.rsplit('@', 1)
        
        if len(local) > 64:
            return False, "Email local part too long"
        
        if len(domain) > 255:
            return False, "Email domain too long"
        
        # Check for consecutive dots
        if '..' in email:
            return False, "Email cannot contain consecutive dots"
        
        # Check for leading/trailing dots in local
        if local.startswith('.') or local.endswith('.'):
            return False, "Email cannot start or end with a dot"
        
        return True, "Valid format"
    
    @staticmethod
    def extract_domain(email: str) -> str:
        """Extract domain from email"""
        return email.split('@')[1].lower()
    
    def check_mx_record(self, domain: str) -> Tuple[bool, str]:
        """Check if domain has MX records (simplified - just check domain exists)"""
        # For now, we'll do a simple domain check without DNS
        # In production, you'd use dns.resolver
        
        # Check for valid domain characters
        domain_pattern = r'^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$'
        if not re.match(domain_pattern, domain):
            return False, "Invalid domain format"
        
        # Check for known invalid domains
        invalid_domains = ['localhost', 'example.com', 'test.com']
        if domain in invalid_domains:
            return False, "Domain not allowed"
        
        return True, "Domain appears valid"
    
    def is_disposable(self, domain: str) -> Tuple[bool, str]:
        """Check if domain is a disposable email service"""
        domain_lower = domain.lower()
        
        if domain_lower in self.DISPOSABLE_DOMAINS:
            return True, "Disposable email domains not allowed"
        
        # Check for disposable domain patterns
        disposable_patterns = ['temp', 'fake', 'throwaway', 'discard', 'trash']
        for pattern in disposable_patterns:
            if pattern in domain_lower:
                return True, "Temporary email addresses not allowed"
        
        return False, "Valid domain"
    
    def suggest_correction(self, email: str) -> Optional[str]:
        """Suggest correction for common domain typos"""
        if '@' not in email:
            return None
        
        try:
            local, domain = email.split('@')
            domain_lower = domain.lower()
            
            for correct, typos in self.COMMON_DOMAINS.items():
                if domain_lower in typos:
                    return f"{local}@{correct}"
        except:
            pass
        
        return None
    
    def validate_email(self, email: str) -> Dict:
        """Comprehensive email validation"""
        results = {
            'valid': False,
            'errors': [],
            'warnings': [],
            'suggestion': None,
            'email': email
        }
        
        # Check format first
        format_valid, format_msg = self.validate_format(email)
        if not format_valid:
            results['errors'].append(format_msg)
            return results
        
        # Extract domain
        domain = self.extract_domain(email)
        
        # Check if disposable
        is_disposable, disposable_msg = self.is_disposable(domain)
        if is_disposable:
            results['errors'].append(disposable_msg)
            return results
        
        # Check MX/domain
        domain_valid, domain_msg = self.check_mx_record(domain)
        if not domain_valid:
            results['errors'].append(domain_msg)
            # Don't return yet - still suggest correction
        
        # Suggest correction for common typos
        suggestion = self.suggest_correction(email)
        if suggestion:
            results['warnings'].append(f"Did you mean {suggestion}?")
            results['suggestion'] = suggestion
        
        # If domain check passed, mark as valid
        if domain_valid:
            results['valid'] = True
        
        return results


# Singleton instance
_email_validation_service: Optional[EmailValidationService] = None


def get_email_validation_service() -> EmailValidationService:
    """Get email validation service singleton"""
    global _email_validation_service
    if _email_validation_service is None:
        _email_validation_service = EmailValidationService()
    return _email_validation_service
