from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import current_user, event_access
from app.models import AllocationRun, AttendanceAudit, EventModuleRecord, JudgeAssignment, JudgeProfile, Registration, User

router = APIRouter(prefix="/events/{event_id}/analytics", tags=["Analytics"])


@router.get("/overview")
def overview(event_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    event_access(db, event_id, user)
    registrations = db.query(Registration).filter_by(event_id=event_id).all()
    teams = [row for row in registrations if row.kind == "team"]
    audits = db.query(AttendanceAudit).join(Registration).filter(Registration.event_id == event_id, AttendanceAudit.action.in_(["checked_in", "manual_override"])).order_by(AttendanceAudit.created_at).all()
    attendance = Counter(audit.created_at.strftime("%H:00") for audit in audits)
    judge_rows = db.query(JudgeProfile).filter_by(event_id=event_id, is_active=True).all()
    latest_run = db.query(AllocationRun).filter_by(event_id=event_id, status="approved").order_by(AllocationRun.created_at.desc()).first()
    loads = Counter()
    if latest_run:
        loads.update({judge_id: count for judge_id, count in db.query(JudgeAssignment.judge_id, func.count(JudgeAssignment.id)).filter_by(run_id=latest_run.id).group_by(JudgeAssignment.judge_id).all()})
    domains = Counter(str(((row.data or {}).get("project") or {}).get("domain") or "Unspecified") for row in teams)
    score_ranges = Counter()
    for row in teams:
        score = float((row.data or {}).get("totalScore", 0))
        score_ranges["90-100" if score >= 90 else "80-89" if score >= 80 else "70-79" if score >= 70 else "<70"] += 1
    resource_records = db.query(EventModuleRecord).filter_by(event_id=event_id, module="resources").all()
    resources = [{"name": row.name, "total": (row.payload or {}).get("totalQuantity", (row.payload or {}).get("quantity", 0)), "consumed": (row.payload or {}).get("consumedQuantity", 0)} for row in resource_records]
    palette = ["#6366f1", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#06b6d4", "#ef4444"]
    return {
        "attendanceTrends": [{"time": key, "count": count} for key, count in sorted(attendance.items())],
        "judgeWorkloads": [{"judge": row.name, "assigned": loads.get(row.id, 0), "max": row.max_assignments} for row in judge_rows],
        "domainDistribution": [{"name": name, "value": count, "color": palette[index % len(palette)]} for index, (name, count) in enumerate(domains.items())],
        "roundScores": [{"range": name, "count": score_ranges.get(name, 0)} for name in ["90-100", "80-89", "70-79", "<70"]],
        "resourceConsumption": resources,
        "registrations": len(registrations),
        "checkedIn": sum(row.check_in_status == "checked_in" for row in registrations),
        "activeJudges": len(judge_rows),
    }
