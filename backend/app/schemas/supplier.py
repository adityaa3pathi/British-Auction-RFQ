from typing import Optional
from pydantic import BaseModel


class SupplierResponse(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
