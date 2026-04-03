import os
import requests
import json
from typing import List, Dict, Optional
from base64 import b64encode

class OpenProjectClient:
    def __init__(self, api_url: str, api_token: str):
        self.api_url = api_url.rstrip('/')
        auth_str = f"apikey:{api_token}"
        encoded_auth = b64encode(auth_str.encode()).decode()
        self.headers = {
            "Authorization": f"Basic {encoded_auth}",
            "Content-Type": "application/json"
        }

    def _get_all_pages(self, url: str, params: Dict = None) -> List[Dict]:
        """Helper to fetch all elements from a paginated endpoint."""
        results = []
        next_url = url
        # Start with pageSize=100 to reduce requests and avoid many pagination issues
        current_params = params or {}
        if "pageSize" not in current_params:
            current_params["pageSize"] = 100

        print(f"Fetching {url}... Initial params: {current_params}")

        while next_url:
            full_url = next_url if next_url.startswith('http') else f"{self.api_url}{next_url}"
            
            response = requests.get(full_url, headers=self.headers, params=current_params)
            response.raise_for_status()
            data = response.json()
            
            elements = data.get("_embedded", {}).get("elements", [])
            results.extend(elements)
            
            # OP uses HAL links: _links -> next -> href
            next_link = data.get("_links", {}).get("next", {}).get("href")
            
            if next_link:
                next_url = next_link
                # Crucial: If next_link already contains query parameters (like filters), 
                # we must NOT pass current_params again, as it would duplicate or conflict.
                # However, if it's just a template or a path without query, we keep them.
                if "?" in next_link:
                    current_params = {} 
                else:
                    # Keep existing filters for safe mesure if they were not in the link
                    pass
            else:
                next_url = None
        
        print(f"Total elements fetched: {len(results)}")
        return results

    def get_projects(self) -> List[Dict]:
        """Fetch all projects (all pages)."""
        return self._get_all_pages("/projects")

    def get_users(self) -> List[Dict]:
        """Fetch all users (all pages)."""
        return self._get_all_pages("/users")

    def get_time_entries(self, project_ids: List[int] = None, start_date: str = None, end_date: str = None, user_id: Optional[int] = None) -> List[Dict]:
        """Fetch all matching time entries (all pages)."""
        filters = []
        
        # Base filters
        if project_ids:
            # OpenProject supports "=" operator for project IDs
            filters.append({"project": {"operator": "=", "values": [str(pid) for pid in project_ids]}})
            
        if start_date and end_date:
            # Use <>d for inclusive date range
            filters.append({"spentOn": {"operator": "<>d", "values": [start_date, end_date]}})
        elif start_date:
            filters.append({"spentOn": {"operator": ">=d", "values": [start_date]}})
        elif end_date:
            filters.append({"spentOn": {"operator": "<=d", "values": [end_date]}})

        if user_id:
            filters.append({"user": {"operator": "=", "values": [str(user_id)]}})

        params = {"filters": json.dumps(filters)}
        
        return self._get_all_pages("/time_entries", params=params)

    def get_work_package(self, wp_id: int) -> Dict:
        """Fetch details for a specific work package."""
        url = f"{self.api_url}/work_packages/{wp_id}"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()
