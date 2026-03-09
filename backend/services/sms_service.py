"""
SMS Service using Twilio API
"""
import os
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Try to import Twilio, fallback to None if not installed
try:
    from twilio.rest import Client
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    logger.warning("Twilio not installed. SMS service will be disabled.")


class SMSService:
    """SMS service using Twilio API"""
    
    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = os.getenv("TWILIO_PHONE_NUMBER")
        self.sms_enabled = os.getenv("SMS_ENABLED", "true").lower() == "true"
        
        # Check if Twilio is available and configured
        if not TWILIO_AVAILABLE:
            self.client = None
            logger.warning("Twilio package not installed")
        elif not all([self.account_sid, self.auth_token, self.from_number]):
            self.client = None
            logger.warning("Twilio credentials not properly configured")
        else:
            self.client = Client(self.account_sid, self.auth_token)
            logger.info("SMS Service initialized with Twilio")
    
    def _format_phone(self, phone: str) -> Optional[str]:
        """Format phone number to international format with +"""
        if not phone:
            return None
        
        # Remove any non-digit characters
        cleaned = ''.join(filter(str.isdigit, phone))
        
        # Handle different formats
        if cleaned.startswith('0'):
            # 07XXXXXXXX -> +2547XXXXXXXX
            return '+' + '254' + cleaned[1:]
        elif cleaned.startswith('254'):
            # 2547XXXXXXXX -> +2547XXXXXXXX
            return '+' + cleaned
        elif cleaned.startswith('7'):
            # 7XXXXXXXX -> +2547XXXXXXXX
            return '+' + '254' + cleaned
        elif cleaned.startswith('+'):
            # Already has +, just return as is
            return phone
        else:
            # Try to handle as international format without +
            return '+' + cleaned
    
    def send_sms(self, phone_number: str, message: str) -> Dict[str, Any]:
        """
        Send SMS via Twilio API
        
        Args:
            phone_number: Recipient phone number (e.g., 0712345678 or +254712345678)
            message: SMS content
            
        Returns:
            Dict with success status and response details
        """
        # Check if SMS is disabled
        if not self.sms_enabled:
            logger.warning(f"SMS disabled. Would send to {phone_number}: {message}")
            return {
                "success": True,
                "message": "SMS disabled in configuration",
                "simulated": True
            }
        
        # Check if Twilio is not available
        if not TWILIO_AVAILABLE:
            logger.error("Twilio package not installed. Run: pip install twilio")
            return {
                "success": False,
                "error": "SMS service not available"
            }
        
        # Check if client is initialized
        if not self.client:
            logger.error("Twilio not properly configured")
            return {
                "success": False,
                "error": "SMS service not configured"
            }
        
        try:
            # Format phone number to international format with +
            formatted_phone = self._format_phone(phone_number)
            
            if not formatted_phone:
                return {
                    "success": False,
                    "error": "Invalid phone number format"
                }
            
            logger.info(f"Sending SMS to {formatted_phone} at {datetime.utcnow().isoformat()}")
            logger.info(f"Message: {message}")
            
            # Send via Twilio
            twilio_message = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=formatted_phone
            )
            
            logger.info(f"SMS sent successfully. SID: {twilio_message.sid}")
            
            return {
                "success": True,
                "message_id": twilio_message.sid,
                "status": twilio_message.status,
                "date_created": twilio_message.date_created.isoformat() if twilio_message.date_created else None,
                "to": formatted_phone
            }
            
        except Exception as e:
            logger.error(f"SMS sending error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }


# Singleton instance
sms_service = SMSService()
