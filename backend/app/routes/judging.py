from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import current_user, event_access
from app.models import AllocationRun, EvaluationTarget, Event, JudgeAssignment, JudgeConflict, JudgeProfile, Registration, User
from app.schemas import AllocationAccept, AllocationRequest, ConflictCreate, JudgeCreate, JudgePatch, TargetCreate
from app.services.matching import expertise_scores

router = APIRouter(prefix="/events/{event_id}/judging", tags=["Judging & Optimization"])


def _solver():
    try:
        from ortools.sat.python import cp_model
        return cp_model
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="OR-Tools is not installed. Install backend requirements to enable allocation.") from exc


@router.get("/judges")
def list_judges(event_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    event_access(db, event_id, user)
    rows = db.query(JudgeProfile).filter_by(event_id=event_id).order_by(JudgeProfile.name).all()
    return [{"id": row.id, "eventId": row.event_id, "name": row.name, "email": row.email, "organization": row.organization, "designation": row.designation, "expertise": row.expertise, "domains": row.expertise, "availableSlots": row.available_slots, "maxTeamCapacity": row.max_assignments, "assignedTeams": [], "workload": 0, "workloadStatus": "AVAILABLE" if row.is_active else "UNAVAILABLE", "availability": "PART_TIME" if row.available_slots else "FULL_TIME"} for row in rows]


@router.post("/judges", status_code=201)
def create_judge(event_id: str, payload: JudgeCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _, role = event_access(db, event_id, user, write=True)
    if role not in {"organization_admin", "event_admin", "coordinator", "personal_owner"}:
        raise HTTPException(status_code=403, detail="Only event organizers can manage the judge roster")
    judge = JudgeProfile(event_id=event_id, **payload.model_dump())
    db.add(judge)
    db.commit()
    db.refresh(judge)
    return {"id": judge.id, "eventId": event_id, "name": judge.name, "email": judge.email, "organization": judge.organization, "designation": judge.designation, "expertise": judge.expertise, "domains": judge.expertise, "availableSlots": judge.available_slots, "maxTeamCapacity": judge.max_assignments, "assignedTeams": [], "workload": 0, "workloadStatus": "AVAILABLE", "availability": "PART_TIME" if judge.available_slots else "FULL_TIME"}


@router.patch("/judges/{judge_id}")
def update_judge(event_id: str, judge_id: str, payload: JudgePatch, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _, role = event_access(db, event_id, user, write=True)
    if role not in {"organization_admin", "event_admin", "coordinator", "personal_owner"}:
        raise HTTPException(status_code=403, detail="Only event organizers can manage the judge roster")
    judge = db.query(JudgeProfile).filter_by(id=judge_id, event_id=event_id).first()
    if not judge:
        raise HTTPException(status_code=404, detail="Judge not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(judge, key, value)
    db.commit()
    return {"id": judge.id, "eventId": event_id, "name": judge.name, "organization": judge.organization, "designation": judge.designation, "expertise": judge.expertise, "domains": judge.expertise, "availableSlots": judge.available_slots, "maxTeamCapacity": judge.max_assignments, "assignedTeams": [], "workloadStatus": "AVAILABLE" if judge.is_active else "UNAVAILABLE"}


@router.get("/targets")
def list_targets(event_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    event_access(db, event_id, user)
    rows = db.query(EvaluationTarget).filter_by(event_id=event_id).order_by(EvaluationTarget.round_number, EvaluationTarget.slot).all()
    return [{"id": row.id, "eventId": event_id, "name": row.name, "externalId": row.external_id, "domain": row.domain, "slot": row.slot, "round": row.round_number, "judgesRequired": row.judges_required, "venue": row.venue} for row in rows]


@router.post("/targets", status_code=201)
def create_target(event_id: str, payload: TargetCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _, role = event_access(db, event_id, user, write=True)
    if role not in {"organization_admin", "event_admin", "coordinator", "personal_owner"}:
        raise HTTPException(status_code=403, detail="Only event organizers can manage evaluation targets")
    target = EvaluationTarget(event_id=event_id, **payload.model_dump())
    db.add(target)
    db.commit()
    db.refresh(target)
    return {"id": target.id, "eventId": event_id, "name": target.name, "externalId": target.external_id, "domain": target.domain, "slot": target.slot, "round": target.round_number, "judgesRequired": target.judges_required, "venue": target.venue}


@router.post("/judges/{judge_id}/conflicts", status_code=201)
def declare_conflict(event_id: str, judge_id: str, payload: ConflictCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _, role = event_access(db, event_id, user, write=True)
    if role not in {"organization_admin", "event_admin", "coordinator", "personal_owner"}:
        raise HTTPException(status_code=403, detail="Only event organizers can manage judge conflicts")
    judge = db.query(JudgeProfile).filter_by(id=judge_id, event_id=event_id).first()
    target = db.query(EvaluationTarget).filter_by(id=payload.target_id, event_id=event_id).first()
    if not judge or not target:
        raise HTTPException(status_code=404, detail="Judge or evaluation target not found")
    conflict = db.query(JudgeConflict).filter_by(judge_id=judge.id, target_id=target.id).first()
    if not conflict:
        conflict = JudgeConflict(judge_id=judge.id, target_id=target.id, reason=payload.reason)
        db.add(conflict)
        db.commit()
    return {"judgeId": judge.id, "targetId": target.id, "reason": conflict.reason}


@router.post("/optimize", status_code=201)
def optimize(event_id: str, payload: AllocationRequest, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _, role = event_access(db, event_id, user, write=True)
    if role not in {"organization_admin", "event_admin", "coordinator", "personal_owner"}:
        raise HTTPException(status_code=403, detail="Only event organizers can run judge optimization")
    cp_model = _solver()
    judges = db.query(JudgeProfile).filter_by(event_id=event_id, is_active=True).all()
    targets = db.query(EvaluationTarget).filter_by(event_id=event_id).all()
    if not targets:
        raise HTTPException(status_code=422, detail="Create at least one evaluation target before optimizing.")
    if not judges:
        raise HTTPException(status_code=422, detail="Add at least one active judge before optimizing.")
    try:
        fit_scores = expertise_scores(judges, targets)
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="The local matching model is unavailable. Install backend requirements.") from exc
    approved_counts = dict(db.query(JudgeAssignment.judge_id, func.count(JudgeAssignment.id)).join(AllocationRun).filter(AllocationRun.event_id == event_id, AllocationRun.status == "approved").group_by(JudgeAssignment.judge_id).all())
    conflicts = {(c.judge_id, c.target_id) for c in db.query(JudgeConflict).join(JudgeProfile).filter(JudgeProfile.event_id == event_id).all()}
    model = cp_model.CpModel()
    x = {}
    for judge in judges:
        for target in targets:
            if (judge.id, target.id) not in conflicts and (not judge.available_slots or target.slot in judge.available_slots):
                x[(judge.id, target.id)] = model.NewBoolVar("assign_%s_%s" % (judge.id, target.id))

    for target in targets:
        vars_for_target = [x[(j.id, target.id)] for j in judges if (j.id, target.id) in x]
        model.Add(sum(vars_for_target) == target.judges_required)
    for judge in judges:
        vars_for_judge = [x[(judge.id, target.id)] for target in targets if (judge.id, target.id) in x]
        model.Add(sum(vars_for_judge) <= judge.max_assignments)
        slots = {target.slot for target in targets}
        for slot in slots:
            same_slot = [x[(judge.id, target.id)] for target in targets if target.slot == slot and (judge.id, target.id) in x]
            model.Add(sum(same_slot) <= 1)

    objective = []
    for judge in judges:
        for target in targets:
            key = (judge.id, target.id)
            if key not in x:
                continue
            expertise_score = fit_scores.get(key, 0)
            # Reward under-used judges to distribute work evenly, with domain fit as the primary signal.
            balance_score = max(0, 100 - (approved_counts.get(judge.id, 0) * 10))
            weight = payload.domain_match_weight * expertise_score + payload.balance_workload_weight * balance_score
            objective.append(weight * x[key])
    model.Maximize(sum(objective))
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = payload.max_runtime_seconds
    solver_status = solver.Solve(model)
    status_name = solver.StatusName(solver_status).lower()

    run = AllocationRun(event_id=event_id, created_by=user.id, solver_status=status_name)
    assignments = []
    if solver_status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        run.objective_score = int(solver.ObjectiveValue())
        for (judge_id, target_id), variable in x.items():
            if solver.Value(variable):
                judge = next(j for j in judges if j.id == judge_id)
                target = next(t for t in targets if t.id == target_id)
                assignments.append(JudgeAssignment(judge_id=judge_id, target_id=target_id, match_score=fit_scores.get((judge_id, target_id), 0)))
        run.summary = {"assignedCount": len(assignments), "targetCount": len(targets), "judgeCount": len(judges), "hardConstraintViolations": 0, "objective": run.objective_score}
        run.status = "draft"
    else:
        run.summary = {"assignedCount": 0, "targetCount": len(targets), "judgeCount": len(judges), "reason": "Available judges, capacities, conflicts, and slots cannot satisfy all target requirements."}
    db.add(run)
    db.flush()
    for assignment in assignments:
        assignment.run_id = run.id
        db.add(assignment)
    db.commit()
    judge_map = {item.id: item for item in judges}
    target_map = {item.id: item for item in targets}
    return {"id": run.id, "eventId": event_id, "status": run.status, "solverStatus": run.solver_status, "objectiveScore": run.objective_score, "summary": run.summary, "assignments": [{"judgeId": a.judge_id, "judgeName": judge_map[a.judge_id].name, "targetId": a.target_id, "targetName": target_map[a.target_id].name, "externalId": target_map[a.target_id].external_id, "domain": target_map[a.target_id].domain, "slot": target_map[a.target_id].slot, "round": target_map[a.target_id].round_number, "venue": target_map[a.target_id].venue, "matchScore": a.match_score} for a in assignments]}


@router.get("/runs/{run_id}")
def get_run(event_id: str, run_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    event_access(db, event_id, user)
    run = db.query(AllocationRun).filter_by(id=run_id, event_id=event_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Allocation run not found")
    assignments = db.query(JudgeAssignment).filter_by(run_id=run.id).all()
    judge_map = {row.id: row for row in db.query(JudgeProfile).filter(JudgeProfile.id.in_([a.judge_id for a in assignments])).all()}
    target_map = {row.id: row for row in db.query(EvaluationTarget).filter(EvaluationTarget.id.in_([a.target_id for a in assignments])).all()}
    return {"id": run.id, "eventId": event_id, "status": run.status, "solverStatus": run.solver_status, "objectiveScore": run.objective_score, "summary": run.summary, "assignments": [{"judgeId": a.judge_id, "judgeName": judge_map[a.judge_id].name, "targetId": a.target_id, "targetName": target_map[a.target_id].name, "externalId": target_map[a.target_id].external_id, "domain": target_map[a.target_id].domain, "slot": target_map[a.target_id].slot, "round": target_map[a.target_id].round_number, "venue": target_map[a.target_id].venue, "matchScore": a.match_score} for a in assignments if a.judge_id in judge_map and a.target_id in target_map]}


@router.get("/results/latest")
def latest_run(event_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    event_access(db, event_id, user)
    run = db.query(AllocationRun).filter_by(event_id=event_id).order_by(AllocationRun.created_at.desc()).first()
    if not run:
        raise HTTPException(status_code=404, detail="No allocation run exists for this event")
    return get_run(event_id, run.id, db, user)


@router.post("/runs/accept")
def accept_run(event_id: str, payload: AllocationAccept, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _, role = event_access(db, event_id, user, write=True)
    if role not in {"organization_admin", "event_admin", "coordinator", "personal_owner"}:
        raise HTTPException(status_code=403, detail="Only event organizers can approve allocations")
    run = db.query(AllocationRun).filter_by(id=payload.run_id, event_id=event_id).filter(AllocationRun.solver_status.in_(["optimal", "feasible"])).first()
    if not run:
        raise HTTPException(status_code=404, detail="An optimal allocation run was not found")
    assignments = db.query(JudgeAssignment, EvaluationTarget, JudgeProfile).join(EvaluationTarget, EvaluationTarget.id == JudgeAssignment.target_id).join(JudgeProfile, JudgeProfile.id == JudgeAssignment.judge_id).filter(JudgeAssignment.run_id == run.id).all()
    grouped = {}
    for assignment, target, judge in assignments:
        if target.external_id:
            grouped.setdefault(target.external_id, []).append(judge.name)
    for public_id, judge_names in grouped.items():
        registration = db.query(Registration).filter_by(event_id=event_id, public_id=public_id, kind="team").first()
        if registration:
            data = dict(registration.data or {})
            data["assignedJudges"] = judge_names
            registration.data = data
    run.status = "approved"
    db.commit()
    return {"id": run.id, "status": run.status, "message": "Allocation approved"}
