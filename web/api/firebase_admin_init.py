"""Initialize the Firebase Admin SDK once at app startup.

Local dev: set GOOGLE_APPLICATION_CREDENTIALS to the path of your
           service account JSON file.
Cloud Run: uses Application Default Credentials automatically — no key file
           needed, just attach the correct IAM service account to the Cloud
           Run service.
"""

from __future__ import annotations

import os

import firebase_admin
from firebase_admin import credentials


def initialize() -> None:
    """Idempotent — safe to call multiple times."""
    if firebase_admin._apps:
        return

    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path:
        # If relative, resolve from project root (parent of web/)
        if not os.path.isabs(cred_path):
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            cred_path = os.path.join(project_root, cred_path)
        
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(
                cred,
                {
                    "storageBucket": os.environ.get("FIREBASE_STORAGE_BUCKET", ""),
                },
            )
        else:
            print(f"Warning: GOOGLE_APPLICATION_CREDENTIALS path not found: {cred_path}")
            # Fallback to ADC
            firebase_admin.initialize_app(
                options={
                    "storageBucket": os.environ.get("FIREBASE_STORAGE_BUCKET", ""),
                }
            )
    else:
        # Application Default Credentials (Cloud Run / Cloud Shell)
        firebase_admin.initialize_app(
            options={
                "storageBucket": os.environ.get("FIREBASE_STORAGE_BUCKET", ""),
            }
        )
