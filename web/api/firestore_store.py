"""Read staff profile and project data from Firestore.

This module mirrors the public interface of web/api/workbook.py exactly so
runner.py can swap it in with a one-line import change.
"""

from __future__ import annotations

from firebase_admin import firestore

from web.api.firebase_admin_init import initialize


def _db():
    initialize()
    return firestore.client()


def list_people() -> list[dict]:
    """Return all staff members from the /staff collection."""
    db = _db()
    docs = db.collection("staff").stream()
    people = []
    for doc in docs:
        data = doc.to_dict()
        people.append(
            {
                "name": data.get("display_name", doc.id),
                "display_name": data.get("display_name", doc.id),
                "title": data.get("title", ""),
                "staff_id": doc.id,
            }
        )
    # Sort alphabetically by display name
    people.sort(key=lambda p: p["display_name"])
    return people


def get_person_data(person_name: str) -> dict:
    """Return full profile + projects + education for a person by display_name.

    Falls back to treating person_name as a staff_id if no display_name match.
    Returns a dict with the same shape as workbook.get_person_data().
    """
    db = _db()

    # Try to find the staff document by display_name
    query = db.collection("staff").where(filter=firestore.FieldFilter("display_name", "==", person_name)).limit(1)
    results = list(query.stream())

    if results:
        doc = results[0]
        staff_id = doc.id
    else:
        # Fallback: treat person_name as staff_id directly
        doc = db.collection("staff").document(person_name).get()
        if not doc.exists:
            raise ValueError(f"No staff record found for '{person_name}'")
        staff_id = person_name

    data = doc.to_dict()

    # Load projects subcollection, ordered by 'order' field
    proj_docs = (
        db.collection("staff")
        .document(staff_id)
        .collection("projects")
        .order_by("order")
        .stream()
    )
    projects = []
    for p in proj_docs:
        pd = p.to_dict()
        projects.append(
            {
                "key": pd.get("key", p.id),
                "client": pd.get("client", ""),
                "title": pd.get("title", ""),
                "description": pd.get("description", ""),
                "start_date": pd.get("start_date", ""),
                "end_date": pd.get("end_date", ""),
                "date_range": pd.get("date_range", ""),
            }
        )

    # Load education subcollection, ordered by 'order' field
    edu_docs = (
        db.collection("staff")
        .document(staff_id)
        .collection("education")
        .order_by("order")
        .stream()
    )
    education = []
    for e in edu_docs:
        ed = e.to_dict()
        education.append(
            {
                "degree_cert": ed.get("degree_cert", ""),
                "degree_area": ed.get("degree_area", ""),
                "location": ed.get("location", ""),
            }
        )

    return {
        "name": data.get("display_name", staff_id),
        "staff_id": staff_id,
        "first_name": data.get("first_name", ""),
        "last_name": data.get("last_name", ""),
        "title": data.get("title", ""),
        "summary": data.get("summary", ""),
        "education": education,
        "projects": projects,
    }
