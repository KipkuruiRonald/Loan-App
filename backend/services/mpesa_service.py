import requests
import json
import base64
import datetime
import logging
from typing import Dict, Any, Optional
from requests.auth import HTTPBasicAuth
import os

logger = logging.getLogger(__name__)


class MpesaService:
    """Service to handle M-Pesa API integration"""
    
    def __init__(self):
        self.consumer_key = os.getenv("MPESA_CONSUMER_KEY", "your_consumer_key")
        self.consumer_secret = os.getenv("MPESA_CONSUMER_SECRET", "your_consumer_secret")
        self.passkey = os.getenv("MPESA_PASSKEY", "your_passkey")
        self.shortcode = os.getenv("MPESA_BUSINESS_SHORTCODE", "174379")
        self.environment = os.getenv("MPESA_ENVIRONMENT", "sandbox")
        
        # Base URLs
        if self.environment == "production":
            self.base_url = "https://api.safaricom.co.ke"
        else:
            self.base_url = "https://sandbox.safaricom.co.ke"
        
        self._access_token = None
        self._token_expiry = None
    
    def get_access_token(self) -> str:
        """Get OAuth access token from Safaricom"""
        auth_url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        
        try:
            response = requests.get(
                auth_url,
                auth=HTTPBasicAuth(self.consumer_key, self.consumer_secret),
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            token = data.get("access_token")
            expires_in = int(data.get("expires_in", 3600))

            # Cache token
            self._access_token = token
            self._token_expiry = datetime.datetime.now() + datetime.timedelta(seconds=expires_in - 60)
            
            logger.info("Successfully obtained M-Pesa access token")
            return token
        except Exception as e:
            logger.error(f"Failed to get M-Pesa access token: {e}")
            # Return cached token if available
            if self._access_token:
                return self._access_token
            raise
    
    def is_token_valid(self) -> bool:
        """Check if cached token is still valid"""
        if not self._access_token or not self._token_expiry:
            return False
        return datetime.datetime.now() < self._token_expiry
    
    def get_valid_token(self) -> str:
        """Get a valid access token (uses cache if available)"""
        if self.is_token_valid():
            return self._access_token
        return self.get_access_token()
    
    def generate_password(self, timestamp: str) -> str:
        """Generate password for STK Push"""
        data = self.shortcode + self.passkey + timestamp
        return base64.b64encode(data.encode()).decode()
    
    def format_phone(self, phone_number: str) -> str:
        """Format phone number to 254XXXXXXXXX format"""
        # Remove any spaces, dashes, or plus signs
        phone = phone_number.replace(' ', '').replace('-', '').replace('+', '')
        
        # Convert 07XX XXX XXX to 254XX XXX XXX
        if phone.startswith("0"):
            phone = "254" + phone[1:]
        elif not phone.startswith("254"):
            phone = "254" + phone
        
        return phone
    
    def stk_push(
        self, 
        phone_number: str, 
        amount: float, 
        account_ref: str, 
        transaction_desc: str = "Loan Repayment"
    ) -> Dict[str, Any]:
        """
        Initiate STK Push to customer's phone for payment
        This is for repayments (Customer pays business)
        """
        token = self.get_valid_token()
        url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        
        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        password = self.generate_password(timestamp)
        
        # Format phone number
        formatted_phone = self.format_phone(phone_number)
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": formatted_phone,
            "PartyB": self.shortcode,
            "PhoneNumber": formatted_phone,
            "CallBackURL": os.getenv("MPESA_CALLBACK_URL", "https://example.com/api/mpesa/callback"),
            "AccountReference": account_ref[:12] if account_ref else f"OKL{int(datetime.datetime.now().timestamp())}"[:12],
            "TransactionDesc": transaction_desc[:13] if transaction_desc else "Payment"[:13]
        }
        
        logger.info(f"STK Push initiated for {formatted_phone} amount {amount}")
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            if result.get("ResponseCode") == "0":
                logger.info(f"STK Push successful: {result.get('CheckoutRequestID')}")
            else:
                logger.error(f"STK Push failed: {result}")
            
            return {
                "success": result.get("ResponseCode") == "0",
                "response_code": result.get("ResponseCode"),
                "response_message": result.get("ResponseDescription"),
                "checkout_request_id": result.get("CheckoutRequestID"),
                "customer_message": result.get("CustomerMessage")
            }
        except requests.exceptions.Timeout:
            logger.error("STK Push timed out")
            raise Exception("Request timed out. Please try again.")
        except requests.exceptions.RequestException as e:
            logger.error(f"STK Push error: {e}")
            raise Exception(f"Failed to initiate payment: {str(e)}")
        except Exception as e:
            logger.error(f"STK Push error: {e}")
            raise
    
    def b2c_payment(
        self, 
        phone_number: str, 
        amount: float, 
        remarks: str = "Loan Disbursement",
        initiator_name: str = "testapi"
    ) -> Dict[str, Any]:
        """
        Business to Customer payment for loan disbursements
        Company pays customer
        """
        token = self.get_valid_token()
        url = f"{self.base_url}/mpesa/b2c/v1/paymentrequest"
        
        # Format phone number
        formatted_phone = self.format_phone(phone_number)
        
        # Security credential (should be encrypted in production)
        security_credential = os.getenv("MPESA_SECURITY_CREDENTIAL", "your_encrypted_credential")
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "InitiatorName": initiator_name,
            "SecurityCredential": security_credential,
            "CommandID": "BusinessPayment",
            "Amount": int(amount),
            "PartyA": self.shortcode,
            "PartyB": formatted_phone,
            "Remarks": remarks[:100] if remarks else "Disbursement"[:100],
            "QueueTimeOutURL": os.getenv("MPESA_TIMEOUT_URL", "https://example.com/api/mpesa/timeout"),
            "ResultURL": os.getenv("MPESA_CALLBACK_URL", "https://example.com/api/mpesa/callback"),
            "Occasion": "Loan Disbursement"
        }
        
        # ===== ADD THIS DEBUG LOGGING =====
        logger.info("=" * 50)
        logger.info("B2C PAYLOAD BEING SENT:")
        logger.info(f"URL: {url}")
        logger.info(f"Headers: {json.dumps({k: v for k, v in headers.items() if k != 'Authorization'}, indent=2)}")
        logger.info(f"Payload: {json.dumps(payload, indent=2)}")
        logger.info("=" * 50)
        # =================================
        
        logger.info(f"B2C payment initiated for {formatted_phone} amount {amount}")
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            
            # ===== ADD THIS RESPONSE LOGGING =====
            logger.info(f"B2C Response Status: {response.status_code}")
            logger.info(f"B2C Response Body: {response.text}")
            # =====================================
            
            response.raise_for_status()
            result = response.json()
            
            return {
                "success": result.get("ResponseCode") == "0",
                "response_code": result.get("ResponseCode"),
                "conversation_id": result.get("ConversationID"),
                "originator_conversation_id": result.get("OriginatorConversationID"),
                "response_message": result.get("ResponseDescription")
            }
        except requests.exceptions.Timeout:
            logger.error("B2C payment timed out")
            raise Exception("Request timed out. Please try again.")
        except requests.exceptions.RequestException as e:
            logger.error(f"B2C payment error: {e}")
            raise Exception(f"Failed to initiate disbursement: {str(e)}")
        except Exception as e:
            logger.error(f"B2C payment error: {e}")
            raise
    
    def query_status(self, checkout_request_id: str) -> Dict[str, Any]:
        """Query the status of an STK Push transaction"""
        token = self.get_valid_token()
        url = f"{self.base_url}/mpesa/stkpushquery/v1/query"
        
        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        password = self.generate_password(timestamp)
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            return {
                "success": result.get("ResponseCode") == "0",
                "result_code": result.get("ResultCode"),
                "result_desc": result.get("ResultDesc"),
                "status": result.get("StatusCode")
            }
        except Exception as e:
            logger.error(f"Status query error: {e}")
            raise
    
    def reverse_transaction(
        self, 
        transaction_id: str, 
        amount: float, 
        remarks: str = "Reversal"
    ) -> Dict[str, Any]:
        """Reverse a transaction (for disputes/refunds)"""
        token = self.get_valid_token()
        url = f"{self.base_url}/mpesa/reversal/v1/request"
        
        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        password = self.generate_password(timestamp)
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "Initiator": "testapi",
            "SecurityCredential": os.getenv("MPESA_SECURITY_CREDENTIAL", "your_encrypted_credential"),
            "CommandID": "TransactionReversal",
            "TransactionID": transaction_id,
            "Amount": int(amount),
            "ReceiverParty": self.shortcode,
            "RecieverIdentifier": "4",
            "Remarks": remarks[:100],
            "QueueTimeOutURL": os.getenv("MPESA_TIMEOUT_URL", "https://example.com/api/mpesa/timeout"),
            "ResultURL": os.getenv("MPESA_CALLBACK_URL", "https://example.com/api/mpesa/callback")
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            return {
                "success": result.get("ResponseCode") == "0",
                "response": result
            }
        except Exception as e:
            logger.error(f"Transaction reversal error: {e}")
            raise


# Singleton instance
_mpesa_service: Optional[MpesaService] = None


def get_mpesa_service() -> MpesaService:
    """Get M-Pesa service singleton"""
    global _mpesa_service
    if _mpesa_service is None:
        _mpesa_service = MpesaService()
    return _mpesa_service
