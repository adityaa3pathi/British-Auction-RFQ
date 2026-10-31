from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierResponse

router = APIRouter(prefix="/api/suppliers", tags=["Suppliers"])


@router.get("", response_model=List[SupplierResponse])
def list_suppliers(db: Session = Depends(get_db)):
    suppliers = db.query(Supplier).order_by(Supplier.name.asc()).all()
    return [{"id": s.id, "name": s.name, "email": s.email} for s in suppliers]
