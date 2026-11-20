from fastapi import APIRouter, Query
from app.config import REPORTS_FILE, load_json

router = APIRouter(tags=["Reports"])

@router.get("/reports/my-reports")
@router.get("/api/v1/reports/my-reports")
async def get_my_reports(
    phone: str = Query(default=''),
    user_id: str = Query(default='')
):
    phone_clean = phone.strip()
    uid_clean = user_id.strip()

    reports = load_json(REPORTS_FILE)
    if not isinstance(reports, list):
        reports = []

    out = []
    if phone_clean or uid_clean:
        for rep in reports:
            rep_phone = (rep.get('user_phone') or '').strip()
            rep_uid = (rep.get('user_id') or '').strip()
            if (phone_clean and rep_phone == phone_clean) or (uid_clean and rep_uid == uid_clean):
                out.append(rep)

    return {
        'success': True,
        'module': 'reports',
        'version': 'v1',
        'data': out
    }
