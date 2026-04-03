import os
import requests
from typing import List, Dict

class InvoiceNinjaClient:
    def __init__(self, api_url: str, api_token: str):
        self.api_url = api_url.rstrip('/')
        self.headers = {
            "X-API-Token": api_token,
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/json"
        }

    def get_clients(self) -> List[Dict]:
        """Fetch all clients from Invoice Ninja."""
        url = f"{self.api_url}/clients"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json().get("data", [])

    def create_invoice(self, client_id: str, line_items: List[Dict], issue_date: str = None, due_date: str = None, footer: str = "") -> Dict:
        """
        Create a new draft invoice.
        line_items: list of dicts with 'notes', 'quantity', 'cost'.
        footer: optional text for the invoice footer (e.g., payment details).
        """
        url = f"{self.api_url}/invoices"
        payload = {
            "client_id": client_id,
            "date": issue_date,
            "due_date": due_date,
            "line_items": line_items,
            "terms": footer,
            "status_id": 1 # Draft
        }
        response = requests.post(url, headers=self.headers, json=payload)
        response.raise_for_status()
        return response.json().get("data", {})
